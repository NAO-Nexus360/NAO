// Envío de notificaciones por correo vía Gmail / Google Workspace (SMTP directo)
// Sin dependencias externas — cliente SMTP mínimo sobre TLS.
//
// Requiere 2 variables de entorno en Vercel:
//   GMAIL_USER          → admin@nexus360.mx
//   GMAIL_APP_PASSWORD  → contraseña de aplicación de 16 letras generada en
//                         https://myaccount.google.com/apppasswords
//
// Si las variables no están configuradas, el sistema funciona normal
// (no se envían correos y se registra un aviso en los logs del servidor).

import * as tls from "tls";

type PendienteEmailData = {
  tarea: string;
  descripcion?: string | null;
  obraNombre: string;
  area: string;
  prioridad: string;
  fechaInicio: Date;
  fechaEntrega: Date;
  contratistaNombre?: string | null;
  responsableNombre?: string | null;
  creadorNombre?: string | null;
  folio?: number | null;
  obraId: string;
};

const AREA_LABEL: Record<string, string> = {
  ESTRUCTURA: "Estructura", OBRA_CIVIL: "Obra civil", OBRA_BLANCA: "Obra blanca",
  INSTALACIONES: "Instalaciones", ACABADOS: "Acabados", PROYECTO: "Proyecto",
  ADMINISTRATIVO: "Administrativo", VENTA: "Venta", POSTVENTA: "Postventa",
};

const PRIORIDAD_COLOR: Record<string, string> = {
  CRITICA: "#dc2626", ALTA: "#ea580c", MEDIA: "#ca8a04", BAJA: "#64748b",
};

function fmtFecha(d: Date) {
  return new Date(d).toLocaleDateString("es-MX", {
    day: "numeric", month: "long", year: "numeric", timeZone: "America/Mexico_City",
  });
}

// ---------- Cliente SMTP mínimo (TLS, AUTH LOGIN) ----------

function smtpSend(opts: {
  user: string; pass: string; to: string[]; subject: string; html: string; fromName: string;
}): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = tls.connect({ host: "smtp.gmail.com", port: 465, servername: "smtp.gmail.com" });
    let buffer = "";
    let step = 0;
    let rcptIndex = 0;
    let settled = false;

    const timer = setTimeout(() => fail(new Error("SMTP timeout")), 20000);

    function fail(err: Error) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { socket.destroy(); } catch {}
      reject(err);
    }
    function done() {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { socket.end(); } catch {}
      resolve();
    }
    function write(line: string) {
      socket.write(line + "\r\n");
    }

    // Construir el mensaje MIME
    const b64 = (s: string) => Buffer.from(s, "utf-8").toString("base64");
    const subjectMime = `=?UTF-8?B?${b64(opts.subject)}?=`;
    const fromMime = `=?UTF-8?B?${b64(opts.fromName)}?= <${opts.user}>`;
    // Cuerpo en base64 para evitar problemas de codificación y dot-stuffing
    const bodyB64 = b64(opts.html).replace(/(.{76})/g, "$1\r\n");
    const message = [
      `From: ${fromMime}`,
      `To: ${opts.to.join(", ")}`,
      `Subject: ${subjectMime}`,
      "MIME-Version: 1.0",
      'Content-Type: text/html; charset="UTF-8"',
      "Content-Transfer-Encoding: base64",
      "",
      bodyB64,
    ].join("\r\n");

    socket.on("error", fail);

    socket.on("data", (chunk) => {
      buffer += chunk.toString("utf-8");
      // Procesar respuestas completas (última línea sin guión de continuación)
      const lines = buffer.split("\r\n");
      const lastComplete = lines.filter(Boolean).pop() || "";
      if (!/^\d{3} /.test(lastComplete)) return; // aún hay continuación "250-"
      const code = parseInt(lastComplete.slice(0, 3), 10);
      buffer = "";

      switch (step) {
        case 0: // saludo del servidor
          if (code !== 220) return fail(new Error(`SMTP saludo: ${lastComplete}`));
          step = 1; write("EHLO nao.nexus-360.mx"); break;
        case 1:
          if (code !== 250) return fail(new Error(`EHLO: ${lastComplete}`));
          step = 2; write("AUTH LOGIN"); break;
        case 2:
          if (code !== 334) return fail(new Error(`AUTH: ${lastComplete}`));
          step = 3; write(b64(opts.user)); break;
        case 3:
          if (code !== 334) return fail(new Error(`AUTH user: ${lastComplete}`));
          step = 4; write(b64(opts.pass)); break;
        case 4:
          if (code !== 235) return fail(new Error(`Credenciales rechazadas: ${lastComplete}`));
          step = 5; write(`MAIL FROM:<${opts.user}>`); break;
        case 5:
          if (code !== 250) return fail(new Error(`MAIL FROM: ${lastComplete}`));
          step = 6; write(`RCPT TO:<${opts.to[rcptIndex]}>`); break;
        case 6:
          // Aceptar 250/251; si un destinatario falla, continuar con los demás
          rcptIndex++;
          if (rcptIndex < opts.to.length) { write(`RCPT TO:<${opts.to[rcptIndex]}>`); }
          else { step = 7; write("DATA"); }
          break;
        case 7:
          if (code !== 354) return fail(new Error(`DATA: ${lastComplete}`));
          step = 8; socket.write(message + "\r\n.\r\n"); break;
        case 8:
          if (code !== 250) return fail(new Error(`Envío: ${lastComplete}`));
          step = 9; write("QUIT"); done(); break;
      }
    });
  });
}

// ---------- Notificación de nuevo pendiente ----------

export async function notificarNuevoPendiente(
  destinatarios: string[],
  p: PendienteEmailData
) {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    console.log("[email] GMAIL_USER o GMAIL_APP_PASSWORD no configurados — no se envía correo.");
    return;
  }
  if (destinatarios.length === 0) return;

  const base = process.env.NEXTAUTH_URL || "https://nao.nexus-360.mx";
  const link = `${base}/obras/${p.obraId}/pendientes`;
  const prioridadColor = PRIORIDAD_COLOR[p.prioridad] || "#64748b";

  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;background:#f1f5f9;padding:24px">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">
      <div style="background:#0f172a;padding:20px 28px">
        <p style="margin:0;color:#ffffff;font-size:18px;font-weight:bold">&#127959;&#65039; NAO — Nexus 360</p>
        <p style="margin:4px 0 0;color:#94a3b8;font-size:13px">Nuevo pendiente asignado</p>
      </div>
      <div style="padding:28px">
        <p style="margin:0 0 4px;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:1px">
          Obra: ${p.obraNombre}${p.folio ? ` · Folio #${p.folio}` : ""}
        </p>
        <h2 style="margin:0 0 16px;color:#0f172a;font-size:20px">${p.tarea}</h2>
        ${p.descripcion ? `<p style="margin:0 0 16px;color:#475569;font-size:14px">${p.descripcion}</p>` : ""}
        <table style="width:100%;font-size:14px;color:#334155;border-collapse:collapse">
          <tr><td style="padding:6px 0;color:#64748b;width:130px">Área</td><td style="padding:6px 0"><b>${AREA_LABEL[p.area] || p.area}</b></td></tr>
          <tr><td style="padding:6px 0;color:#64748b">Prioridad</td><td style="padding:6px 0"><span style="color:${prioridadColor};font-weight:bold">${p.prioridad}</span></td></tr>
          <tr><td style="padding:6px 0;color:#64748b">Inicio</td><td style="padding:6px 0">${fmtFecha(p.fechaInicio)}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b">Fecha de entrega</td><td style="padding:6px 0"><b>${fmtFecha(p.fechaEntrega)}</b></td></tr>
          ${p.contratistaNombre ? `<tr><td style="padding:6px 0;color:#64748b">Contratista</td><td style="padding:6px 0">${p.contratistaNombre}</td></tr>` : ""}
          ${p.responsableNombre ? `<tr><td style="padding:6px 0;color:#64748b">Responsable</td><td style="padding:6px 0">${p.responsableNombre}</td></tr>` : ""}
          ${p.creadorNombre ? `<tr><td style="padding:6px 0;color:#64748b">Creado por</td><td style="padding:6px 0">${p.creadorNombre}</td></tr>` : ""}
        </table>
        <a href="${link}" style="display:inline-block;margin-top:24px;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:bold">
          Ver pendiente en NAO
        </a>
      </div>
      <div style="padding:16px 28px;background:#f8fafc;border-top:1px solid #e2e8f0">
        <p style="margin:0;color:#94a3b8;font-size:11px">
          Este correo se envió automáticamente desde NAO — Nexus Avance de Obra. No respondas a este mensaje.
        </p>
      </div>
    </div>
  </div>`;

  try {
    await smtpSend({
      user, pass,
      to: destinatarios,
      subject: `Nuevo pendiente en ${p.obraNombre}: ${p.tarea}`,
      html,
      fromName: "NAO Nexus 360",
    });
    console.log(`[email] Notificación enviada a: ${destinatarios.join(", ")}`);
  } catch (e) {
    // Un fallo del correo NUNCA debe romper la creación del pendiente
    console.error("[email] Fallo al enviar:", e);
  }
}
