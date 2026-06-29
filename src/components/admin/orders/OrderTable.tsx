"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatBs } from "@/lib/money";
import { formatPhone, cn, isRealPhone } from "@/lib/utils";
import { formatOrderTime } from "@/lib/utils/format-relative-time";
import { formatItems } from "@/lib/utils/format-items";
import { OrderStatusBadge } from "@/components/admin/orders/OrderStatusBadge";
import { OrderModeChip } from "@/components/admin/orders/OrderModeChip";
import { QuickActions } from "@/components/admin/orders/QuickActions";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { ShoppingBag, Clock } from "lucide-react";
import type { OrderListItem } from "@/components/admin/orders/OrderCard";
import { STATUS_STYLES, type OrderStatus } from "@/lib/constants/order-status";

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

const USD_METHODS = ["Zelle", "Binance", "Efectivo $"];

/*
 * ── Column layout ───────────────────────────────────────────
 * [accent 4px] [Orden 10%] [Hora 8%] [Cliente 11%] [Detalle auto]
 * [Total 9%] [Pago 9%] [Estado 14%] [Vía 8%] [Acciones 11%]
 */
const COL_WIDTHS = ["4px", "10%", "8%", "11%", "", "9%", "9%", "14%", "8%", "11%"] as const;

/* ── Specific status label ─────────────────────────────────── */
interface StatusLabel { label: string; className: string }

function specificStatus(order: OrderListItem): StatusLabel {
  const meta = order.paymentMetadata as any;
  const hasComprobante = !!meta?.uploadedUrl;
  const isEfectivo = order.paymentMethod === "Efectivo $";

  switch (order.status) {
    case "pending":
      if (isEfectivo) return { label: "Pago al recibir", className: "text-teal-700 bg-teal-50 border-teal-200" };
      if (hasComprobante) return { label: "Comprobante ✓", className: "text-sky-700 bg-sky-50 border-sky-200" };
      return { label: "Esperando pago", className: "text-amber-700 bg-amber-50 border-amber-200" };

    case "whatsapp":
      if (isEfectivo) return { label: "Pago al recibir", className: "text-teal-700 bg-teal-50 border-teal-200" };
      if (hasComprobante) return { label: "Comprobante cargado", className: "text-sky-700 bg-sky-50 border-sky-200" };
      return { label: "Sin comprobante", className: "text-amber-700 bg-amber-50 border-amber-200" };

    case "paid": return { label: "Pago confirmado", className: "text-emerald-700 bg-emerald-50 border-emerald-200" };
    case "kitchen": return { label: "En preparación", className: "text-orange-700 bg-orange-50 border-orange-200" };
    case "delivered": return { label: "Entregado", className: "text-slate-600 bg-slate-50 border-slate-200" };
    case "expired": return { label: "Expirado", className: "text-slate-500 bg-slate-50 border-slate-200" };
    case "failed": return { label: "Pago rechazado", className: "text-red-700 bg-red-50 border-red-200" };
    case "cancelled": return { label: "Cancelado", className: "text-red-700 bg-red-50 border-red-200" };
    default: return { label: order.status, className: "text-text-muted bg-surface-section border-border" };
  }
}

/* ── Component ─────────────────────────────────────────────── */
export function OrderTable({
  orders,
  suppressEmpty = false,
}: {
  orders: OrderListItem[];
  suppressEmpty?: boolean;
}) {
  const router = useRouter();

  if (orders.length === 0) {
    if (suppressEmpty) return null;
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/40 ring-1 ring-border/40">
          <ShoppingBag className="h-7 w-7 text-text-muted/40" />
        </div>
        <p className="text-sm font-semibold text-text-main">Sin órdenes</p>
        <p className="text-xs text-text-muted mt-1">No hay órdenes en esta categoría</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table className="table-fixed w-full min-w-[900px]">
        <colgroup>
          {COL_WIDTHS.map((w, i) => (
            <col key={i} style={w ? { width: w } : undefined} />
          ))}
        </colgroup>

        {/* ── Header ── */}
        <TableHeader>
          <TableRow className="bg-bg-app border-b border-border/60 hover:bg-bg-app select-none">
            <TableHead className="p-0 border-0" aria-hidden />
            <TableHead className="px-4 py-3 text-[10px] font-bold text-text-muted/70 uppercase tracking-widest text-left">Orden</TableHead>
            <TableHead className="px-4 py-3 text-[10px] font-bold text-text-muted/70 uppercase tracking-widest text-left">Hora</TableHead>
            <TableHead className="px-4 py-3 text-[10px] font-bold text-text-muted/70 uppercase tracking-widest text-left">Cliente</TableHead>
            <TableHead className="px-4 py-3 text-[10px] font-bold text-text-muted/70 uppercase tracking-widest text-left">Detalle</TableHead>
            <TableHead className="px-4 py-3 text-[10px] font-bold text-text-muted/70 uppercase tracking-widest text-left">Total</TableHead>
            <TableHead className="px-4 py-3 text-[10px] font-bold text-text-muted/70 uppercase tracking-widest text-left hidden md:table-cell">Pago</TableHead>
            <TableHead className="px-4 py-3 text-[10px] font-bold text-text-muted/70 uppercase tracking-widest text-left">Estado</TableHead>
            <TableHead className="px-4 py-3 text-[10px] font-bold text-text-muted/70 uppercase tracking-widest text-left">Vía</TableHead>
            <TableHead className="py-3 pl-4 pr-6 text-[10px] font-bold text-text-muted/70 uppercase tracking-widest text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>

        {/* ── Body ── */}
        <TableBody>
          {orders.map((order) => {
            const { label: stateLabel, className: stateClass } = specificStatus(order);
            const isUsd = USD_METHODS.includes(order.paymentMethod);

            return (
              <TableRow
                key={order.id}
                className={cn(
                  "border-b border-border/40 cursor-pointer group",
                  "transition-colors duration-100 hover:bg-primary/[0.025]"
                )}
                onClick={() => router.push(`/admin/orders/${order.id}`)}
              >
                {/* Accent bar */}
                <TableCell className="p-0 h-full relative border-0">
                  <div
                    className={cn(
                      "absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full opacity-90 transition-opacity group-hover:opacity-100",
                      STATUS_STYLES[order.status as OrderStatus]?.accentBg ?? "bg-border/40"
                    )}
                  />
                </TableCell>

                {/* Orden */}
                <TableCell className="px-4 py-3 align-middle">
                  <div className="flex flex-col gap-1 items-start">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold text-xs tracking-tight w-fit mt-0.5">
                      #{order.orderNumber ?? order.id.slice(0, 6)}
                    </span>
                    <OrderModeChip mode={order.orderMode ?? "delivery"} />
                    {order.tableNumber && order.orderMode === "on_site" && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-bold text-[10px] tracking-tight border border-amber-200">
                        Mesa {order.tableNumber}
                      </span>
                    )}
                    {order.tableNumber && order.orderMode === "take_away" && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-sky-100 text-sky-700 font-bold text-[10px] tracking-tight border border-sky-200 max-w-[9rem] truncate">
                        {order.tableNumber}
                      </span>
                    )}
                    {order.tableNumber && order.orderMode === "delivery" && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 font-bold text-[10px] tracking-tight border border-violet-200 max-w-[9rem] truncate">
                        {order.tableNumber}
                      </span>
                    )}
                    <OrderCountdown expiresAt={order.expiresAt} status={order.status} />
                    {order.paymentMetadata?.outcome === "confirmed" && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px] border border-emerald-200 leading-none">
                        Auto
                      </span>
                    )}
                    {order.paymentMetadata?.outcome === "manual" && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 font-bold text-[10px] border border-sky-200 leading-none">
                        Manual
                      </span>
                    )}
                  </div>
                </TableCell>

                {/* Hora */}
                <TableCell className="px-4 py-3 align-middle">
                  <span className="text-xs text-text-muted tabular-nums">
                    {formatOrderTime(order.createdAt)}
                  </span>
                </TableCell>

                {/* Cliente */}
                <TableCell className="px-4 py-3 align-middle">
                  <div className="flex flex-col gap-0.5">
                    {order.customerName && (
                      <span className="text-[13px] font-bold text-text-main truncate">
                        {order.customerName}
                      </span>
                    )}
                    {order.customerPhone && isRealPhone(order.customerPhone) && (
                      <span className="text-[11px] text-text-muted tabular-nums font-mono">
                        {formatPhone(order.customerPhone)}
                      </span>
                    )}
                  </div>
                </TableCell>

                {/* Detalle */}
                <TableCell className="px-4 py-3 align-middle overflow-hidden">
                  <span className="text-sm text-text-muted/90 italic truncate block">
                    {formatItems(order.itemsSnapshot as Array<{ name: string }>, 2)}
                  </span>
                </TableCell>

                {/* Total */}
                <TableCell className="px-4 py-3 align-middle">
                  <div className="flex flex-col gap-0">
                    <span className={cn(
                      "text-[15px] font-bold tabular-nums leading-tight",
                      isUsd ? "text-sky-700" : "text-emerald-600"
                    )}>
                      {isUsd && order.grandTotalUsdCents != null
                        ? `$${(order.grandTotalUsdCents / 100).toFixed(2)}`
                        : formatBs(order.grandTotalBsCents)
                      }
                    </span>
                    {isUsd && order.grandTotalUsdCents != null && (
                      <span className="text-[10px] text-text-muted/60 tabular-nums">
                        ≈ {formatBs(order.grandTotalBsCents)}
                      </span>
                    )}
                  </div>
                </TableCell>

                {/* Pago */}
                <TableCell className="hidden md:table-cell px-4 py-3 align-middle overflow-hidden">
                  <span className="text-[11px] font-semibold tracking-wide text-text-muted uppercase truncate block">
                    {order.paymentMethod}
                  </span>
                </TableCell>

                {/* Estado — específico y corto */}
                <TableCell className="px-4 py-3 align-middle">
                  <span className={cn(
                    "inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-semibold whitespace-nowrap",
                    stateClass
                  )}>
                    {stateLabel}
                  </span>
                </TableCell>

                {/* Vía — badge del pipeline (antes en "Estado") */}
                <TableCell className="px-4 py-3 align-middle">
                  <OrderStatusBadge status={order.status} />
                </TableCell>

                {/* Acciones */}
                <TableCell
                  className="py-3 pl-4 pr-6 align-middle"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex justify-end pr-2">
                    <QuickActions
                      orderId={order.id}
                      orderStatus={order.status as OrderStatus}
                      paymentMethod={order.paymentMethod}
                    />
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
