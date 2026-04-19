"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { uploadComprobante } from "@/lib/services/comprobante-upload";
import { registerComprobanteAction } from "@/actions/checkout";
import type { ComprobanteData } from "@/components/public/checkout/CheckoutForm.types";

interface Params {
    orderId: string;
}

export interface UseComprobanteUploadReturn {
    comprobante: ComprobanteData | null;
    fileInputRef: React.RefObject<HTMLInputElement | null>;
    isDragging: boolean;
    handleFileSelect: (e: File | React.ChangeEvent<HTMLInputElement>) => Promise<void>;
    handleDrop: (e: React.DragEvent<HTMLDivElement>) => void;
    handleDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
    handleDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
    retryUpload: () => Promise<void>;
    clearComprobante: () => void;
    /** true solo cuando uploadedUrl está disponible y no hay error */
    isReady: boolean;
}

export function useComprobanteUpload({ orderId }: Params): UseComprobanteUploadReturn {
    const [comprobante, setComprobante] = useState<ComprobanteData | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const lastFileRef = useRef<File | null>(null);

    // Cleanup de Object URLs al desmontar para evitar memory leaks
    useEffect(() => {
        return () => {
            if (comprobante?.previewUrl) {
                URL.revokeObjectURL(comprobante.previewUrl);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const processFile = useCallback(async (file: File) => {
        // Revocar URL anterior
        setComprobante((prev) => {
            if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
            return null;
        });

        lastFileRef.current = file;
        const previewUrl = URL.createObjectURL(file);

        setComprobante({
            file,
            previewUrl,
            uploadedUrl: null,
            isUploading: true,
            uploadError: null,
        });

        try {
            // Optimizar imagen: Max 1200px (comprobantes necesitan legibilidad), WebP, calidad 80%
            const { optimizeImage } = await import("@/lib/utils/image-optimization");
            const optimizedFile = await optimizeImage(file, {
                maxWidth: 1200,
                maxHeight: 1200,
                quality: 0.8,
            });

            const result = await uploadComprobante(optimizedFile, orderId);

            if (result.success) {
                // 1. Registrar la URL real en la base de datos de la orden
                await registerComprobanteAction({ 
                    orderId, 
                    uploadedUrl: result.publicUrl 
                });

                setComprobante((prev) => {
                    if (!prev) return null;
                    // 2. Usar el link ofuscado para la interfaz y WhatsApp
                    const obfuscatedUrl = `${window.location.origin}/api/view-comprobante/${orderId}`;
                    return { ...prev, uploadedUrl: obfuscatedUrl, isUploading: false };
                });
            } else {
                setComprobante((prev) => prev ? { ...prev, isUploading: false, uploadError: result.error } : null);
            }
        } catch (err) {
            setComprobante((prev) => prev ? { ...prev, isUploading: false, uploadError: "Error al procesar imagen" } : null);
        }
    }, [orderId]);

    const handleFileSelect = useCallback(async (e: File | React.ChangeEvent<HTMLInputElement>) => {
        const file = e instanceof File ? e : e.target.files?.[0];
        if (!file) return;
        await processFile(file);
    }, [processFile]);

    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file?.type.startsWith("image/")) void processFile(file);
    }, [processFile]);

    const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    // Reintentar la subida con el mismo archivo (no pide nuevo archivo)
    const retryUpload = useCallback(async () => {
        const file = lastFileRef.current;
        if (!file) return;
        setComprobante((prev) => prev ? { ...prev, isUploading: true, uploadError: null } : null);
        
        try {
            const { optimizeImage } = await import("@/lib/utils/image-optimization");
            const optimizedFile = await optimizeImage(file, {
                maxWidth: 1200,
                maxHeight: 1200,
                quality: 0.8,
            });

            const result = await uploadComprobante(optimizedFile, orderId);
            
            if (result.success) {
                // Registrar URL real
                await registerComprobanteAction({ orderId, uploadedUrl: result.publicUrl });

                setComprobante((prev) => {
                    if (!prev) return null;
                    const obfuscatedUrl = `${window.location.origin}/api/view-comprobante/${orderId}`;
                    return { ...prev, uploadedUrl: obfuscatedUrl, isUploading: false };
                });
            } else {
                setComprobante((prev) => prev ? { ...prev, isUploading: false, uploadError: result.error } : null);
            }
        } catch (err) {
            setComprobante((prev) => prev ? { ...prev, isUploading: false, uploadError: "Error al procesar imagen" } : null);
        }
    }, [orderId]);

    const clearComprobante = useCallback(() => {
        if (comprobante?.previewUrl) URL.revokeObjectURL(comprobante.previewUrl);
        setComprobante(null);
        lastFileRef.current = null;
        if (fileInputRef.current) fileInputRef.current.value = "";
    }, [comprobante?.previewUrl]);

    const isReady =
        comprobante !== null &&
        comprobante.uploadedUrl !== null &&
        !comprobante.isUploading &&
        comprobante.uploadError === null;

    return {
        comprobante,
        fileInputRef,
        isDragging,
        handleFileSelect,
        handleDrop,
        handleDragOver,
        handleDragLeave,
        retryUpload,
        clearComprobante,
        isReady,
    };
}
