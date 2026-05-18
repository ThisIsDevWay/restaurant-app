"use client";

import {
  DollarSign, Coins, Smartphone, CreditCard, Banknote, Landmark, Table2, Map, User, Send, CheckCircle2, Store, Package, Truck, Phone, MapPin, Hash
} from "lucide-react";
import { formatBs, formatRef } from "@/lib/money";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type WaiterPaymentMethod = "Efectivo $" | "Efectivo Bs" | "Pago Móvil" | "Punto / PdV" | "Zelle" | "Transf." | "Binance";

interface OrderFormProps {
  tableNumber: string;
  setTableNumber: (v: string) => void;
  customerName: string;
  setCustomerName: (v: string) => void;
  paymentMethod: WaiterPaymentMethod;
  setPaymentMethod: (v: WaiterPaymentMethod) => void;
  onSubmit: () => void;
  canSubmit: boolean;
  isSubmitting: boolean;
  totalUsd: number;
  totalBs: number;
  rate: number;
  igtfUsd: number;
  surchargesUsd?: number; // kept for compat but ignored — use packagingUsd + deliveryUsd
  packagingUsd?: number;
  deliveryUsd?: number;
  customerPhone?: string;
  setCustomerPhone?: (v: string) => void;
  deliveryZones?: Array<{ label: string; feeUsdCents: number }>;
  deliveryZone?: string;
  setDeliveryZone?: (v: string) => void;
  /** "waiter" toma pedidos; "caja" toma y cobra (muestra el campo de referencia). */
  variant?: "waiter" | "caja";
  paymentReference?: string;
  setPaymentReference?: (v: string) => void;
  prefilledTable?: string;
  onOpenTableSelector: () => void;
  isEditing?: boolean;
  onCancelEdit?: () => void;
  onEditItem?: (index: number) => void;
  orderMode: "on_site" | "take_away" | "delivery";
  setOrderMode: (v: "on_site" | "take_away" | "delivery") => void;
  /** When true, the submit button is rendered inline (mobile).
   *  When false/undefined, the submit button is omitted (rendered externally for desktop sticky). */
  showSubmitButton?: boolean;
  /** Label for the submit button when not editing (e.g. "Enviar a Cocina", "Cobrar"). */
  submitLabel?: string;
}

export function OrderForm({
  tableNumber,
  setTableNumber,
  customerName,
  setCustomerName,
  paymentMethod,
  setPaymentMethod,
  onSubmit,
  canSubmit,
  isSubmitting,
  totalUsd,
  totalBs,
  rate,
  igtfUsd,
  surchargesUsd = 0,
  packagingUsd = 0,
  deliveryUsd = 0,
  customerPhone = "",
  setCustomerPhone,
  deliveryZones = [],
  deliveryZone = "",
  setDeliveryZone,
  variant = "waiter",
  paymentReference = "",
  setPaymentReference,
  prefilledTable,
  onOpenTableSelector,
  isEditing,
  onCancelEdit,
  onEditItem,
  orderMode,
  setOrderMode,
  showSubmitButton = true,
  submitLabel = "Enviar a Cocina",
}: OrderFormProps) {
  const isCash = paymentMethod === "Efectivo $" || paymentMethod === "Efectivo Bs";
  // En caja se cobra al instante: pedir referencia para métodos no-efectivo.
  const needsReference = variant === "caja" && !isCash;
  const referencePlaceholder =
    paymentMethod === "Pago Móvil" || paymentMethod === "Transf."
      ? "Últimos 4 dígitos"
      : paymentMethod === "Zelle"
        ? "Nº de confirmación"
        : paymentMethod === "Binance"
          ? "ID de transacción"
          : "Nº de referencia / lote";

  const methods = [
    { id: "Efectivo $", label: "Efectivo $", icon: <DollarSign size={16} /> },
    { id: "Efectivo Bs", label: "Efectivo Bs", icon: <Coins size={16} /> },
    { id: "Pago Móvil", label: "Pago Móvil", icon: <Smartphone size={16} /> },
    { id: "Punto / PdV", label: "Punto / PdV", icon: <CreditCard size={16} /> },
    { id: "Zelle", label: "Zelle", icon: <Banknote size={16} /> },
    { id: "Transf.", label: "Transf.", icon: <Landmark size={16} /> },
    { id: "Binance", label: "Binance", icon: <Coins size={16} /> },
  ];

  return (
    <div className="flex flex-col gap-2">
      {/* Totals */}
      <div className="rounded-2xl bg-[var(--color-surface-section)] px-4 py-2 border border-[var(--color-border)] relative overflow-hidden group">
        {/* Fiscal breakdown - Compact */}
        {(packagingUsd > 0 || deliveryUsd > 0 || igtfUsd > 0) && (
          <div className="mb-1 space-y-0.5 border-b border-[var(--color-border)]/30 pb-1.5">
            {packagingUsd > 0 && (
              <div className="flex justify-between items-baseline">
                <span className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.15em]">Envases</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[var(--color-text-main)]">{formatBs(Math.round(packagingUsd * rate))}</span>
                  <span className="text-[10px] text-[var(--color-text-muted)] font-medium bg-[var(--color-bg-app)] px-1.5 py-0.5 rounded tabular-nums border border-[var(--color-border-ghost)]">
                    ({formatRef(packagingUsd)})
                  </span>
                </div>
              </div>
            )}

            {deliveryUsd > 0 && (
              <div className="flex justify-between items-baseline">
                <span className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.15em]">Delivery</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[var(--color-text-main)]">{formatBs(Math.round(deliveryUsd * rate))}</span>
                  <span className="text-[10px] text-[var(--color-text-muted)] font-medium bg-[var(--color-bg-app)] px-1.5 py-0.5 rounded tabular-nums border border-[var(--color-border-ghost)]">
                    ({formatRef(deliveryUsd)})
                  </span>
                </div>
              </div>
            )}

            {igtfUsd > 0 && (
              <div className="flex justify-between items-baseline">
                <span className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.15em]">IGTF (3%)</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[var(--color-text-main)]">{formatBs(Math.round(igtfUsd * rate))}</span>
                  <span className="text-[10px] text-[var(--color-text-muted)] font-medium bg-[var(--color-bg-app)] px-1.5 py-0.5 rounded tabular-nums border border-[var(--color-border-ghost)]">
                    ({formatRef(igtfUsd)})
                  </span>
                </div>
              </div>
            )}
          </div>
        )}


        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--color-text-muted)] leading-none">Total</span>
            <span className="text-base font-black text-[var(--color-primary)] tabular-nums">
              {formatRef(totalUsd)}
            </span>
          </div>
          <div className="text-right">
            <span className="font-display text-3xl font-black leading-none text-[var(--color-text-main)] tabular-nums">
              {formatBs(totalBs)}
            </span>
          </div>
        </div>
      </div>

      {/* Form Fields */}
      <div className="space-y-1">
        <div>
          <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">
            Modo de Entrega
          </label>
          <div className="flex p-0.5 rounded-xl bg-[var(--color-bg-app)] border border-[var(--color-border)]">
            {(["on_site", "take_away", "delivery"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setOrderMode(mode)}
                className={`flex flex-1 items-center justify-center gap-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider transition-all rounded-lg ${
                  orderMode === mode
                    ? "bg-[var(--color-primary)] text-white shadow-sm"
                    : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-section)]"
                }`}
              >
                {mode === "on_site" && <><Store size={13} className={orderMode === mode ? "text-white" : ""} /> En sitio</>}
                {mode === "take_away" && <><Package size={13} className={orderMode === mode ? "text-white" : ""} /> Llevar</>}
                {mode === "delivery" && <><Truck size={13} className={orderMode === mode ? "text-white" : ""} /> Delivery</>}
              </button>
            ))}
          </div>
        </div>


        {/* Fields: adapt by mode */}
        {orderMode === "on_site" ? (
          /* ── EN SITIO: mesa + cliente (igual que antes) ── */
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Mesa</label>
              <div className="relative group">
                <div className="absolute left-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg bg-[var(--color-surface-section)] group-focus-within:bg-[var(--color-primary-light)] transition-colors">
                  <Table2 size={13} className="text-[var(--color-text-muted)] group-focus-within:text-[var(--color-primary)] transition-colors" />
                </div>
                <input
                  type="text"
                  value={tableNumber}
                  onChange={e => setTableNumber(e.target.value)}
                  placeholder="Ej: 5"
                  required
                  className="w-full rounded-xl border border-[var(--color-border)] bg-white py-1 pl-10 pr-10 text-sm font-bold text-[var(--color-text-main)] outline-none placeholder:text-slate-300 focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/5 transition-all"
                />
                <button
                  onClick={onOpenTableSelector}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--color-surface-section)] text-[var(--color-text-muted)] hover:bg-[var(--color-primary)] hover:text-white transition-all shadow-sm"
                  title="Seleccionar en plano"
                >
                  <Map size={13} />
                </button>
              </div>
            </div>
            <div className="space-y-1">
              <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Cliente</label>
              <div className="relative group">
                <div className="absolute left-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg bg-[var(--color-surface-section)] group-focus-within:bg-[var(--color-primary-light)] transition-colors">
                  <User size={13} className="text-[var(--color-text-muted)] group-focus-within:text-[var(--color-primary)] transition-colors" />
                </div>
                <input
                  type="text"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder="Nombre"
                  className="w-full rounded-xl border border-[var(--color-border)] bg-white py-1 pl-10 pr-3 text-sm font-bold text-[var(--color-text-main)] outline-none placeholder:text-slate-300 focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/5 transition-all"
                />
              </div>
            </div>
          </div>
        ) : orderMode === "delivery" ? (
          /* ── DELIVERY: dirección + zona + teléfono + cliente ── */
          <div className="space-y-2">
            {/* Dirección de entrega */}
            <div className="space-y-1">
              <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">
                Dirección de entrega <span className="text-[var(--color-primary)]">*</span>
              </label>
              <div className="relative group">
                <div className="absolute left-2.5 top-[0.6rem] p-1 rounded-lg bg-[var(--color-surface-section)] group-focus-within:bg-[var(--color-primary-light)] transition-colors">
                  <Truck size={13} className="text-[var(--color-text-muted)] group-focus-within:text-[var(--color-primary)] transition-colors" />
                </div>
                <textarea
                  value={tableNumber}
                  onChange={e => setTableNumber(e.target.value)}
                  placeholder="Calle, sector, referencia..."
                  required
                  rows={2}
                  className="w-full resize-none rounded-xl border border-[var(--color-border)] bg-white py-1.5 pl-10 pr-3 text-sm font-bold text-[var(--color-text-main)] outline-none placeholder:text-slate-300 focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/5 transition-all leading-snug"
                  style={{ fieldSizing: "content" } as React.CSSProperties}
                />
              </div>
            </div>

            {/* Zona de delivery */}
            <div className="space-y-1">
              <label className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">
                <MapPin size={11} /> Zona de delivery <span className="text-[var(--color-primary)]">*</span>
              </label>
              <Select value={deliveryZone} onValueChange={(val) => val && setDeliveryZone?.(val)}>
                <SelectTrigger className="w-full h-9 border border-[var(--color-border)] bg-white px-3 text-sm font-bold text-[var(--color-text-main)] outline-none focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/5 transition-all rounded-xl">
                  <SelectValue placeholder={deliveryZones.length ? "Seleccionar zona" : "Sin zonas configuradas"} />
                </SelectTrigger>
                <SelectContent className="bg-white rounded-xl shadow-2xl border border-[var(--color-border)] p-1">
                  {deliveryZones.map((zone) => (
                    <SelectItem
                      key={zone.label}
                      value={zone.label}
                      className="text-sm font-bold py-2 px-3 rounded-lg focus:bg-[var(--color-surface-section)] focus:text-[var(--color-primary)] cursor-pointer"
                    >
                      <div className="flex w-full items-center justify-between gap-3">
                        <span>{zone.label}</span>
                        <span className="text-[var(--color-text-muted)] tabular-nums">{formatRef(zone.feeUsdCents)}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Teléfono + Cliente */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Teléfono <span className="text-[var(--color-primary)]">*</span></label>
                <div className="relative group">
                  <div className="absolute left-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg bg-[var(--color-surface-section)] group-focus-within:bg-[var(--color-primary-light)] transition-colors">
                    <Phone size={13} className="text-[var(--color-text-muted)] group-focus-within:text-[var(--color-primary)] transition-colors" />
                  </div>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={e => setCustomerPhone?.(e.target.value)}
                    placeholder="0414-0000000"
                    required
                    className="w-full rounded-xl border border-[var(--color-border)] bg-white py-1.5 pl-10 pr-3 text-sm font-bold text-[var(--color-text-main)] outline-none placeholder:text-slate-300 focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/5 transition-all"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Cliente <span className="text-[var(--color-primary)]">*</span></label>
                <div className="relative group">
                  <div className="absolute left-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg bg-[var(--color-surface-section)] group-focus-within:bg-[var(--color-primary-light)] transition-colors">
                    <User size={13} className="text-[var(--color-text-muted)] group-focus-within:text-[var(--color-primary)] transition-colors" />
                  </div>
                  <input
                    type="text"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    placeholder="Nombre"
                    required
                    className="w-full rounded-xl border border-[var(--color-border)] bg-white py-1.5 pl-10 pr-3 text-sm font-bold text-[var(--color-text-main)] outline-none placeholder:text-slate-300 focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/5 transition-all"
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ── PARA LLEVAR: solo cliente ── */
          <div className="space-y-1">
            <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Cliente <span className="text-[var(--color-primary)]">*</span></label>
            <div className="relative group">
              <div className="absolute left-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg bg-[var(--color-surface-section)] group-focus-within:bg-[var(--color-primary-light)] transition-colors">
                <User size={13} className="text-[var(--color-text-muted)] group-focus-within:text-[var(--color-primary)] transition-colors" />
              </div>
              <input
                type="text"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                placeholder="Nombre"
                required
                className="w-full rounded-xl border border-[var(--color-border)] bg-white py-1.5 pl-10 pr-3 text-sm font-bold text-[var(--color-text-main)] outline-none placeholder:text-slate-300 focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/5 transition-all"
              />
            </div>
          </div>
        )}

        {/* Pago */}
        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">
            Método de Pago
            {variant === "waiter" && (
              <span className="font-medium normal-case text-[var(--color-text-muted)]/60"> (tentativo)</span>
            )}
          </label>
          <Select value={paymentMethod} onValueChange={(val) => val && setPaymentMethod(val as WaiterPaymentMethod)}>
            <SelectTrigger className="w-full h-9 border border-[var(--color-border)] bg-white px-3 text-sm font-bold text-[var(--color-text-main)] outline-none focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/5 transition-all rounded-xl">
              <SelectValue placeholder="Seleccionar método" />
            </SelectTrigger>
            <SelectContent className="bg-white rounded-xl shadow-2xl border border-[var(--color-border)] p-1">
              {methods.map((method) => (
                <SelectItem 
                  key={method.id} 
                  value={method.id}
                  className="text-sm font-bold py-2 px-3 rounded-lg focus:bg-[var(--color-surface-section)] focus:text-[var(--color-primary)] cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded-md bg-[var(--color-surface-section)] group-focus:bg-white transition-colors">{method.icon}</span>
                    {method.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Referencia de pago — solo en caja, para métodos no-efectivo */}
        {needsReference && (
          <div className="space-y-1">
            <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">
              Referencia de Pago <span className="text-[var(--color-primary)]">*</span>
            </label>
            <div className="relative group">
              <div className="absolute left-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg bg-[var(--color-surface-section)] group-focus-within:bg-[var(--color-primary-light)] transition-colors">
                <Hash size={13} className="text-[var(--color-text-muted)] group-focus-within:text-[var(--color-primary)] transition-colors" />
              </div>
              <input
                type="text"
                inputMode={paymentMethod === "Pago Móvil" || paymentMethod === "Transf." ? "numeric" : "text"}
                value={paymentReference}
                onChange={e => setPaymentReference?.(e.target.value)}
                placeholder={referencePlaceholder}
                required
                className="w-full rounded-xl border border-[var(--color-border)] bg-white py-1.5 pl-10 pr-3 text-sm font-bold text-[var(--color-text-main)] outline-none placeholder:text-slate-300 focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/5 transition-all"
              />
            </div>
          </div>
        )}


        {/* Submit button — only shown in mobile/inline mode */}
        {showSubmitButton && (
          <div className="pt-2">
            <SubmitButton
              canSubmit={canSubmit}
              isSubmitting={isSubmitting}
              isEditing={isEditing}
              onSubmit={onSubmit}
              onCancelEdit={onCancelEdit}
              submitLabel={submitLabel}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/** Standalone submit button — used in both mobile (inline) and desktop (sticky footer) */
interface SubmitButtonProps {
  canSubmit: boolean;
  isSubmitting: boolean;
  isEditing?: boolean;
  onSubmit: () => void;
  onCancelEdit?: () => void;
  submitLabel?: string;
}

export function SubmitButton({ canSubmit, isSubmitting, isEditing, onSubmit, onCancelEdit, submitLabel = "Enviar a Cocina" }: SubmitButtonProps) {
  return (
    <>
      <button
        onClick={onSubmit}
        disabled={!canSubmit || isSubmitting}
        className="w-full flex items-center justify-center gap-3 rounded-2xl py-2.5 text-base font-black transition-all shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:grayscale disabled:scale-100 group overflow-hidden relative"
        style={{
          background: canSubmit ? "var(--color-primary)" : "var(--color-input)",
          color: "white",
          boxShadow: canSubmit ? "0 10px 20px -10px rgba(187, 0, 5, 0.4)" : "none",
        }}
      >
        {/* Glossy overlay effect */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
        
        {isSubmitting ? (
          <>
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            <span className="uppercase tracking-widest">{isEditing ? "Actualizando..." : "Enviando..."}</span>
          </>
        ) : (
          <>
            {isEditing ? <CheckCircle2 size={20} /> : <Send size={20} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
            <span className="uppercase tracking-widest">{isEditing ? "Actualizar Pedido" : submitLabel}</span>
          </>
        )}
      </button>

      {isEditing && (
        <button
          onClick={onCancelEdit}
          className="w-full mt-3 rounded-xl border border-[var(--color-border)] py-3 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] hover:bg-[var(--color-surface-section)] transition-all"
        >
          Cancelar Edición (Nuevo Pedido)
        </button>
      )}
    </>
  );
}
