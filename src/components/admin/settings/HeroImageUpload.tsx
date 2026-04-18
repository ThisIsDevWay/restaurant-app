"use client";

import { useRef, useState } from "react";
import { ImageIcon, Upload, Trash2, Loader2, ImagePlus } from "lucide-react";
import { uploadHeroImageAction } from "@/actions/settings";

interface HeroImageUploadProps {
    coverImageUrl: string;
    onImageChange: (url: string) => void;
}

export function HeroImageUpload({ coverImageUrl, onImageChange }: HeroImageUploadProps) {
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setError(null);

        try {
            // Optimizar imagen: Max 1920px ancho, formato WebP, calidad 85%
            const { optimizeImage } = await import("@/lib/utils/image-optimization");
            const optimizedFile = await optimizeImage(file, {
                maxWidth: 1920,
                maxHeight: 1080,
                quality: 0.85,
            });

            // 1. Get signed upload URL from action
            const result = await uploadHeroImageAction({ fileName: optimizedFile.name });

            if (!result?.data?.success) {
                setError("No se pudo generar la URL de subida");
                return;
            }

            const { signedUrl, publicUrl } = result.data;

            // 2. Upload file directly via signed URL
            const uploadRes = await fetch(signedUrl, {
                method: "PUT",
                headers: { "Content-Type": optimizedFile.type },
                body: optimizedFile,
            });

            if (!uploadRes.ok) {
                setError("Error al subir el archivo");
                return;
            }

            // 3. Propagate public URL to parent form
            onImageChange(publicUrl);
        } catch {
            setError("Error inesperado al subir la imagen");
        } finally {
            setUploading(false);
            // Reset input so the same file can be re-selected
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    }

    function handleRemove() {
        onImageChange("");
        if (fileInputRef.current) fileInputRef.current.value = "";
    }

    return (
        <div className="flex flex-col items-center gap-4 pb-6 border-b border-border/30 mb-6">
            <div className="relative w-full max-w-sm">
                {/* Hero preview / placeholder */}
                <div
                    className="w-full aspect-[4/3] sm:aspect-video rounded-2xl flex items-center justify-center overflow-hidden border-2 transition-all bg-bg-app relative group"
                    style={{
                        borderColor: coverImageUrl ? "var(--color-primary)" : "var(--color-border)",
                    }}
                >
                    {coverImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={coverImageUrl}
                            alt="Fondo de la cabecera"
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="flex flex-col items-center gap-2 text-text-muted">
                            <ImagePlus className="h-8 w-8 opacity-50" />
                            <span className="text-xs font-semibold">Sin imagen (Fondo oscuro)</span>
                        </div>
                    )}
                </div>

                {/* Remove button overlay */}
                {coverImageUrl && !uploading && (
                    <button
                        type="button"
                        onClick={handleRemove}
                        title="Eliminar imagen"
                        className="absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center shadow-sm bg-white border border-border/60 hover:bg-red-50 hover:border-red-200 transition-all z-10"
                    >
                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
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
                        <Upload className="h-6 w-6 mb-1" style={{ color: "var(--color-primary)" }} />
                        <span className="text-sm font-semibold" style={{ color: "var(--color-primary)" }}>
                            {coverImageUrl ? "Cambiar fondo" : "Subir imagen"}
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
            <div className="text-center mt-2">
                <p className="text-sm font-semibold" style={{ color: "var(--color-text-main)" }}>
                    Fondo de Cabecera (Hero)
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
                    PNG o JPG — recomendado panorámico (ej. 16:9)
                </p>
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-full transition-all disabled:opacity-50"
                    style={{
                        background: "var(--color-surface-section)",
                        color: "var(--color-primary)",
                        border: "1px solid var(--color-border)",
                    }}
                >
                    <Upload className="h-3.5 w-3.5" />
                    {uploading ? "Subiendo…" : coverImageUrl ? "Cambiar imagen" : "Seleccionar fondo"}
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
