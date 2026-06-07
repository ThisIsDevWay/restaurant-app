"use client";

import { X } from "lucide-react";

/* ─────────────────────────────────────────────
   COMPROBANTE LIGHTBOX
   Visor ampliado del comprobante de pago. Reutilizado por OrderPaymentPanel
   (admin) y WebOrdersSheet (caja).
───────────────────────────────────────────── */
export function ComprobanteLightbox({
  url,
  onClose,
}: {
  url: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-end p-4 bg-black/40"
      onClick={onClose}
    >
      <div
        className="relative h-[92vh] max-w-xl w-full rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.3)] bg-white animate-in slide-in-from-right duration-500 ease-out"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-900 transition-all active:scale-90"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="w-full h-full p-8 flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt="Comprobante de pago"
            className="block w-auto h-auto max-w-full max-h-full object-contain"
          />
        </div>
      </div>
    </div>
  );
}
