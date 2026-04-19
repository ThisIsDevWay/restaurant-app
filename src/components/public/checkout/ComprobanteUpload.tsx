"use client";

import { useState } from "react";
import { Camera, Image as ImageIcon, Loader2, Trash2, CheckCircle2, Upload, AlertCircle, RefreshCw } from "lucide-react";
import type { UseComprobanteUploadReturn } from "@/hooks/useComprobanteUpload";
import { cn } from "@/lib/utils";

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

    const openCamera = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (fileInputRef.current) {
            fileInputRef.current.setAttribute("capture", "environment");
            fileInputRef.current.click();
        }
    };

    const openGallery = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (fileInputRef.current) {
            fileInputRef.current.removeAttribute("capture");
            fileInputRef.current.click();
        }
    };

    const handleClickZone = () => {
        if (!comprobante) {
            openGallery({ stopPropagation: () => { } } as any);
        }
    };

    const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
        const img = e.currentTarget;
        setAspectRatio(img.naturalWidth / img.naturalHeight);
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
                onClick={handleClickZone}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={cn(
                    "relative w-full overflow-hidden transition-all duration-500 flex flex-col items-center justify-center group",
                    !comprobante ? 'min-h-[240px] border-2 border-dashed rounded-[32px]' : 'bg-white rounded-[24px] border-none shadow-md',
                    isDragging
                        ? "border-[#7B2D2D] bg-[#7B2D2D]/5 scale-[0.98]"
                        : !comprobante 
                            ? "border-border/40 bg-white cursor-pointer hover:border-[#7B2D2D]/30 hover:bg-[#FAF5F2] active:scale-[0.97]"
                            : ""
                )}
            >
                {/* State 1: No file (Empty) */}
                {!comprobante && (
                    <div className="flex flex-col items-center justify-center p-8 text-center pointer-events-none animate-in fade-in zoom-in duration-500">
                        {/* Pulse Animation Icon */}
                        <div className="relative mb-6">
                            <div className="absolute inset-0 bg-[#7B2D2D]/10 rounded-full animate-ping duration-[3s]" />
                            <div className="relative w-16 h-16 rounded-full bg-[#FAF5F2] border border-[#7B2D2D]/10 flex items-center justify-center shadow-sm">
                                <Upload className="w-7 h-7 text-[#7B2D2D]" />
                            </div>
                        </div>

                        <p className="text-[16px] font-display font-black text-[#251a07] mb-1.5">
                            Sube tu comprobante
                        </p>
                        <p className="text-[12px] text-text-muted mb-8 font-medium max-w-[200px] leading-relaxed">
                            Captura de pantalla legible · Máx. 5 MB
                        </p>

                        {/* Dual Buttons */}
                        <div className="flex gap-4 pointer-events-auto">
                            <button
                                onClick={openCamera}
                                className="relative h-12 flex items-center gap-2 bg-[#7B2D2D] text-white px-6 rounded-2xl text-[13px] font-display font-black shadow-lg shadow-[#7B2D2D]/20 active:scale-95 transition-all overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-gradient-to-tr from-[#7B2D2D] to-[#9c3939] opacity-100" />
                                <span className="relative z-10 flex items-center gap-2">
                                    <Camera className="w-4 h-4" /> Cámara
                                </span>
                            </button>
                            <button
                                onClick={openGallery}
                                className="flex h-12 items-center gap-2 bg-white text-[#251a07] border border-border/60 px-6 rounded-2xl text-[13px] font-display font-black shadow-sm active:scale-95 transition-all hover:bg-[#FAF5F2]"
                            >
                                <ImageIcon className="w-4 h-4" /> Galería
                            </button>
                        </div>
                    </div>
                )}

                {/* State 2: Progress (Uploading) */}
                {comprobante?.isUploading && (
                    <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-8 animate-in fade-in duration-500">
                        <div className="relative mb-6">
                            <Loader2 className="w-12 h-12 text-[#7B2D2D] animate-spin" strokeWidth={3} />
                        </div>
                        <p className="text-[14px] font-display font-black text-[#251a07] mb-1">
                            Subiendo imagen...
                        </p>
                        <p className="text-[11px] text-[#251a07]/40 font-black tracking-widest uppercase">
                            No cierres esta ventana
                        </p>
                    </div>
                )}

                {/* State 3: Content (Preview) */}
                {comprobante && (
                    <div className="relative w-full h-full flex items-center justify-center animate-in zoom-in-95 duration-500 group/preview">
                        {comprobante.previewUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={comprobante.previewUrl}
                                alt="Comprobante"
                                className={cn(
                                    "w-full h-auto object-contain transition-all duration-700",
                                    comprobante.isUploading ? 'opacity-30 grayscale blur-[2px]' : 'opacity-100'
                                )}
                                onLoad={handleImageLoad}
                            />
                        )}

                        {/* Error State Overlay */}
                        {comprobante.uploadError && (
                            <div className="absolute inset-0 bg-red-500/10 backdrop-blur-[2px] flex flex-col items-center justify-center p-8 animate-in fade-in">
                                <AlertCircle className="w-10 h-10 text-red-600 mb-4" />
                                <p className="text-[14px] font-display font-black text-red-600 mb-6 text-center">
                                    Error al subir la imagen
                                </p>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        retryUpload();
                                    }}
                                    className="h-11 px-6 bg-red-600 text-white rounded-2xl text-[12px] font-display font-black flex items-center gap-2 active:scale-95 transition-all"
                                >
                                    <RefreshCw className="w-4 h-4" /> Reintentar
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        clearComprobante();
                                    }}
                                    className="mt-4 text-[11px] font-black text-red-600/60 uppercase tracking-widest underline decoration-red-600/20 underline-offset-4"
                                >
                                    Cancelar
                                </button>
                            </div>
                        )}

                        {/* Success State */}
                        {!comprobante.isUploading && comprobante.uploadedUrl && (
                            <>
                                <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between animate-in slide-in-from-bottom-2 duration-500">
                                    <div className="px-5 py-2.5 bg-[#2A7A4A] text-white text-[11px] font-display font-black uppercase tracking-widest rounded-full flex items-center gap-2.5 shadow-xl shadow-[#2A7A4A]/30">
                                        <CheckCircle2 className="w-4 h-4" strokeWidth={3} />
                                        Listo
                                    </div>

                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            clearComprobante();
                                        }}
                                        className="h-10 px-4 bg-white/95 backdrop-blur-md shadow-lg rounded-2xl text-[#7B2D2D] hover:bg-[#7B2D2D] hover:text-white transition-all active:scale-90 flex items-center gap-2.5 border border-white/20"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Cambiar</span>
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
