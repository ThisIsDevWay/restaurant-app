export function toOriginalUrl(url: string): string {
  if (!url) return url;
  try {
    const u = new URL(url);
    u.searchParams.set("tr", "orig-true");
    return u.toString();
  } catch {
    return url.includes("?") ? `${url}&tr=orig-true` : `${url}?tr=orig-true`;
  }
}
