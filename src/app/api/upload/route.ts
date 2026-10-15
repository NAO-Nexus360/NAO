import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { uploadFile } from "@/lib/cloudinary";

export const runtime = "nodejs";

const MAX_BYTES = 20 * 1024 * 1024;
const TIPOS_PERMITIDOS = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
]);
const EXTENSIONES_PERMITIDAS = [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".csv", ".heic", ".heif"];

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const folder = (form.get("folder") as string) || "nao";
    if (!file) return NextResponse.json({ error: "Sin archivo" }, { status: 400 });

    // Solo los tipos que la app usa: fotos, PDF, Word, Excel y CSV
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "El archivo es demasiado grande (máximo 20 MB)" }, { status: 413 });
    }
    const nombre = file.name.toLowerCase();
    const tipoPermitido =
      file.type.startsWith("image/") ||
      TIPOS_PERMITIDOS.has(file.type) ||
      EXTENSIONES_PERMITIDAS.some((ext) => nombre.endsWith(ext));
    if (!tipoPermitido) {
      return NextResponse.json({ error: "Tipo de archivo no permitido" }, { status: 415 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadFile(buffer, { folder, resourceType: "auto" });
    return NextResponse.json({ url: result.url, publicId: result.publicId, tipo: result.resourceType, nombre: file.name });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Error subiendo archivo" }, { status: 500 });
  }
}
