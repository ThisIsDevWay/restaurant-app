import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { orders, paymentsLog } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { formatBs, formatRef } from "@/lib/money";
import { obfuscatePhone } from "@/lib/utils";
import { OrderStatusBadge } from "@/components/admin/orders/OrderStatusBadge";
import { ConfirmPaymentButton } from "@/components/admin/orders/ConfirmPaymentButton";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Clock,
  Phone,
  CreditCard,
  FileText,
  Receipt,
  History,
} from "lucide-react";

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
          <h1 className="text-2xl font-bold text-text-main">
            Orden #{order.id.slice(0, 8)}
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <OrderStatusBadge status={order.status as any} />
            <span className="text-xs text-text-muted">
              {new Date(order.createdAt).toLocaleDateString("es-VE")}{" "}
              {new Date(order.createdAt).toLocaleTimeString("es-VE")}
            </span>
          </div>
        </div>
        {order.status === "whatsapp" && (
          <ConfirmPaymentButton orderId={order.id} />
        )}
      </div>

      {/* 2 Column Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column (2/3) - Items */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="ring-1 ring-border">
            <CardHeader className="border-b border-border">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-primary" />
                <CardTitle>Artículos del pedido</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {items.map((item, idx) => (
                  <div key={idx} className="px-5 py-4">
                    <div className="flex items-baseline justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-text-main">
                          {item.quantity > 1 && (
                            <span className="inline-flex items-center justify-center h-5 w-5 rounded-md bg-primary/10 text-primary text-xs font-bold mr-2">
                              {item.quantity}
                            </span>
                          )}
                          {item.name}
                        </p>
                        {item.selectedContorno && (
                          <p className="mt-1 text-xs text-text-muted flex items-center gap-1.5">
                            <span className="inline-block h-1 w-1 rounded-full bg-text-muted" />
                            {item.selectedContorno.name}
                          </p>
                        )}
                        {item.selectedAdicionales.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {item.selectedAdicionales.map((ad, adIdx) => (
                              <Badge
                                key={adIdx}
                                className="bg-primary/5 text-primary border-primary/20 text-[11px]"
                              >
                                + {ad.name}
                                <span className="ml-1 opacity-70">
                                  {formatBs(ad.priceBsCents)}
                                </span>
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <span className="text-sm font-semibold text-price-green whitespace-nowrap">
                        {formatBs(item.itemTotalBsCents)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="justify-between">
              <span className="text-sm font-semibold text-text-main">Subtotal</span>
              <div className="text-right">
                <span className="text-xs text-text-muted block">
                  {formatRef(order.subtotalUsdCents)}
                </span>
                <span className="text-lg font-bold text-price-green">
                  {formatBs(order.subtotalBsCents)}
                </span>
              </div>
            </CardFooter>
          </Card>
        </div>

        {/* Right Column (1/3) - Info */}
        <div className="space-y-6">
          {/* Customer Info */}
          <Card className="ring-1 ring-border">
            <CardHeader className="border-b border-border">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary" />
                <CardTitle>Información</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div>
                <p className="text-xs text-text-muted uppercase tracking-wide mb-1">Teléfono</p>
                <p className="font-mono text-sm font-medium text-text-main">
                  {obfuscatePhone(order.customerPhone)}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-muted uppercase tracking-wide mb-1">Método de pago</p>
                <Badge variant="outline" className="capitalize">
                  {order.paymentMethod === "pago_movil"
                    ? "Pago Móvil"
                    : order.paymentMethod === "transfer"
                      ? "Transferencia"
                      : order.paymentMethod}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-text-muted uppercase tracking-wide mb-1">Provider</p>
                <p className="text-sm text-text-main">{order.paymentProvider}</p>
              </div>
              {order.paymentReference && (
                <div>
                  <p className="text-xs text-text-muted uppercase tracking-wide mb-1">Referencia</p>
                  <p className="font-mono text-sm font-medium text-text-main">
                    {order.paymentReference}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Log */}
          {latestLog && (
            <Card className="ring-1 ring-border">
              <CardHeader className="border-b border-border">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-primary" />
                  <CardTitle>Último pago</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-muted">Provider</span>
                  <span className="text-sm font-medium text-text-main">{latestLog.providerId}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-muted">Estado</span>
                  <Badge
                    className={
                      latestLog.outcome === "confirmed"
                        ? "bg-success/10 text-success border-transparent"
                        : latestLog.outcome === "manual"
                          ? "bg-amber/10 text-amber border-transparent"
                          : "bg-error/10 text-error border-transparent"
                    }
                  >
                    {latestLog.outcome === "confirmed"
                      ? "Confirmado"
                      : latestLog.outcome === "manual"
                        ? "Manual"
                        : "Rechazado"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-muted">Monto</span>
                  <span className="text-sm font-semibold text-price-green">
                    {formatBs(latestLog.amountBsCents)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-muted">Fecha</span>
                  <span className="text-xs text-text-main">
                    {new Date(latestLog.createdAt).toLocaleString("es-VE")}
                  </span>
                </div>
                {latestLog.reference && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-muted">Referencia</span>
                    <span className="font-mono text-xs text-text-main">
                      {latestLog.reference}
                    </span>
                  </div>
                )}
                {latestLog.senderPhone && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-muted">Emisor</span>
                    <span className="font-mono text-xs text-text-main">
                      {latestLog.senderPhone}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Payment History Timeline */}
          {paymentLogs.length > 1 && (
            <Card className="ring-1 ring-border">
              <CardHeader className="border-b border-border">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-primary" />
                  <CardTitle>Historial ({paymentLogs.length})</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="relative space-y-0">
                  {paymentLogs.map((log, idx) => (
                    <div key={log.id} className="flex gap-3 pb-4 last:pb-0">
                      <div className="relative flex flex-col items-center">
                        <div
                          className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold shrink-0 ${
                            log.outcome === "confirmed"
                              ? "bg-success/10 text-success"
                              : log.outcome === "manual"
                                ? "bg-amber/10 text-amber"
                                : "bg-error/10 text-error"
                          }`}
                        >
                          {idx + 1}
                        </div>
                        {idx < paymentLogs.length - 1 && (
                          <div className="w-px flex-1 bg-border mt-1" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-text-main">
                            {log.providerId}
                          </p>
                          <Badge
                            className={
                              log.outcome === "confirmed"
                                ? "bg-success/10 text-success border-transparent text-[10px]"
                                : log.outcome === "manual"
                                  ? "bg-amber/10 text-amber border-transparent text-[10px]"
                                  : "bg-error/10 text-error border-transparent text-[10px]"
                            }
                          >
                            {log.outcome === "confirmed"
                              ? "Confirmado"
                              : log.outcome === "manual"
                                ? "Manual"
                                : "Rechazado"}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-text-muted mt-0.5">
                          {new Date(log.createdAt).toLocaleString("es-VE")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
