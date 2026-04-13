"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { uploadComprobante } from "@/lib/services/comprobante-upload";
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

        const result = await uploadComprobante(file, orderId);

        setComprobante((prev) => {
            if (!prev) return null;
            if (result.success) {
                return { ...prev, uploadedUrl: result.publicUrl, isUploading: false };
            }
            return { ...prev, isUploading: false, uploadError: result.error };
        });
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
        const result = await uploadComprobante(file, orderId);
        setComprobante((prev) => {
            if (!prev) return null;
            if (result.success) {
                return { ...prev, uploadedUrl: result.publicUrl, isUploading: false };
            }
            return { ...prev, isUploading: false, uploadError: result.error };
        });
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
