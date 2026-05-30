"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReferenceEntryProps {
  orderId: string;
  checkoutToken: string;
  onConfirmed: () => void;
  onError: (message: string) => void;
}

export function ReferenceEntry({
  orderId,
  checkoutToken,
  onConfirmed,
  onError,
}: ReferenceEntryProps) {
  const [digits, setDigits] = useState<string[]>(["", "", "", ""]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [allValid, setAllValid] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([null, null, null, null]);

  const reference = digits.join("");
  const isComplete = digits.every((d) => d.length === 1);

  useEffect(() => {
    setAllValid(isComplete);
  }, [isComplete]);

  const handleDigitChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);
    setVerifyError(null);

    if (digit && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      const newDigits = [...digits];
      newDigits[index - 1] = "";
      setDigits(newDigits);
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
    if (pasted.length === 4) {
      setDigits(pasted.split(""));
    }
  };

  const handleVerify = async () => {
    if (!isComplete) return;
    setIsVerifying(true);
    setVerifyError(null);

    try {
      const res = await fetch("/api/payment-confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, reference, checkoutToken }),
      });

      const data = await res.json();

      if (data.success) {
        onConfirmed();
      } else {
        const msg = data.message || "No se pudo verificar el pago";
        setVerifyError(msg);
        onError(msg);
      }
    } catch {
      setVerifyError("Error de conexión. Intenta de nuevo.");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="font-sans text-[10px] uppercase tracking-[0.12em] text-text-muted pl-1 mb-3">
          Últimos 4 dígitos de la referencia
        </p>

        <div className="flex gap-2.5 justify-center" onPaste={handlePaste}>
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              value={digit}
              maxLength={1}
              onChange={(e) => handleDigitChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              disabled={isVerifying}
              className={cn(
                "w-[56px] h-[64px] rounded-[14px] border-2 text-center font-sans text-[28px] font-bold tabular-nums outline-none transition-all duration-150",
                !digit
                  ? "bg-surface-section border-border text-text-muted"
                  : allValid && !verifyError
                  ? "bg-[#E8EFE3] border-[#3F6B4A] text-[#3F6B4A]"
                  : verifyError
                  ? "bg-surface-section border-primary text-primary"
                  : "bg-bg-card border-text-main text-text-main",
                "focus:border-primary focus:shadow-[0_0_0_4px_rgba(187,0,5,0.2)] focus:bg-bg-card"
              )}
            />
          ))}
        </div>

        {/* Placeholder dots for empty cells */}
        {digits.every((d) => !d) && (
          <p className="text-center text-[11px] text-text-muted mt-2">
            Ingresa los 4 dígitos de la referencia
          </p>
        )}

        {verifyError && (
          <p className="text-center text-[12px] text-primary font-semibold mt-2">
            {verifyError}
          </p>
        )}
      </div>

      <button
        onClick={handleVerify}
        disabled={!isComplete || isVerifying}
        className={cn(
          "w-full h-14 rounded-full font-semibold text-base transition-all active:scale-[0.98]",
          isComplete && !isVerifying
            ? "bg-primary text-white shadow-elevated"
            : "bg-surface-section text-text-muted cursor-not-allowed"
        )}
      >
        {isVerifying ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Verificando...
          </span>
        ) : (
          "Confirmar pago →"
        )}
      </button>
    </div>
  );
}
