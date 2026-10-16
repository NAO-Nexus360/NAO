// Notificaciones push web (app instalable): claves, envío y limpieza de dispositivos caducados.
import webpush from "web-push";
import { prisma } from "@/lib/prisma";

const CONTACTO = "mailto:eliasjasqui02@gmail.com";

// Las claves VAPID se generan una sola vez y se guardan en la base de datos.
async function obtenerClaves() {
  const existentes = await prisma.pushClaves.findUnique({ where: { id: "unica" } });
  if (existentes) return { publica: existentes.clavePublica, privada: existentes.clavePrivada };

  const nuevas = webpush.generateVAPIDKeys();
  try {
    await prisma.pushClaves.create({
      data: { id: "unica", clavePublica: nuevas.publicKey, clavePrivada: nuevas.privateKey },
    });
    return { publica: nuevas.publicKey, privada: nuevas.privateKey };
  } catch {
    // Otra petición las creó al mismo tiempo: usar las guardadas
    const guardadas = await prisma.pushClaves.findUniqueOrThrow({ where: { id: "unica" } });
    return { publica: guardadas.clavePublica, privada: guardadas.clavePrivada };
  }
}

export async function clavePublicaPush(): Promise<string> {
  return (await obtenerClaves()).publica;
}

export type PayloadPush = { titulo: string; cuerpo: string; url?: string };

// Envía una notificación a todos los dispositivos de los usuarios indicados.
// Los dispositivos que ya no existen (404/410) se eliminan. Nunca lanza errores.
export async function enviarPush(usuarioIds: string[], payload: PayloadPush) {
  try {
    if (usuarioIds.length === 0) return { enviados: 0, fallidos: 0 };
    const claves = await obtenerClaves();
    webpush.setVapidDetails(CONTACTO, claves.publica, claves.privada);

    const dispositivos = await prisma.pushSuscripcion.findMany({ where: { usuarioId: { in: usuarioIds } } });
    const mensaje = JSON.stringify(payload);
    let enviados = 0;
    let fallidos = 0;

    await Promise.all(
      dispositivos.map(async (d) => {
        try {
          await webpush.sendNotification({ endpoint: d.endpoint, keys: { p256dh: d.p256dh, auth: d.auth } }, mensaje);
          enviados++;
        } catch (e: any) {
          fallidos++;
          if (e?.statusCode === 404 || e?.statusCode === 410) {
            await prisma.pushSuscripcion.deleteMany({ where: { endpoint: d.endpoint } });
          } else {
            console.error("[push] Error al enviar:", e?.statusCode, e?.body || e?.message);
          }
        }
      })
    );
    return { enviados, fallidos };
  } catch (e) {
    console.error("[push] Fallo general:", e);
    return { enviados: 0, fallidos: 0 };
  }
}

// Igual que enviarPush, pero buscando a los usuarios por correo
export async function enviarPushPorCorreos(correos: string[], payload: PayloadPush) {
  if (correos.length === 0) return;
  const usuarios = await prisma.user.findMany({
    where: { email: { in: correos.map((c) => c.toLowerCase()) }, activo: true },
    select: { id: true },
  });
  await enviarPush(usuarios.map((u) => u.id), payload);
}
