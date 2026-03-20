import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { orders, paymentsLog } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { formatBs, formatRef } from "@/lib/money";
import { obfuscatePhone } from "@/lib/utils";
import { OrderStatusBadge } from "@/components/admin/orders/OrderStatusBadge";
import { ConfirmPaymentButton } from "@/components/admin/orders/ConfirmPaymentButton";

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
    <div>
      <Link
        href="/admin/orders"
        className="mb-4 inline-flex items-center text-sm text-primary hover:underline"
      >
        ← Volver a órdenes
      </Link>

      <h1 className="mb-6 text-2xl font-bold text-text-main">
        Orden #{order.id.slice(0, 8)}
      </h1>

      {/* Cabecera */}
      <div className="mb-6 rounded-card border border-border bg-white p-4 shadow-card">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="text-xs text-text-muted">Fecha</p>
            <p className="text-sm font-medium text-text-main">
              {new Date(order.createdAt).toLocaleDateString("es-VE")}{" "}
              {new Date(order.createdAt).toLocaleTimeString("es-VE")}
            </p>
          </div>
          <div>
            <p className="text-xs text-text-muted">Teléfono</p>
            <p className="font-mono text-sm text-text-main">
              {obfuscatePhone(order.customerPhone)}
            </p>
          </div>
          <div>
            <p className="text-xs text-text-muted">Estado</p>
            <div className="mt-0.5">
              <OrderStatusBadge status={order.status} />
            </div>
          </div>
          <div>
            <p className="text-xs text-text-muted">Método de pago</p>
            <p className="text-sm text-text-main capitalize">
              {order.paymentMethod === "pago_movil"
                ? "Pago Móvil"
                : order.paymentMethod === "transfer"
                  ? "Transferencia"
                  : order.paymentMethod}
            </p>
          </div>
          <div>
            <p className="text-xs text-text-muted">Provider</p>
            <p className="text-sm text-text-main">{order.paymentProvider}</p>
          </div>
          {order.paymentReference && (
            <div>
              <p className="text-xs text-text-muted">Referencia</p>
              <p className="font-mono text-sm text-text-main">
                {order.paymentReference}
              </p>
            </div>
          )}
        </div>

        {order.status === "whatsapp" && (
          <div className="mt-4 border-t border-border pt-4">
            <ConfirmPaymentButton orderId={order.id} />
          </div>
        )}
      </div>

      {/* Items del pedido */}
      <div className="mb-6 rounded-card border border-border bg-white shadow-card">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-text-main">
            Items del pedido
          </h2>
        </div>
        <div className="divide-y divide-border">
          {items.map((item, idx) => (
            <div key={idx} className="px-4 py-3">
              <div className="flex items-baseline justify-between">
                <p className="text-sm font-medium text-text-main">
                  {item.name} × {item.quantity}
                </p>
                <p className="text-sm font-semibold text-price-green">
                  {formatBs(item.itemTotalBsCents)}
                </p>
              </div>
              {item.selectedContorno && (
                <p className="mt-0.5 text-xs text-text-muted">
                  Contorno: {item.selectedContorno.name}
                </p>
              )}
              {item.selectedAdicionales.map((ad, adIdx) => (
                <p key={adIdx} className="mt-0.5 text-xs text-primary-hover">
                  + {ad.name} ({formatBs(ad.priceBsCents)})
                </p>
              ))}
            </div>
          ))}
        </div>
        <div className="border-t border-border px-4 py-3">
          <div className="flex justify-between text-sm">
            <span className="font-semibold text-text-main">Subtotal</span>
            <span>
              {formatRef(order.subtotalUsdCents)} ·{" "}
              <span className="font-semibold text-price-green">
                {formatBs(order.subtotalBsCents)}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Log de pago */}
      {latestLog && (
        <div className="mb-6 rounded-card border border-border bg-white shadow-card">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold text-text-main">Log de pago</h2>
          </div>
          <div className="px-4 py-3">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-xs text-text-muted">Provider</p>
                <p className="text-sm text-text-main">{latestLog.providerId}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted">Outcome</p>
                <p className="text-sm capitalize text-text-main">
                  {latestLog.outcome}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-muted">Monto verificado</p>
                <p className="text-sm text-text-main">
                  {formatBs(latestLog.amountBsCents)}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-muted">Fecha</p>
                <p className="text-sm text-text-main">
                  {new Date(latestLog.createdAt).toLocaleString("es-VE")}
                </p>
              </div>
              {latestLog.reference && (
                <div>
                  <p className="text-xs text-text-muted">Referencia</p>
                  <p className="font-mono text-sm text-text-main">
                    {latestLog.reference}
                  </p>
                </div>
              )}
              {latestLog.senderPhone && (
                <div>
                  <p className="text-xs text-text-muted">Teléfono emisor</p>
                  <p className="font-mono text-sm text-text-main">
                    {latestLog.senderPhone}
                  </p>
                </div>
              )}
            </div>

            <details className="mt-3">
              <summary className="cursor-pointer text-xs text-text-muted hover:text-text-main">
                Ver datos del provider
              </summary>
              <pre className="mt-2 max-h-60 overflow-auto rounded-input bg-bg-app p-3 text-xs text-text-main">
                {JSON.stringify(latestLog.providerRaw, null, 2)}
              </pre>
            </details>
          </div>
        </div>
      )}

      {paymentLogs.length > 1 && (
        <div className="rounded-card border border-border bg-white shadow-card">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold text-text-main">
              Historial de pagos ({paymentLogs.length})
            </h2>
          </div>
          <div className="divide-y divide-border">
            {paymentLogs.map((log) => (
              <div key={log.id} className="flex items-center justify-between px-4 py-2">
                <div className="text-sm text-text-main">
                  {log.providerId} · {log.outcome}
                </div>
                <div className="text-xs text-text-muted">
                  {new Date(log.createdAt).toLocaleString("es-VE")}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
