import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatBs } from "@/lib/money";
import { maskPhone, formatOrderDate, formatRate } from "@/lib/utils";
import { formatProvider } from "@/lib/payments/format-provider";

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
};

export function OrderPaymentPanel({
  order,
  latestLog,
}: {
  order: OrderData;
  latestLog: PaymentLog | null;
}) {
  return (
    <div className="space-y-4">
      {/* Client Section */}
      <Card className="ring-1 ring-border">
        <CardContent className="pt-5 space-y-3">
          <h3 className="text-xs font-medium uppercase tracking-wide text-text-muted">
            Cliente
          </h3>
          <dl className="space-y-2">
            <div className="flex items-center justify-between">
              <dt className="text-xs text-text-muted">Teléfono</dt>
              <dd className="text-sm font-mono font-medium text-text-main">
                {maskPhone(order.customerPhone)}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Payment Section */}
      <Card className="ring-1 ring-border">
        <CardContent className="pt-5 space-y-3">
          <h3 className="text-xs font-medium uppercase tracking-wide text-text-muted">
            Pago
          </h3>
          <dl className="space-y-2">
            <div className="flex items-center justify-between">
              <dt className="text-xs text-text-muted">Método</dt>
              <dd className="text-sm font-medium text-text-main">
                {formatProvider(order.paymentProvider)}
              </dd>
            </div>
            {order.paymentReference && (
              <div className="flex items-center justify-between">
                <dt className="text-xs text-text-muted">Referencia</dt>
                <dd className="text-sm font-mono font-medium text-text-main">
                  {order.paymentReference}
                </dd>
              </div>
            )}
            {latestLog?.senderPhone && (
              <div className="flex items-center justify-between">
                <dt className="text-xs text-text-muted">Emisor</dt>
                <dd className="text-sm font-mono text-text-main">
                  {maskPhone(latestLog.senderPhone)}
                </dd>
              </div>
            )}
            {latestLog && (
              <>
                <div className="flex items-center justify-between">
                  <dt className="text-xs text-text-muted">Estado</dt>
                  <dd>
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
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-xs text-text-muted">Monto</dt>
                  <dd className="text-sm font-semibold text-price-green">
                    {formatBs(latestLog.amountBsCents)}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-xs text-text-muted">Fecha</dt>
                  <dd className="text-xs text-text-main">
                    {formatOrderDate(latestLog.createdAt)}
                  </dd>
                </div>
              </>
            )}
          </dl>
        </CardContent>
      </Card>

      {/* Exchange Rate Section */}
      {order.rateSnapshotBsPerUsd && (
        <div className="flex items-center gap-1.5 text-sm text-text-muted px-1">
          <span>Tasa BCV:</span>
          <span className="font-medium text-text-main">
            Bs.&nbsp;{formatRate(order.rateSnapshotBsPerUsd)}&nbsp;/&nbsp;USD
          </span>
        </div>
      )}
    </div>
  );
}
