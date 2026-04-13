"use client";

import { createClient } from "@supabase/supabase-js";

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
 * Retorna la URL pública permanente o un error con mensaje en español.
 *
 * SETUP REQUERIDO en Supabase Dashboard (una sola vez):
 *   1. Storage → New bucket → Name: "comprobantes" → Public: true
 *   2. Policy INSERT para anon:
 *      CREATE POLICY "anon_insert_comprobantes"
 *      ON storage.objects FOR INSERT TO anon
 *      WITH CHECK (bucket_id = 'comprobantes');
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

    // ── Path único: orders/{orderId}/{timestamp}.{ext} ──────────────
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `orders/${orderId}/${Date.now()}.${ext}`;

    const { error } = await supabasePublic.storage
        .from(BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false });

    if (error) {
        console.error("[comprobante-upload]", error.message);
        return { success: false, error: "No se pudo subir el comprobante. Intenta de nuevo." };
    }

    const { data } = supabasePublic.storage.from(BUCKET).getPublicUrl(path);
    return { success: true, publicUrl: data.publicUrl };
}
