import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { uploadFile } from "@/lib/cloudinary";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const folder = (form.get("folder") as string) || "nao";
    if (!file) return NextResponse.json({ error: "Sin archivo" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadFile(buffer, { folder, resourceType: "auto" });
    return NextResponse.json({ url: result.url, publicId: result.publicId, tipo: result.resourceType, nombre: file.name });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Error subiendo archivo" }, { status: 500 });
  }
}
