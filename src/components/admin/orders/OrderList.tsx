"use client";

import { OrderCard, type OrderListItem } from "@/components/admin/orders/OrderCard";
import { OrderTable } from "@/components/admin/orders/OrderTable";

export function OrderList({ orders }: { orders: OrderListItem[] }) {
  return (
    <>
      {/* Mobile cards */}
      <div className="flex flex-col gap-2 md:hidden">
        {orders.map((order) => (
          <OrderCard key={order.id} order={order} />
        ))}
        {orders.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm font-medium text-text-main">Sin órdenes</p>
            <p className="text-xs text-text-muted mt-1">
              No hay órdenes en esta categoría
            </p>
          </div>
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block">
        <OrderTable orders={orders} />
      </div>
    </>
  );
}
