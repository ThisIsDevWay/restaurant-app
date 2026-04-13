"use client";

import { useState } from "react";
import Image from "next/image";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import type { UseComprobanteUploadReturn } from "@/hooks/useComprobanteUpload";

type ComprobanteUploadProps = Pick<
    UseComprobanteUploadReturn,
    | "comprobante"
    | "fileInputRef"
    | "isDragging"
    | "handleFileSelect"
    | "handleDrop"
    | "handleDragOver"
    | "handleDragLeave"
    | "retryUpload"
    | "clearComprobante"
>;

export function ComprobanteUpload({
    comprobante,
    fileInputRef,
    isDragging,
    handleFileSelect,
    handleDrop,
    handleDragOver,
    handleDragLeave,
    retryUpload,
    clearComprobante,
}: ComprobanteUploadProps) {
    const [aspectRatio, setAspectRatio] = useState<number | undefined>(undefined);

    const handleClick = () => {
        if (!comprobante) {
            fileInputRef.current?.click();
        }
    };

    return (
        <div className="w-full">
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
            />

            <div
                style={comprobante && aspectRatio ? { aspectRatio: `${aspectRatio}` } : undefined}
                onClick={handleClick}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`relative w-full ${!comprobante ? 'aspect-[4/3] max-h-[200px]' : 'bg-[#FAF5F2]'} rounded-[14px] overflow-hidden transition-all duration-200 border-2 border-dashed flex flex-col items-center justify-center
          ${isDragging
                        ? "border-[#7B2D2D] bg-[#FBF0EC] scale-[0.99]"
                        : comprobante
                            ? "border-transparent border-none"
                            : "border-[#D4A9A0] bg-[#FAF5F2] cursor-pointer hover:bg-[#FBF0EC] active:scale-[0.98]"
                    }
        `}
            >
                {/* State 1: No file */}
                {!comprobante && (
                    <div className="flex flex-col items-center justify-center p-4 text-center pointer-events-none">
                        <div className="w-10 h-10 rounded-full bg-[#E8DED8] flex items-center justify-center mb-3">
                            <ImagePlus className="w-5 h-5 text-[#7B2D2D]" />
                        </div>
                        <p className="text-[14px] font-medium text-[#1A0A0A] mb-1">
                            Adjunta tu captura de pantalla
                        </p>
                        <p className="text-[12px] text-[#9A6A5A] mb-2">
                            JPG, PNG, WEBP · Máx. 5 MB
                        </p>
                        <p className="text-[11px] text-[#7B2D2D]/70 md:hidden bg-[#7B2D2D]/5 px-2 py-1 rounded-md">
                            Toca para abrir cámara o galería
                        </p>
                    </div>
                )}

                {/* State 2 & 3: Uploading or Submited */}
                {comprobante && !comprobante.uploadError && (
                    <div className="absolute inset-0 w-full h-full flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={comprobante.previewUrl}
                            alt="Comprobante"
                            onLoad={(e) => {
                                const target = e.target as HTMLImageElement;
                                setAspectRatio(target.naturalWidth / target.naturalHeight);
                            }}
                            className={`w-full h-auto object-cover transition-all ${comprobante.isUploading ? "opacity-40 blur-[2px]" : "opacity-100"
                                }`}
                        />
                        {comprobante.isUploading && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <Loader2 className="w-8 h-8 text-[#7B2D2D] animate-spin" />
                            </div>
                        )}
                        {!comprobante.isUploading && comprobante.uploadedUrl && (
                            <>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        clearComprobante();
                                    }}
                                    className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-sm shadow-sm rounded-full text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                                <div className="absolute top-3 left-3 px-3 py-1.5 bg-green-500/90 backdrop-blur-sm text-white text-[12px] font-medium rounded-full flex items-center gap-1.5 shadow-sm">
                                    ✓ Comprobante listo
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* State 4: Error */}
            {comprobante?.uploadError && (
                <div className="mt-3 bg-red-50 border border-red-200 text-red-700 rounded-[10px] px-3 py-2.5 text-[12px] flex flex-col gap-2 animate-in fade-in slide-in-from-top-2">
                    <p className="font-medium text-center">{comprobante.uploadError}</p>
                    <div className="flex gap-2">
                        <button
                            onClick={retryUpload}
                            className="flex-1 py-1.5 bg-red-600 text-white font-medium rounded-md active:scale-95 transition-all text-center"
                        >
                            Reintentar
                        </button>
                        <button
                            onClick={clearComprobante}
                            className="flex-1 py-1.5 bg-red-100 text-red-700 font-medium rounded-md active:scale-95 transition-all text-center border border-red-200"
                        >
                            Cambiar imagen
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
