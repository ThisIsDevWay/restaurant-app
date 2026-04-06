"use client";

import { OrderCard, type OrderListItem } from "@/components/admin/orders/OrderCard";
import { OrderTable } from "@/components/admin/orders/OrderTable";
import { ShoppingBag } from "lucide-react";

export function OrderList({
  orders,
  suppressEmpty = false,
}: {
  orders: OrderListItem[];
  suppressEmpty?: boolean;
}) {
  const showEmpty = orders.length === 0 && !suppressEmpty;

  return (
    <>
      {/* Mobile cards */}
      <div className="flex flex-col gap-2 md:hidden">
        {orders.map((order) => (
          <OrderCard key={order.id} order={order} />
        ))}
        {showEmpty && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/5">
              <ShoppingBag className="h-7 w-7 text-primary/40" />
            </div>
            <p className="text-sm font-medium text-text-main">Sin órdenes</p>
            <p className="text-xs text-text-muted mt-1">
              No hay órdenes en esta categoría
            </p>
          </div>
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block">
        <OrderTable orders={orders} suppressEmpty={suppressEmpty} />
      </div>
    </>
  );
}
