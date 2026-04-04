"use client";

import { useRef, useState } from "react";
import { ImageIcon, Upload, Trash2, Loader2 } from "lucide-react";
import { uploadLogoAction } from "@/actions/settings";

interface RestaurantLogoUploadProps {
    logoUrl: string;
    onLogoChange: (url: string) => void;
}

export function RestaurantLogoUpload({ logoUrl, onLogoChange }: RestaurantLogoUploadProps) {
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setError(null);

        try {
            // 1. Get signed upload URL from action
            const result = await uploadLogoAction({ fileName: file.name });

            if (!result?.data?.success) {
                setError("No se pudo generar la URL de subida");
                return;
            }

            const { signedUrl, publicUrl } = result.data;

            // 2. Upload file directly via signed URL
            const uploadRes = await fetch(signedUrl, {
                method: "PUT",
                headers: { "Content-Type": file.type },
                body: file,
            });

            if (!uploadRes.ok) {
                setError("Error al subir el archivo");
                return;
            }

            // 3. Propagate public URL to parent form
            onLogoChange(publicUrl);
        } catch {
            setError("Error inesperado al subir el logo");
        } finally {
            setUploading(false);
            // Reset input so the same file can be re-selected
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    }

    function handleRemove() {
        onLogoChange("");
        if (fileInputRef.current) fileInputRef.current.value = "";
    }

    return (
        <div className="flex flex-col items-center gap-4 pb-6 border-b border-border/30 mb-6">
            <div className="relative">
                {/* Logo preview / placeholder */}
                <div
                    className="w-28 h-28 rounded-2xl flex items-center justify-center overflow-hidden border-2 transition-all"
                    style={{
                        background: logoUrl ? "transparent" : "var(--color-surface-section)",
                        borderColor: logoUrl ? "var(--color-primary)" : "var(--color-border)",
                    }}
                >
                    {logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={logoUrl}
                            alt="Logo del restaurante"
                            className="w-full h-full object-contain p-1"
                        />
                    ) : (
                        <ImageIcon className="h-10 w-10" style={{ color: "var(--color-border)" }} />
                    )}
                </div>

                {/* Remove button overlay */}
                {logoUrl && !uploading && (
                    <button
                        type="button"
                        onClick={handleRemove}
                        title="Eliminar logo"
                        className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center shadow-sm bg-white border border-border/60 hover:bg-red-50 hover:border-red-200 transition-all"
                    >
                        <Trash2 className="h-3 w-3 text-red-500" />
                    </button>
                )}

                {/* Upload overlay on hover */}
                {!uploading && (
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center gap-1 opacity-0 hover:opacity-100 transition-opacity"
                        style={{ background: "rgba(187,0,5,0.08)" }}
                    >
                        <Upload className="h-5 w-5" style={{ color: "var(--color-primary)" }} />
                        <span className="text-[10px] font-semibold" style={{ color: "var(--color-primary)" }}>
                            {logoUrl ? "Cambiar" : "Subir"}
                        </span>
                    </button>
                )}

                {/* Uploading spinner */}
                {uploading && (
                    <div className="absolute inset-0 rounded-2xl flex items-center justify-center" style={{ background: "rgba(255,248,243,0.85)" }}>
                        <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--color-primary)" }} />
                    </div>
                )}
            </div>

            {/* Call to action text */}
            <div className="text-center">
                <p className="text-sm font-semibold" style={{ color: "var(--color-text-main)" }}>
                    Logo del Restaurante
                </p>
                <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                    PNG, JPG o SVG — recomendado 256×256 px
                </p>
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-all disabled:opacity-50"
                    style={{
                        background: "var(--color-surface-section)",
                        color: "var(--color-primary)",
                        border: "1px solid var(--color-border)",
                    }}
                >
                    <Upload className="h-3 w-3" />
                    {uploading ? "Subiendo…" : logoUrl ? "Cambiar logo" : "Seleccionar archivo"}
                </button>
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={handleFileChange}
                className="hidden"
            />

            {error && (
                <p className="text-xs text-red-600 mt-1">{error}</p>
            )}
        </div>
    );
}
