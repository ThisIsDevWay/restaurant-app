"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatBs } from "@/lib/money";
import { formatPhone, cn, isRealPhone } from "@/lib/utils";
import { formatOrderTime } from "@/lib/utils/format-relative-time";
import { formatItems } from "@/lib/utils/format-items";
import { OrderStatusBadge } from "@/components/admin/orders/OrderStatusBadge";
import { QuickActions } from "@/components/admin/orders/QuickActions";
import { OrderModeChip } from "@/components/admin/orders/OrderModeChip";
import { checkoutFlowState } from "@/lib/payments/checkout-flow";
import { Clock, Phone, FileText, CheckCircle2, AlertCircle, Ban } from "lucide-react";
import { STATUS_STYLES, type OrderStatus } from "@/lib/constants/order-status";

export interface OrderListItem {
  id: string;
  orderNumber?: number;
  status: string;
  subtotalBsCents: number;
  grandTotalBsCents: number;
  grandTotalUsdCents?: number;
  customerPhone: string;
  customerName?: string | null;
  createdAt: Date;
  paymentMethod: string;
  paymentProvider?: string;
  itemsSnapshot: unknown;
  orderMode: string | null;
  tableNumber?: string | null;
  paymentMetadata?: { uploadedUrl?: string; cashAmountUsd?: string; acceptChangeBs?: boolean; outcome?: "confirmed" | "manual"; [key: string]: any } | null;
  expiresAt?: Date | string | null;
}

const USD_METHODS = ["Zelle", "Binance", "Efectivo $"];

function OrderCountdown({ expiresAt, status }: { expiresAt: Date | string | null | undefined; status: string }) {
  const [timeLeft, setTimeLeft] = useState<string>("");

  useEffect(() => {
    if (status !== "pending" && status !== "whatsapp") return;
    if (!expiresAt) return;

    const target = new Date(expiresAt).getTime();

    const update = () => {
      const diff = target - Date.now();
      if (diff <= 0) {
        setTimeLeft("Expirado");
        return;
      }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${mins}:${String(secs).padStart(2, "0")}`);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, status]);

  if ((status !== "pending" && status !== "whatsapp") || !expiresAt || !timeLeft) return null;

  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border tabular-nums leading-none shrink-0",
      timeLeft === "Expirado"
        ? "bg-red-50 text-red-700 border-red-200"
        : "bg-amber-50 text-amber-700 border-amber-200 animate-pulse"
    )}>
      <Clock className="w-2.5 h-2.5" />
      {timeLeft}
    </span>
  );
}

function FlowBadge({ order }: { order: OrderListItem }) {
  const state = checkoutFlowState(order);

  if (state === "terminated") return null;

  const config = {
    complete: {
      icon: CheckCircle2,
      label: "Flujo completo",
      className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    incomplete: {
      icon: AlertCircle,
      label: "Pendiente cliente",
      className: "bg-amber-50 text-amber-700 border-amber-200",
    },
  }[state];

  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] font-semibold",
        config.className
      )}
    >
      <Icon className="w-2.5 h-2.5" />
      {config.label}
    </span>
  );
}

export function OrderCard({ order }: { order: OrderListItem }) {
  const router = useRouter();
  const items = order.itemsSnapshot as Array<{ name: string }>;
  const orderMode = order.orderMode ?? "delivery";
  const isUsd = USD_METHODS.includes(order.paymentMethod);

  return (
    <div
      className={cn(
        "bg-card border border-border border-l-4 rounded-xl p-4 cursor-pointer active:scale-[0.98] transition-all shadow-sm hover:shadow-md",
        STATUS_STYLES[order.status as OrderStatus]?.borderAccent ?? "border-l-muted"
      )}
      onClick={() => router.push(`/admin/orders/${order.id}`)}
    >
      {/* Row 1: Number + Status + Flow indicator */}
      <div className="flex items-start justify-between mb-3 gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center px-2 py-1 rounded-md bg-primary/10 text-primary font-bold text-sm tracking-tight border border-primary/10">
            #{order.orderNumber ?? order.id.slice(0, 8)}
          </span>
          <OrderModeChip mode={orderMode} className="py-1 px-2 text-[10px]" />
          {order.tableNumber && orderMode === "on_site" && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-bold text-[10px] tracking-tight border border-amber-200">
              Mesa {order.tableNumber}
            </span>
          )}
          {order.tableNumber && orderMode === "take_away" && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-sky-100 text-sky-700 font-bold text-[10px] tracking-tight border border-sky-200">
              {order.tableNumber}
            </span>
          )}
          {order.tableNumber && orderMode === "delivery" && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 font-bold text-[10px] tracking-tight border border-violet-200 max-w-[160px] truncate">
              {order.tableNumber}
            </span>
          )}
          <OrderCountdown expiresAt={order.expiresAt} status={order.status} />
          {order.paymentMetadata?.outcome === "confirmed" && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px] border border-emerald-200 leading-none shrink-0">
              Auto
            </span>
          )}
          {order.paymentMetadata?.outcome === "manual" && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 font-bold text-[10px] border border-sky-200 leading-none shrink-0">
              Manual
            </span>
          )}
        </div>

        {/* Status + flow badge stacked */}
        <div className="flex flex-col items-end gap-1 shrink-0">
          <OrderStatusBadge status={order.status} />
          <FlowBadge order={order} />
        </div>
      </div>

      {/* Row 2: Customer Info + Time */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {order.customerName && (
          <div className="flex items-center gap-1.5 px-2 py-1 bg-primary/5 rounded-lg text-xs font-bold text-primary border border-primary/10">
            {order.customerName}
          </div>
        )}
        {order.customerPhone && isRealPhone(order.customerPhone) && (
          <div className="flex items-center gap-1.5 px-2 py-1 bg-stone-100 rounded-lg text-xs font-medium text-text-main border border-border/50">
            <Phone className="h-3 w-3 text-text-muted/70" />
            <span className="font-mono">{formatPhone(order.customerPhone)}</span>
          </div>
        )}
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

      {/* Row 4: Total + Payment method + Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-border/50">
        <div className="flex flex-col">
          <span className="text-[10px] text-text-muted/80 uppercase tracking-widest font-semibold mb-0.5">Total</span>
          <span className="text-lg font-bold tracking-tight leading-none">
            {isUsd && order.grandTotalUsdCents != null
              ? <span className="text-sky-700">${(order.grandTotalUsdCents / 100).toFixed(2)}</span>
              : <span className="text-emerald-700">{formatBs(order.grandTotalBsCents)}</span>
            }
          </span>
          {isUsd && order.grandTotalUsdCents != null && (
            <span className="text-[10px] text-text-muted/60 mt-0.5 tabular-nums">
              ≈ {formatBs(order.grandTotalBsCents)}
            </span>
          )}
          <span className="text-[10px] text-text-muted/70 mt-0.5 font-medium">{order.paymentMethod}</span>
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
