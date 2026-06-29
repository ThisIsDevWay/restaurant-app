"use client";

import { ChefHat, Clock, Phone, MapPin, User, CheckCircle2, CircleDollarSign } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatBs } from "@/lib/money";
import { formatPhone, isRealPhone, isOrderLockedByCashier } from "@/lib/utils";
import { formatOrderTime } from "@/lib/utils/format-relative-time";
import { OrderModeChip } from "@/components/admin/orders/OrderModeChip";
import { OrderStatusBadge } from "@/components/admin/orders/OrderStatusBadge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ActiveOrdersSheetProps {
  isOpen: boolean;
  onClose: () => void;
  orders: any[];
  onSelect: (order: any) => void;
  title?: string;
  emptyText?: string;
  isWaiter?: boolean;
}

const STATUS_ACCENT: Record<string, string> = {
  paid: "border-l-emerald-500",
  kitchen: "border-l-orange-500",
  delivered: "border-l-green-600",
  whatsapp: "border-l-blue-500",
  pending: "border-l-amber-400",
};

export function LocationBadge({ order }: { order: any }) {
  const mode = order.orderMode ?? "on_site";
  const table = order.tableNumber as string | null | undefined;

  if (mode === "on_site") {
    return table ? (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 font-bold text-[10px] tracking-tight border border-amber-200">
        Mesa {table}
      </span>
    ) : (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 font-bold text-[10px] tracking-tight border border-slate-200">
        En sitio
      </span>
    );
  }

  if (mode === "take_away") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-100 text-sky-700 font-bold text-[10px] tracking-tight border border-sky-200 max-w-[140px] truncate">
        {table || "Para llevar"}
      </span>
    );
  }

  // delivery
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-violet-100 text-violet-700 font-bold text-[10px] tracking-tight border border-violet-200 max-w-[140px] truncate">
      <MapPin className="h-2.5 w-2.5 shrink-0" />
      <span className="truncate">{table || "Domicilio"}</span>
    </span>
  );
}

function PaymentBadge({ order }: { order: any }) {
  return order.paidAt ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 font-bold text-[10px] tracking-tight border border-emerald-200">
      <CheckCircle2 className="h-2.5 w-2.5" /> Cobrado
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 font-bold text-[10px] tracking-tight border border-amber-200">
      <CircleDollarSign className="h-2.5 w-2.5" /> Por cobrar
    </span>
  );
}

export function CustomerInfo({ order }: { order: any }) {
  const name = order.customerName as string | null | undefined;
  const phone = order.customerPhone as string | null | undefined;
  const isSynthetic = !isRealPhone(phone);

  if (name) {
    return (
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-sm font-bold text-slate-900 line-clamp-1">{name}</span>
        {!isSynthetic && (
          <span className="text-[11px] font-mono text-slate-400 line-clamp-1 flex items-center gap-1">
            <Phone className="h-2.5 w-2.5" />
            {formatPhone(phone!)}
          </span>
        )}
      </div>
    );
  }

  if (!isSynthetic && phone) {
    return (
      <span className="text-sm font-bold text-slate-700 font-mono line-clamp-1 flex items-center gap-1">
        <Phone className="h-3 w-3 text-slate-400" />
        {formatPhone(phone)}
      </span>
    );
  }

  return (
    <span className="text-sm text-slate-400 italic flex items-center gap-1">
      <User className="h-3 w-3" />
      En sitio
    </span>
  );
}

export function ActiveOrdersSheet({
  isOpen,
  onClose,
  orders,
  onSelect,
  title = "Órdenes Activas",
  emptyText = "No hay órdenes activas",
  isWaiter = false,
}: ActiveOrdersSheetProps) {
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col bg-slate-50">
        <SheetHeader className="px-6 py-5 bg-white border-b shrink-0">
          <SheetTitle className="flex items-center justify-between">
            <span className="text-xl font-display font-black text-slate-900">
              {title}
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
              <ChefHat size={48} className="mb-3" />
              <p className="font-bold text-slate-700">{emptyText}</p>
              <p className="text-xs text-slate-500 mt-1">Las órdenes del día aparecerán aquí</p>
            </div>
          ) : (
            orders.map((order) => {
              const isLocked = isOrderLockedByCashier(order);
              const isWebOrder = !!order.checkoutToken;
              return (
                <div
                  key={order.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    if (isWebOrder) {
                      toast.error("Los pedidos realizados desde la web no se pueden editar en caja.");
                      return;
                    }
                    if (isWaiter && isLocked) {
                      toast.error("El pedido está cargado en Caja y no puede ser modificado.");
                      return;
                    }
                    onSelect(order);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      if (isWebOrder) {
                        toast.error("Los pedidos realizados desde la web no se pueden editar en caja.");
                        return;
                      }
                      if (isWaiter && isLocked) {
                        toast.error("El pedido está cargado en Caja y no puede ser modificado.");
                        return;
                      }
                      onSelect(order);
                    }
                  }}
                  className={cn(
                    "w-full text-left bg-white rounded-2xl p-4 shadow-sm cursor-pointer",
                    "border-l-4 border border-transparent",
                    "hover:shadow-md hover:border-primary/30 transition-all group",
                    STATUS_ACCENT[order.status as string] ?? "border-l-slate-200",
                    ((isWaiter && isLocked) || isWebOrder) && "opacity-70 cursor-not-allowed hover:shadow-sm hover:border-transparent"
                  )}
                >
                  {/* Row 1: # + Mode + Status */}
                  <div className="flex items-center justify-between mb-3 gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-wrap">
                      {/* Order number pill */}
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-primary/10 text-primary font-black text-sm tracking-tight border border-primary/10 group-hover:bg-primary group-hover:text-white transition-colors shrink-0">
                        #{order.orderNumber}
                      </span>
                      <OrderModeChip mode={order.orderMode ?? "on_site"} />
                      <LocationBadge order={order} />
                      <PaymentBadge order={order} />
                      {isWebOrder && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-100 text-sky-700 font-bold text-[10px] tracking-tight border border-sky-200 shrink-0">
                          🌐 Web
                        </span>
                      )}
                      {isLocked && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 font-bold text-[10px] tracking-tight border border-rose-200 shrink-0">
                          🔒 En Caja
                        </span>
                      )}
                    </div>
                    <OrderStatusBadge status={order.status} />
                  </div>

                  {/* Row 2: Customer */}
                  <div className="mb-3">
                    <CustomerInfo order={order} />
                  </div>

                  {/* Row 3: Time + Total + Payment */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 gap-2">
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-50 px-2 py-1 rounded-full shrink-0">
                      <Clock size={10} />
                      <span>{formatOrderTime(order.createdAt)}</span>
                    </div>

                    <div className="flex flex-col items-end">
                      <span className="text-base font-black text-slate-900 group-hover:text-primary transition-colors leading-tight">
                        {formatBs(order.grandTotalBsCents)}
                      </span>
                      {order.paymentMethod && (
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                          {order.paymentMethod}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
