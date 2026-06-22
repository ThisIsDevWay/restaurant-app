"use client";

import { useState } from "react";
import { Loader2, Phone } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReferenceEntryProps {
  orderId: string;
  checkoutToken: string;
  onConfirmed: () => void;
  onError: (message: string) => void;
  onFallbackWhatsApp: () => void;
}

export function ReferenceEntry({
  orderId,
  checkoutToken,
  onConfirmed,
  onError,
  onFallbackWhatsApp,
}: ReferenceEntryProps) {
  const [reference, setReference] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [isTransitioningToWa, setIsTransitioningToWa] = useState(false);

  const MAX_ATTEMPTS = 3;
  const isValidLength = reference.length >= 4 && reference.length <= 20;

  const handleChange = (val: string) => {
    // Only allow digits
    const cleaned = val.replace(/\D/g, "");
    setReference(cleaned);
    setVerifyError(null);
  };

  const handleVerify = async () => {
    if (!isValidLength || isVerifying) return;
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
        setAttempts((prev) => prev + 1);
      }
    } catch {
      setVerifyError("Error de conexión. Intenta de nuevo.");
      setAttempts((prev) => prev + 1);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleFallback = async () => {
    setIsTransitioningToWa(true);
    try {
      await onFallbackWhatsApp();
    } catch {
      setVerifyError("Error al iniciar confirmación por WhatsApp.");
    } finally {
      setIsTransitioningToWa(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="font-sans text-[10px] uppercase tracking-[0.12em] text-text-muted pl-1 mb-2">
          Ingresa la referencia bancaria
        </p>

        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={reference}
          onChange={(e) => handleChange(e.target.value)}
          disabled={isVerifying || isTransitioningToWa}
          placeholder="Mínimo 4 dígitos de la referencia"
          className={cn(
            "w-full h-14 px-5 rounded-[16px] border-2 font-sans text-[18px] font-bold tabular-nums outline-none transition-all duration-150",
            !reference
              ? "bg-surface-section border-border text-text-muted"
              : isValidLength && !verifyError
              ? "bg-[#E8EFE3] border-[#3F6B4A] text-[#3F6B4A]"
              : verifyError
              ? "bg-surface-section border-primary text-primary"
              : "bg-bg-card border-text-main text-text-main",
            "focus:border-primary focus:shadow-[0_0_0_4px_rgba(187,0,5,0.2)] focus:bg-bg-card"
          )}
        />

        {verifyError && (
          <p className="text-center text-[12px] text-primary font-semibold mt-2.5">
            {verifyError}
          </p>
        )}
      </div>

      <button
        onClick={handleVerify}
        disabled={!isValidLength || isVerifying || isTransitioningToWa}
        className={cn(
          "w-full h-14 rounded-full font-semibold text-base transition-all active:scale-[0.98]",
          isValidLength && !isVerifying && !isTransitioningToWa
            ? "bg-primary text-white shadow-elevated"
            : "bg-surface-section text-text-muted cursor-not-allowed"
        )}
      >
        {isVerifying ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Verificando pago...
          </span>
        ) : (
          "Verificar pago automático →"
        )}
      </button>

      {attempts >= MAX_ATTEMPTS && (
        <button
          onClick={handleFallback}
          disabled={isVerifying || isTransitioningToWa}
          className={cn(
            "w-full h-14 rounded-full font-bold text-[14px] uppercase tracking-wider transition-all active:scale-[0.98] border-2 border-[#25D366] text-[#25D366] bg-transparent flex items-center justify-center gap-2",
            isTransitioningToWa && "opacity-75"
          )}
        >
          {isTransitioningToWa ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Cargando WhatsApp...
            </>
          ) : (
            <>
              <Phone className="w-4 h-4" />
              Verificar por WhatsApp manual
            </>
          )}
        </button>
      )}
    </div>
  );
}
