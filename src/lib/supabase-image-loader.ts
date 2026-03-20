import type { ImageLoaderProps } from "next/image";

export default function supabaseLoader({
  src,
  width,
  quality,
}: ImageLoaderProps): string {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

  // If src is already a full URL, use it directly
  if (src.startsWith("http://") || src.startsWith("https://")) {
    // Transform to render endpoint for optimization
    const url = new URL(src);
    const path = url.pathname.replace("/object/", "/render/image/");
    return `${url.origin}${path}?width=${width}&quality=${quality ?? 75}`;
  }

  // Otherwise, prepend the base URL
  return `${baseUrl}/storage/v1/render/image/public/${src}?width=${width}&quality=${quality ?? 75}`;
}
