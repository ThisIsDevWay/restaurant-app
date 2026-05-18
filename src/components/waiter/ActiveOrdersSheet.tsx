"use client";

import { ChefHat, Clock, Phone, MapPin, User, Wallet, CheckCircle2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatBs } from "@/lib/money";
import { formatPhone } from "@/lib/utils";
import { formatOrderTime } from "@/lib/utils/format-relative-time";
import { OrderModeChip } from "@/components/admin/orders/OrderModeChip";
import { OrderStatusBadge } from "@/components/admin/orders/OrderStatusBadge";
import { cn } from "@/lib/utils";

interface ActiveOrdersSheetProps {
  isOpen: boolean;
  onClose: () => void;
  orders: any[];
  onSelect: (order: any) => void;
  onCobrar: (order: any) => void;
}

const STATUS_ACCENT: Record<string, string> = {
  paid:      "border-l-emerald-500",
  kitchen:   "border-l-orange-500",
  delivered: "border-l-green-600",
  whatsapp:  "border-l-blue-500",
  pending:   "border-l-amber-400",
};

function LocationBadge({ order }: { order: any }) {
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
        {table || "Mostrador"}
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

function CustomerInfo({ order }: { order: any }) {
  const name = order.customerName as string | null | undefined;
  const phone = order.customerPhone as string | null | undefined;
  const isSynthetic = !phone || phone.startsWith("mesa-") || phone.startsWith("mesero-");

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
  onCobrar,
}: ActiveOrdersSheetProps) {
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col bg-slate-50">
        <SheetHeader className="px-6 py-5 bg-white border-b shrink-0">
          <SheetTitle className="flex items-center justify-between">
            <span className="text-xl font-display font-black text-slate-900">
              Órdenes Activas
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
              <p className="font-bold text-slate-700">No hay órdenes activas</p>
              <p className="text-xs text-slate-500 mt-1">Las órdenes del día aparecerán aquí</p>
            </div>
          ) : (
            orders.map((order) => (
              <div
                key={order.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelect(order)}
                onKeyDown={(e) => { if (e.key === "Enter") onSelect(order); }}
                className={cn(
                  "w-full text-left bg-white rounded-2xl p-4 shadow-sm cursor-pointer",
                  "border-l-4 border border-transparent",
                  "hover:shadow-md hover:border-primary/30 transition-all group",
                  STATUS_ACCENT[order.status as string] ?? "border-l-slate-200"
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

                {/* Row 4: Cobro */}
                <div className="mt-3 pt-3 border-t border-slate-100">
                  {order.paidAt ? (
                    <span className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-50 py-2 text-xs font-black uppercase tracking-widest text-emerald-600 border border-emerald-100">
                      <CheckCircle2 size={14} /> Cobrado
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onCobrar(order); }}
                      className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary py-2 text-xs font-black uppercase tracking-widest text-white shadow-sm transition-all hover:bg-primary/90 active:scale-[0.98]"
                    >
                      <Wallet size={14} /> Cobrar
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
