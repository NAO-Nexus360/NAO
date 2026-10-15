// Reduce fotos muy pesadas en el navegador antes de subirlas.
// Vercel rechaza cuerpos de petición de más de ~4,5 MB; una foto de celular puede superar ese tamaño.
// Si la imagen no se puede reducir, se devuelve el archivo original.
export async function prepararArchivo(file: File, maxBytes = 3.5 * 1024 * 1024): Promise<File> {
  if (!file.type.startsWith("image/") || file.size <= maxBytes) return file;
  try {
    const imagen = await createImageBitmap(file);
    const escala = Math.min(1, 2048 / Math.max(imagen.width, imagen.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(imagen.width * escala);
    canvas.height = Math.round(imagen.height * escala);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(imagen, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}
