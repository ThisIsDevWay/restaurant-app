"use client";

import { toOriginalUrl } from "@/lib/imagekit/utils";
import { IMAGEKIT_FOLDERS } from "@/lib/imagekit/folders";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
];

export type UploadResult =
    | { success: true; publicUrl: string }
    | { success: false; error: string };

/**
 * Valida y sube un comprobante de pago a ImageKit.
 * NOTE: la optimización de imagen se hace en useComprobanteUpload antes de
 * llamar a esta función — no duplicar aquí.
 */
export async function uploadComprobante(
    file: File,
    orderId: string,
): Promise<UploadResult> {
    if (!ALLOWED_TYPES.includes(file.type)) {
        return { success: false, error: "Formato no soportado. Usa JPG, PNG o WEBP." };
    }
    if (file.size > MAX_BYTES) {
        const mb = (file.size / (1024 * 1024)).toFixed(1);
        return { success: false, error: `El archivo pesa ${mb} MB. Máximo: 5 MB.` };
    }

    // Get short-lived upload auth from the public endpoint
    // Cache-bust: append timestamp to avoid browser serving a cached one-time-use token
    let authData: { token: string; expire: number; signature: string; publicKey: string; urlEndpoint: string };
    try {
        const authRes = await fetch(`/api/imagekit/auth?_t=${Date.now()}`, {
            cache: "no-store",
        });
        if (!authRes.ok) throw new Error("Auth error");
        authData = await authRes.json();
    } catch {
        return { success: false, error: "No se pudo iniciar la subida. Intenta de nuevo." };
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("fileName", `${Date.now()}.webp`);
    formData.append("folder", IMAGEKIT_FOLDERS.comprobantes(orderId));
    formData.append("useUniqueFileName", "true");
    formData.append("publicKey", authData.publicKey);
    formData.append("signature", authData.signature);
    formData.append("expire", String(authData.expire));
    formData.append("token", authData.token);

    const uploadRes = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
        method: "POST",
        body: formData,
    });

    if (!uploadRes.ok) {
        let detail = "";
        try { detail = await uploadRes.text(); } catch { /* best-effort */ }
        console.error("[comprobante-upload] ImageKit upload failed", {
            status: uploadRes.status,
            detail,
            orderId,
        });
        return { success: false, error: "No se pudo subir el comprobante. Intenta de nuevo." };
    }

    const data = (await uploadRes.json()) as { url: string };
    return { success: true, publicUrl: toOriginalUrl(data.url) };
}
