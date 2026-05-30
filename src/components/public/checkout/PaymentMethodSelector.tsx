"use client";

import { Smartphone, Landmark, Shield, Coins, DollarSign, Bitcoin } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PaymentMethod } from "./CheckoutForm.types";

interface PaymentMethodSelectorProps {
  paymentPagoMovilEnabled: boolean;
  paymentTransferEnabled: boolean;
  paymentEfectivoEnabled: boolean;
  paymentZelleEnabled: boolean;
  paymentBinanceEnabled: boolean;
  paymentMethod: PaymentMethod | null;
  onSetPaymentMethod: (method: PaymentMethod) => void;
  grandTotalUsdCents: number;
  cashAmountUsd: string;
  onCashAmountUsdChange: (v: string) => void;
  acceptChangeBs: boolean | null;
  onAcceptChangeBsChange: (v: boolean | null) => void;
  efectivoAskCashAmount: boolean;
  efectivoAskChangeBs: boolean;
}

function MethodButton({
  isSelected,
  onClick,
  icon,
  name,
  badge,
  badgeColor,
  subtitle,
}: {
  isSelected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  name: string;
  badge: string;
  badgeColor: "gold" | "green" | "blue";
  subtitle: string;
}) {
  const badgeClass =
    badgeColor === "gold"
      ? "bg-[rgba(212,175,85,0.3)] text-[#B8893A]"
      : badgeColor === "blue"
      ? "bg-[rgba(59,130,246,0.15)] text-blue-600"
      : "bg-[#E8EFE3] text-[#3F6B4A]";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3.5 p-4 rounded-[18px] border transition-all duration-200 text-left",
        isSelected
          ? "bg-bg-card border-2 border-primary shadow-[0_8px_22px_rgba(187,0,5,0.12)]"
          : "bg-bg-card border border-border shadow-card"
      )}
    >
      <div
        className={cn(
          "w-[52px] h-[52px] rounded-[14px] flex items-center justify-center shrink-0 transition-colors duration-200",
          isSelected ? "bg-primary text-white" : "bg-surface-section text-text-main"
        )}
      >
        {icon}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-display text-[22px] leading-none text-text-main">{name}</p>
          <span className={cn("inline-block px-2 py-0.5 rounded-[4px] font-sans text-[10px] font-semibold uppercase tracking-wide", badgeClass)}>
            {badge}
          </span>
        </div>
        <p className="font-sans text-[13px] text-text-muted mt-0.5">{subtitle}</p>
      </div>

      <div
        className={cn(
          "w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center shrink-0 transition-colors duration-200",
          isSelected ? "bg-primary border-primary" : "border-border"
        )}
      >
        {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
      </div>
    </button>
  );
}

export function PaymentMethodSelector({
  paymentPagoMovilEnabled,
  paymentTransferEnabled,
  paymentEfectivoEnabled,
  paymentZelleEnabled,
  paymentBinanceEnabled,
  paymentMethod,
  onSetPaymentMethod,
  grandTotalUsdCents,
  cashAmountUsd,
  onCashAmountUsdChange,
  acceptChangeBs,
  onAcceptChangeBsChange,
  efectivoAskCashAmount,
  efectivoAskChangeBs,
}: PaymentMethodSelectorProps) {
  const exactUsd = (grandTotalUsdCents / 100).toFixed(2);

  return (
    <div className="flex flex-col gap-2.5">
      {paymentPagoMovilEnabled && (
        <MethodButton
          isSelected={paymentMethod === "pago_movil"}
          onClick={() => onSetPaymentMethod("pago_movil")}
          icon={<Smartphone className="w-6 h-6" strokeWidth={paymentMethod === "pago_movil" ? 2.5 : 2} />}
          name="Pago Móvil"
          badge="INSTANTÁNEO"
          badgeColor="gold"
          subtitle="Transferencia inmediata 24/7"
        />
      )}

      {paymentTransferEnabled && (
        <MethodButton
          isSelected={paymentMethod === "transfer"}
          onClick={() => onSetPaymentMethod("transfer")}
          icon={<Landmark className="w-6 h-6" strokeWidth={paymentMethod === "transfer" ? 2.5 : 2} />}
          name="Transferencia"
          badge="Bs"
          badgeColor="green"
          subtitle="Cuentas nacionales"
        />
      )}

      {paymentEfectivoEnabled && (
        <>
          <MethodButton
            isSelected={paymentMethod === "efectivo"}
            onClick={() => onSetPaymentMethod("efectivo")}
            icon={<Coins className="w-6 h-6" strokeWidth={paymentMethod === "efectivo" ? 2.5 : 2} />}
            name="Efectivo $"
            badge="USD"
            badgeColor="green"
            subtitle="Paga al recibir / retirar"
          />

          {/* ── Sección expandible de efectivo ── */}
          {paymentMethod === "efectivo" && (efectivoAskCashAmount || efectivoAskChangeBs) && (
            <div className="animate-in slide-in-from-top-1 fade-in duration-200 rounded-[16px] bg-surface-section border border-border/50 px-4 py-4 -mt-0.5 space-y-4">
              {/* Monto */}
              {efectivoAskCashAmount && (
                <div>
                  <label className="font-sans text-[10px] uppercase tracking-[0.12em] text-text-muted block mb-1.5">
                    ¿Con cuánto pagarás?{" "}
                    <span className="normal-case tracking-normal text-text-muted/60 font-normal">
                      — opcional
                    </span>
                  </label>
                  <div className="flex items-center gap-2 px-3.5 py-3 rounded-[12px] border border-border bg-bg-card focus-within:border-primary/60 transition-colors">
                    <span className="font-sans text-[15px] font-semibold text-text-muted shrink-0">$</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      value={cashAmountUsd}
                      onChange={(e) => onCashAmountUsdChange(e.target.value)}
                      placeholder={exactUsd}
                      className="flex-1 bg-transparent outline-none font-sans text-[15px] font-semibold text-text-main placeholder:text-text-muted/35 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    {cashAmountUsd && (
                      <button
                        type="button"
                        onClick={() => onCashAmountUsdChange("")}
                        className="text-text-muted/50 hover:text-text-muted text-[18px] leading-none shrink-0"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Vuelto en Bs */}
              {efectivoAskChangeBs && (
                <div>
                  <label className="font-sans text-[10px] uppercase tracking-[0.12em] text-text-muted block mb-1.5">
                    ¿Acepto vuelto en Bs (tasa BCV)?{" "}
                    <span className="normal-case tracking-normal text-text-muted/60 font-normal">
                      — opcional
                    </span>
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => onAcceptChangeBsChange(acceptChangeBs === true ? null : true)}
                      className={cn(
                        "flex-1 py-2.5 rounded-[10px] text-[13px] font-semibold border transition-all",
                        acceptChangeBs === true
                          ? "bg-[#E8EFE3] border-[rgba(63,107,74,0.45)] text-[#3F6B4A]"
                          : "bg-bg-card border-border text-text-muted"
                      )}
                    >
                      Sí, acepto
                    </button>
                    <button
                      type="button"
                      onClick={() => onAcceptChangeBsChange(acceptChangeBs === false ? null : false)}
                      className={cn(
                        "flex-1 py-2.5 rounded-[10px] text-[13px] font-semibold border transition-all",
                        acceptChangeBs === false
                          ? "bg-primary/8 border-primary/35 text-primary"
                          : "bg-bg-card border-border text-text-muted"
                      )}
                    >
                      Prefiero exacto
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {paymentZelleEnabled && (
        <MethodButton
          isSelected={paymentMethod === "zelle"}
          onClick={() => onSetPaymentMethod("zelle")}
          icon={<DollarSign className="w-6 h-6" strokeWidth={paymentMethod === "zelle" ? 2.5 : 2} />}
          name="Zelle"
          badge="USD"
          badgeColor="green"
          subtitle="Transferencia bancaria USA"
        />
      )}

      {paymentBinanceEnabled && (
        <MethodButton
          isSelected={paymentMethod === "binance"}
          onClick={() => onSetPaymentMethod("binance")}
          icon={<Bitcoin className="w-6 h-6" strokeWidth={paymentMethod === "binance" ? 2.5 : 2} />}
          name="Binance Pay"
          badge="USDT"
          badgeColor="blue"
          subtitle="Pago en cripto estable"
        />
      )}

      {/* Security note */}
      <div className="bg-surface-section rounded-[12px] p-3 flex items-start gap-2.5 mt-1">
        <Shield className="w-4 h-4 text-text-muted shrink-0 mt-0.5" />
        <p className="font-sans text-[11px] text-text-muted leading-snug">
          Tu pago es procesado directamente con el restaurante. No almacenamos datos bancarios.
        </p>
      </div>
    </div>
  );
}
