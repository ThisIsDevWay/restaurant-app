"use client";

import { useState } from "react";
import { ClipboardCopy, Check, ArrowRight } from "lucide-react";
import { buildPagoMovilClipboard } from "@/lib/clipboard-pago-movil";

interface CopyAllButtonProps {
    bankName: string;
    bankCode: string;
    phone: string;
    rifOrCedula: string;
    amountBsCents: number;
}

export function CopyAllButton({
    bankName,
    bankCode,
    phone,
    rifOrCedula,
    amountBsCents,
}: CopyAllButtonProps) {
    const [copied, setCopied] = useState(false);

    const handleCopyAll = async () => {
        const text = buildPagoMovilClipboard({
            bankName,
            bankCode,
            phone,
            rifOrCedula,
            amountBsCents,
        });
        
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
        } else {
            const ta = document.createElement("textarea");
            ta.value = text;
            ta.style.cssText = "position:fixed;top:-9999px;left:-9999px;opacity:0";
            document.body.appendChild(ta);
            ta.focus();
            ta.select();
            document.execCommand("copy");
            document.body.removeChild(ta);
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 3000); // ✅ M2: 3 seconds
    };

    return (
        <button
            onClick={handleCopyAll}
            className={`relative mt-4 flex w-full items-center justify-center gap-2.5 rounded-2xl py-4 text-[14px] font-display font-black transition-all shadow-md group overflow-hidden ${
                copied
                    ? "bg-success text-white shadow-success/20"
                    : "bg-primary text-white active:scale-[0.98] shadow-primary/20"
            }`}
        >
            {/* Signature Gradient Overlay */}
            {!copied && (
                <div className="absolute inset-0 bg-primary-gradient opacity-100 pointer-events-none" />
            )}

            <span className="relative z-10 flex items-center justify-center gap-2.5">
                {copied ? (
                    <>
                        <Check className="h-5 w-5 animate-in zoom-in" strokeWidth={3} />
                        <span>¡Copiado! Abre tu app bancaria</span>
                        <ArrowRight className="h-4 w-4 animate-in slide-in-from-left-2" />
                    </>
                ) : (
                    <>
                        <ClipboardCopy className="h-5 w-5 group-hover:scale-110 transition-transform" />
                        Copiar todo para Pago Móvil
                    </>
                )}
            </span>
        </button>
    );
}
