import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export async function uploadFile(buffer: Buffer, opts?: { folder?: string; resourceType?: "image" | "raw" | "auto" }) {
  return new Promise<{ url: string; publicId: string; resourceType: string }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: opts?.folder ?? "obra-control",
        resource_type: opts?.resourceType ?? "auto",
      },
      (err, result) => {
        if (err || !result) return reject(err);
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          resourceType: result.resource_type,
        });
      }
    );
    stream.end(buffer);
  });
}

export async function deleteFile(publicId: string, resourceType: "image" | "raw" | "video" = "image") {
  return cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
}

export default cloudinary;
