"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { formatBs, formatRef } from "@/lib/money";
import { Loader2, ChevronDown } from "lucide-react";
import type { CartItem } from "@/store/cartStore";

interface CheckoutFormProps {
  items: CartItem[];
  totalBsCents: number;
  totalUsdCents: number;
  isSubmitting: boolean;
  error: string | null;
  onSubmit: (phone: string, paymentMethod: "pago_movil" | "transfer", name?: string, cedula?: string) => void;
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
  const [name, setName] = useState("");
  const [cedula, setCedula] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"pago_movil" | "transfer">(
    "pago_movil",
  );
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [customerFieldsVisible, setCustomerFieldsVisible] = useState(false);
  const [isReturning, setIsReturning] = useState(false);
  const lookupTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const itemCount = items.reduce((acc, i) => acc + i.quantity, 0);

  const validatePhone = (value: string) => {
    if (!/^(0414|0424|0412|0416|0426)\d{7}$/.test(value)) {
      return "Número de teléfono venezolano inválido";
    }
    return null;
  };

  const lookupCustomer = useCallback(async (phoneNumber: string) => {
    try {
      const res = await fetch(`/api/customers/lookup?phone=${phoneNumber}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.found) {
        setName(data.name ?? "");
        setCedula(data.cedula ?? "");
        setIsReturning(true);
      } else {
        setName("");
        setCedula("");
        setIsReturning(false);
      }
      setCustomerFieldsVisible(true);
    } catch {
      setCustomerFieldsVisible(true);
    }
  }, []);

  useEffect(() => {
    if (lookupTimeout.current) clearTimeout(lookupTimeout.current);

    if (phone.length === 11 && validatePhone(phone) === null) {
      lookupTimeout.current = setTimeout(() => lookupCustomer(phone), 400);
    } else {
      setCustomerFieldsVisible(false);
      setIsReturning(false);
      setName("");
      setCedula("");
    }

    return () => {
      if (lookupTimeout.current) clearTimeout(lookupTimeout.current);
    };
  }, [phone, lookupCustomer]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const err = validatePhone(phone);
    if (err) {
      setPhoneError(err);
      return;
    }
    setPhoneError(null);
    onSubmit(
      phone,
      paymentMethod,
      name.trim() || undefined,
      cedula.trim() || undefined,
    );
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
            className={`text-text-muted transition-transform duration-200 ${summaryExpanded ? "rotate-180" : ""
              }`}
          />
        </button>
        <div
          className={`overflow-hidden transition-all duration-300 ${summaryExpanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
            }`}
        >
          <div className="border-t border-border px-4 pb-3 pt-2">
            {items.map((item, idx) => (
              <div
                key={idx}
                className="flex items-start justify-between border-b border-border py-2.5 last:border-b-0"
              >
                <div className="flex-1 pr-4">
                  <p className="text-sm text-text-main font-medium">
                    {item.quantity > 1 ? `${item.quantity} servicios de ${item.name}` : item.name}
                  </p>
                  <p className="text-[10px] text-text-muted mt-0.5">
                    {formatBs(item.baseBsCents)} / {formatRef(item.baseUsdCents)}
                  </p>

                  <div className="mt-1 space-y-1">
                    {/* Contornos */}
                    {((item.fixedContornos ?? []).length > 0 || (item.contornoSubstitutions ?? []).length > 0) && (
                      <div className="space-y-0.5">
                        <p className="text-[11px] font-semibold text-text-main">Contornos</p>
                        {(item.fixedContornos ?? []).map((c) => (
                          <p key={c.id} className="text-[11px] text-text-muted">
                            {c.name}
                          </p>
                        ))}
                        {(item.contornoSubstitutions ?? []).map((s, idx) => (
                          <p key={idx} className="text-[11px] text-text-muted">
                            {s.substituteName}
                            <span className="text-[10px] opacity-70 ml-1">
                              (en vez de {s.originalName})
                            </span>
                          </p>
                        ))}
                      </div>
                    )}

                    {/* Removidos */}
                    {(item.removedComponents ?? []).length > 0 && (
                      <div className="space-y-0.5">
                        {(item.removedComponents ?? []).map((r) => (
                          <p key={r.componentId} className="text-[11px] text-error/70 italic">
                            Sin {r.name}
                          </p>
                        ))}
                      </div>
                    )}

                    {/* Adicionales */}
                    {item.selectedAdicionales.length > 0 && (
                      <div className="space-y-0.5">
                        <p className="text-[11px] font-semibold text-text-main">Adicionales</p>
                        {item.selectedAdicionales.map((adicional) => (
                          <p key={adicional.id} className="text-[11px] text-text-muted">
                            + {adicional.name}
                            {adicional.priceBsCents > 0 && (
                              <span className="ml-1 text-[10px] font-medium text-price-green">
                                ({formatBs(adicional.priceBsCents)} / {formatRef(adicional.priceUsdCents)})
                              </span>
                            )}
                          </p>
                        ))}
                      </div>
                    )}

                    {/* Bebidas */}
                    {(item.selectedBebidas ?? []).length > 0 && (
                      <div className="space-y-0.5">
                        <p className="text-[11px] font-semibold text-text-main">Bebidas</p>
                        {(item.selectedBebidas ?? []).map((bebida) => (
                          <p key={bebida.id} className="text-[11px] text-text-muted">
                            + {bebida.name}
                            {bebida.priceBsCents > 0 && (
                              <span className="ml-1 text-[10px] font-medium text-price-green">
                                ({formatBs(bebida.priceBsCents)} / {formatRef(bebida.priceUsdCents)})
                              </span>
                            )}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <p className="whitespace-nowrap text-sm font-semibold text-price-green">
                  {formatBs(item.itemTotalBsCents * item.quantity)}
                </p>
              </div>
            ))}
            {items.some((item) => item.quantity > 1) && (
              <p className="mt-4 px-2 text-center text-[10px] text-text-muted/80 leading-tight italic animate-in fade-in slide-in-from-bottom-2 duration-300">
                Para que cada plato tenga sus propios contornos o adicionales, agrégalos uno por uno.
              </p>
            )}
            <div className="mt-1 space-y-1.5 border-t border-border pt-2.5">
              <div className="flex justify-between">
                <span className="text-xs text-text-muted">Base Imponible</span>
                <span className="text-xs font-medium text-text-main">
                  {formatBs(Math.round(totalBsCents / 1.16))}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-text-muted">IVA (16%)</span>
                <span className="text-xs font-medium text-text-main">
                  {formatBs(totalBsCents - Math.round(totalBsCents / 1.16))}
                </span>
              </div>
              <div className="flex justify-between border-t border-border/50 pt-2">
                <span className="text-[14px] font-semibold text-text-main">Total a Pagar</span>
                <span className="text-[14px] font-bold text-price-green">
                  {formatBs(totalBsCents)}
                </span>
              </div>
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
          className={`mb-2 w-full rounded-input border p-4 text-left transition-colors ${paymentMethod === "pago_movil"
            ? "border-primary bg-primary/5"
            : "border-border bg-white"
            }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${paymentMethod === "pago_movil"
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
          className={`w-full rounded-input border p-4 text-left transition-colors ${paymentMethod === "transfer"
            ? "border-primary bg-primary/5"
            : "border-border bg-white"
            }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${paymentMethod === "transfer"
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
          className={`w-full rounded-input border px-4 py-3 text-sm outline-none transition-colors ${phoneError ? "border-error" : "border-border focus:border-primary"
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

      {/* Name + Cedula — aparece con animación */}
      {customerFieldsVisible && (
        <div className="mt-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
          {isReturning && (
            <p className="text-xs text-success font-medium">
              ¡Bienvenido de nuevo! 👋
            </p>
          )}
          <div>
            <label className="mb-1 block text-sm font-semibold text-text-main">
              ¿Cómo te llamamos? <span className="text-text-muted font-normal">(opcional)</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Carlos"
              maxLength={50}
              className={`w-full rounded-input border px-4 py-3 text-sm outline-none transition-colors ${isReturning && name ? "border-success/40 bg-success/5" : "border-border focus:border-primary"
                }`}
              disabled={isSubmitting}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-text-main">
              Cédula <span className="text-text-muted font-normal">(opcional)</span>
            </label>
            <input
              type="text"
              value={cedula}
              onChange={(e) => setCedula(e.target.value)}
              placeholder="V-12.345.678"
              maxLength={20}
              className={`w-full rounded-input border px-4 py-3 text-sm outline-none transition-colors ${isReturning && cedula ? "border-success/40 bg-success/5" : "border-border focus:border-primary"
                }`}
              disabled={isSubmitting}
            />
          </div>
        </div>
      )}

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
