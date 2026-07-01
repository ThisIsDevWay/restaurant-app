"use client";

import { useState, useRef, useEffect } from "react";
import { Loader2, Phone, AlertTriangle, AlertCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useKeyboardOpen } from "@/hooks/useKeyboardOpen";

interface ReferenceEntryProps {
  orderId: string;
  checkoutToken: string;
  onConfirmed: () => void;
  onExpired?: () => void;
  onError: (message: string) => void;
  onFallbackWhatsApp: () => void;
  activeProviderId?: string;
}

const COOLDOWN_DURATION = 45;

export function ReferenceEntry({
  orderId,
  checkoutToken,
  onConfirmed,
  onExpired,
  onError,
  onFallbackWhatsApp,
  activeProviderId,
}: ReferenceEntryProps) {
  const [reference, setReference] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [technicalError, setTechnicalError] = useState<boolean | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [isTransitioningToWa, setIsTransitioningToWa] = useState(false);

  // Cooldown & auto-verification state
  const [cooldown, setCooldown] = useState(0);
  const [lastFailedReference, setLastFailedReference] = useState<string | null>(null);

  const { isKeyboardOpen } = useKeyboardOpen();
  const inputRef = useRef<HTMLInputElement>(null);

  const minLengthRequired = 4;
  const isValidLength = reference.length >= minLengthRequired && reference.length <= 20;

  // Cooldown countdown tick
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  // Debounced auto-verification: triggers 1000ms after user pauses typing
  useEffect(() => {
    if (reference.length < minLengthRequired) return;
    if (isVerifying || isTransitioningToWa) return;
    if (cooldown > 0) return;
    if (reference === lastFailedReference) return;

    const timer = setTimeout(() => {
      handleVerify();
    }, 1000);

    return () => clearTimeout(timer);
  }, [reference, cooldown, isVerifying, isTransitioningToWa, lastFailedReference]);

  const handleChange = (val: string) => {
    // Only allow digits
    const cleaned = val.replace(/\D/g, "");
    if (cleaned === reference) return;

    setReference(cleaned);
    setVerifyError(null);
    setTechnicalError(null);
    // Editing clears cooldown and last failed ref so user can immediately verify a new value
    setCooldown(0);
    setLastFailedReference(null);
  };

  const handleVerify = async () => {
    if (!isValidLength || isVerifying || cooldown > 0) return;
    setIsVerifying(true);
    setVerifyError(null);
    setTechnicalError(null);

    try {
      const res = await fetch("/api/payment-confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, reference, checkoutToken }),
      });

      if (res.status === 429) {
        const msg = "Demasiados intentos. Por favor espera un momento antes de volver a verificar.";
        setVerifyError(msg);
        setTechnicalError(true);
        onError(msg);
        setCooldown(COOLDOWN_DURATION);
        setLastFailedReference(reference);
        return;
      }

      const data = await res.json();

      if (data.success) {
        onConfirmed();
      } else if (data.reason === "expired") {
        const msg = data.message || "Tu pedido ha expirado.";
        setVerifyError(msg);
        onError(msg);
        setTimeout(() => {
          onExpired?.();
        }, 1500);
      } else {
        const msg = data.message || "No se pudo verificar el pago";
        setVerifyError(msg);
        setTechnicalError(false); // Warning (mismatch/not found)
        onError(msg);
        setAttempts((prev) => prev + 1);
        setCooldown(COOLDOWN_DURATION);
        setLastFailedReference(reference);
      }
    } catch {
      setVerifyError("Error de conexión. Intenta de nuevo.");
      setTechnicalError(true); // Technical issue
      setAttempts((prev) => prev + 1);
      setCooldown(COOLDOWN_DURATION);
      setLastFailedReference(reference);
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
      setTechnicalError(true);
    } finally {
      setIsTransitioningToWa(false);
    }
  };

  // Button text & state derived values
  const getButtonText = () => {
    if (isVerifying) return "Buscando tu pago...";
    if (cooldown > 0) return `⏱ Reintentar en ${cooldown}s`;
    if (attempts > 0) return "Verificar nuevamente";
    return "Verificar pago automático →";
  };

  const isButtonDisabled = !isValidLength || isVerifying || isTransitioningToWa || cooldown > 0;
  const showWhatsAppFallback = attempts >= 2; // Habilitado al segundo intento (después de 1 fallo)

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <p className="font-sans text-[10px] uppercase tracking-[0.12em] text-text-muted pl-1">
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
            if (e.key === "Enter" && !isButtonDisabled) {
              e.preventDefault();
              handleVerify();
            }
          }}
          disabled={isVerifying || isTransitioningToWa || cooldown > 0}
          placeholder="Mínimo 4 dígitos de la referencia"
          className={cn(
            "w-full h-14 px-5 rounded-[16px] border-2 font-sans text-[18px] font-bold tabular-nums outline-none transition-all duration-150",
            !reference
              ? "bg-surface-section border-border text-text-muted"
              : isValidLength && !verifyError
                ? "bg-[#E8EFE3] border-[#3F6B4A] text-[#3F6B4A]"
                : verifyError && technicalError
                  ? "bg-surface-section border-primary text-primary" // Error técnico (rojo)
                  : verifyError && !technicalError
                    ? "bg-surface-section border-amber text-amber" // No encontrado (ámbar)
                    : "bg-bg-card border-text-main text-text-main",
            "focus:border-primary focus:shadow-[0_0_0_4px_rgba(187,0,5,0.2)] focus:bg-bg-card"
          )}
        />

        {/* Dynamic Helpers / Status Banners */}
        <div className="space-y-2.5 animate-in fade-in duration-300">
          {/* State: Verifying */}
          {isVerifying && (
            <div className="flex items-center justify-center gap-2.5 py-3 px-4 bg-surface-section border border-border/40 rounded-[16px] text-text-muted font-sans text-[13px] font-semibold select-none">
              <Loader2 className="w-4.5 h-4.5 animate-spin text-[#3F6B4A]" />
              <span>Buscando tu pago en el banco...</span>
            </div>
          )}

          {/* State: Technical Error (Danger / Red) */}
          {verifyError && technicalError && (
            <div className="flex items-start gap-3 p-4 bg-primary/10 border border-primary/20 rounded-[16px] text-primary font-sans">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="text-[13px] font-bold">Error de conexión</p>
                <p className="text-[12px] opacity-90 mt-0.5 leading-snug">{verifyError}</p>
              </div>
            </div>
          )}

          {/* State: Not Found / Pending Reconciliation (Warning / Amber) */}
          {verifyError && !technicalError && (
            <div className="flex items-start gap-3 p-4 bg-amber/10 border border-amber/20 rounded-[16px] text-amber font-sans">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="text-[13px] font-bold">No encontramos tu pago todavía</p>
                <p className="text-[12px] opacity-90 mt-0.5 leading-snug">
                  {verifyError}
                </p>
              </div>
            </div>
          )}

          {/* State: Initial Helper */}
          {!isVerifying && !verifyError && (
            <p className="font-sans text-[11px] text-text-muted/80 pl-1 leading-normal">
              💡 Ingresa los últimos 4 dígitos de la referencia de tu pago móvil para confirmar.
            </p>
          )}
        </div>
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
            disabled={isButtonDisabled}
            className={cn(
              "w-full h-13 rounded-full font-semibold text-base shadow-elevated transition-all duration-150 active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer",
              !isButtonDisabled
                ? "bg-primary text-white"
                : "bg-surface-section text-text-muted cursor-not-allowed"
            )}
          >
            {isVerifying ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                {getButtonText()}
              </span>
            ) : (
              getButtonText()
            )}
          </button>

          {showWhatsAppFallback && (
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
            disabled={isButtonDisabled}
            className={cn(
              "w-full h-14 rounded-full font-semibold text-base shadow-elevated transition-all active:scale-[0.98] cursor-pointer",
              !isButtonDisabled
                ? "bg-primary text-white"
                : "bg-surface-section text-text-muted cursor-not-allowed"
            )}
          >
            {isVerifying ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                {getButtonText()}
              </span>
            ) : (
              getButtonText()
            )}
          </button>

          {showWhatsAppFallback && (
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

