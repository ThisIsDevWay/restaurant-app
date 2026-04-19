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
import { ArrowLeft, Hash } from "lucide-react";

type ItemsSnapshot = Array<{
  id: string;
  name: string;
  priceUsdCents: number;
  priceBsCents: number;
  fixedContornos: Array<{
    id: string;
    name: string;
    priceUsdCents: number;
    priceBsCents: number;
  }>;
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

  if (!order) notFound();

  const paymentLogs = await db
    .select()
    .from(paymentsLog)
    .where(eq(paymentsLog.orderId, id))
    .orderBy(desc(paymentsLog.createdAt));

  const latestLog = paymentLogs[0] ?? null;
  const items = order.itemsSnapshot as ItemsSnapshot;
  const surcharges = order.surchargesSnapshot as typeof order.surchargesSnapshot;

  const orderLabel = order.orderNumber ?? order.id.slice(0, 8).toUpperCase();

  return (
    /*
     * PAGE SHELL
     * Heritage Cream canvas — never pure white.
     */
    <div
      className="min-h-screen"
      style={{ background: "#fff8f3" }}
    >
      {/* ────────────────────────────────────────
          STICKY GLASSMORPHIC HEADER BAR
      ──────────────────────────────────────── */}
      <div
        className="sticky top-0 z-30 px-6 py-3 flex items-center gap-4 border-b"
        style={{
          background: "rgba(255,248,243,0.80)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderColor: "rgba(187,0,5,0.08)",
          boxShadow: "0 1px 0 rgba(37,26,7,0.04)",
        }}
      >
        {/* Back button */}
        <Link
          href="/admin/orders"
          className="group flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
          style={{
            background: "rgba(187,0,5,0.06)",
            color: "#bb0005",
          }}
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
        </Link>

        {/* Order identifier */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            {/* Order # pill */}
            <div
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full"
              style={{
                background: "linear-gradient(135deg, #bb0005 0%, #e2231a 100%)",
              }}
            >
              <Hash className="w-3 h-3 text-white/70" />
              <span
                className="text-white font-black text-sm tracking-tight"
                style={{ fontFamily: "'Epilogue', sans-serif" }}
              >
                {orderLabel}
              </span>
            </div>

            {/* Status badge */}
            <OrderStatusBadge status={order.status} />
          </div>
        </div>

        {/* Date — right-aligned, muted */}
        <time className="hidden sm:block text-[11px] text-[#9e8e7e] font-medium shrink-0">
          {formatOrderDate(order.createdAt)}
        </time>
      </div>

      {/* ────────────────────────────────────────
          CONTENT AREA
      ──────────────────────────────────────── */}
      <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6 max-w-7xl mx-auto">

        {/* ── HERO ORDER NUMBER (large editorial display) ── */}
        <div className="flex items-end justify-between gap-4">
          <div>
            <p
              className="text-[10px] font-black uppercase tracking-[0.2em] mb-1"
              style={{ color: "#bb0005", fontFamily: "'Epilogue', sans-serif" }}
            >
              Detalle de Orden
            </p>
            <h1
              className="leading-none font-black text-[#251a07]"
              style={{
                fontFamily: "'Epilogue', sans-serif",
                fontSize: "clamp(2rem, 5vw, 3rem)",
                letterSpacing: "-0.03em",
              }}
            >
              #{orderLabel}
            </h1>
          </div>

          {/* Date on mobile */}
          <time className="sm:hidden text-[11px] text-[#9e8e7e] font-medium mb-1">
            {formatOrderDate(order.createdAt)}
          </time>
        </div>

        {/* ── ACTIONS BAR ── */}
        <OrderActions
          orderId={order.id}
          orderStatus={order.status as any}
        />

        {/* ── TIMELINE ── */}
        <div
          className="rounded-2xl px-5 py-4"
          style={{
            background: "#ffffff",
            boxShadow: "0 2px 12px rgba(37,26,7,0.05)",
          }}
        >
          <p
            className="text-[10px] font-black uppercase tracking-[0.15em] mb-4"
            style={{ color: "#bb0005", fontFamily: "'Epilogue', sans-serif" }}
          >
            Estado del Pedido
          </p>
          <OrderTimeline status={order.status} />
        </div>

        {/* ── 3-COLUMN GRID ── */}
        <div className="grid gap-5 lg:grid-cols-3" data-print-order>
          {/* Left: Items (2/3 width) */}
          <div className="lg:col-span-2">
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: "#ffffff",
                boxShadow: "0 2px 12px rgba(37,26,7,0.05)",
              }}
            >
              {/* Items table section label */}
              <div
                className="px-5 pt-5 pb-3 border-b"
                style={{ borderColor: "#fff2e2" }}
              >
                <p
                  className="text-[10px] font-black uppercase tracking-[0.15em]"
                  style={{
                    color: "#bb0005",
                    fontFamily: "'Epilogue', sans-serif",
                  }}
                >
                  Resumen del Pedido
                </p>
              </div>
              <div className="p-5">
                <OrderItemsTable
                  items={items}
                  subtotalBsCents={order.subtotalBsCents}
                  subtotalUsdCents={order.subtotalUsdCents}
                  exchangeRate={order.rateSnapshotBsPerUsd}
                  surcharges={surcharges}
                  grandTotalBsCents={order.grandTotalBsCents}
                  grandTotalUsdCents={order.grandTotalUsdCents}
                />
              </div>
            </div>
          </div>

          {/* Right: Payment panel (1/3 width) */}
          <div>
            <OrderPaymentPanel
              order={{
                customerPhone: order.customerPhone,
                paymentMethod: order.paymentMethod,
                paymentProvider: order.paymentProvider,
                paymentReference: order.paymentReference,
                rateSnapshotBsPerUsd: order.rateSnapshotBsPerUsd,
                orderMode: order.orderMode ?? "delivery",
                deliveryAddress: order.deliveryAddress,
                gpsCoords: order.gpsCoords,
                comprobanteUrl: order.paymentMetadata?.uploadedUrl,
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
    </div>
  );
}