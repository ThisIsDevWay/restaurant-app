import { formatBs } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { Receipt } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type ItemsSnapshot = Array<{
  id: string;
  name: string;
  priceUsdCents: number;
  priceBsCents: number;
  fixedContornos: Array<{ id: string; name: string; priceUsdCents: number; priceBsCents: number }>;
  selectedAdicionales: Array<{
    id: string;
    name: string;
    priceUsdCents: number;
    priceBsCents: number;
  }>;
  quantity: number;
  itemTotalBsCents: number;
}>;

export function OrderItemsTable({
  items,
  subtotalBsCents,
  subtotalUsdCents,
  exchangeRate,
}: {
  items: ItemsSnapshot;
  subtotalBsCents: number;
  subtotalUsdCents: number;
  exchangeRate?: string | null;
}) {
  const hasModifiers = items.some(
    (item) =>
      item.fixedContornos.length > 0 || item.selectedAdicionales.length > 0,
  );

  return (
    <Card className="ring-1 ring-border">
      <CardHeader className="border-b border-border">
        <div className="flex items-center gap-2">
          <Receipt className="h-4 w-4 text-primary" />
          <CardTitle>Artículos del pedido</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {items.map((item, idx) => {
            const adicionalesTotal = item.selectedAdicionales.reduce(
              (sum, ad) => sum + ad.priceBsCents,
              0,
            );
            const basePriceBs =
              item.itemTotalBsCents - adicionalesTotal;

            return (
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

                    {hasModifiers && (
                      <div className="mt-2 space-y-1">
                        {item.fixedContornos.map((c, cIdx) => (
                          <div key={cIdx} className="flex items-center gap-1.5 text-xs text-text-muted">
                            <span className="inline-block h-1 w-1 rounded-full bg-text-muted" />
                            <span>{c.name}</span>
                            <span className="text-text-muted ml-auto">—</span>
                          </div>
                        ))}
                        {item.selectedAdicionales.map((ad, adIdx) => (
                          <div
                            key={adIdx}
                            className="flex items-center gap-1.5"
                          >
                            <span className="text-xs text-text-muted">+</span>
                            <span className="text-xs text-text-main">
                              {ad.name}
                            </span>
                            <span className="text-xs font-medium text-price-green ml-auto">
                              + {formatBs(ad.priceBsCents)}
                            </span>
                          </div>
                        ))}
                        {(item.fixedContornos.length > 0 ||
                          item.selectedAdicionales.length > 0) && (
                            <div className="flex items-center gap-1.5 pt-1 border-t border-border/50">
                              <span className="text-xs text-text-muted">
                                Subtotal ítem
                              </span>
                              <span className="text-xs font-semibold text-price-green ml-auto">
                                = {formatBs(item.itemTotalBsCents)}
                              </span>
                            </div>
                          )}
                      </div>
                    )}
                  </div>
                  {!hasModifiers && (
                    <span className="text-sm font-semibold text-price-green whitespace-nowrap">
                      {formatBs(item.itemTotalBsCents)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
      <CardFooter className="flex-col items-stretch gap-2">
        <Separator className="mb-2" />
        <div className="flex items-center justify-between">
          <span className="text-base font-bold text-text-main">TOTAL</span>
          <span className="text-lg font-bold text-price-green">
            {formatBs(subtotalBsCents)}
          </span>
        </div>
        {exchangeRate && (
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span>
              ≈ USD{" "}
              {(subtotalUsdCents / 100).toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
