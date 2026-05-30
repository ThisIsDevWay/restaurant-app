import "server-only";
import ImageKit from "imagekit";
export { toOriginalUrl } from "./utils";

const ik = new ImageKit({
  publicKey: process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY!,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY!,
  urlEndpoint: process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT!,
});

export async function uploadBuffer({
  buffer,
  fileName,
  folder,
}: {
  buffer: Buffer | Uint8Array;
  fileName: string;
  folder: string;
}): Promise<{ url: string; fileId: string; filePath: string }> {
  const result = await ik.upload({
    file: Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer),
    fileName,
    folder,
    useUniqueFileName: true,
  });
  return { url: result.url, fileId: result.fileId, filePath: result.filePath };
}

export async function deleteFile(fileId: string): Promise<void> {
  try {
    await ik.deleteFile(fileId);
  } catch {
    // best-effort
  }
}

export function getUploadAuth(options?: { expirySeconds?: number }): { token: string; expire: number; signature: string } {
  const expire = Math.floor(Date.now() / 1000) + (options?.expirySeconds ?? 3600);
  return ik.getAuthenticationParameters(undefined, expire);
}
