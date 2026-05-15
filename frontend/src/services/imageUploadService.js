import { supabase, taskImagesBucket } from "../lib/supabaseClient";
import { createUuid } from "../utils/ids";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export function validateImageFile(file) {
  if (!file) throw new Error("Choose an image first.");
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    throw new Error("Use a JPG, PNG, WebP, or GIF image.");
  }
  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error("Images must be 10 MB or smaller.");
  }
}

export async function compressImage(file) {
  validateImageFile(file);
  if (file.type === "image/gif") return file;
  const { default: imageCompression } = await import("browser-image-compression");
  return imageCompression(file, {
    maxSizeMB: 1,
    maxWidthOrHeight: 1800,
    useWebWorker: true,
    initialQuality: 0.86
  });
}

export async function uploadTaskImage({ file, taskId, userId, oldPath }) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const compressed = await compressImage(file);
  const extension = compressed.type.split("/")[1] || "jpg";
  const path = `${userId}/${taskId}/${createUuid()}.${extension}`;

  const { error } = await supabase.storage
    .from(taskImagesBucket)
    .upload(path, compressed, {
      cacheControl: "31536000",
      contentType: compressed.type,
      upsert: false
    });

  if (error) throw error;
  if (oldPath && !oldPath.startsWith("http")) {
    await deleteTaskImage(oldPath);
  }

  return path;
}

export async function getTaskImageUrl(path) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  if (!supabase) return "";

  const { data, error } = await supabase.storage
    .from(taskImagesBucket)
    .createSignedUrl(path, 60 * 60);

  if (error) throw error;
  return data.signedUrl;
}

export async function deleteTaskImage(path) {
  if (!supabase || !path || path.startsWith("http")) return;
  await supabase.storage.from(taskImagesBucket).remove([path]);
}
