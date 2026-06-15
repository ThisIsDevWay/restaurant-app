export default function wsrvLoader({ src, width, quality }: { src: string; width: number; quality?: number }) {
  // If the image is not an external URL, load it locally
  if (!src.startsWith("http")) return src;

  // If the URL requests to bypass the loader, return the original URL directly
  if (src.includes("bypass-loader=true")) {
    return src;
  }

  // Clean the URL (remove any tr=orig-true query parameter or similar)
  const cleanSrc = src.split("?")[0];

  // Return the wsrv.nl Cloudflare proxy URL with requested width and webp output format
  return `https://wsrv.nl/?url=${encodeURIComponent(cleanSrc)}&w=${width}&output=webp&q=${quality || 75}`;
}
