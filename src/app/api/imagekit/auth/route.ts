import { NextResponse } from "next/server";
import { getUploadAuth } from "@/lib/imagekit/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/imagekit/auth
 * Returns short-lived ImageKit upload auth params for public (anonymous) uploads,
 * used by the checkout comprobante uploader.
 */
export async function GET() {
  const { token, expire, signature } = getUploadAuth();
  return NextResponse.json({
    token,
    expire,
    signature,
    publicKey: process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY,
    urlEndpoint: process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT,
  });
}
