import { formatBs, formatRef } from "@/lib/money";
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

import type { SnapshotItem } from "@/lib/utils/format-items-detailed";

export function OrderItemsTable({
  items,
  subtotalBsCents,
  subtotalUsdCents,
  exchangeRate,
  surcharges,
  grandTotalBsCents,
  grandTotalUsdCents,
}: {
  items: SnapshotItem[];
  subtotalBsCents: number;
  subtotalUsdCents: number;
  exchangeRate?: string | null;
  surcharges?: {
    plateCount: number;
    adicionalCount: number;
    bebidaCount: number;
    packagingFeePerPlateUsdCents: number;
    packagingFeePerAdicionalUsdCents: number;
    packagingFeePerBebidaUsdCents: number;
    packagingUsdCents: number;
    deliveryFeeUsdCents: number;
    deliveryUsdCents: number;
    orderMode: string;
  } | null;
  grandTotalBsCents?: number;
  grandTotalUsdCents?: number;
}) {
  const rate = exchangeRate ? parseFloat(exchangeRate) : 0;
  const packagingBsCents = surcharges ? Math.round(surcharges.packagingUsdCents * rate) : 0;
  const deliveryBsCents = surcharges ? Math.round(surcharges.deliveryUsdCents * rate) : 0;
  const hasSurcharges = surcharges && (surcharges.packagingUsdCents > 0 || surcharges.deliveryUsdCents > 0);
  const displayTotalBs = grandTotalBsCents ?? subtotalBsCents;
  const displayTotalUsd = grandTotalUsdCents ?? subtotalUsdCents;
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
            const hasContornos =
              item.fixedContornos.length > 0 ||
              item.selectedAdicionales.some((a) => a.substitutesComponentId);
            const pureAdicionales = item.selectedAdicionales.filter(
              (a) => !a.substitutesComponentId,
            );
            const hasModifiers =
              hasContornos ||
              (item.removedComponents && item.removedComponents.length > 0) ||
              pureAdicionales.length > 0 ||
              (item.selectedBebidas && item.selectedBebidas.length > 0);

            return (
              <div key={idx} className="px-5 py-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-sm font-semibold text-text-main">
                      {item.quantity > 1 ? `${item.quantity}× ` : ""}{item.name}
                    </div>
                    <div className="text-xs text-text-muted mt-0.5">
                      Base · {formatBs(item.priceBsCents)} / {formatRef(item.priceUsdCents)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-text-main">
                      {formatBs(item.itemTotalBsCents)}
                    </div>
                  </div>
                </div>

                {hasModifiers && (
                  <div className="mt-2.5 flex flex-col gap-1">
                    {/* Contornos */}
                    {hasContornos && (
                      <>
                        <div className="text-[10px] font-semibold uppercase text-text-muted mt-1 mb-0.5">Contornos</div>
                        {item.fixedContornos.map((c, cIdx) => (
                          <div key={cIdx} className="flex justify-between items-center pl-2 border-l-2 border-border/50">
                            <span className="text-xs text-text-main">{c.name}</span>
                            <span className="text-[11px] italic text-text-muted">incluido</span>
                          </div>
                        ))}
                        {item.selectedAdicionales
                          .filter((a) => a.substitutesComponentId)
                          .map((s, sIdx) => (
                            <div key={`sub-${sIdx}`} className="flex justify-between items-center pl-2 border-l-2 border-border/50">
                              <span className="text-xs text-text-main">
                                {s.name} <span className="opacity-70 text-[10px] ml-1">(en lugar de {s.substitutesComponentName})</span>
                              </span>
                              {s.priceBsCents > 0 ? (
                                <span className="text-xs font-semibold text-price-green">+ {formatBs(s.priceBsCents)}</span>
                              ) : (
                                <span className="text-[11px] italic text-text-muted">incluido</span>
                              )}
                            </div>
                          ))}
                      </>
                    )}

                    {/* Removidos */}
                    {item.removedComponents && item.removedComponents.length > 0 && (
                      <>
                        <div className="text-[10px] font-semibold uppercase text-text-muted mt-1 mb-0.5">Removido</div>
                        {item.removedComponents.map((r, rIdx) => (
                          <div key={rIdx} className="flex justify-between items-center pl-2 border-l-2 border-error/20">
                            <span className="text-xs italic text-error/80">Sin {r.name}</span>
                          </div>
                        ))}
                      </>
                    )}

                    {/* Adicionales */}
                    {pureAdicionales.length > 0 && (
                      <>
                        <div className="text-[10px] font-semibold uppercase text-text-muted mt-1 mb-0.5">Adicionales</div>
                        {pureAdicionales.map((ad, adIdx) => (
                          <div key={`ad-${adIdx}`} className="flex justify-between items-center pl-2 border-l-2 border-border/50">
                            <span className="text-xs text-text-main">{(ad.quantity ?? 1) > 1 ? `${ad.quantity}× ` : ""}{ad.name}</span>
                            <span className="text-xs font-semibold text-price-green">
                              {ad.priceBsCents > 0 ? `+ ${formatBs(ad.priceBsCents * (ad.quantity ?? 1))}` : "incluido"}
                            </span>
                          </div>
                        ))}
                      </>
                    )}

                    {/* Bebidas */}
                    {item.selectedBebidas && item.selectedBebidas.length > 0 && (
                      <>
                        <div className="text-[10px] font-semibold uppercase text-text-muted mt-1 mb-0.5">Bebidas</div>
                        {item.selectedBebidas.map((b, bIdx) => (
                          <div key={`beb-${bIdx}`} className="flex justify-between items-center pl-2 border-l-2 border-border/50">
                            <span className="text-xs text-text-main">{(b.quantity ?? 1) > 1 ? `${b.quantity}× ` : ""}{b.name}</span>
                            <span className="text-xs font-semibold text-price-green">
                              {b.priceBsCents > 0 ? `+ ${formatBs(b.priceBsCents * (b.quantity ?? 1))}` : "incluido"}
                            </span>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
      <CardFooter className="flex-col items-stretch gap-2">
        <Separator className="mb-2" />
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-muted">Subtotal</span>
          <span className="text-sm text-text-main">
            {formatBs(subtotalBsCents)}
          </span>
        </div>
        {hasSurcharges && surcharges && (
          <>
            {surcharges.packagingUsdCents > 0 && (
              <div className="flex items-center justify-between text-xs text-text-muted">
                <span>
                  Envases ({surcharges.plateCount} plato{surcharges.plateCount !== 1 ? "s" : ""} · {surcharges.adicionalCount} adicional{
                    surcharges.adicionalCount !== 1 ? "es" : ""
                  } · {surcharges.bebidaCount} bebida{surcharges.bebidaCount !== 1 ? "s" : ""})
                </span>
                <span className="text-xs text-text-main">
                  + {formatBs(packagingBsCents)}
                </span>
              </div>
            )}
            {surcharges.deliveryUsdCents > 0 && (
              <div className="flex items-center justify-between text-xs text-text-muted">
                <span>Delivery</span>
                <span className="text-xs text-text-main">
                  + {formatBs(deliveryBsCents)}
                </span>
              </div>
            )}
          </>
        )}
        <Separator />
        <div className="flex items-center justify-between">
          <span className="text-base font-bold text-text-main">TOTAL</span>
          <span className="text-lg font-bold text-price-green">
            {formatBs(displayTotalBs)}
          </span>
        </div>
        {exchangeRate && (
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span>
              ≈ USD{" "}
              {(displayTotalUsd / 100).toLocaleString("en-US", {
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
