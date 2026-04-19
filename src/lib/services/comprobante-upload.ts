"use client";

import { createClient } from "@supabase/supabase-js";
import { optimizeImage } from "@/lib/utils/image-optimization";

// ⚠️ Cliente PÚBLICO — usa ANON KEY, no SERVICE_ROLE_KEY
// La policy del bucket debe permitir INSERT para rol 'anon'
const supabasePublic = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const BUCKET = "comprobantes";
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/heic",
    "image/heif",
];

export type UploadResult =
    | { success: true; publicUrl: string }
    | { success: false; error: string };

/**
 * Valida y sube un comprobante de pago al bucket de Supabase Storage.
 */
export async function uploadComprobante(
    file: File,
    orderId: string,
): Promise<UploadResult> {
    // ── Validaciones client-side ────────────────────────────────────
    if (!ALLOWED_TYPES.includes(file.type)) {
        return { success: false, error: "Formato no soportado. Usa JPG, PNG o WEBP." };
    }
    if (file.size > MAX_BYTES) {
        const mb = (file.size / (1024 * 1024)).toFixed(1);
        return { success: false, error: `El archivo pesa ${mb} MB. Máximo: 5 MB.` };
    }

    // ── Optimización ────────────────────────────────────────────────
    let fileToUpload = file;
    try {
        fileToUpload = await optimizeImage(file, {
            maxWidth: 1200,
            quality: 0.7,
            format: "image/webp",
        });
    } catch (err) {
        console.warn("[comprobante-upload] Falló optimización, subiendo original", err);
    }

    // ── Path único: orders/{orderId}/{timestamp}.webp ──────────────
    const path = `orders/${orderId}/${Date.now()}.webp`;

    const { error } = await supabasePublic.storage
        .from(BUCKET)
        .upload(path, fileToUpload, { 
            contentType: "image/webp", 
            upsert: false 
        });

    if (error) {
        console.error("[comprobante-upload]", error.message);
        return { success: false, error: "No se pudo subir el comprobante. Intenta de nuevo." };
    }

    const { data } = supabasePublic.storage.from(BUCKET).getPublicUrl(path);
    return { success: true, publicUrl: data.publicUrl };
}
