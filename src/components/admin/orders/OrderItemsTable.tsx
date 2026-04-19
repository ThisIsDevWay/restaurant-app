import { formatBs, formatRef } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { Receipt, Package, Truck, MinusCircle, PlusCircle, Layers } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

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
    <Card className="ring-1 ring-border shadow-md rounded-2xl overflow-hidden border-none">
      <CardHeader className="bg-slate-50/50 border-b border-border/60 py-4 px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-primary/10 p-2 rounded-xl">
              <Receipt className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-lg font-bold">Resumen del Pedido</CardTitle>
          </div>
          <Badge variant="outline" className="bg-white font-bold text-text-muted border-border px-3">
            {items.reduce((acc, item) => acc + item.quantity, 0)} items
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border/40">
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
              <div key={idx} className="px-6 py-5 group hover:bg-slate-50/30 transition-colors">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/5 flex items-center justify-center text-xs font-black text-primary shrink-0 border border-primary/20">
                        {item.quantity}x
                      </div>
                      <div>
                        <div className="text-base font-bold text-text-main flex items-center gap-2">
                          {item.name}
                        </div>
                        <div className="text-xs font-medium text-text-muted mt-0.5 flex items-center gap-1.5 opacity-80">
                          {formatBs(item.priceBsCents)} / {formatRef(item.priceUsdCents)}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-bold text-text-main">
                      {formatBs(item.itemTotalBsCents)}
                    </div>
                  </div>
                </div>

                {hasModifiers && (
                  <div className="mt-4 ml-11 space-y-3">
                    {/* Contornos */}
                    {hasContornos && (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <Layers className="h-3 w-3 text-primary/60" />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Contornos</span>
                        </div>
                        <div className="space-y-1">
                          {item.fixedContornos.map((c, cIdx) => (
                            <div key={cIdx} className="flex justify-between items-center pl-3 border-l-2 border-primary/20 py-0.5">
                              <span className="text-sm text-text-main font-medium">{c.name}</span>
                              <span className="text-[10px] font-bold uppercase text-text-muted bg-muted px-1.5 rounded">Incluido</span>
                            </div>
                          ))}
                          {item.selectedAdicionales
                            .filter((a) => a.substitutesComponentId)
                            .map((s, sIdx) => (
                              <div key={`sub-${sIdx}`} className="flex justify-between items-center pl-3 border-l-2 border-primary/20 py-0.5">
                                <span className="text-sm text-text-main font-medium">
                                  {s.name} <span className="text-[10px] font-normal text-text-muted ml-1">(Sustituye {s.substitutesComponentName})</span>
                                </span>
                                {s.priceBsCents > 0 ? (
                                  <span className="text-sm font-bold text-price-green">+ {formatBs(s.priceBsCents)}</span>
                                ) : (
                                  <span className="text-[10px] font-bold uppercase text-text-muted bg-muted px-1.5 rounded">Sustitución</span>
                                )}
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Adicionales */}
                    {pureAdicionales.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <PlusCircle className="h-3 w-3 text-emerald-500/60" />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Extras</span>
                        </div>
                        <div className="space-y-1">
                          {pureAdicionales.map((ad, adIdx) => (
                            <div key={`ad-${adIdx}`} className="flex justify-between items-center pl-3 border-l-2 border-emerald-500/20 py-0.5">
                              <span className="text-sm text-text-main font-medium">
                                {ad.quantity ?? 1}× {ad.name}
                              </span>
                              <span className="text-sm font-bold text-emerald-600">
                                {ad.priceBsCents > 0 ? `+ ${formatBs(ad.priceBsCents * (ad.quantity ?? 1))}` : "Gratis"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Bebidas */}
                    {item.selectedBebidas && item.selectedBebidas.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <Layers className="h-3 w-3 text-blue-500/60" />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Bebidas</span>
                        </div>
                        <div className="space-y-1">
                          {item.selectedBebidas.map((b, bIdx) => (
                            <div key={`beb-${bIdx}`} className="flex justify-between items-center pl-3 border-l-2 border-blue-500/20 py-0.5">
                              <span className="text-sm text-text-main font-medium">
                                {b.quantity ?? 1}× {b.name}
                              </span>
                              <span className="text-sm font-bold text-blue-600">
                                {b.priceBsCents > 0 ? `+ ${formatBs(b.priceBsCents * (b.quantity ?? 1))}` : "Incluida"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Removidos */}
                    {item.removedComponents && item.removedComponents.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <MinusCircle className="h-3 w-3 text-red-500/60" />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Sin estos ingredientes</span>
                        </div>
                        <div className="space-y-1">
                          {item.removedComponents.map((r, rIdx) => (
                            <div key={rIdx} className="flex items-center pl-2 border-l-2 border-red-500/20 py-0.5">
                              <span className="text-xs italic text-red-600/80 font-medium">No incluir {r.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
      <CardFooter className="flex-col items-stretch gap-4 p-6 bg-slate-50/30 border-t border-border/60">
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-text-muted">Subtotal de productos</span>
            <span className="text-sm font-bold text-text-main">
              {formatBs(subtotalBsCents)}
            </span>
          </div>

          {hasSurcharges && surcharges && (
            <div className="space-y-2 pt-1">
              {surcharges.packagingUsdCents > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-text-muted">
                    <Package className="h-3.5 w-3.5 opacity-70" />
                    <span>Empaquetado y Envases</span>
                  </div>
                  <span className="text-xs font-bold text-text-main">
                    + {formatBs(packagingBsCents)}
                  </span>
                </div>
              )}
              {surcharges.deliveryUsdCents > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-text-muted">
                    <Truck className="h-3.5 w-3.5 opacity-70" />
                    <span>Costo de Delivery</span>
                  </div>
                  <span className="text-xs font-bold text-text-main">
                    + {formatBs(deliveryBsCents)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-border/80 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-lg font-black text-text-main leading-tight">TOTAL</span>
            {exchangeRate && (
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                ≈ USD {(displayTotalUsd / 100).toFixed(2)}
              </span>
            )}
          </div>
          <div className="text-2xl font-black text-price-green tracking-tight">
            {formatBs(displayTotalBs)}
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
