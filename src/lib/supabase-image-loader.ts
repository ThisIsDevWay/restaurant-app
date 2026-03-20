import type { ImageLoaderProps } from "next/image";

export default function supabaseLoader({
  src,
  width,
  quality,
}: ImageLoaderProps): string {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const q = quality ?? 75;

  // If src is already a full URL, use it directly
  if (src.startsWith("http://") || src.startsWith("https://")) {
    // Transform to render endpoint for optimization
    const url = new URL(src);
    const path = url.pathname.replace("/object/", "/render/image/");
    // Add resize=cover to prevent distortion when cropping
    return `${url.origin}${path}?width=${width}&quality=${q}&resize=cover`;
  }

  // Otherwise, prepend the base URL
  return `${baseUrl}/storage/v1/render/image/public/${src}?width=${width}&quality=${q}&resize=cover`;
}
