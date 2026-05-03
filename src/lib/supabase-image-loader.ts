import type { ImageLoaderProps } from "next/image";

/**
 * Supabase image loader for next/image.
 *
 * NOTE: Supabase Image Transformations (/render/image/) require the Pro plan.
 * On Free tier that endpoint returns 403. We return the original public Storage
 * URL and let Vercel Image Optimization handle resizing from the public CDN.
 */
export default function supabaseLoader({ src }: ImageLoaderProps): string {
  // If already a full URL, return as-is (Vercel will optimize it)
  if (src.startsWith("http://") || src.startsWith("https://")) {
    return src;
  }

  // Relative path — prepend the Supabase Storage public base
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return `${baseUrl}/storage/v1/object/public/${src}`;
}
