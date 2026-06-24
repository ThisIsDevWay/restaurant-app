"use client";

import { useState, useRef } from "react";
import { Loader2, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { useKeyboardOpen } from "@/hooks/useKeyboardOpen";

interface ReferenceEntryProps {
  orderId: string;
  checkoutToken: string;
  onConfirmed: () => void;
  onError: (message: string) => void;
  onFallbackWhatsApp: () => void;
  activeProviderId?: string;
}

export function ReferenceEntry({
  orderId,
  checkoutToken,
  onConfirmed,
  onError,
  onFallbackWhatsApp,
  activeProviderId,
}: ReferenceEntryProps) {
  const [reference, setReference] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [isTransitioningToWa, setIsTransitioningToWa] = useState(false);

  const { isKeyboardOpen } = useKeyboardOpen();
  const inputRef = useRef<HTMLInputElement>(null);

  const MAX_ATTEMPTS = 3;
  const minLengthRequired = 4;
  const isValidLength = reference.length >= minLengthRequired && reference.length <= 20;

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

      if (res.status === 429) {
        const msg = "Demasiados intentos. Por favor espera un momento antes de volver a verificar.";
        setVerifyError(msg);
        onError(msg);
        return;
      }

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
          ref={inputRef}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          enterKeyHint="go"
          value={reference}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => {
            setTimeout(() => {
              inputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
            }, 150);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && isValidLength && !isVerifying) {
              e.preventDefault();
              handleVerify();
            }
          }}
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

      {/* Simple help line in scrollable content */}
      {(activeProviderId === "local_notifications" || activeProviderId === "pabilo_notifications") && (
        <p className="text-center font-sans text-[11px] text-text-muted/85 mt-2 leading-normal px-2 select-none animate-in fade-in duration-300">
          💡 Si ya transferiste, mantén abierta esta pantalla. Se actualizará sola.
        </p>
      )}

      {/* Botón contextual inline cuando el teclado está abierto */}
      {isKeyboardOpen && (
        <div className="pt-2 flex flex-col gap-2 animate-in fade-in duration-150">
          <button
            onClick={handleVerify}
            disabled={!isValidLength || isVerifying || isTransitioningToWa}
            className={cn(
              "w-full h-13 rounded-full font-semibold text-base shadow-elevated transition-all duration-150 active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer",
              isValidLength && !isVerifying && !isTransitioningToWa
                ? "bg-primary text-white"
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
                "w-full h-11 rounded-full font-bold text-[12px] uppercase tracking-wider transition-all duration-150 active:scale-[0.98] border border-[#25D366] text-[#25D366] bg-transparent flex items-center justify-center gap-2 cursor-pointer",
                isTransitioningToWa && "opacity-75"
              )}
            >
              {isTransitioningToWa ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Cargando WhatsApp...
                </>
              ) : (
                <>
                  <Phone className="w-3.5 h-3.5" />
                  Verificar por WhatsApp manual
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Sticky/Fixed footer for the verification and WhatsApp fallback buttons (solo si el teclado está cerrado) */}
      {!isKeyboardOpen && (
        <div className="fixed bottom-0 inset-x-0 z-30 px-5 pt-3.5 pb-[calc(env(safe-area-inset-bottom)+16px)] bg-bg-app/95 backdrop-blur-xl border-t border-border flex flex-col gap-2">
          <button
            onClick={handleVerify}
            disabled={!isValidLength || isVerifying || isTransitioningToWa}
            className={cn(
              "w-full h-14 rounded-full font-semibold text-base shadow-elevated transition-all active:scale-[0.98] cursor-pointer",
              isValidLength && !isVerifying && !isTransitioningToWa
                ? "bg-primary text-white"
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
                "w-full h-11 rounded-full font-bold text-[12px] uppercase tracking-wider transition-all active:scale-[0.98] border border-[#25D366] text-[#25D366] bg-transparent flex items-center justify-center gap-2 cursor-pointer",
                isTransitioningToWa && "opacity-75"
              )}
            >
              {isTransitioningToWa ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Cargando WhatsApp...
                </>
              ) : (
                <>
                  <Phone className="w-3.5 h-3.5" />
                  Verificar por WhatsApp manual
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
