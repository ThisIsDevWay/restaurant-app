"use client";

import { Image as ImageIcon, Upload, Trash2, Loader2, Plus } from "lucide-react";
import { useState, useCallback } from "react";

interface MenuItemImageUploadProps {
  previewUrl: string | null;
  uploading: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onUpload: (e: React.ChangeEvent<HTMLInputElement> | File) => void | Promise<void>;
  onRemoveImage: () => void;
}

export function MenuItemImageUpload({
  previewUrl,
  uploading,
  fileInputRef,
  onUpload,
  onRemoveImage,
}: MenuItemImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const file = e.dataTransfer.files?.[0];
      if (file && file.type.startsWith("image/")) {
        onUpload(file);
      }
    },
    [onUpload]
  );

  return (
    <section className="space-y-4">
      <header className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-[0.05em] text-gray-400">Imagen del producto</h2>
      </header>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative aspect-square rounded-2xl border-2 border-dashed transition-all duration-300 overflow-hidden group
          ${isDragging
            ? "border-primary bg-primary/5 scale-[0.99] shadow-inner"
            : "border-gray-200 bg-gray-50/50 hover:border-gray-300 hover:bg-gray-50"
          }
          ${previewUrl ? "border-solid border-gray-100" : ""}
        `}
      >
        {previewUrl ? (
          <div className="relative w-full h-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Preview"
              className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 ${uploading ? "opacity-40 blur-sm" : ""}`}
            />

            {/* Overlay for actions when image exists */}
            {!uploading && (
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                {showDeleteConfirm ? (
                  <div className="flex flex-col items-center gap-2 p-4 bg-white rounded-2xl shadow-xl animate-in fade-in zoom-in duration-200 mx-4">
                    <p className="text-xs font-semibold text-gray-800">¿Eliminar imagen?</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDeleteConfirm(false);
                        }}
                        className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700"
                      >
                        No
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveImage();
                          setShowDeleteConfirm(false);
                        }}
                        className="px-3 py-1.5 bg-red-500 text-white text-xs font-medium rounded-lg hover:bg-red-600 transition-colors"
                      >
                        Sí, eliminar
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-32 py-2 bg-white rounded-full shadow-lg text-xs font-semibold text-gray-800 hover:bg-gray-50 transition-all transform translate-y-1 group-hover:translate-y-0"
                    >
                      Cambiar imagen
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="w-32 py-2 bg-red-500/90 backdrop-blur-sm rounded-full shadow-lg text-xs font-semibold text-white hover:bg-red-500 transition-all transform translate-y-1 group-hover:translate-y-0"
                    >
                      Eliminar
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center"
          >
            <div className="w-12 h-12 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-300">
              <Plus className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-700">Añadir imagen</p>
              <p className="text-xs text-gray-400">Arrastra o haz clic para subir</p>
            </div>
          </button>
        )}

        {/* Uploading State Overlay */}
        {uploading && (
          <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3 animate-in fade-in duration-300">
            <div className="relative">
              <Loader2 className="h-10 w-10 text-primary animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-4 w-4 bg-primary/20 rounded-full animate-ping" />
              </div>
            </div>
            <p className="text-sm font-semibold text-gray-700">Subiendo...</p>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => onUpload(e)}
          className="hidden"
        />
      </div>

      {!previewUrl && !uploading && (
        <div className="flex items-center gap-2 px-1 text-[11px] text-gray-400">
          <ImageIcon className="h-3 w-3" />
          <span>Soporta JPG, PNG, WebP. Máx 5MB.</span>
        </div>
      )}
    </section>
  );
}
