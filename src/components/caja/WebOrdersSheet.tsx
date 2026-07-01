"use client";

import { useState } from "react";
import {
  Globe,
  Clock,
  Receipt,
  Ban,
  ChefHat,
  Loader2,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatBs, usdCentsToBsCents } from "@/lib/money";
import { formatOrderTime } from "@/lib/utils/format-relative-time";
import { cn, formatPhone, isRealPhone } from "@/lib/utils";
import { OrderModeChip } from "@/components/admin/orders/OrderModeChip";
import { OrderStatusBadge } from "@/components/admin/orders/OrderStatusBadge";
import { LocationBadge, CustomerInfo } from "@/components/waiter/ActiveOrdersSheet";
import { ComprobanteLightbox } from "@/components/admin/orders/ComprobanteLightbox";
import { ReferenceDialog, type RefFields } from "@/components/admin/orders/ReferenceDialog";
import { useOrderActionMutation } from "@/hooks/useOrderActionMutation";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { ACTION_MAP, STATUS_STYLES, type OrderStatus } from "@/lib/constants/order-status";

function getItemTotalUsdCents(item: any): number {
  let total = item.priceUsdCents * item.quantity;
  for (const c of item.fixedContornos ?? []) {
    total += c.priceUsdCents * item.quantity;
  }
  for (const a of item.selectedAdicionales ?? []) {
    total += a.priceUsdCents * (a.quantity ?? 1);
  }
  for (const b of item.selectedBebidas ?? []) {
    total += b.priceUsdCents * (b.quantity ?? 1);
  }
  for (const r of item.removedComponents ?? []) {
    total += r.priceUsdCents * item.quantity;
  }
  return total;
}

interface WebOrdersSheetProps {
  isOpen: boolean;
  onClose: () => void;
  orders: any[];
  /** Refresca las órdenes en vivo tras una acción (p.ej. pos.refetchOrders). */
  onConfirmed?: () => void;
}

export function WebOrdersSheet({ isOpen, onClose, orders, onConfirmed }: WebOrdersSheetProps) {
  const { confirm, confirmDialog } = useConfirm();

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col bg-slate-50">
        <SheetHeader className="px-6 py-5 bg-white border-b shrink-0">
          <SheetTitle className="flex items-center justify-between">
            <span className="text-xl font-display font-black text-slate-900">
              Pedidos Web
            </span>
            {orders.length > 0 && (
              <span className="inline-flex items-center justify-center h-6 min-w-[24px] px-1.5 rounded-full bg-primary text-white text-xs font-black">
                {orders.length}
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center opacity-40">
              <Globe size={48} className="mb-3" />
              <p className="font-bold text-slate-700">No hay pedidos web hoy</p>
              <p className="text-xs text-slate-500 mt-1">
                Los pedidos hechos desde la web aparecerán aquí
              </p>
            </div>
          ) : (
            orders.map((order) => (
              <WebOrderCard
                key={order.id}
                order={order}
                onConfirmed={onConfirmed}
                confirm={confirm}
              />
            ))
          )}
        </div>
      </SheetContent>
      {confirmDialog}
    </Sheet>
  );
}

// ─── Web Order Card ───────────────────────────────────────────────────────────

function WebOrderCard({
  order,
  onConfirmed,
  confirm,
}: {
  order: any;
  onConfirmed?: () => void;
  confirm: (opts: {
    title: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    destructive?: boolean;
  }) => Promise<boolean>;
}) {
  const status = order.status as OrderStatus;
  const items = (order.itemsSnapshot ?? []) as any[];
  const comprobanteUrl = order.paymentMetadata?.uploadedUrl as string | undefined;

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [refDialogOpen, setRefDialogOpen] = useState(false);
  const [fields, setFields] = useState<RefFields>({
    paymentReference: "",
    phone: order.customerPhone ?? "",
    customerName: order.customerName ?? "",
    cedula: "",
  });
  const [errors, setErrors] = useState<Partial<RefFields>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof RefFields, boolean>>>({});

  const mutation = useOrderActionMutation({
    orderId: order.id,
    onSuccess: () => {
      setRefDialogOpen(false);
      onConfirmed?.();
    },
    onError: (err) => {
      setErrors((prev) => ({
        ...prev,
        paymentReference: err.message,
      }));
      setTouched((prev) => ({
        ...prev,
        paymentReference: true,
      }));
    },
  });

  function setField(key: keyof RefFields, value: string) {
    setFields((f) => ({ ...f, [key]: value }));
    if (touched[key]) {
      const next = { ...errors };
      if (key === "paymentReference") {
        if (value.trim().length >= 3) delete next.paymentReference;
        else next.paymentReference = "Mínimo 3 caracteres";
      }
      if (key === "phone") {
        if (value.trim().length >= 7) delete next.phone;
        else next.phone = "Mínimo 7 dígitos";
      }
      setErrors(next);
    }
  }

  function validate(): boolean {
    const next: Partial<RefFields> = {};
    if (fields.paymentReference.trim().length < 3) next.paymentReference = "Mínimo 3 caracteres";
    if (fields.phone.trim().length < 7) next.phone = "Mínimo 7 dígitos";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleConfirmWithRef() {
    setTouched({ paymentReference: true, phone: true });
    if (!validate()) return;
    mutation.mutate({ actionType: "confirm_with_ref", refPayload: fields });
  }

  function handleForceManual() {
    mutation.mutate({ actionType: "confirm_manual", refPayload: fields });
  }

  async function handleCancel() {
    const ok = await confirm({
      title: "¿Cancelar pedido?",
      description: `¿Seguro que deseas cancelar la orden #${order.orderNumber}? Esta acción no se puede deshacer.`,
      destructive: true,
      confirmLabel: "Sí, cancelar",
      cancelLabel: "Volver",
    });
    if (!ok) return;
    mutation.mutate(
      { actionType: "cancel" },
      { onSuccess: () => toast.success(`Pedido #${order.orderNumber} cancelado`) },
    );
  }

  const isEfectivo = order.paymentMethod === "Efectivo $";
  const actions = status === "pending" && isEfectivo
    ? [
      {
        label: "Confirmar Efectivo",
        icon: ChefHat,
        action: "confirm_manual" as const,
        variant: "default" as const,
      },
    ]
    : (ACTION_MAP[status] ?? []);
  const canCancel = status === "pending" || status === "whatsapp";
  const canSendToKitchen = status === "paid";

  return (
    <div
      className={cn(
        "w-full bg-white rounded-xl p-3.5 shadow-sm border-l-4 border border-transparent space-y-2",
        STATUS_STYLES[status]?.borderAccent ?? "border-l-slate-200",
      )}
    >
      {/* Fila 1: # · Modo · Mesa/Para llevar y Pagado */}
      <div className="flex items-center justify-between text-xs text-slate-500 font-sans font-semibold">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[#bb0005] font-black">#{order.orderNumber}</span>
          <span>·</span>
          <span className="text-slate-700 font-bold">
            {order.orderMode === "on_site" ? "Comer en el local" : order.orderMode === "take_away" ? "Retiro en Local" : "Delivery"}
          </span>
          <span>·</span>
          <span className="text-slate-600 font-semibold">
            {order.orderMode === "on_site" ? (order.tableNumber ? `Mesa ${order.tableNumber}` : "En sitio") : (order.tableNumber || "Para llevar")}
          </span>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      {/* Fila 2: Cliente + Teléfono y Tiempo transcurrido */}
      <div className="flex items-center justify-between text-xs text-slate-500 font-sans">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-bold text-slate-800 truncate">{order.customerName || "Cliente Web"}</span>
          {order.customerPhone && isRealPhone(order.customerPhone) && (
            <>
              <span className="text-slate-300">·</span>
              <span className="font-mono text-slate-500">{formatPhone(order.customerPhone)}</span>
            </>
          )}
        </div>
        <span className="shrink-0">{formatOrderTime(order.createdAt)}</span>
      </div>

      {/* Separador */}
      <div className="border-t border-slate-100 my-1" />

      {/* Fila 3: items y modificadores */}
      {items.length > 0 && (
        <div className="space-y-1.5 pl-2 border-l-2 border-slate-100 text-sm">
          {items.map((item, idx) => {
            const extras = [
              ...(item.fixedContornos ?? []).map((c: any) => c.name),
              ...(item.contornoSubstitutions ?? []).map(
                (s: any) => `${s.substituteName} (por ${s.originalName})`
              ),
              ...(item.selectedAdicionales ?? []).map(
                (a: any) => `+${a.name}${a.quantity > 1 ? ` (x${a.quantity})` : ""}`
              ),
              ...(item.selectedBebidas ?? []).map(
                (b: any) => `+${b.name}${b.quantity > 1 ? ` (x${b.quantity})` : ""}`
              ),
              ...(item.removedComponents ?? []).map((r: any) => `Sin ${r.name}`),
            ];
            return (
              <div key={idx} className="space-y-0.5">
                <div className="flex justify-between gap-2">
                  <span className="font-bold text-slate-800">
                    {item.quantity}x {item.name}
                  </span>
                  <span className="font-mono font-semibold text-slate-700 shrink-0 text-right">
                    {formatBs(item.itemTotalBsCents)}
                  </span>
                </div>
                {extras.length > 0 && (
                  <p className="text-xs text-slate-400 pl-2.5 leading-relaxed">
                    {extras.join(", ")}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Fila 4: Pago, Ref, Recargos y Totales */}
      <div className="flex items-start justify-between text-xs text-slate-500 font-sans border-t border-slate-100 pt-2.5">
        {/* Left Column: Pago, Ref, Recargos and Comprobante */}
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            {order.paymentMethod && (
              <span className="font-bold text-slate-700">
                {order.paymentMethod.toLowerCase() === "pago_movil" ? "Pago Móvil" : order.paymentMethod.toLowerCase() === "efectivo" ? "Efectivo" : order.paymentMethod}
              </span>
            )}
            {order.paymentReference && (
              <>
                <span className="text-slate-300">·</span>
                <span className="font-mono text-slate-600 font-semibold">
                  Ref: {order.paymentReference}
                </span>
              </>
            )}
            {(order.paymentMethod === "Efectivo $" || order.paymentMethod === "efectivo") && (() => {
              const meta = order.paymentMetadata as { cashAmountUsd?: string | null; acceptChangeBs?: boolean | null } | null;
              if (!meta) return null;
              const details = [];
              if (meta.cashAmountUsd) details.push(`Paga: $${parseFloat(meta.cashAmountUsd).toFixed(2)}`);
              if (meta.acceptChangeBs !== undefined && meta.acceptChangeBs !== null) {
                details.push(meta.acceptChangeBs ? "Vuelto Bs" : "Vuelto USD");
              }
              if (details.length === 0) return null;
              return (
                <span className="text-[10px] font-bold text-sky-700 bg-sky-50 px-1 rounded-sm">
                  {details.join(" • ")}
                </span>
              );
            })()}
          </div>

          <div className="flex items-center gap-2">
            {/* Recargos details */}
            {((order.packagingUsdCents && order.packagingUsdCents > 0) || (order.deliveryUsdCents && order.deliveryUsdCents > 0)) ? (() => {
              const rate = parseFloat(order.rateSnapshotBsPerUsd || "0") || 1;
              return (
                <details className="group shrink-0 relative">
                  <summary className="flex items-center gap-0.5 text-slate-500 font-bold cursor-pointer select-none">
                    <span>↳ Ver recargos</span>
                    <ChevronDown className="h-3 w-3 text-slate-400 group-open:rotate-180 transition-transform" />
                  </summary>
                  <div className="absolute left-0 bottom-full mb-1 z-20 w-48 bg-white border border-slate-200 rounded-lg p-2 shadow-lg space-y-1 text-[11px] text-slate-600">
                    {order.packagingUsdCents > 0 && (
                      <div className="flex justify-between gap-1">
                        <span>📦 Empaque</span>
                        <span className="font-mono text-right font-bold">{formatBs(usdCentsToBsCents(order.packagingUsdCents, rate))}</span>
                      </div>
                    )}
                    {order.deliveryUsdCents > 0 && (
                      <div className="flex justify-between gap-1">
                        <span>🛵 Delivery</span>
                        <span className="font-mono text-right font-bold">{formatBs(usdCentsToBsCents(order.deliveryUsdCents, rate))}</span>
                      </div>
                    )}
                  </div>
                </details>
              );
            })() : <div />}

            {/* Comprobante */}
            {comprobanteUrl && (
              <button
                onClick={() => setLightboxOpen(true)}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-bold hover:bg-slate-200 transition-colors active:scale-95 shrink-0"
              >
                <Receipt className="h-3 w-3" />
                <span>Comprobante</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Total & Ref USD */}
        <div className="text-right shrink-0">
          <span className="font-black text-slate-800 text-base block leading-none">
            {formatBs(order.grandTotalBsCents)}
          </span>
          {order.grandTotalUsdCents != null && (
            <span className="font-semibold text-[11px] text-slate-400 block mt-1">
              (Ref ${(order.grandTotalUsdCents / 100).toFixed(2)})
            </span>
          )}
        </div>
      </div>

      {/* Fila 5: Botones de Acción (Full Width, py-3) */}
      {(actions.length > 0 || canCancel || canSendToKitchen) && (
        <div className="flex flex-col gap-1.5 mt-2 border-t border-slate-100/50 pt-2">
          {canSendToKitchen && (
            <button
              onClick={() =>
                mutation.mutate(
                  { actionType: "mark_kitchen" },
                  { onSuccess: () => toast.success(`Pedido #${order.orderNumber} enviado a cocina`) },
                )
              }
              disabled={mutation.isPending}
              className="w-full inline-flex items-center justify-center gap-1.5 py-3 rounded-lg bg-orange-600 text-white text-sm font-black uppercase tracking-wide hover:bg-orange-700 active:bg-orange-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {mutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ChefHat className="h-3.5 w-3.5" />}
              Enviar a cocina
            </button>
          )}
          {actions.map((action) => {
            const Icon = action.icon;
            const onClick =
              action.action === "confirm_with_ref"
                ? () => {
                  setFields({
                    paymentReference: "",
                    phone: order.customerPhone ?? "",
                    customerName: order.customerName ?? "",
                    cedula: "",
                  });
                  setErrors({});
                  setTouched({});
                  setRefDialogOpen(true);
                }
                : () =>
                  mutation.mutate(
                    { actionType: action.action },
                    {
                      onSuccess: () =>
                        toast.success(`Pedido #${order.orderNumber} actualizado`),
                    },
                  );
            return (
              <button
                key={action.action}
                onClick={onClick}
                disabled={mutation.isPending}
                className="w-full inline-flex items-center justify-center gap-1.5 py-3 rounded-lg bg-red-600 text-white text-sm font-black uppercase tracking-wide hover:bg-red-700 active:bg-red-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {mutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Icon className="h-3.5 w-3.5" />
                )}
                {action.label}
              </button>
            );
          })}

          {canCancel && (
            <button
              onClick={handleCancel}
              disabled={mutation.isPending}
              className="w-full inline-flex items-center justify-center gap-1.5 py-3 rounded-lg border border-red-200 text-red-600 text-sm font-black uppercase tracking-wide hover:bg-red-50 active:bg-red-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Ban className="h-3.5 w-3.5" />
              Cancelar pedido
            </button>
          )}
        </div>
      )}

      {/* Lightbox del comprobante */}
      {lightboxOpen && comprobanteUrl && (
        <ComprobanteLightbox url={comprobanteUrl} onClose={() => setLightboxOpen(false)} />
      )}

      {/* Diálogo de confirmación con referencia (pre-llenado) */}
      <ReferenceDialog
        open={refDialogOpen}
        fields={fields}
        errors={errors}
        touched={touched}
        isPending={mutation.isPending}
        onChange={setField}
        onBlur={(k) => setTouched((t) => ({ ...t, [k]: true }))}
        onConfirm={handleConfirmWithRef}
        onClose={() => setRefDialogOpen(false)}
        onForceManual={handleForceManual}
      />
    </div>
  );
}
