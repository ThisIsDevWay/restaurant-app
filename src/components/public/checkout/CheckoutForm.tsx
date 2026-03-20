"use client";

import { useState } from "react";
import { formatBs, formatRef } from "@/lib/money";
import { Loader2, ChevronDown } from "lucide-react";
import type { CartItem } from "@/store/cartStore";

interface CheckoutFormProps {
  items: CartItem[];
  totalBsCents: number;
  totalUsdCents: number;
  isSubmitting: boolean;
  error: string | null;
  onSubmit: (phone: string, paymentMethod: "pago_movil" | "transfer") => void;
}

export function CheckoutForm({
  items,
  totalBsCents,
  totalUsdCents,
  isSubmitting,
  error,
  onSubmit,
}: CheckoutFormProps) {
  const [phone, setPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"pago_movil" | "transfer">(
    "pago_movil",
  );
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [summaryExpanded, setSummaryExpanded] = useState(false);

  const itemCount = items.reduce((acc, i) => acc + i.quantity, 0);

  const validatePhone = (value: string) => {
    if (!/^(0414|0424|0412|0416|0426)\d{7}$/.test(value)) {
      return "Número de teléfono venezolano inválido";
    }
    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const err = validatePhone(phone);
    if (err) {
      setPhoneError(err);
      return;
    }
    setPhoneError(null);
    onSubmit(phone, paymentMethod);
  };

  return (
    <form onSubmit={handleSubmit} className="px-4 pb-8">
      {/* Order summary — collapsible */}
      <div className="mt-4 rounded-card border border-border bg-white shadow-card">
        <button
          type="button"
          onClick={() => setSummaryExpanded((prev) => !prev)}
          className="flex w-full items-center justify-between px-4 py-3 text-left"
        >
          <span className="text-[13px] text-text-muted">
            {itemCount} {itemCount === 1 ? "item" : "items"} ·{" "}
            {formatBs(totalBsCents)} · {formatRef(totalUsdCents)}
          </span>
          <ChevronDown
            size={16}
            className={`text-text-muted transition-transform duration-200 ${
              summaryExpanded ? "rotate-180" : ""
            }`}
          />
        </button>
        <div
          className={`overflow-hidden transition-all duration-200 ${
            summaryExpanded ? "max-h-[400px] opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="border-t border-border px-4 pb-3 pt-2">
            {items.map((item, idx) => (
              <div
                key={idx}
                className="flex items-start justify-between border-b border-border py-2 last:border-b-0"
              >
                <div>
                  <p className="text-sm text-text-main">
                    {item.quantity}× {item.name}
                  </p>
                  {item.selectedContorno && (
                    <p className="text-xs text-text-muted">
                      {item.selectedContorno.name}
                    </p>
                  )}
                  {item.selectedAdicionales.length > 0 && (
                    <p className="text-xs text-text-muted">
                      + {item.selectedAdicionales.map((a) => a.name).join(", ")}
                    </p>
                  )}
                </div>
                <p className="whitespace-nowrap text-sm font-semibold text-price-green">
                  {formatBs(item.itemTotalBsCents)}
                </p>
              </div>
            ))}
            <div className="mt-2 flex justify-between">
              <span className="text-[14px] font-semibold text-text-main">Total</span>
              <span className="text-[14px] font-bold text-price-green">
                {formatBs(totalBsCents)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment method */}
      <div className="mt-6">
        <p className="mb-2 text-sm font-semibold text-text-main">
          Método de pago
        </p>

        <button
          type="button"
          onClick={() => setPaymentMethod("pago_movil")}
          className={`mb-2 w-full rounded-input border p-4 text-left transition-colors ${
            paymentMethod === "pago_movil"
              ? "border-primary bg-primary/5"
              : "border-border bg-white"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                paymentMethod === "pago_movil"
                  ? "border-primary"
                  : "border-border"
              }`}
            >
              {paymentMethod === "pago_movil" && (
                <div className="h-2.5 w-2.5 rounded-full bg-primary" />
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-text-main">Pago Móvil</p>
              <span className="text-[10px] font-semibold text-primary">
                Recomendado
              </span>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setPaymentMethod("transfer")}
          className={`w-full rounded-input border p-4 text-left transition-colors ${
            paymentMethod === "transfer"
              ? "border-primary bg-primary/5"
              : "border-border bg-white"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                paymentMethod === "transfer"
                  ? "border-primary"
                  : "border-border"
              }`}
            >
              {paymentMethod === "transfer" && (
                <div className="h-2.5 w-2.5 rounded-full bg-primary" />
              )}
            </div>
            <p className="text-sm font-semibold text-text-main">Transferencia</p>
          </div>
        </button>
      </div>

      {/* Phone */}
      <div className="mt-6">
        <label className="mb-1 block text-sm font-semibold text-text-main">
          Tu número de teléfono
        </label>
        <input
          type="tel"
          inputMode="numeric"
          pattern="[0-9]*"
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value);
            setPhoneError(null);
          }}
          placeholder="0414 123 4567"
          maxLength={11}
          className={`w-full rounded-input border px-4 py-3 text-sm outline-none transition-colors ${
            phoneError ? "border-error" : "border-border focus:border-primary"
          }`}
          disabled={isSubmitting}
        />
        <p className="mt-1 text-xs text-text-muted">
          11 dígitos sin espacios
        </p>
        {phoneError && (
          <p className="mt-1 text-xs text-error">{phoneError}</p>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mt-4 rounded-input bg-error/10 p-3 text-sm text-error">
          {error}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-6 w-full rounded-input bg-primary py-3 text-sm font-semibold text-white transition-colors active:bg-primary-hover disabled:opacity-60"
      >
        {isSubmitting ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Procesando...
          </span>
        ) : (
          `Confirmar pedido → ${formatBs(totalBsCents)}`
        )}
      </button>
    </form>
  );
}
