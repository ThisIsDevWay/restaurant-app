"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { formatBs } from "@/lib/money";
import { Copy, Check, Loader2, Clock, ArrowLeft } from "lucide-react";
import type { CartItem } from "@/store/cartStore";

interface ReferenceEntryProps {
  orderId: string;
  expiresAt: string;
  totalBsCents: number;
  bankDetails: {
    bankName: string;
    bankCode: string;
    accountPhone: string;
    accountRif: string;
  };
  items: CartItem[];
  onPaid: () => void;
  onError: (message: string) => void;
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className={`flex h-9 w-9 items-center justify-center rounded-input transition-colors ${
        copied ? "bg-success/10 text-success" : "bg-bg-image text-text-muted"
      }`}
      aria-label="Copiar"
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
    </button>
  );
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
    <div className="px-4 pb-8">
      {/* Back button */}
      <button
        onClick={() => setShowLeaveDialog(true)}
        className="mt-4 flex items-center gap-1 text-sm text-text-muted"
      >
        <ArrowLeft size={16} />
        Volver
      </button>

      {/* Hero amount */}
      <div className="mt-6 text-center">
        <p className="text-xs text-text-muted">Transfiere</p>
        <p className="mt-2 text-[36px] font-extrabold text-primary">
          {formatBs(totalBsCents)}
        </p>
      </div>

      {/* Bank details */}
      <div className="mt-6 rounded-card border border-border bg-white p-4 shadow-card">
        <p className="mb-3 text-sm font-semibold text-text-main">
          Datos para Pago Móvil
        </p>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-text-muted">Banco</p>
              <p className="text-sm font-semibold text-text-main">
                {bankDetails.bankName} ({bankDetails.bankCode})
              </p>
            </div>
            <CopyButton value={`${bankDetails.bankName} (${bankDetails.bankCode})`} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-text-muted">Teléfono</p>
              <p className="text-sm font-semibold text-text-main">
                {bankDetails.accountPhone}
              </p>
            </div>
            <CopyButton value={bankDetails.accountPhone} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-text-muted">RIF / Cédula</p>
              <p className="text-sm font-semibold text-text-main">
                {bankDetails.accountRif}
              </p>
            </div>
            <CopyButton value={bankDetails.accountRif} />
          </div>
        </div>
      </div>

      {/* Reference input */}
      <div className="mt-6 rounded-card border border-border bg-white p-4 shadow-card">
        <p className="mb-3 text-sm font-semibold text-text-main">
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
          className={`w-full rounded-input border px-4 py-3 text-sm outline-none transition-colors ${
            verifyError ? "border-error" : "border-border focus:border-primary"
          }`}
          disabled={isVerifying}
        />
        {verifyError && (
          <p className="mt-2 text-xs text-error">{verifyError}</p>
        )}
        <button
          onClick={handleVerify}
          disabled={isVerifying || reference.trim().length < 8}
          className="mt-3 w-full rounded-input bg-primary py-3 text-sm font-semibold text-white disabled:opacity-60"
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
      <div className="mt-4 rounded-card border border-border bg-white p-4 shadow-card">
        <p className="mb-2 text-sm font-semibold text-text-main">Resumen</p>
        {items.map((item, idx) => (
          <div key={idx} className="border-b border-border py-2 last:border-b-0">
            <p className="text-sm text-text-main">
              {item.quantity}× {item.name}
            </p>
            <p className="text-sm font-semibold text-price-green">
              {formatBs(item.itemTotalBsCents)}
            </p>
          </div>
        ))}
      </div>

      {/* Expiration countdown */}
      {secondsLeft > 0 && (
        <div className={`mt-4 flex items-center justify-center gap-1.5 text-sm ${
          secondsLeft < 300 ? "text-amber font-semibold" : "text-text-muted"
        }`}>
          <Clock size={14} />
          {secondsLeft < 300
            ? `¡Apresúrate! ${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}`
            : `Expira en ${Math.floor(secondsLeft / 60)} min`}
        </div>
      )}

      {/* Leave confirmation dialog */}
      {showLeaveDialog && (
        <div
          className="fixed inset-0 z-[200] flex items-end justify-center p-4"
          style={{ background: "rgba(28,20,16,0.5)" }}
          onClick={() => setShowLeaveDialog(false)}
        >
          <div
            className="flex w-full max-w-sm flex-col gap-4 rounded-modal bg-white p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col gap-1 text-center">
              <p className="text-[15px] font-semibold text-text-main">
                ¿Salir del pago?
              </p>
              <p className="text-[13px] text-text-muted">
                Tu pedido seguirá activo por{" "}
                {Math.ceil(secondsLeft / 60)} min si ya realizaste la
                transferencia.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setShowLeaveDialog(false)}
                className="flex h-[48px] items-center justify-center rounded-input bg-primary text-[15px] font-semibold text-white"
              >
                Continuar con el pago
              </button>
              <button
                onClick={() => router.push("/")}
                className="flex h-[48px] items-center justify-center rounded-input border border-border text-[15px] font-semibold text-text-main"
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
