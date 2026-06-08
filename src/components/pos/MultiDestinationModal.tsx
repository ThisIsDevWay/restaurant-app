"use client";

import { useMemo, useState, useEffect } from "react";
import { X, Plus, Trash2, Check, Store, Package, Truck, MapPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { formatBs, formatRef } from "@/lib/money";
import { createMultiModeOrderAction } from "@/actions/split-order";
import { calculateSurcharges } from "@/lib/utils/calculate-surcharges";
import type { CheckoutItem } from "@/lib/types/checkout";
import type { WaiterPaymentMethod } from "@/components/waiter/OrderForm";

interface CartLine {
  name: string;
  quantity: number;
  lineUsdCents: number;
}

type OrderMode = "on_site" | "take_away" | "delivery";

interface Destination {
  orderMode: OrderMode;
  tableNumber: string;
  deliveryAddress: string;
  deliveryZoneLabel: string;
  customerName: string;
  customerPhone: string;
  paymentMethod: WaiterPaymentMethod;
  paymentReference: string;
}

interface MultiDestinationModalProps {
  isOpen: boolean;
  onClose: () => void;
  lines: CartLine[];
  checkoutItems: CheckoutItem[];
  deliveryZones: Array<{ label: string; feeUsdCents: number }>;
  rate: number;
  settings: Record<string, any> | null;
  defaultCustomerName?: string;
  defaultCustomerPhone?: string;
  onSuccess: () => void;
  /**
   * "destinations" (default): cada bucket elige su propia modalidad/dirección.
   * "payers": dividir la cuenta de UNA mesa entre varios pagadores — todos
   * comparten `sharedMode`/`sharedTable`; solo cambian el pago y el nombre.
   */
  variant?: "destinations" | "payers";
  sharedMode?: OrderMode;
  sharedTable?: string;
}

const PAYMENT_METHODS: WaiterPaymentMethod[] = [
  "Efectivo $", "Efectivo Bs", "Pago Móvil", "Punto / PdV", "Zelle", "Transf.", "Binance",
];
const DEST_LABELS = [
  "Destino 1", "Destino 2", "Destino 3", "Destino 4",
  "Destino 5", "Destino 6", "Destino 7", "Destino 8",
];
const PAYER_LABELS = [
  "Cliente A", "Cliente B", "Cliente C", "Cliente D",
  "Cliente E", "Cliente F", "Cliente G", "Cliente H",
];

const PAYER_COLORS = [
  { border: "border-indigo-200 focus-within:border-indigo-500", bg: "bg-indigo-50/40", text: "text-indigo-700", badge: "bg-indigo-100 text-indigo-800" },
  { border: "border-emerald-200 focus-within:border-emerald-500", bg: "bg-emerald-50/40", text: "text-emerald-700", badge: "bg-emerald-100 text-emerald-800" },
  { border: "border-rose-200 focus-within:border-rose-500", bg: "bg-rose-50/40", text: "text-rose-700", badge: "bg-rose-100 text-rose-800" },
  { border: "border-amber-200 focus-within:border-amber-500", bg: "bg-amber-50/40", text: "text-amber-700", badge: "bg-amber-100 text-amber-800" },
  { border: "border-cyan-200 focus-within:border-cyan-500", bg: "bg-cyan-50/40", text: "text-cyan-700", badge: "bg-cyan-100 text-cyan-800" },
  { border: "border-violet-200 focus-within:border-violet-500", bg: "bg-violet-50/40", text: "text-violet-700", badge: "bg-violet-100 text-violet-800" },
  { border: "border-sky-200 focus-within:border-sky-500", bg: "bg-sky-50/40", text: "text-sky-700", badge: "bg-sky-100 text-sky-800" },
  { border: "border-teal-200 focus-within:border-teal-500", bg: "bg-teal-50/40", text: "text-teal-700", badge: "bg-teal-100 text-teal-800" },
];

function isCash(m: WaiterPaymentMethod) {
  return m === "Efectivo $" || m === "Efectivo Bs";
}

/**
 * Expands lines and checkoutItems to split quantities > 1 into single units.
 */
function expandItems(lines: CartLine[], checkoutItems: CheckoutItem[]) {
  const expandedLines: Array<{ name: string; quantity: number; lineUsdCents: number }> = [];
  const expandedCheckoutItems: CheckoutItem[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const item = checkoutItems[i];
    if (!line || !item) continue;

    const q = line.quantity;
    if (q <= 1) {
      expandedLines.push(line);
      expandedCheckoutItems.push(item);
      continue;
    }

    // Pure adicionales (excluding substitutions) and beverages are flat extras
    const flatAdicionales = item.selectedAdicionales.filter((a) => !a.substitutesComponentId);
    const flatAdicionalesUsd = flatAdicionales.reduce((sum, a) => sum + a.priceUsdCents * (a.quantity ?? 1), 0);
    const flatBebidasUsd = (item.selectedBebidas ?? []).reduce((sum, b) => sum + b.priceUsdCents * (b.quantity ?? 1), 0);
    const flatExtrasUsd = flatAdicionalesUsd + flatBebidasUsd;

    const perUnitBase = Math.round((line.lineUsdCents - flatExtrasUsd) / q);

    for (let k = 0; k < q; k++) {
      const isFirst = k === 0;
      const itemUsd = isFirst ? (line.lineUsdCents - perUnitBase * (q - 1)) : perUnitBase;

      expandedLines.push({
        name: line.name,
        quantity: 1,
        lineUsdCents: itemUsd,
      });

      expandedCheckoutItems.push({
        ...item,
        quantity: 1,
        selectedAdicionales: isFirst
          ? item.selectedAdicionales
          : item.selectedAdicionales.filter((a) => !!a.substitutesComponentId),
        selectedBebidas: isFirst ? item.selectedBebidas : [],
      });
    }
  }

  return { expandedLines, expandedCheckoutItems };
}

/**
 * Crea un pedido repartido en varios buckets desde un mismo carrito en caja.
 * Cada bucket se crea y cobra como una orden independiente (vinculadas por
 * splitGroupId). Asignación a nivel de línea completa para que los montos
 * sumen exacto. Dos variantes: multi-modalidad o dividir-cuenta por pagador.
 */
export function MultiDestinationModal({
  isOpen, onClose, lines, checkoutItems, deliveryZones, rate, settings,
  defaultCustomerName, defaultCustomerPhone, onSuccess,
  variant = "destinations", sharedMode = "on_site", sharedTable = "",
}: MultiDestinationModalProps) {
  const isPayers = variant === "payers";
  const labels = isPayers ? PAYER_LABELS : DEST_LABELS;
  const maxBuckets = labels.length;

  function newBucket(): Destination {
    return {
      orderMode: isPayers ? sharedMode : "on_site",
      tableNumber: isPayers ? sharedTable : "",
      deliveryAddress: "", deliveryZoneLabel: "",
      customerName: "", customerPhone: "", paymentMethod: "Punto / PdV", paymentReference: "",
    };
  }

  // Expand lines and checkoutItems
  const { expandedLines, expandedCheckoutItems } = useMemo(() => {
    return expandItems(lines, checkoutItems);
  }, [lines, checkoutItems]);

  const [destinations, setDestinations] = useState<Destination[]>(() =>
    isPayers
      ? [newBucket(), newBucket()]
      : [{ ...newBucket(), orderMode: "on_site" }, { ...newBucket(), orderMode: "take_away" }],
  );

  // lineDest[i] = índice del bucket al que va la línea i (-1 sin asignar)
  const [lineDest, setLineDest] = useState<number[]>(() => new Array(expandedLines.length).fill(-1));

  useEffect(() => {
    setLineDest(new Array(expandedLines.length).fill(-1));
  }, [expandedLines.length]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateDest(idx: number, patch: Partial<Destination>) {
    setDestinations((prev) => prev.map((d, i) => (i === idx ? { ...d, ...patch } : d)));
  }
  function addDest() {
    if (destinations.length >= maxBuckets) return;
    setDestinations((prev) => [...prev, newBucket()]);
  }
  function removeDest(idx: number) {
    if (destinations.length <= 2) return;
    setDestinations((prev) => prev.filter((_d, i) => i !== idx));
    setLineDest((prev) => prev.map((d) => (d === idx ? -1 : d > idx ? d - 1 : d)));
  }

  const destItemsCount = (d: number) => lineDest.filter((x) => x === d).length;

  const getDestTotals = (d: number) => {
    const dest = destinations[d];
    
    // 1. Subtotal USD and Bs
    const subtotalUsd = expandedLines.reduce((sum, l, i) => (lineDest[i] === d ? sum + l.lineUsdCents : sum), 0);
    const subtotalBs = Math.round(subtotalUsd * rate);

    // 2. Surcharges
    const destCheckoutItems = expandedCheckoutItems.filter((_, i) => lineDest[i] === d);
    const mode = isPayers ? sharedMode : dest.orderMode;
    const selectedZone = !isPayers && mode === "delivery"
      ? deliveryZones.find((z) => z.label === dest.deliveryZoneLabel)
      : undefined;

    const surchargeSettings = {
      packagingFeePerPlateUsdCents: Number(settings?.packagingFeePerPlateUsdCents) || 0,
      packagingFeePerAdicionalUsdCents: Number(settings?.packagingFeePerAdicionalUsdCents) || 0,
      packagingFeePerBebidaUsdCents: Number(settings?.packagingFeePerBebidaUsdCents) || 0,
      deliveryFeeUsdCents: mode === "delivery" ? selectedZone?.feeUsdCents ?? 0 : 0,
    };

    const surchargeItems = destCheckoutItems.map((item) => ({
      categoryIsSimple: item.categoryIsSimple,
      categoryName: item.categoryName,
      quantity: item.quantity,
      isPrepackaged: item.isPrepackaged,
      selectedAdicionales: item.selectedAdicionales.map((a) => ({
        quantity: a.quantity,
        isPrepackaged: a.isPrepackaged,
        substitutesComponentId: a.substitutesComponentId,
      })),
      selectedBebidas: (item.selectedBebidas ?? []).map((b) => ({
        quantity: b.quantity,
        isPrepackaged: b.isPrepackaged,
      })),
    }));

    const surcharges = calculateSurcharges(surchargeItems, mode, surchargeSettings);
    
    // 3. IGTF
    const applyIgtf = Boolean(settings?.applyIgtf);
    const igtfPercentage = Number(settings?.igtfPercentage) || 3;
    const isForeignCurrency =
      dest.paymentMethod === "Efectivo $" ||
      dest.paymentMethod === "Zelle" ||
      dest.paymentMethod === "Binance";

    const igtfUsd = applyIgtf && isForeignCurrency
      ? Math.round((subtotalUsd + surcharges.totalSurchargeUsdCents) * (igtfPercentage / 100))
      : 0;
    const igtfBs = Math.round(igtfUsd * rate);

    // 4. Grand Total
    const grandTotalUsd = subtotalUsd + surcharges.totalSurchargeUsdCents + igtfUsd;
    const grandTotalBs = subtotalBs + igtfBs + Math.round(surcharges.totalSurchargeUsdCents * rate);

    return {
      subtotalUsd,
      subtotalBs,
      packagingUsd: surcharges.packagingUsdCents,
      packagingBs: Math.round(surcharges.packagingUsdCents * rate),
      deliveryUsd: surcharges.deliveryUsdCents,
      deliveryBs: Math.round(surcharges.deliveryUsdCents * rate),
      igtfUsd,
      igtfBs,
      grandTotalUsd,
      grandTotalBs,
      hasSurcharges: surcharges.totalSurchargeUsdCents > 0,
      hasIgtf: igtfUsd > 0,
    };
  };

  const allAssigned = useMemo(() => lineDest.every((d) => d >= 0), [lineDest]);

  const destValid = (d: number) => {
    const dest = destinations[d];
    if (destItemsCount(d) === 0) return false;
    if (!isPayers && dest.orderMode === "delivery" && !dest.deliveryAddress.trim()) return false;
    if (!isPayers && dest.orderMode === "on_site" && !dest.tableNumber.trim()) return false;
    if (!isCash(dest.paymentMethod) && !dest.paymentReference.trim()) return false;
    return true;
  };

  const canConfirm =
    allAssigned &&
    destinations.length >= 2 &&
    destinations.every((_d, i) => destValid(i)) &&
    !isSubmitting;

  async function handleConfirm() {
    if (!canConfirm) return;
    setIsSubmitting(true);
    try {
      const payload = {
        customerName: defaultCustomerName?.trim() || undefined,
        customerPhone: defaultCustomerPhone?.trim() || undefined,
        destinations: destinations.map((d, idx) => {
          const mode = isPayers ? sharedMode : d.orderMode;
          const table = isPayers ? sharedTable : d.tableNumber.trim();
          return {
            orderMode: mode,
            tableNumber: mode === "on_site" ? table : undefined,
            deliveryAddress: mode === "delivery" ? d.deliveryAddress.trim() : undefined,
            deliveryZoneLabel: mode === "delivery" ? d.deliveryZoneLabel || undefined : undefined,
            customerName: d.customerName.trim() || undefined,
            customerPhone: d.customerPhone.trim() || undefined,
            paymentMethod: d.paymentMethod,
            paymentReference: d.paymentReference.trim() || undefined,
            items: expandedCheckoutItems.filter((_item, i) => lineDest[i] === idx),
          };
        }),
      };
      const res = await createMultiModeOrderAction(payload);
      if (res?.data?.success) {
        toast.success(
          isPayers
            ? `Cuenta dividida en ${res.data.orders.length} y cobrada`
            : `${res.data.orders.length} órdenes creadas y cobradas`,
        );
        onSuccess();
        onClose();
      } else {
        toast.error(res?.serverError ?? "Error al crear las órdenes");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isOpen) return null;

  const modeBtn = (d: number, mode: OrderMode, icon: React.ReactNode, label: string) => (
    <button
      type="button"
      onClick={() => updateDest(d, { orderMode: mode })}
      className={`flex flex-1 items-center justify-center gap-1 rounded-lg py-1 text-[10px] font-black uppercase tracking-wider transition-all ${
        destinations[d].orderMode === mode ? "bg-[var(--color-primary)] text-white shadow-sm" : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-section)]"
      }`}
    >
      {icon} {label}
    </button>
  );

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/50" onClick={onClose} style={{ backdropFilter: "blur(2px)" }} />
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6 pointer-events-none">
        <div className="pointer-events-auto flex w-full max-w-5xl flex-col rounded-3xl bg-white shadow-2xl" style={{ maxHeight: "92dvh" }}>
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
            <div className="flex items-center gap-2">
              {isPayers ? <Users size={18} className="text-[var(--color-primary)]" /> : <MapPlus size={18} className="text-[var(--color-primary)]" />}
              <div className="flex flex-col">
                <span className="font-display font-bold text-[var(--color-text-main)]">
                  {isPayers ? "Dividir Cuenta" : "Repartir en varios destinos"}
                </span>
                {isPayers ? (
                  <span className="text-[11px] text-[var(--color-text-muted)]">
                    Mesa {sharedTable} · Divide el carrito entre varios pagadores antes de cobrar
                  </span>
                ) : (
                  <span className="text-[11px] text-[var(--color-text-muted)]">
                    Reparte el carrito en destinos con diferentes modalidades y métodos de pago
                  </span>
                )}
              </div>
            </div>
            <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-surface-section)] hover:bg-[var(--color-border)] transition-colors">
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <div className="grid gap-5 lg:grid-cols-2">
              {/* Left: lines → bucket */}
              <div>
                <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Ítems del pedido</p>
                <div className="space-y-2.5">
                  {expandedLines.map((line, i) => {
                    const assignedIdx = lineDest[i];
                    const hasAssignment = assignedIdx >= 0;
                    const colors = hasAssignment ? PAYER_COLORS[assignedIdx] : null;

                    return (
                      <div
                        key={i}
                        className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 transition-all duration-200 ${
                          hasAssignment
                            ? `${colors?.border} ${colors?.bg} shadow-sm`
                            : "border-amber-300 bg-amber-50/40 hover:bg-amber-50/60"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-bold text-[var(--color-text-main)] flex items-center gap-2">
                            <span className="bg-[var(--color-surface-section)] text-[var(--color-text-muted)] text-[11px] font-black px-1.5 py-0.5 rounded-md">
                              {line.quantity}×
                            </span>
                            <span className="truncate">{line.name}</span>
                          </div>
                          <div className="text-[10px] text-[var(--color-text-muted)] font-semibold mt-0.5 tabular-nums">
                            {formatRef(line.lineUsdCents)} <span className="text-[9px] font-normal">({formatBs(Math.round(line.lineUsdCents * rate))})</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {hasAssignment && (
                            <span className={`hidden sm:inline-flex items-center justify-center text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${colors?.badge}`}>
                              {labels[assignedIdx]}
                            </span>
                          )}
                          <select
                            value={assignedIdx}
                            onChange={(e) => setLineDest((prev) => prev.map((d, j) => (j === i ? Number(e.target.value) : d)))}
                            className="shrink-0 rounded-xl border border-[var(--color-border)] bg-white px-3 py-1.5 text-xs font-bold text-[var(--color-text-main)] outline-none focus:border-[var(--color-primary)] transition-all hover:bg-slate-50 cursor-pointer"
                          >
                            <option value={-1}>{isPayers ? "— Cliente —" : "— Destino —"}</option>
                            {destinations.map((_d, di) => (
                              <option key={di} value={di}>{labels[di]}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right: buckets config */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">
                    {isPayers ? "Pagadores" : "Destinos"}
                  </p>
                  {destinations.length < maxBuckets && (
                    <button
                      onClick={addDest}
                      className="flex items-center gap-1.5 text-xs font-bold text-[var(--color-primary)] hover:underline bg-[var(--color-primary-light)] px-3 py-1.5 rounded-xl transition-all active:scale-95"
                    >
                      <Plus size={14} /> Agregar {isPayers ? "Cliente" : "Destino"}
                    </button>
                  )}
                </div>
                <div className="space-y-4">
                  {destinations.map((dest, d) => {
                    const colors = PAYER_COLORS[d];
                    const itemsCount = destItemsCount(d);
                    const totals = getDestTotals(d);

                    return (
                      <div
                        key={d}
                        className={`rounded-2xl border-2 bg-white p-4 shadow-sm transition-all duration-200 ${colors.border}`}
                      >
                        {/* Header of the card */}
                        <div className="mb-3 flex items-center justify-between border-b border-dashed border-slate-100 pb-2.5">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center justify-center text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${colors.badge}`}>
                              {labels[d]}
                            </span>
                            <span className="text-[11px] font-bold text-[var(--color-text-muted)]">
                              {itemsCount} ítem(s)
                            </span>
                          </div>
                          <div className="flex items-center gap-2.5">
                            <span className="text-sm font-black tabular-nums text-[var(--color-primary)]">
                              {formatRef(totals.grandTotalUsd)}
                            </span>
                            {destinations.length > 2 && (
                              <button
                                onClick={() => removeDest(d)}
                                className="text-slate-300 hover:text-red-500 transition-colors p-1 hover:bg-red-50 rounded-lg"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Item list inside the card */}
                        <div className="mb-3 space-y-1">
                          {itemsCount > 0 ? (
                            expandedLines.map((line, i) => {
                              if (lineDest[i] !== d) return null;
                              return (
                                <div key={i} className="flex justify-between text-xs text-[var(--color-text-main)] bg-slate-50/60 px-2.5 py-1.5 rounded-lg border border-slate-100">
                                  <span className="truncate font-medium">{line.quantity}× {line.name}</span>
                                  <span className="font-semibold tabular-nums text-[var(--color-text-muted)]">{formatRef(line.lineUsdCents)}</span>
                                </div>
                              );
                            })
                          ) : (
                            <div className="py-3 text-center text-xs text-[var(--color-text-muted)] border border-dashed border-slate-200 rounded-xl bg-slate-50/40">
                              Sin ítems asignados
                            </div>
                          )}
                        </div>

                        {/* Mode + address (Only for multi-destination) */}
                        {!isPayers && (
                          <div className="mb-3">
                            <div className="mb-2.5 flex gap-1 rounded-xl border border-[var(--color-border)] bg-slate-50 p-1">
                              {modeBtn(d, "on_site", <Store size={12} />, "Aquí")}
                              {modeBtn(d, "take_away", <Package size={12} />, "Llevar")}
                              {modeBtn(d, "delivery", <Truck size={12} />, "Delivery")}
                            </div>
                            {dest.orderMode === "on_site" && (
                              <input
                                value={dest.tableNumber}
                                onChange={(e) => updateDest(d, { tableNumber: e.target.value })}
                                placeholder="Mesa *"
                                className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm font-bold outline-none focus:border-[var(--color-primary)] shadow-sm"
                              />
                            )}
                            {dest.orderMode === "delivery" && (
                              <div className="space-y-2">
                                <textarea
                                  value={dest.deliveryAddress}
                                  onChange={(e) => updateDest(d, { deliveryAddress: e.target.value })}
                                  placeholder="Dirección de entrega *"
                                  rows={2}
                                  className="w-full resize-none rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm font-bold outline-none focus:border-[var(--color-primary)] shadow-sm"
                                />
                                <select
                                  value={dest.deliveryZoneLabel}
                                  onChange={(e) => updateDest(d, { deliveryZoneLabel: e.target.value })}
                                  className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm font-bold outline-none focus:border-[var(--color-primary)] shadow-sm"
                                >
                                  <option value="">Zona de delivery</option>
                                  {deliveryZones.map((z) => (
                                    <option key={z.label} value={z.label}>{z.label} · {formatRef(z.feeUsdCents)}</option>
                                  ))}
                                </select>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Name Input (For Split Account) */}
                        {isPayers && (
                          <div className="mb-3">
                            <input
                              value={dest.customerName}
                              onChange={(e) => updateDest(d, { customerName: e.target.value })}
                              placeholder="Nombre del cliente (opcional)"
                              className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-sm font-bold outline-none focus:border-[var(--color-primary)] shadow-sm"
                            />
                          </div>
                        )}

                        {/* Payment Details */}
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          <select
                            value={dest.paymentMethod}
                            onChange={(e) => updateDest(d, { paymentMethod: e.target.value as WaiterPaymentMethod })}
                            className="rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-xs font-bold outline-none focus:border-[var(--color-primary)] shadow-sm cursor-pointer"
                          >
                            {PAYMENT_METHODS.map((m) => (
                              <option key={m} value={m}>{m}</option>
                            ))}
                          </select>
                          {!isCash(dest.paymentMethod) && (
                            <input
                              value={dest.paymentReference}
                              onChange={(e) => updateDest(d, { paymentReference: e.target.value })}
                              placeholder="Referencia *"
                              className="rounded-xl border border-[var(--color-border)] bg-white px-3 py-2 text-xs font-bold outline-none focus:border-[var(--color-primary)] shadow-sm"
                            />
                          )}
                        </div>

                        {/* Price Breakdown */}
                        {itemsCount > 0 && (
                          <div className="rounded-xl bg-slate-50 p-3 text-xs space-y-1.5 border border-slate-100/80 shadow-inner">
                            <div className="flex justify-between text-[var(--color-text-muted)] font-medium">
                              <span>Subtotal</span>
                              <span className="tabular-nums">{formatRef(totals.subtotalUsd)} <span className="text-[10px] font-normal text-slate-400">({formatBs(totals.subtotalBs)})</span></span>
                            </div>
                            
                            {totals.hasSurcharges && (
                              <div className="flex justify-between text-[var(--color-text-muted)] font-medium">
                                <span>{isPayers ? "Envase" : "Envase / Delivery"}</span>
                                <span className="tabular-nums">{formatRef(totals.packagingUsd + totals.deliveryUsd)} <span className="text-[10px] font-normal text-slate-400">({formatBs(totals.packagingBs + totals.deliveryBs)})</span></span>
                              </div>
                            )}

                            {totals.hasIgtf && (
                              <div className="flex justify-between text-amber-700 font-bold">
                                <span>IGTF (3%)</span>
                                <span className="tabular-nums">{formatRef(totals.igtfUsd)} <span className="text-[10px] font-medium text-amber-600/80">({formatBs(totals.igtfBs)})</span></span>
                              </div>
                            )}

                            <div className="border-t border-dashed border-slate-200 my-2 pt-2 flex justify-between font-black text-[var(--color-text-main)] text-sm">
                              <span>Total a pagar</span>
                              <div className="text-right">
                                <span className="text-[var(--color-primary)] font-black tabular-nums block">
                                  {formatRef(totals.grandTotalUsd)}
                                </span>
                                <span className="text-[10px] text-[var(--color-text-muted)] font-bold block tabular-nums">
                                  {formatBs(totals.grandTotalBs)}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="shrink-0 border-t border-[var(--color-border)] px-5 py-4">
            {!allAssigned && <p className="mb-2 text-center text-[11px] font-bold text-amber-600">{isPayers ? "Asigna cada ítem a un cliente." : "Asigna cada ítem a un destino."}</p>}
            <button
              onClick={handleConfirm}
              disabled={!canConfirm}
              className="flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-base font-black text-white transition-all active:scale-[0.98] disabled:opacity-50 disabled:grayscale"
              style={{ background: "var(--color-primary)" }}
            >
              {isSubmitting ? (
                <><div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" /><span className="uppercase tracking-widest">{isPayers ? "Dividiendo..." : "Creando..."}</span></>
              ) : (
                <><Check size={20} /><span className="uppercase tracking-widest">{isPayers ? `Dividir y Cobrar (${destinations.length})` : `Crear y Cobrar (${destinations.length})`}</span></>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
