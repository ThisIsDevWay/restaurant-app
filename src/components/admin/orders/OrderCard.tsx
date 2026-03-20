"use client";

import { useRouter } from "next/navigation";
import { formatBs } from "@/lib/money";
import { maskPhone } from "@/lib/utils";
import { formatOrderTime } from "@/lib/utils/format-relative-time";
import { formatItems } from "@/lib/utils/format-items";
import { formatProvider } from "@/lib/payments/format-provider";
import { OrderStatusBadge } from "@/components/admin/orders/OrderStatusBadge";
import { QuickActions } from "@/components/admin/orders/QuickActions";
import type { OrderStatus } from "@/lib/constants/order-status";

export interface OrderListItem {
  id: string;
  orderNumber?: number;
  status: string;
  subtotalBsCents: number;
  customerPhone: string;
  createdAt: Date;
  paymentMethod: string;
  paymentProvider?: string;
  itemsSnapshot: unknown;
}

export function OrderCard({ order }: { order: OrderListItem }) {
  const router = useRouter();
  const items = order.itemsSnapshot as Array<{ name: string }>;

  return (
    <div
      className="bg-card border border-border rounded-lg p-4 cursor-pointer active:bg-accent/50 transition-colors"
      onClick={() => router.push(`/admin/orders/${order.id}`)}
    >
      {/* Row 1: Number + Status */}
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-sm text-text-main">
          #{order.orderNumber ?? order.id.slice(0, 8)}
        </span>
        <OrderStatusBadge status={order.status} />
      </div>

      {/* Row 2: Items + Phone */}
      <p className="text-sm text-text-muted mb-2 truncate">
        {formatItems(items)}
      </p>

      {/* Row 3: Total + Time + Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-price-green">
            {formatBs(order.subtotalBsCents)}
          </span>
          <span className="text-xs text-text-muted">
            {formatOrderTime(order.createdAt)}
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
