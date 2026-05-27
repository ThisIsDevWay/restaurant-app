"use server";

import * as v from "valibot";
import { adminActionClient } from "@/lib/safe-action";
import { getUploadAuth, deleteFile } from "@/lib/imagekit/server";

export const getImagekitAuthAction = adminActionClient
  .schema(v.object({}))
  .action(async () => {
    const { token, expire, signature } = getUploadAuth();
    return {
      token,
      expire,
      signature,
      publicKey: process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY!,
      urlEndpoint: process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT!,
    };
  });

export const deleteImagekitFileAction = adminActionClient
  .schema(v.object({ fileId: v.pipe(v.string(), v.minLength(1)) }))
  .action(async ({ parsedInput: { fileId } }) => {
    await deleteFile(fileId); // best-effort, never throws
    return { success: true };
  });
