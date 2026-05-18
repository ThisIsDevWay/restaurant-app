"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X, Wallet, Hash, CheckCircle2 } from "lucide-react";
import { formatBs, formatRef, usdCentsToBsCents } from "@/lib/money";
import { settleOrderAction } from "@/actions/waiter-order";
import type { WaiterPaymentMethod } from "./OrderForm";

const PAYMENT_METHODS: WaiterPaymentMethod[] = [
  "Efectivo $",
  "Efectivo Bs",
  "Pago Móvil",
  "Punto / PdV",
  "Zelle",
  "Transf.",
  "Binance",
];

const CASH_METHODS: WaiterPaymentMethod[] = ["Efectivo $", "Efectivo Bs"];
const FOREIGN_METHODS: WaiterPaymentMethod[] = ["Efectivo $", "Zelle", "Binance"];

function referencePlaceholder(method: WaiterPaymentMethod): string {
  if (method === "Pago Móvil" || method === "Transf.") return "Últimos 4 dígitos";
  if (method === "Zelle") return "Nº de confirmación";
  if (method === "Binance") return "ID de transacción";
  return "Nº de referencia / lote";
}

interface CobroModalProps {
  order: any;
  settings: Record<string, unknown> | null;
  onClose: () => void;
}

export function CobroModal({ order, settings, onClose }: CobroModalProps) {
  const router = useRouter();
  const [method, setMethod] = useState<WaiterPaymentMethod>(
    PAYMENT_METHODS.includes(order.paymentMethod) ? order.paymentMethod : "Punto / PdV",
  );
  const [reference, setReference] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isCash = CASH_METHODS.includes(method);
  const needsReference = !isCash;

  const rate = Number(order.rateSnapshotBsPerUsd) || 0;
  const applyIgtf = Boolean(settings?.applyIgtf);
  const igtfPercentage = Number(settings?.igtfPercentage) || 3;

  const baseUsdCents =
    (order.subtotalUsdCents ?? 0) +
    (order.packagingUsdCents ?? 0) +
    (order.deliveryUsdCents ?? 0);
  const isForeign = FOREIGN_METHODS.includes(method);
  const igtfUsdCents =
    applyIgtf && isForeign ? Math.round(baseUsdCents * (igtfPercentage / 100)) : 0;
  const igtfBsCents = Math.round(igtfUsdCents * rate);
  const grandTotalUsdCents = baseUsdCents + igtfUsdCents;
  const grandTotalBsCents =
    (order.subtotalBsCents ?? 0) +
    usdCentsToBsCents(
      (order.packagingUsdCents ?? 0) + (order.deliveryUsdCents ?? 0),
      rate,
    ) +
    igtfBsCents;

  const canConfirm =
    !isSubmitting && (isCash || reference.trim().length > 0);

  async function handleConfirm() {
    if (!canConfirm) return;
    setIsSubmitting(true);
    try {
      const result = await settleOrderAction({
        id: order.id,
        paymentMethod: method,
        paymentReference: reference.trim() || undefined,
      });
      if (result?.data?.success) {
        toast.success(`Pedido #${order.orderNumber} cobrado`);
        router.refresh();
        onClose();
      } else {
        toast.error(result?.serverError ?? "Error al registrar el cobro");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-[60] bg-black/50"
        style={{ backdropFilter: "blur(2px)" }}
        onClick={onClose}
      />
      <div className="fixed left-1/2 top-1/2 z-[70] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-primary)]">
              <Wallet size={18} className="text-white" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] leading-none">
                Cobro en caja
              </p>
              <p className="text-sm font-bold text-[var(--color-text-main)]">
                Pedido #{order.orderNumber}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-surface-section)] text-[var(--color-text-muted)] hover:bg-[var(--color-border)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          {/* Total */}
          <div className="rounded-2xl bg-[var(--color-surface-section)] px-4 py-3 border border-[var(--color-border)]">
            {igtfUsdCents > 0 && (
              <div className="mb-1.5 flex justify-between border-b border-[var(--color-border)]/40 pb-1.5">
                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-[var(--color-text-muted)]">
                  IGTF ({igtfPercentage}%)
                </span>
                <span className="text-xs font-bold text-[var(--color-text-main)]">
                  {formatBs(igtfBsCents)}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--color-text-muted)]">
                Total a cobrar
              </span>
              <div className="text-right">
                <p className="font-display text-2xl font-black leading-none text-[var(--color-text-main)] tabular-nums">
                  {formatBs(grandTotalBsCents)}
                </p>
                <p className="text-[11px] font-bold text-[var(--color-primary)] tabular-nums">
                  {formatRef(grandTotalUsdCents)}
                </p>
              </div>
            </div>
          </div>

          {/* Payment method */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">
              Método de Pago
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  className={
                    "rounded-xl border py-2 px-3 text-sm font-bold transition-all " +
                    (method === m
                      ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white shadow-sm"
                      : "border-[var(--color-border)] bg-white text-[var(--color-text-main)] hover:border-[var(--color-primary)]/40")
                  }
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Reference */}
          {needsReference && (
            <div className="space-y-1.5">
              <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">
                Referencia de pago <span className="text-[var(--color-primary)]">*</span>
              </label>
              <div className="relative group">
                <div className="absolute left-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg bg-[var(--color-surface-section)] group-focus-within:bg-[var(--color-primary-light)] transition-colors">
                  <Hash size={13} className="text-[var(--color-text-muted)] group-focus-within:text-[var(--color-primary)] transition-colors" />
                </div>
                <input
                  type="text"
                  inputMode={method === "Pago Móvil" || method === "Transf." ? "numeric" : "text"}
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder={referencePlaceholder(method)}
                  autoFocus
                  className="w-full rounded-xl border border-[var(--color-border)] bg-white py-2 pl-10 pr-3 text-sm font-bold text-[var(--color-text-main)] outline-none placeholder:text-slate-300 focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/5 transition-all"
                />
              </div>
            </div>
          )}

          {/* Confirm */}
          <button
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--color-primary)] py-3 text-sm font-black uppercase tracking-widest text-white shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:grayscale"
          >
            {isSubmitting ? (
              <>
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Procesando...
              </>
            ) : (
              <>
                <CheckCircle2 size={18} /> Confirmar Cobro
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
