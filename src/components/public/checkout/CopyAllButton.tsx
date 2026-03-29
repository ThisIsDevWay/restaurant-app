"use client";

import { useState } from "react";
import { ClipboardCopy, Check } from "lucide-react";
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
        // navigator.clipboard requires a secure context (HTTPS / localhost).
        // On mobile over HTTP it will be undefined — fall back to execCommand.
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
        setTimeout(() => setCopied(false), 2500);
    };

    return (
        <button
            onClick={handleCopyAll}
            className={`mt-3 flex w-full items-center justify-center gap-2 rounded-input py-3 text-sm font-semibold transition-all ${copied
                ? "bg-success/10 text-success border border-success/30"
                : "bg-primary/10 text-primary border border-primary/20 active:scale-[0.98]"
                }`}
        >
            {copied ? (
                <>
                    <Check className="h-4 w-4" />
                    ¡Copiado! — Pega en tu app de banco
                </>
            ) : (
                <>
                    <ClipboardCopy className="h-4 w-4" />
                    Copiar todo para Pago Móvil
                </>
            )}
        </button>
    );
}
