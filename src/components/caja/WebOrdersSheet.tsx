"use client";

import { useState } from "react";
import {
  Globe,
  Clock,
  Receipt,
  Ban,
  ChefHat,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatBs } from "@/lib/money";
import { formatOrderTime } from "@/lib/utils/format-relative-time";
import { cn } from "@/lib/utils";
import { OrderModeChip } from "@/components/admin/orders/OrderModeChip";
import { OrderStatusBadge } from "@/components/admin/orders/OrderStatusBadge";
import { LocationBadge, CustomerInfo } from "@/components/waiter/ActiveOrdersSheet";
import { ComprobanteLightbox } from "@/components/admin/orders/ComprobanteLightbox";
import { ReferenceDialog, type RefFields } from "@/components/admin/orders/ReferenceDialog";
import { useOrderActionMutation } from "@/hooks/useOrderActionMutation";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { ACTION_MAP, STATUS_STYLES, type OrderStatus } from "@/lib/constants/order-status";

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

  const actions = ACTION_MAP[status] ?? [];
  const canCancel = status === "pending" || status === "whatsapp";
  const canSendToKitchen = status === "paid";

  return (
    <div
      className={cn(
        "w-full bg-white rounded-2xl p-4 shadow-sm border-l-4 border border-transparent",
        STATUS_STYLES[status]?.borderAccent ?? "border-l-slate-200",
      )}
    >
      {/* Row 1: # + Mode + Location + Status */}
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-primary/10 text-primary font-black text-sm tracking-tight border border-primary/10 shrink-0">
            #{order.orderNumber}
          </span>
          <OrderModeChip mode={order.orderMode ?? "on_site"} />
          <LocationBadge order={order} />
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      {/* Row 2: Customer */}
      <div className="mb-3">
        <CustomerInfo order={order} />
      </div>

      {/* Items snapshot — auditoría inline (no carga al carrito) */}
      {items.length > 0 && (
        <div className="mb-3 space-y-1 pl-2 border-l-2 border-slate-100 text-xs text-slate-600">
          {items.map((item, idx) => {
            const extras = [
              ...(item.selectedAdicionales ?? []).map(
                (a: any) => `+ ${a.name}${a.quantity > 1 ? ` (x${a.quantity})` : ""}`,
              ),
              ...(item.selectedBebidas ?? []).map(
                (b: any) => `+ ${b.name}${b.quantity > 1 ? ` (x${b.quantity})` : ""}`,
              ),
            ];
            return (
              <div key={idx} className="flex justify-between gap-2">
                <span className="min-w-0">
                  <span className="font-semibold text-slate-700">
                    {item.quantity}x {item.name}
                  </span>
                  {extras.length > 0 && (
                    <span className="block pl-3 text-[10px] text-slate-400">
                      {extras.join(", ")}
                    </span>
                  )}
                </span>
                <span className="font-mono text-slate-500 shrink-0">
                  {formatBs(item.itemTotalBsCents)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Comprobante */}
      {comprobanteUrl && (
        <button
          onClick={() => setLightboxOpen(true)}
          className="mb-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-colors active:scale-95"
        >
          <Receipt className="h-3.5 w-3.5" />
          Ver comprobante
        </button>
      )}

      {/* Row 3: Time + Total + Method */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-100 gap-2">
        <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-50 px-2 py-1 rounded-full shrink-0">
          <Clock size={10} />
          <span>{formatOrderTime(order.createdAt)}</span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-base font-black text-slate-900 leading-tight">
            {formatBs(order.grandTotalBsCents)}
          </span>
          {order.paymentMethod && (
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
              {order.paymentMethod}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      {(actions.length > 0 || canCancel || canSendToKitchen) && (
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          {canSendToKitchen && (
            <button
              onClick={() =>
                mutation.mutate(
                  { actionType: "mark_kitchen" },
                  { onSuccess: () => toast.success(`Pedido #${order.orderNumber} enviado a cocina`) },
                )
              }
              disabled={mutation.isPending}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-orange-600 text-white text-xs font-bold uppercase tracking-tight hover:bg-orange-700 active:bg-orange-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-red-600 text-white text-xs font-bold uppercase tracking-tight hover:bg-red-700 active:bg-red-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-red-300 text-red-600 text-xs font-bold uppercase tracking-tight hover:bg-red-50 active:bg-red-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Ban className="h-3.5 w-3.5" />
              Cancelar
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
      />
    </div>
  );
}
