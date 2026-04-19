"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Copy, Check, Loader2, Link as LinkIcon, ExternalLink, User, Home } from "lucide-react";
import type { GpsCoords } from "./CheckoutForm.types";
import { useComprobanteUpload } from "@/hooks/useComprobanteUpload";
import { ComprobanteUpload } from "./ComprobanteUpload";
import { appendComprobanteToMessage, buildFinalWaLink } from "@/lib/utils/build-whatsapp-payload";
import { formatBs, formatRef } from "@/lib/money";
import { useCartStore } from "@/store/cartStore";
import { CopyAllButton } from "./CopyAllButton";
import { cn } from "@/lib/utils";

interface PagoMovilScreenProps {
    orderId: string;
    totalBsCents: number;
    totalUsdCents: number;
    bankDetails: {
        bankName: string;
        bankCode: string;
        accountPhone: string;
        accountRif: string;
    };
    serverPrefilledMessage: string;
    serverWaLink: string;
    gpsCoords: GpsCoords | null;
    deliveryAddress: string;
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
    deliveryAddress,
    onVolver,
}: PagoMovilScreenProps) {
    const router = useRouter();
    const clearCart = useCartStore((s) => s.clearCart);

    // ✅ Forzar scroll al inicio cuando se monta la pantalla de pago
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const { comprobante, isReady, fileInputRef, isDragging, handleFileSelect, handleDrop, handleDragOver, handleDragLeave, retryUpload, clearComprobante } = useComprobanteUpload({ orderId });

    const [finalizado, setFinalizado] = useState(false);
    const [copiedLink, setCopiedLink] = useState(false);
    const [montoCopiado, setMontoCopiado] = useState(false);

    // Derived final link (if ready)
    let finalLink = "";
    if (isReady && comprobante?.uploadedUrl) {
        const finalMessage = appendComprobanteToMessage({
            serverMessage: serverPrefilledMessage,
            comprobanteUrl: comprobante.uploadedUrl,
            gpsCoords,
            deliveryAddress,
        });
        finalLink = buildFinalWaLink(serverWaLink, finalMessage);
    }

    const handleFinalizar = () => {
        if (!isReady || !finalLink) return;

        // Intentar abrir WhatsApp
        window.open(finalLink, "_blank", "noopener,noreferrer");
        
        // Cambiar a estado finalizado para mostrar confirmación y opción de reintento
        setFinalizado(true);
        
        // NO vaciamos el carrito ni redirigimos automáticamente
    };

    const handleConfirmarSalida = () => {
        clearCart();
        router.push("/");
    };

    const handleCopyLink = () => {
        if (!finalLink) return;
        navigator.clipboard.writeText(finalLink);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
    };

    return (
        <div className="flex flex-col h-full bg-[#FAF5F2]">
        <div className="px-5 pb-52 pt-10 max-w-md mx-auto w-full">
                {finalizado ? (
                    <div className="flex flex-col items-center justify-center py-12 animate-in fade-in zoom-in duration-700">
                        <div className="w-24 h-24 bg-[#2A7A4A]/10 rounded-full flex items-center justify-center mb-8">
                            <Check className="w-12 h-12 text-[#2A7A4A]" strokeWidth={3} />
                        </div>
                        
                        <h2 className="text-[28px] font-display font-black text-[#251a07] mb-4 text-center leading-tight">
                            ¡Orden Notificada!
                        </h2>
                        
                        <p className="text-[15px] text-text-muted font-medium leading-relaxed mb-12 text-center max-w-[280px]">
                            Tu comprobante fue procesado con éxito. Ahora abre WhatsApp para finalizar el envío de tu pedido.
                        </p>

                        <div className="w-full space-y-4">
                            <button
                                onClick={() => window.open(finalLink, "_blank", "noopener,noreferrer")}
                                className="w-full h-18 bg-[#25D366] text-white rounded-[24px] text-[16px] font-display font-black shadow-xl shadow-green-500/20 active:scale-[0.97] transition-all flex items-center justify-center gap-3"
                            >
                                <ExternalLink className="w-5 h-5" />
                                Abrir WhatsApp
                            </button>
                            
                            <button
                                onClick={handleConfirmarSalida}
                                className="w-full h-12 text-[#251a07]/50 rounded-xl text-[13px] font-display font-black active:opacity-70 transition-all flex items-center justify-center gap-2"
                            >
                                <Home className="w-4 h-4" />
                                Volver al menú
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Card Datos */}
                <div className="bg-white rounded-[32px] overflow-hidden mb-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-[#7B2D2D]/5">
                    <div className="bg-[#FAF5F2]/50 px-6 py-5 border-b border-border/30">
                        <h2 className="text-[11px] font-display font-black tracking-[0.2em] text-text-muted uppercase flex items-center gap-2.5">
                            <span className="w-2 h-2 rounded-full bg-[#7B2D2D]" />
                            Datos de Pago Móvil
                        </h2>
                    </div>

                    <div className="p-7 space-y-8">
                        {/* ✅ Monto Hero - COPIABLE */}
                        <div 
                            className="text-center mb-4 cursor-pointer group relative"
                            onClick={() => {
                                const rawAmount = (totalBsCents / 100).toFixed(2).replace('.', ',');
                                navigator.clipboard.writeText(rawAmount);
                                setMontoCopiado(true);
                                setTimeout(() => setMontoCopiado(false), 2000);
                            }}
                        >
                            <div className="flex justify-center mb-3">
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#7B2D2D]/5 rounded-full border border-[#7B2D2D]/10">
                                    <Copy className="w-3 h-3 text-[#7B2D2D]" />
                                    <span className="text-[10px] font-display font-black tracking-[0.1em] text-[#7B2D2D] uppercase">
                                        Toca para copiar monto
                                    </span>
                                </div>
                            </div>
                            
                            <div className="relative inline-block px-4">
                                <div className="text-[clamp(32px,10vw,42px)] font-display font-black tracking-tighter text-[#7B2D2D] leading-none mb-4 break-words transition-transform group-active:scale-95 flex items-center justify-center gap-2">
                                    {formatBs(totalBsCents)}
                                </div>
                                {montoCopiado && (
                                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-[#2A7A4A] text-white text-[10px] font-black px-3 py-1.5 rounded-full animate-in fade-in zoom-in slide-in-from-bottom-2 shadow-lg z-10 flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                        ¡Monto Copiado!
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-center">
                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#FAF5F2] rounded-full text-[12px] sm:text-[13px] font-black text-[#251a07]/60 shadow-inner">
                                    <span className="opacity-40 tracking-wider text-[10px] font-black">REF</span> {formatRef(totalUsdCents)}
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-y-2 pt-4 border-t border-dashed border-border/60">
                            <CopyRow label="Banco" value={bankDetails.bankName} />
                            <CopyRow label="Cédula/RIF" value={bankDetails.accountRif} />
                            <CopyRow label="Teléfono" value={bankDetails.accountPhone} />
                        </div>

                        <div className="pt-2">
                            <CopyAllButton
                                bankName={bankDetails.bankName}
                                bankCode={bankDetails.bankCode}
                                phone={bankDetails.accountPhone}
                                rifOrCedula={bankDetails.accountRif}
                                amountBsCents={totalBsCents}
                            />
                        </div>
                    </div>
                </div>

                {/* Zona Upload */}
                <div className="mb-6">
                    <div className="text-[11px] font-display font-black tracking-[0.2em] text-text-muted uppercase mb-5 flex items-center gap-2.5 px-3">
                        <span className="w-2 h-2 rounded-full bg-[#7B2D2D]" />
                        Comprobante de Pago
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

                {/* Aviso */}
                <div className="text-[11px] text-[#251a07]/60 leading-relaxed flex gap-4 mt-10 items-start bg-white p-6 rounded-[24px] border border-[#7B2D2D]/5 shadow-sm italic font-medium">
                    <span className="text-[20px] shrink-0 opacity-80 mt-[-2px]">✍️</span>
                    <span>El restaurante verificará el pago antes de procesar tu pedido. Asegúrate de que la captura sea legible para evitar retrasos.</span>
                </div>
                    </>
                )}
            </div>

            {/* ✅ Sticky Footer */}
            {!finalizado && (
                <div className="fixed bottom-0 left-0 right-0 z-40">
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-xl border-t border-[#7B2D2D]/10" />
                    
                    <div className="relative max-w-md mx-auto px-6 pt-5 pb-10">
                        <div className="flex items-center justify-between px-2 mb-6">
                            <Step number={1} label="Pagar" active={!comprobante} completed={!!comprobante} />
                            <div className={cn("h-[2px] flex-1 mx-4 rounded-full transition-all duration-700", comprobante ? 'bg-[#2A7A4A]' : 'bg-border/30')} />
                            <Step number={2} label="Subir" active={!!comprobante && !isReady} completed={isReady} />
                            <div className={cn("h-[2px] flex-1 mx-4 rounded-full transition-all duration-700", isReady ? 'bg-[#2A7A4A]' : 'bg-border/30')} />
                            <Step number={3} label="Listo" active={isReady} completed={finalizado} />
                        </div>

                        <button
                            onClick={handleFinalizar}
                            disabled={!isReady || comprobante?.isUploading}
                            className={cn(
                                "w-full h-16 rounded-[22px] text-[15px] font-display font-black flex items-center justify-center gap-3 transition-all duration-500 shadow-xl relative overflow-hidden group",
                                isReady && !comprobante?.isUploading
                                    ? "bg-[#7B2D2D] text-white shadow-[#7B2D2D]/20 active:scale-[0.97]"
                                    : "bg-border/30 text-text-muted cursor-not-allowed shadow-none"
                            )}
                        >
                            {isReady && !comprobante?.isUploading && (
                                <div className="absolute inset-0 bg-gradient-to-tr from-[#7B2D2D] to-[#9c3939] opacity-100 group-active:opacity-90" />
                            )}
                            
                            <span className="relative z-10 flex items-center gap-3">
                                {!comprobante && "Adjunta el comprobante"}
                                {comprobante?.isUploading && (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" /> Subiendo...
                                    </>
                                )}
                                {isReady && !comprobante?.isUploading && (
                                    <>
                                        Confirmar Pedido
                                        <ExternalLink className="w-5 h-5 opacity-80" strokeWidth={2.5} />
                                    </>
                                )}
                            </span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function Step({ number, label, active, completed }: { number: number; label: string; active: boolean; completed: boolean }) {
    return (
        <div className="flex items-center gap-2.5">
            <div className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-black transition-all duration-700",
                completed ? 'bg-[#2A7A4A] text-white shadow-lg shadow-[#2A7A4A]/20' : active ? 'bg-[#7B2D2D] text-white shadow-lg shadow-[#7B2D2D]/20' : 'bg-border/40 text-text-muted'
            )}>
                {completed ? '✓' : number}
            </div>
            <span className={cn(
                "text-[10px] font-display font-black uppercase tracking-[0.15em] transition-colors duration-500",
                completed ? 'text-[#2A7A4A]' : active ? 'text-[#7B2D2D]' : 'text-text-muted/50'
            )}>
                {label}
            </span>
        </div>
    );
}

function CopyRow({ label, value }: { label: string; value: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    return (
        <div className="flex flex-col gap-1 group cursor-pointer" onClick={handleCopy}>
            <div className="flex justify-between items-end px-1">
                <span className="text-[10px] font-display font-black uppercase tracking-[0.2em] text-text-muted opacity-60">{label}</span>
                {copied && (
                    <span className="text-[10px] font-black text-[#2A7A4A] animate-in fade-in slide-in-from-right-2 tracking-tight">
                        Copiado
                    </span>
                )}
            </div>
            <div className={cn(
                "flex items-center justify-between px-3.5 py-3 rounded-[20px] border-2 transition-all duration-300",
                copied ? 'border-[#2A7A4A]/30 bg-[#2A7A4A]/5 shadow-sm' : 'border-[#FAF5F2] bg-[#FAF5F2] group-hover:border-border/60 group-hover:bg-white'
            )}>
                <span className={cn(
                    "text-[clamp(14px,4.5vw,17px)] font-bold text-[#251a07] tracking-tight transition-colors break-all pr-2",
                    copied ? 'text-[#2A7A4A]' : ''
                )}>
                    {value}
                </span>
                <div className={cn("shrink-0 transition-colors", copied ? 'text-[#2A7A4A]' : 'text-[#7B2D2D]/50 group-hover:text-[#7B2D2D]')}>
                    {copied ? <Check className="w-4 h-4" strokeWidth={3} /> : <Copy className="w-4 h-4" />}
                </div>
            </div>
        </div>
    );
}
