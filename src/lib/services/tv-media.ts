import { uploadBuffer, deleteFile, toOriginalUrl } from "@/lib/imagekit/server";
import { IMAGEKIT_FOLDERS } from "@/lib/imagekit/folders";
import { nanoid } from "nanoid";

export const TV_MEDIA_MAX_BYTES = 100 * 1024 * 1024;       // 100 MB (videos)
export const TV_MEDIA_MAX_IMAGE_BYTES = 10 * 1024 * 1024;  // 10 MB (imágenes)

export const TV_MEDIA_ALLOWED_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
] as const;

export type TvMediaMime = (typeof TV_MEDIA_ALLOWED_MIMES)[number];

export function inferMediaType(mimeType: string): "image" | "video" | null {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  return null;
}

export function buildFileName(originalName: string): string {
  const dotIdx = originalName.lastIndexOf(".");
  const ext =
    dotIdx >= 0 ? originalName.slice(dotIdx + 1).toLowerCase() : "bin";
  const safeExt = ext.replace(/[^a-z0-9]/g, "").slice(0, 6) || "bin";
  return `${nanoid(16)}.${safeExt}`;
}

// Kept for compatibility with existing DB rows that store a storagePath.
export function buildStoragePath(originalName: string): string {
  return buildFileName(originalName);
}

/**
 * Uploads a file buffer to ImageKit. Returns the public URL and fileId.
 * Caller is responsible for storing these in the DB.
 */
export async function uploadTvMediaBuffer(params: {
  buffer: Buffer | Uint8Array;
  path: string;
  contentType: string;
}): Promise<{ ok: true; publicUrl: string; fileId: string } | { ok: false; error: string }> {
  const { buffer, path, contentType: _contentType } = params;
  try {
    const folder = IMAGEKIT_FOLDERS.tvMedia();
    const result = await uploadBuffer({ buffer, fileName: path, folder });
    return { ok: true, publicUrl: toOriginalUrl(result.url), fileId: result.fileId };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Upload error",
    };
  }
}

/**
 * Deletes a file from ImageKit by fileId. Best-effort: never throws.
 */
export async function deleteTvMediaFromStorage(
  fileId: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await deleteFile(fileId);
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Delete error",
    };
  }
}
