"use client";

import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface CopyButtonProps {
  value: string;
  successDurationMs?: number;
  className?: string;
}

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
      aria-label="Copiar"
      className={cn(
        "w-9 h-9 rounded-[10px] flex items-center justify-center transition-colors shrink-0",
        copied
          ? "bg-[#E8EFE3] text-[#3F6B4A]"
          : "bg-surface-section text-text-muted active:bg-border/60",
        className
      )}
    >
      {copied ? (
        <Check className="w-4 h-4" strokeWidth={2.5} />
      ) : (
        <Copy className="w-4 h-4" />
      )}
    </button>
  );
}

/* CopyRow — full-width clickable row with label, value, and copy feedback */
interface CopyRowProps {
  label: string;
  value: string;
}

export function CopyRow({ label, value }: CopyRowProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        throw new Error("unavailable");
      }
    } catch {
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
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <button
      onClick={handleCopy}
      className={cn(
        "w-full flex items-center justify-between p-3.5 rounded-[12px] border transition-colors text-left cursor-pointer",
        copied
          ? "bg-[#E8EFE3] border-[rgba(63,107,74,0.25)]"
          : "bg-bg-card border-border active:bg-surface-section"
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="font-sans text-[10px] uppercase tracking-[0.1em] text-text-muted mb-0.5">
          {label}
        </p>
        <p
          className={cn(
            "font-sans text-[14px] font-semibold truncate",
            copied ? "text-[#3F6B4A]" : "text-text-main"
          )}
        >
          {value}
        </p>
      </div>
      <div
        className={cn(
          "w-8 h-8 rounded-[8px] flex items-center justify-center ml-3 shrink-0 transition-colors",
          copied ? "bg-[#3F6B4A]/20 text-[#3F6B4A]" : "bg-surface-section text-text-muted"
        )}
      >
        {copied ? (
          <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
        ) : (
          <Copy className="w-3.5 h-3.5" />
        )}
      </div>
    </button>
  );
}
