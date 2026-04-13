"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Copy, Check, Loader2, Link as LinkIcon, ExternalLink } from "lucide-react";
import type { GpsCoords } from "./CheckoutForm.types";
import { useComprobanteUpload } from "@/hooks/useComprobanteUpload";
import { ComprobanteUpload } from "./ComprobanteUpload";
import { appendComprobanteToMessage, buildFinalWaLink } from "@/lib/utils/build-whatsapp-payload";
import { formatBs, formatRef } from "@/lib/money";
import { useCartStore } from "@/store/cartStore";

interface PagoMovilScreenProps {
    orderId: string;
    totalBsCents: number;
    totalUsdCents: number;
    bankDetails: {
        bankName: string;
        accountPhone: string;
        accountRif: string;
    };
    serverPrefilledMessage: string;
    serverWaLink: string;
    gpsCoords: GpsCoords | null;
    onVolver: () => void;
}

export function PagoMovilScreen({
    orderId,
    totalBsCents,
    totalUsdCents,
    bankDetails,
    serverPrefilledMessage,
    serverWaLink,
    gpsCoords,
    onVolver,
}: PagoMovilScreenProps) {
    const router = useRouter();
    const clearCart = useCartStore((s) => s.clearCart);

    const { comprobante, isReady, fileInputRef, isDragging, handleFileSelect, handleDrop, handleDragOver, handleDragLeave, retryUpload, clearComprobante } = useComprobanteUpload({ orderId });

    const [finalizado, setFinalizado] = useState(false);
    const [copiedLink, setCopiedLink] = useState(false);

    // Derived final link (if ready)
    let finalLink = "";
    if (isReady && comprobante?.uploadedUrl) {
        const finalMessage = appendComprobanteToMessage({
            serverMessage: serverPrefilledMessage,
            comprobanteUrl: comprobante.uploadedUrl,
            gpsCoords,
        });
        finalLink = buildFinalWaLink(serverWaLink, finalMessage);
    }

    const handleFinalizar = () => {
        if (!isReady || !finalLink) return;

        window.open(finalLink, "_blank", "noopener,noreferrer");
        setFinalizado(true);

        setTimeout(() => {
            clearCart();
            router.push("/");
        }, 2000);
    };

    const handleCopyLink = () => {
        if (!finalLink) return;
        navigator.clipboard.writeText(finalLink);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
    };

    return (
        <div className="flex flex-col h-full bg-[#F8EFE6]/30">
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center gap-3 bg-white px-5 py-4 border-b border-black/[0.06]">
                <button
                    type="button"
                    onClick={onVolver}
                    className="w-8 h-8 rounded-full bg-[#FAF5F2] flex items-center justify-center cursor-pointer active:scale-95 transition-all"
                    aria-label="Volver"
                >
                    <ChevronLeft className="w-[18px] h-[18px] text-[#3C1A1A]" strokeWidth={2.5} />
                </button>
                <h1 className="text-[18px] font-medium text-[#1A0A0A]">
                    Pago Móvil
                </h1>
            </div>

            <div className="px-4 pb-32 pt-4">
                {/* Card Datos */}
                <div className="bg-white rounded-[16px] border border-black/[0.06] overflow-hidden mb-6">
                    <div className="bg-[#FAF5F2] px-4 py-3 border-b border-black/[0.06]">
                        <h2 className="text-[13px] font-medium tracking-[0.06em] text-[#9A6A5A] uppercase flex items-center gap-2">
                            💳 Datos para el Pago
                        </h2>
                    </div>

                    <div className="p-4 space-y-3">
                        <CopyRow label="Banco" value={bankDetails.bankName} />
                        <CopyRow label="Teléfono" value={bankDetails.accountPhone} />
                        <CopyRow label="Cédula/RIF" value={bankDetails.accountRif} />

                        <div className="h-[1px] bg-black/[0.06] my-4" />

                        <div className="text-[12px] text-[#9A6A5A] font-medium mb-2">
                            Monto exacto a transferir:
                        </div>
                        <div className="bg-[#7B2D2D] text-white rounded-xl p-3 text-center flex flex-col items-center justify-center shadow-sm">
                            <span className="text-[18px] font-bold tracking-tight">{formatBs(totalBsCents)}</span>
                            <span className="text-[12px] opacity-80 mt-0.5">Ref {formatRef(totalUsdCents)}</span>
                        </div>
                    </div>
                </div>

                {/* Zona Upload */}
                <div className="mb-2">
                    <div className="text-[13px] font-medium text-[#1A0A0A] mb-1.5 flex items-center gap-1.5">
                        📸 Adjunta el comprobante
                    </div>
                    <ComprobanteUpload
                        comprobante={comprobante}
                        fileInputRef={fileInputRef}
                        isDragging={isDragging}
                        handleFileSelect={handleFileSelect}
                        handleDrop={handleDrop}
                        handleDragOver={handleDragOver}
                        handleDragLeave={handleDragLeave}
                        retryUpload={retryUpload}
                        clearComprobante={clearComprobante}
                    />
                </div>

                {/* Aviso Pequeño */}
                <div className="text-[11px] text-[#9A6A5A] leading-relaxed flex gap-1.5 mt-4 items-start bg-[#FAF5F2] p-2.5 rounded-lg border border-[#E8DED8]">
                    <span className="text-[13px]">⚠️</span>
                    <span>El restaurante verificará el pago antes de procesar tu pedido.</span>
                </div>
            </div>

            {/* Sticky Footer */}
            <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-black/[0.06] p-4 pb-safe z-20">
                {!finalizado && isReady && (
                    <p className="text-[11px] text-[#9A6A5A] text-center mb-3 animate-pulse">
                        💡 Si ves un diálogo de WhatsApp, selecciona <b>&quot;WhatsApp Messenger&quot;</b>
                    </p>
                )}
                {finalizado ? (
                    <div className="flex flex-col gap-3 animate-in slide-in-from-bottom-2">
                        <div className="text-center mb-1">
                            <div className="text-[18px] mb-1">✅</div>
                            <p className="text-[14px] font-medium text-[#1A0A0A]">¡Listo! Se abrió WhatsApp con tu pedido.</p>
                            <p className="text-[12px] text-[#9A6A5A]">¿No se abrió automáticamente?</p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => window.open(finalLink, "_blank", "noopener,noreferrer")}
                                className="flex-1 py-3 px-4 bg-[#25D366] text-white font-medium rounded-xl flex justify-center items-center gap-2 active:scale-95 transition-all"
                            >
                                <ExternalLink className="w-4 h-4" /> Abrir WhatsApp
                            </button>
                            <button
                                onClick={handleCopyLink}
                                className="py-3 px-4 bg-[#FAF5F2] text-[#7B2D2D] font-medium rounded-xl flex justify-center items-center gap-2 active:scale-95 transition-all border border-[#E8DED8]"
                            >
                                {copiedLink ? <Check className="w-4 h-4" /> : <LinkIcon className="w-4 h-4" />}
                                {copiedLink ? "Copiado" : "Copiar"}
                            </button>
                        </div>
                    </div>
                ) : (
                    <button
                        onClick={handleFinalizar}
                        disabled={!isReady || comprobante?.isUploading}
                        className={`w-full py-4 rounded-xl text-[15px] font-semibold flex items-center justify-center gap-2 transition-all shadow-sm
              ${!comprobante
                                ? "bg-[#FAF5F2] text-[#9A6A5A] cursor-not-allowed border border-[#E8DED8]"
                                : comprobante?.isUploading || comprobante?.uploadError
                                    ? "bg-[#FAF5F2] text-[#9A6A5A] cursor-not-allowed border border-[#E8DED8] opacity-80"
                                    : isReady
                                        ? "bg-[#7B2D2D] text-white active:scale-[0.98] hover:bg-[#6A2525]"
                                        : "bg-[#FAF5F2] text-[#9A6A5A]"
                            }
            `}
                    >
                        {!comprobante && "Sube el comprobante para continuar"}
                        {comprobante?.isUploading && (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin text-[#7B2D2D]" />
                                <span className="text-[#1A0A0A]">Subiendo imagen...</span>
                            </>
                        )}
                        {comprobante?.uploadError && "Error al subir — revisa el comprobante"}
                        {isReady && (
                            <>
                                Finalizar y enviar a WhatsApp
                                <ExternalLink className="w-4 h-4 opacity-80" />
                            </>
                        )}
                    </button>
                )}
            </div>
        </div>
    );
}

// ── Shared Component for Copyable Rows
function CopyRow({ label, value }: { label: string; value: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="flex items-center justify-between">
            <span className="text-[13px] text-[#9A6A5A]">{label}</span>
            <div className="flex items-center gap-2">
                <span className="text-[14px] font-medium text-[#1A0A0A] tracking-wide">{value}</span>
                <button
                    onClick={handleCopy}
                    className="p-1.5 rounded-lg hover:bg-[#FAF5F2] active:bg-[#FBF0EC] text-[#9A6A5A] active:text-[#7B2D2D] transition-colors"
                    title="Copiar"
                    aria-label={`Copiar ${label}`}
                >
                    {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
            </div>
        </div>
    );
}
