"use client";

import { useRouter } from "next/navigation";
import { formatBs } from "@/lib/money";
import { formatPhone } from "@/lib/utils";
import { formatOrderTime } from "@/lib/utils/format-relative-time";
import { formatItems } from "@/lib/utils/format-items";
import { formatProvider } from "@/lib/payments/format-provider";
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
import { ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OrderListItem } from "@/components/admin/orders/OrderCard";
import type { OrderStatus } from "@/lib/constants/order-status";

const STATUS_ACCENT: Record<string, string> = {
  pending: "bg-amber-400",
  pending_payment: "bg-amber-400",
  confirmed: "bg-sky-400",
  preparing: "bg-violet-400",
  ready: "bg-emerald-500",
  delivered: "bg-slate-300",
  cancelled: "bg-red-400",
};

/*
 *  Column budget — must sum to 100% of table width.
 *  Using % so it scales with the container.
 *  The accent bar is 4px absolute; we account for it in the first col.
 *
 *  [accent] [orden] [hora] [cliente] [detalle] [total] [pago] [estado] [acciones]
 *  [ 0%   ] [ 11%] [ 9% ] [ 13%  ] [ auto  ] [ 10%] [ 11%] [  9%  ] [  15%   ]
 *
 *  ACCIONES is 15% (~168px at 1120px table) — enough for icon + compact label.
 *  DETALLE gets whatever is left (flex fill).
 */
const COL_WIDTHS = ["4px", "11%", "9%", "13%", "", "10%", "11%", "9%", "15%"] as const;

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
      {/*
       * KEY FIX: `table-fixed` tells the browser to respect <colgroup> widths
       * instead of auto-sizing based on content. Without it, a wide button in
       * ACCIONES inflates that column and crushes everything else.
       */}
      <Table className="table-fixed w-full min-w-[820px]">
        <colgroup>
          {COL_WIDTHS.map((w, i) => (
            <col key={i} style={w ? { width: w } : undefined} />
          ))}
        </colgroup>

        {/* ── Header ───────────────────────────────────────────────────────── */}
        <TableHeader>
          <TableRow className="bg-bg-app border-b border-border/60 hover:bg-bg-app select-none">
            {/* accent spacer — no label */}
            <TableHead className="p-0 border-0" aria-hidden />

            <TableHead className="px-4 py-3 text-[10px] font-bold text-text-muted/70 uppercase tracking-widest text-left">
              Orden
            </TableHead>
            <TableHead className="px-4 py-3 text-[10px] font-bold text-text-muted/70 uppercase tracking-widest text-left">
              Hora
            </TableHead>
            <TableHead className="px-4 py-3 text-[10px] font-bold text-text-muted/70 uppercase tracking-widest text-left">
              Cliente
            </TableHead>
            <TableHead className="px-4 py-3 text-[10px] font-bold text-text-muted/70 uppercase tracking-widest text-left">
              Detalle
            </TableHead>
            <TableHead className="px-4 py-3 text-[10px] font-bold text-text-muted/70 uppercase tracking-widest text-left">
              Total
            </TableHead>
            <TableHead className="px-4 py-3 text-[10px] font-bold text-text-muted/70 uppercase tracking-widest text-left hidden md:table-cell">
              Pago
            </TableHead>
            <TableHead className="px-4 py-3 text-[10px] font-bold text-text-muted/70 uppercase tracking-widest text-left">
              Estado
            </TableHead>
            <TableHead className="py-3 pl-4 pr-6 text-[10px] font-bold text-text-muted/70 uppercase tracking-widest text-right">
              Acciones
            </TableHead>
          </TableRow>
        </TableHeader>

        {/* ── Body ─────────────────────────────────────────────────────────── */}
        <TableBody>
          {orders.map((order) => (
            <TableRow
              key={order.id}
              className={cn(
                "border-b border-border/40 cursor-pointer group",
                "transition-colors duration-100 hover:bg-primary/[0.025]"
              )}
              onClick={() => router.push(`/admin/orders/${order.id}`)}
            >
              {/* accent spacer (rendered as a div inside the cell) */}
              <TableCell className="p-0 h-full relative border-0">
                <div
                  className={cn(
                    "absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full",
                    "opacity-90 transition-opacity group-hover:opacity-100",
                    STATUS_ACCENT[order.status] ?? "bg-border/40"
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
                <span className="text-[13px] font-medium text-text-main tabular-nums">
                  {formatPhone(order.customerPhone)}
                </span>
              </TableCell>

              {/* Detalle */}
              <TableCell className="px-4 py-3 align-middle overflow-hidden">
                <span className="text-sm text-text-muted/90 italic truncate block">
                  {formatItems(order.itemsSnapshot as Array<{ name: string }>, 2)}
                </span>
              </TableCell>

              {/* Total */}
              <TableCell className="px-4 py-3 align-middle">
                <span className="text-[15px] font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {formatBs(order.subtotalBsCents)}
                </span>
              </TableCell>

              {/* Pago */}
              <TableCell className="hidden md:table-cell px-4 py-3 align-middle overflow-hidden">
                <span className="text-[11px] font-semibold tracking-wide text-text-muted uppercase truncate block">
                  {formatProvider(order.paymentProvider)}
                </span>
              </TableCell>

              {/* Estado */}
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
                  />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}