"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { formatBs } from "@/lib/money";
import { Copy, Check, Loader2, Clock, ArrowLeft, ClipboardCopy } from "lucide-react";
import type { CartItem } from "@/store/cartStore";
import type { BankDetails } from "@/lib/payment-providers/types";
import { buildPagoMovilClipboard } from "@/lib/clipboard-pago-movil";
import { CopyAllButton } from "./CopyAllButton";
import { CopyButton } from "./CopyButton";

interface ReferenceEntryProps {
  orderId: string;
  expiresAt: string;
  totalBsCents: number;
  bankDetails: BankDetails;
  items: CartItem[];
  onPaid: () => void;
  onError: (message: string) => void;
}



export function ReferenceEntry({
  orderId,
  expiresAt,
  totalBsCents,
  bankDetails,
  items,
  onPaid,
  onError,
}: ReferenceEntryProps) {
  const router = useRouter();
  const [reference, setReference] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);

  // Countdown
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)),
  );

  useEffect(() => {
    const interval = setInterval(() => {
      const diff = Math.floor(
        (new Date(expiresAt).getTime() - Date.now()) / 1000,
      );
      setSecondsLeft(Math.max(0, diff));
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  useEffect(() => {
    if (secondsLeft === 0) router.push("/checkout/expired");
  }, [secondsLeft, router]);

  const handleVerify = async () => {
    if (reference.trim().length < 8) {
      setVerifyError("La referencia debe tener al menos 8 caracteres");
      return;
    }

    setIsVerifying(true);
    setVerifyError(null);

    try {
      const res = await fetch("/api/payment-confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, reference: reference.trim() }),
      });

      const data = await res.json();

      if (data.success) {
        onPaid();
      } else {
        setVerifyError(data.message || "No se pudo verificar el pago");
      }
    } catch {
      setVerifyError("Error de conexión. Intenta de nuevo.");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="px-4 pb-8 bg-bg-app min-h-screen">
      {/* Back button */}
      <button
        onClick={() => setShowLeaveDialog(true)}
        className="mt-6 flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-section text-[13px] font-bold text-text-main border border-border/50 active:scale-95 transition-all"
      >
        <ArrowLeft size={16} />
        Volver
      </button>

      {/* Hero amount */}
      <div className="pt-8 pb-6 text-center animate-in fade-in slide-in-from-top-4 duration-500">
        <p className="text-[11px] font-display font-bold tracking-[0.1em] text-text-muted uppercase mb-1">Monto de la transferencia</p>
        <p className="text-[42px] font-display font-black text-text-main leading-tight">
          {formatBs(totalBsCents)}
        </p>
      </div>

      {/* Bank details */}
      <div className="mt-2 rounded-2xl border border-border bg-bg-card p-5 shadow-sm">
        {bankDetails.transferAccountNumber ? (
          <>
            <p className="mb-4 text-[11px] font-display font-bold tracking-[0.08em] text-text-muted uppercase">
              🏦 Datos para Transferencia
            </p>

            <div className="space-y-4">
              <div className="flex items-center justify-between py-1 border-b border-border/40 pb-3">
                <div>
                  <p className="text-[11px] text-text-muted/60 uppercase font-bold tracking-wider mb-0.5">Banco</p>
                  <p className="text-[14px] font-bold text-text-main">
                    {bankDetails.transferBankName || bankDetails.bankName}
                  </p>
                </div>
                <CopyButton value={bankDetails.transferBankName || bankDetails.bankName} />
              </div>

              <div className="flex items-center justify-between py-1 border-b border-border/40 pb-3">
                <div>
                  <p className="text-[11px] text-text-muted/60 uppercase font-bold tracking-wider mb-0.5">Número de Cuenta</p>
                  <p className="text-[14px] font-bold text-text-main tracking-wide">
                    {bankDetails.transferAccountNumber}
                  </p>
                </div>
                <CopyButton value={bankDetails.transferAccountNumber!} />
              </div>

              <div className="flex items-center justify-between py-1 border-b border-border/40 pb-3">
                <div>
                  <p className="text-[11px] text-text-muted/60 uppercase font-bold tracking-wider mb-0.5">Titular</p>
                  <p className="text-[14px] font-bold text-text-main">
                    {bankDetails.transferAccountName}
                  </p>
                </div>
                <CopyButton value={bankDetails.transferAccountName!} />
              </div>

              <div className="flex items-center justify-between py-1">
                <div>
                  <p className="text-[11px] text-text-muted/60 uppercase font-bold tracking-wider mb-0.5">RIF / Cédula</p>
                  <p className="text-[14px] font-bold text-text-main tracking-wide">
                    {bankDetails.transferAccountRif}
                  </p>
                </div>
                <CopyButton value={bankDetails.transferAccountRif!} />
              </div>
            </div>
          </>
        ) : (
          <>
            <p className="mb-4 text-[11px] font-display font-bold tracking-[0.08em] text-text-muted uppercase">
              💳 Datos para Pago Móvil
            </p>

            <div className="space-y-4">
              <div className="flex items-center justify-between py-1 border-b border-border/40 pb-3">
                <div>
                  <p className="text-[11px] text-text-muted/60 uppercase font-bold tracking-wider mb-0.5">Banco</p>
                  <p className="text-[14px] font-bold text-text-main">
                    {bankDetails.bankName} <span className="text-text-muted/70 font-medium">({bankDetails.bankCode})</span>
                  </p>
                </div>
                <CopyButton value={`${bankDetails.bankName} (${bankDetails.bankCode})`} />
              </div>

              <div className="flex items-center justify-between py-1 border-b border-border/40 pb-3">
                <div>
                  <p className="text-[11px] text-text-muted/60 uppercase font-bold tracking-wider mb-0.5">Teléfono</p>
                  <p className="text-[14px] font-bold text-text-main tracking-wide">
                    {bankDetails.accountPhone}
                  </p>
                </div>
                <CopyButton value={bankDetails.accountPhone} />
              </div>

              <div className="flex items-center justify-between py-1">
                <div>
                  <p className="text-[11px] text-text-muted/60 uppercase font-bold tracking-wider mb-0.5">RIF / Cédula</p>
                  <p className="text-[14px] font-bold text-text-main tracking-wide">
                    {bankDetails.accountRif}
                  </p>
                </div>
                <CopyButton value={bankDetails.accountRif} />
              </div>
            </div>

            {/* Copy all for Pago Móvil */}
            {!bankDetails.transferAccountNumber && (
              <div className="mt-5 border-t border-border pt-2">
                <CopyAllButton
                  bankName={bankDetails.bankName!}
                  bankCode={bankDetails.bankCode!}
                  phone={bankDetails.accountPhone!}
                  rifOrCedula={bankDetails.accountRif!}
                  amountBsCents={totalBsCents}
                />
              </div>
            )}
          </>
        )}
      </div>


      <div className="mt-6 rounded-2xl border border-border bg-bg-card p-6 shadow-sm">
        <p className="mb-4 text-[11px] font-display font-bold tracking-[0.08em] text-text-muted uppercase">
          Ingresa la referencia del pago
        </p>
        <input
          type="text"
          inputMode="numeric"
          value={reference}
          onChange={(e) => {
            setReference(e.target.value);
            setVerifyError(null);
          }}
          placeholder="Ej: 01234567"
          className={`w-full rounded-xl border px-4 py-4 text-[15px] font-bold outline-none transition-all placeholder:font-medium placeholder:text-text-muted/40 ${verifyError ? "border-error bg-error/5" : "border-border bg-surface-section focus:border-primary focus:bg-primary/5"
            }`}
          disabled={isVerifying}
        />
        {verifyError && (
          <p className="mt-2 text-[12px] font-bold text-error flex items-center gap-1">
            <span className="text-[14px]">⚠️</span> {verifyError}
          </p>
        )}
        <button
          onClick={handleVerify}
          disabled={isVerifying || reference.trim().length < 8}
          className="mt-4 w-full rounded-xl bg-primary py-4 text-[15px] font-display font-bold text-white shadow-lg shadow-primary/20 disabled:opacity-60 transition-all active:scale-[0.98]"
        >
          {isVerifying ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Verificando...
            </span>
          ) : (
            "Verificar pago"
          )}
        </button>
      </div>

      {/* Items summary */}
      <div className="mt-4 rounded-2xl border border-border bg-bg-card p-6 shadow-sm">
        <p className="mb-4 text-[11px] font-display font-bold tracking-[0.08em] text-text-muted uppercase">📦 Resumen del pedido</p>
        <div className="space-y-1">
          {items.map((item, idx) => (
            <div key={idx} className="flex justify-between items-center py-2 border-b border-border/30 last:border-b-0">
              <span className="text-[14px] font-medium text-text-main">
                {item.quantity}× {item.name}
              </span>
              <span className="text-[14px] font-bold text-text-main">
                {formatBs(item.itemTotalBsCents)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Expiration countdown */}
      {secondsLeft > 0 && (
        <div className={`mt-8 flex items-center justify-center gap-2 text-[13px] py-3 px-4 rounded-xl border ${
          secondsLeft < 300 
            ? "bg-warning/5 border-warning/20 text-warning font-bold animate-pulse" 
            : "bg-surface-section border-border text-text-muted font-medium"
          }`}>
          <Clock size={16} />
          {secondsLeft < 300
            ? `¡Tu orden expira pronto! ${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}`
            : `Esta orden expira en ${Math.floor(secondsLeft / 60)} minutos`}
        </div>
      )}

      {/* Leave confirmation dialog */}
      {showLeaveDialog && (
        <div
          className="fixed inset-0 z-[200] flex items-end justify-center p-4 bg-black/40 backdrop-blur-[2px]"
          onClick={() => setShowLeaveDialog(false)}
        >
          <div
            className="flex w-full max-w-sm flex-col gap-5 rounded-[28px] bg-bg-card p-7 shadow-2xl animate-in slide-in-from-bottom-8 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col gap-2 text-center">
              <p className="text-[18px] font-display font-black text-text-main">
                ¿Seguro que deseas salir?
              </p>
              <p className="text-[14px] text-text-muted leading-relaxed">
                Tu pedido seguirá activo por{" "}
                <b className="text-text-main">{Math.ceil(secondsLeft / 60)} min</b>. No pierdas tu reserva si ya transferiste.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => setShowLeaveDialog(false)}
                className="flex h-[56px] items-center justify-center rounded-xl bg-primary text-[15px] font-display font-bold text-white shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
              >
                Continuar con el pago
              </button>
              <button
                onClick={() => router.push("/")}
                className="flex h-[56px] items-center justify-center rounded-xl bg-surface-section border border-border text-[15px] font-display font-bold text-text-main transition-all active:scale-[0.98]"
              >
                Volver al menú
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
