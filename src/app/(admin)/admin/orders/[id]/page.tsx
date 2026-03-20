import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { orders, paymentsLog } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { OrderStatusBadge } from "@/components/admin/orders/OrderStatusBadge";
import { OrderActions } from "@/components/admin/orders/OrderActions";
import { OrderTimeline } from "@/components/admin/orders/OrderTimeline";
import { OrderItemsTable } from "@/components/admin/orders/OrderItemsTable";
import { OrderPaymentPanel } from "@/components/admin/orders/OrderPaymentPanel";
import { formatOrderDate } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";

type ItemsSnapshot = Array<{
  id: string;
  name: string;
  priceUsdCents: number;
  priceBsCents: number;
  selectedContorno: { id: string; name: string } | null;
  selectedAdicionales: Array<{
    id: string;
    name: string;
    priceUsdCents: number;
    priceBsCents: number;
  }>;
  quantity: number;
  itemTotalBsCents: number;
}>;

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const order = await db.query.orders.findFirst({
    where: eq(orders.id, id),
  });

  if (!order) {
    notFound();
  }

  const paymentLogs = await db
    .select()
    .from(paymentsLog)
    .where(eq(paymentsLog.orderId, id))
    .orderBy(desc(paymentsLog.createdAt));

  const latestLog = paymentLogs[0] ?? null;
  const items = order.itemsSnapshot as ItemsSnapshot;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/orders"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-white text-text-muted hover:text-text-main hover:bg-bg-app transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-text-main">
              Orden <span className="font-bold">#{order.orderNumber ?? order.id.slice(0, 8)}</span>
            </h1>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <OrderStatusBadge status={order.status} />
            <span className="text-xs text-text-muted">
              {formatOrderDate(order.createdAt)}
            </span>
          </div>
        </div>
      </div>

      {/* Actions Bar */}
      <OrderActions
        orderId={order.id}
        orderStatus={order.status as any}
      />

      {/* Timeline */}
      <OrderTimeline status={order.status} />

      {/* 2 Column Grid */}
      <div className="grid gap-6 lg:grid-cols-3" data-print-order>
        {/* Left Column (2/3) - Items */}
        <div className="lg:col-span-2 space-y-6">
          <OrderItemsTable
            items={items}
            subtotalBsCents={order.subtotalBsCents}
            subtotalUsdCents={order.subtotalUsdCents}
            exchangeRate={order.rateSnapshotBsPerUsd}
          />
        </div>

        {/* Right Column (1/3) - Info */}
        <div>
          <OrderPaymentPanel
            order={{
              customerPhone: order.customerPhone,
              paymentMethod: order.paymentMethod,
              paymentProvider: order.paymentProvider,
              paymentReference: order.paymentReference,
              rateSnapshotBsPerUsd: order.rateSnapshotBsPerUsd,
            }}
            latestLog={
              latestLog
                ? {
                    id: latestLog.id,
                    providerId: latestLog.providerId,
                    amountBsCents: latestLog.amountBsCents,
                    reference: latestLog.reference,
                    senderPhone: latestLog.senderPhone,
                    outcome: latestLog.outcome,
                    createdAt: latestLog.createdAt,
                  }
                : null
            }
          />
        </div>
      </div>
    </div>
  );
}
