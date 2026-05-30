"use client";

import { Camera, ImageIcon, Loader2, Trash2, CheckCircle2, Upload, AlertCircle, RefreshCw } from "lucide-react";
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

  const hasFile = !!comprobante;
  const isUploaded = !comprobante?.isUploading && !!comprobante?.uploadedUrl;
  const hasError = !!comprobante?.uploadError;

  return (
    <div className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      {!hasFile && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => openGallery({ stopPropagation: () => {} } as any)}
          className={cn(
            "w-full min-h-[200px] border-dashed border-2 rounded-[14px] flex flex-col items-center justify-center gap-4 cursor-pointer transition-all",
            isDragging
              ? "border-primary bg-primary/5 scale-[0.98]"
              : "border-border bg-surface-section hover:border-primary/40 hover:bg-bg-card active:scale-[0.97]"
          )}
        >
          <div className="w-14 h-14 rounded-full bg-bg-card border border-border flex items-center justify-center">
            <Upload className="w-6 h-6 text-text-muted" />
          </div>
          <div className="text-center px-4">
            <p className="font-sans text-[14px] font-semibold text-text-main">
              Sube tu comprobante
            </p>
            <p className="font-sans text-[12px] text-text-muted mt-0.5">
              Captura de pantalla legible · Máx. 5 MB
            </p>
          </div>
          <div className="flex gap-3 pointer-events-auto">
            <button
              onClick={openCamera}
              className="h-11 px-5 bg-primary text-white rounded-full text-[13px] font-semibold flex items-center gap-2 active:scale-95 transition-all"
            >
              <Camera className="w-4 h-4" /> Cámara
            </button>
            <button
              onClick={openGallery}
              className="h-11 px-5 bg-bg-card border border-border text-text-main rounded-full text-[13px] font-semibold flex items-center gap-2 active:scale-95 transition-all"
            >
              <ImageIcon className="w-4 h-4" /> Galería
            </button>
          </div>
        </div>
      )}

      {hasFile && (
        <div
          className={cn(
            "w-full rounded-[14px] overflow-hidden border transition-colors",
            isUploaded
              ? "bg-[#E8EFE3] border-[rgba(63,107,74,0.25)]"
              : "bg-surface-section border-border"
          )}
        >
          {/* Preview image */}
          {comprobante.previewUrl && (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={comprobante.previewUrl}
                alt="Comprobante"
                className={cn(
                  "w-full h-auto object-contain transition-all duration-500",
                  comprobante.isUploading ? "opacity-30 grayscale blur-[2px]" : "opacity-100"
                )}
              />

              {/* Uploading overlay */}
              {comprobante.isUploading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" strokeWidth={2.5} />
                  <p className="font-sans text-[12px] font-semibold text-text-main">
                    Subiendo...
                  </p>
                </div>
              )}

              {/* Error overlay */}
              {hasError && (
                <div className="absolute inset-0 bg-primary/10 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3 p-6">
                  <AlertCircle className="w-8 h-8 text-primary" />
                  <p className="font-sans text-[13px] font-semibold text-primary text-center">
                    Error al subir la imagen
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); retryUpload(); }}
                      className="h-10 px-4 bg-primary text-white rounded-full text-[12px] font-semibold flex items-center gap-1.5 active:scale-95"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Reintentar
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); clearComprobante(); }}
                      className="h-10 px-4 bg-bg-card border border-border text-text-main rounded-full text-[12px] font-semibold active:scale-95"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Success bar */}
          {isUploaded && (
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2 text-[#3F6B4A]">
                <CheckCircle2 className="w-4 h-4" strokeWidth={2.5} />
                <span className="font-sans text-[12px] font-semibold">Comprobante listo</span>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); clearComprobante(); }}
                className="h-8 px-3 bg-bg-card border border-border text-text-muted rounded-full text-[11px] font-semibold flex items-center gap-1.5 active:scale-95"
              >
                <Trash2 className="w-3 h-3" /> Cambiar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
