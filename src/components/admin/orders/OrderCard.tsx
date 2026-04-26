"use client";

import { useRouter } from "next/navigation";
import { formatBs } from "@/lib/money";
import { formatPhone, cn } from "@/lib/utils";
import { formatOrderTime } from "@/lib/utils/format-relative-time";
import { formatItems } from "@/lib/utils/format-items";
import { formatProvider } from "@/lib/payments/format-provider";
import { OrderStatusBadge } from "@/components/admin/orders/OrderStatusBadge";
import { QuickActions } from "@/components/admin/orders/QuickActions";
import { OrderModeChip } from "@/components/admin/orders/OrderModeChip";
import { Clock, Phone, FileText } from "lucide-react";
import type { OrderStatus } from "@/lib/constants/order-status";

export interface OrderListItem {
  id: string;
  orderNumber?: number;
  status: string;
  subtotalBsCents: number;
  grandTotalBsCents: number;
  customerPhone: string;
  createdAt: Date;
  paymentMethod: string;
  paymentProvider?: string;
  itemsSnapshot: unknown;
  orderMode: string | null;
  tableNumber?: string | null;
}

export function OrderCard({ order }: { order: OrderListItem }) {
  const router = useRouter();
  const items = order.itemsSnapshot as Array<{ name: string }>;
  const orderMode = order.orderMode ?? "delivery";


  const statusColors: Record<string, string> = {
    pending: "border-l-amber-500",
    whatsapp: "border-l-blue-500",
    paid: "border-l-emerald-500",
    kitchen: "border-l-orange-500",
    delivered: "border-l-green-600",
    expired: "border-l-red-500",
    failed: "border-l-red-600",
    cancelled: "border-l-red-700",
  };

  return (
    <div
      className={cn(
        "bg-card border border-border border-l-4 rounded-xl p-4 cursor-pointer active:scale-[0.98] transition-all shadow-sm hover:shadow-md",
        statusColors[order.status] ?? "border-l-muted"
      )}
      onClick={() => router.push(`/admin/orders/${order.id}`)}
    >
      {/* Row 1: Number + Status */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-2 py-1 rounded-md bg-primary/10 text-primary font-bold text-sm tracking-tight border border-primary/10">
            #{order.orderNumber ?? order.id.slice(0, 8)}
          </span>
          <OrderModeChip mode={orderMode} className="py-1 px-2 text-[10px]" />
          {order.tableNumber && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-bold text-[10px] tracking-tight border border-amber-200">
              MESA {order.tableNumber}
            </span>
          )}
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      {/* Row 2: Customer Info + Time */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="flex items-center gap-1.5 px-2 py-1 bg-stone-100 rounded-lg text-xs font-medium text-text-main border border-border/50">
          <Phone className="h-3 w-3 text-text-muted/70" />
          <span className="font-mono">{formatPhone(order.customerPhone)}</span>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 bg-stone-100 rounded-lg text-xs font-medium text-text-main border border-border/50">
          <Clock className="h-3 w-3 text-text-muted/70" />
          <span>{formatOrderTime(order.createdAt)}</span>
        </div>
      </div>

      {/* Row 3: Items */}
      <div className="flex items-start gap-1.5 mb-4">
        <FileText className="h-4 w-4 text-text-muted/50 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-text-muted line-clamp-1 italic max-w-full">
          {formatItems(items, 3)}
        </p>
      </div>

      {/* Row 4: Total + Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-border/50">
        <div className="flex flex-col">
          <span className="text-[10px] text-text-muted/80 uppercase tracking-widest font-semibold mb-0.5">Total</span>
          <span className="text-lg font-bold text-emerald-700 tracking-tight leading-none">
            {formatBs(order.grandTotalBsCents)}
          </span>
        </div>
        <QuickActions
          orderId={order.id}
          orderStatus={order.status as OrderStatus}
          compact
        />
      </div>
    </div>
  );
}
