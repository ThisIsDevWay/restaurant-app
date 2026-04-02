"use client";

import { Image as ImageIcon, Upload, Trash2 } from "lucide-react";

interface MenuItemImageUploadProps {
  previewUrl: string | null;
  uploading: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveImage: () => void;
}

export function MenuItemImageUpload({
  previewUrl,
  uploading,
  fileInputRef,
  onUpload,
  onRemoveImage,
}: MenuItemImageUploadProps) {
  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Imagen</h2>
      </header>

      <div className="aspect-square relative rounded-lg border border-gray-200 bg-gray-50 overflow-hidden group">
        {previewUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-white/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-50"
              >
                <Upload className="h-4 w-4 text-gray-700" />
              </button>
              <button
                type="button"
                onClick={onRemoveImage}
                className="p-2 bg-white rounded-full shadow-sm hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </button>
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 hover:bg-gray-100 transition-colors"
          >
            <ImageIcon className="h-8 w-8 text-gray-300" />
            <span className="text-xs text-gray-500">Añadir imagen</span>
          </button>
        )}
        <input ref={fileInputRef} type="file" accept="image/*" onChange={onUpload} className="hidden" />
      </div>
      {uploading && <p className="text-xs text-gray-500 text-center animate-pulse">Subiendo...</p>}
    </section>
  );
}
