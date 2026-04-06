import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatBs } from "@/lib/money";
import { maskPhone, formatOrderDate, formatRate, cn } from "@/lib/utils";
import { formatProvider } from "@/lib/payments/format-provider";
import { OrderModeChip } from "./OrderModeChip";
import { Phone, CreditCard, Hash, Calendar, Globe } from "lucide-react";

type PaymentLog = {
  id: string;
  providerId: string;
  amountBsCents: number;
  reference: string | null;
  senderPhone: string | null;
  outcome: "confirmed" | "rejected" | "manual";
  createdAt: Date;
};

type OrderData = {
  customerPhone: string;
  paymentMethod: string;
  paymentProvider: string;
  paymentReference: string | null;
  rateSnapshotBsPerUsd: string;
  orderMode: string;
};

export function OrderPaymentPanel({
  order,
  latestLog,
}: {
  order: OrderData;
  latestLog: PaymentLog | null;
}) {
  return (
    <Card className="ring-1 ring-border shadow-sm rounded-2xl overflow-hidden sticky top-4">
      <CardContent className="p-0">
        {/* Header Section - Order Mode */}
        <div className="bg-slate-50/50 p-5 border-b border-border">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-3">
            Tipo de Entrega
          </h3>
          <OrderModeChip mode={order.orderMode} className="py-1 px-3 text-xs" />
        </div>

        <div className="p-5 space-y-6">
          {/* Client Section */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-text-muted">
              <Phone className="h-3 w-3" />
              <span>Cliente</span>
            </div>
            <div className="flex items-center justify-between bg-muted/30 p-3 rounded-xl border border-border/50">
              <span className="text-sm font-mono font-bold text-text-main">
                {order.customerPhone}
              </span>
              <a
                href={`tel:${order.customerPhone}`}
                className="text-[10px] bg-white border border-border px-2 py-1 rounded-md font-bold hover:bg-slate-50 transition-colors"
              >
                Llamar
              </a>
            </div>
          </section>

          <Separator className="opacity-50" />

          {/* Payment Section */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-text-muted">
              <CreditCard className="h-3 w-3" />
              <span>Información de Pago</span>
            </div>

            <dl className="space-y-3">
              <div className="flex items-center justify-between">
                <dt className="text-xs text-text-muted flex items-center gap-1.5">
                  Método
                </dt>
                <dd className="text-sm font-bold text-text-main">
                  {formatProvider(order.paymentProvider)}
                </dd>
              </div>

              {order.paymentReference && (
                <div className="flex items-center justify-between">
                  <dt className="text-xs text-text-muted flex items-center gap-1.5">
                    Referencia
                  </dt>
                  <dd className="text-sm font-mono font-bold text-primary">
                    {order.paymentReference}
                  </dd>
                </div>
              )}

              {latestLog && (
                <>
                  <div className="flex items-center justify-between">
                    <dt className="text-xs text-text-muted">Estado Red</dt>
                    <dd>
                      <Badge
                        className={cn(
                          "rounded-lg px-2 py-0 border-none font-bold text-[10px] uppercase",
                          latestLog.outcome === "confirmed"
                            ? "bg-emerald-100 text-emerald-700"
                            : latestLog.outcome === "manual"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-red-100 text-red-700"
                        )}
                      >
                        {latestLog.outcome === "confirmed"
                          ? "Confirmado"
                          : latestLog.outcome === "manual"
                            ? "Manual"
                            : "Rechazado"}
                      </Badge>
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-xs text-text-muted">Confirmado en</dt>
                    <dd className="text-[11px] font-medium text-text-main">
                      {formatOrderDate(latestLog.createdAt)}
                    </dd>
                  </div>
                </>
              )}
            </dl>
          </section>

          {/* Exchange Rate Section */}
          {order.rateSnapshotBsPerUsd && (
            <div className="bg-slate-50 rounded-xl p-3 border border-border/50 flex items-center justify-between mt-2">
              <div className="flex items-center gap-2 text-xs text-text-muted">
                <Globe className="h-3 w-3" />
                <span className="font-medium">Tasa BCV</span>
              </div>
              <span className="text-xs font-bold text-text-main">
                Bs. {formatRate(order.rateSnapshotBsPerUsd)}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
