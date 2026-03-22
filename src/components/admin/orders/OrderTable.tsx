"use client";

import { useRouter } from "next/navigation";
import { formatBs } from "@/lib/money";
import { maskPhone } from "@/lib/utils";
import { formatOrderTime } from "@/lib/utils/format-relative-time";
import { formatItems } from "@/lib/utils/format-items";
import { formatProvider } from "@/lib/payments/format-provider";
import { OrderStatusBadge } from "@/components/admin/orders/OrderStatusBadge";
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
import type { OrderListItem } from "@/components/admin/orders/OrderCard";
import type { OrderStatus } from "@/lib/constants/order-status";

export function OrderTable({ orders }: { orders: OrderListItem[] }) {
  const router = useRouter();

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/5">
          <ShoppingBag className="h-7 w-7 text-primary/40" />
        </div>
        <p className="text-sm font-medium text-text-main">Sin órdenes</p>
        <p className="text-xs text-text-muted mt-1">
          No hay órdenes en esta categoría
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-bg-app/50">
          <TableHead className="w-16 font-semibold text-text-main pl-5">
            #
          </TableHead>
          <TableHead className="w-28 font-semibold text-text-main">
            Hora
          </TableHead>
          <TableHead className="w-28 font-semibold text-text-main">
            Teléfono
          </TableHead>
          <TableHead className="font-semibold text-text-main">
            Items
          </TableHead>
          <TableHead className="w-32 font-semibold text-text-main">
            Total
          </TableHead>
          <TableHead className="w-32 font-semibold text-text-main hidden md:table-cell">
            Método
          </TableHead>
          <TableHead className="w-28 font-semibold text-text-main">
            Estado
          </TableHead>
          <TableHead className="w-40 font-semibold text-text-main text-right pr-5">
            Acciones
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map((order) => (
          <TableRow
            key={order.id}
            className="border-border cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => router.push(`/admin/orders/${order.id}`)}
          >
            <TableCell className="pl-5 font-semibold text-sm">
              #{order.orderNumber ?? order.id.slice(0, 8)}
            </TableCell>
            <TableCell>
              <span className="text-sm text-text-main">
                {formatOrderTime(order.createdAt)}
              </span>
            </TableCell>
            <TableCell>
              <span className="font-mono text-xs text-text-main">
                {order.customerPhone}
              </span>
            </TableCell>
            <TableCell>
              <span className="text-sm text-text-main truncate block max-w-[240px]">
                {formatItems(order.itemsSnapshot as Array<{ name: string }>, 2)}
              </span>
            </TableCell>
            <TableCell>
              <span className="font-semibold text-price-green">
                {formatBs(order.subtotalBsCents)}
              </span>
            </TableCell>
            <TableCell className="hidden md:table-cell">
              <span className="text-sm text-text-main">
                {formatProvider(order.paymentProvider)}
              </span>
            </TableCell>
            <TableCell>
              <OrderStatusBadge status={order.status} />
            </TableCell>
            <TableCell className="text-right pr-5">
              <QuickActions
                orderId={order.id}
                orderStatus={order.status as OrderStatus}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
