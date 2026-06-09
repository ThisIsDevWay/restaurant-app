import { NextResponse } from "next/server";
import { getUploadAuth } from "@/lib/imagekit/server";
import { rateLimiters, getIP } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** Anti-cache headers — ImageKit tokens are one-time-use. */
const NO_CACHE_HEADERS = {
  "Cache-Control": "no-cache, no-store, must-revalidate",
  Pragma: "no-cache",
  Expires: "0",
} as const;

/**
 * GET /api/imagekit/auth
 * Returns short-lived ImageKit upload auth params for anonymous checkout uploads.
 * Accepts requests from /checkout (anonymous) pages.
 */
export async function GET(req: Request) {
  const ip = getIP(req);
  const { success } = await rateLimiters.imagekitUpload.limit(ip);
  if (!success) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: NO_CACHE_HEADERS },
    );
  }

  const referer = req.headers.get("referer") ?? "";
  if (!referer.includes("/checkout")) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403, headers: NO_CACHE_HEADERS },
    );
  }

  const { token, expire, signature } = getUploadAuth({ expirySeconds: 900 });
  return NextResponse.json(
    {
      token,
      expire,
      signature,
      publicKey: process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY,
      urlEndpoint: process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT,
    },
    { headers: NO_CACHE_HEADERS },
  );
}
