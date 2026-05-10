import { supabase } from "@/lib/supabase";
import { nanoid } from "nanoid";

export const TV_MEDIA_BUCKET = "tv-media";

export const TV_MEDIA_MAX_BYTES = 100 * 1024 * 1024; // 100 MB

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

export function buildStoragePath(originalName: string): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  // Sanitize and shorten extension
  const dotIdx = originalName.lastIndexOf(".");
  const ext =
    dotIdx >= 0 ? originalName.slice(dotIdx + 1).toLowerCase() : "bin";
  const safeExt = ext.replace(/[^a-z0-9]/g, "").slice(0, 6) || "bin";
  return `${year}/${month}/${nanoid(16)}.${safeExt}`;
}

/**
 * Uploads a file buffer to the tv-media bucket. Returns the storage path
 * and public URL. Caller is responsible for storing this in the DB.
 */
export async function uploadTvMediaBuffer(params: {
  buffer: Buffer | Uint8Array;
  path: string;
  contentType: string;
}): Promise<{ ok: true; publicUrl: string } | { ok: false; error: string }> {
  const { buffer, path, contentType } = params;
  try {
    const { error } = await supabase.storage
      .from(TV_MEDIA_BUCKET)
      .upload(path, buffer, {
        contentType,
        upsert: false,
      });
    if (error) return { ok: false, error: error.message };
    const { data } = supabase.storage.from(TV_MEDIA_BUCKET).getPublicUrl(path);
    return { ok: true, publicUrl: data.publicUrl };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Upload error",
    };
  }
}

/**
 * Removes a file from the tv-media bucket. Best-effort: returns ok=false
 * on failure but the caller may decide whether to still delete the DB row.
 */
export async function deleteTvMediaFromStorage(
  storagePath: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await supabase.storage
      .from(TV_MEDIA_BUCKET)
      .remove([storagePath]);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Storage error",
    };
  }
}
