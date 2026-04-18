"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

interface CopyButtonProps {
    value: string;
    successDurationMs?: number;
    className?: string;
}

/**
 * Shared copy-to-clipboard button for checkout screens.
 * Includes graceful fallback for browsers that block navigator.clipboard (e.g. iOS Safari in PWA iframes).
 */
export function CopyButton({ value, successDurationMs = 2000, className }: CopyButtonProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(value);
            } else {
                throw new Error("Clipboard API unavailable");
            }
        } catch {
            // Fallback for Safari/secure-context restrictions
            const ta = document.createElement("textarea");
            ta.value = value;
            ta.style.position = "fixed";
            ta.style.opacity = "0";
            document.body.appendChild(ta);
            ta.select();
            document.execCommand("copy");
            document.body.removeChild(ta);
        }
        setCopied(true);
        setTimeout(() => setCopied(false), successDurationMs);
    };

    return (
        <button
            type="button"
            onClick={handleCopy}
            className={`flex h-9 w-9 items-center justify-center rounded-input transition-colors ${copied ? "bg-success/10 text-success" : "bg-bg-image text-text-muted"
                } ${className ?? ""}`}
            aria-label="Copiar"
        >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </button>
    );
}
