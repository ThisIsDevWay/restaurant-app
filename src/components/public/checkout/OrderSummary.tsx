import { useState } from "react";
import { ChevronDown, ShoppingBag, Info } from "lucide-react";
import { formatBs, formatRef } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { CartItem } from "@/store/cartStore";
import type { CheckoutSettings } from "./CheckoutForm.types";

interface SurchargeInfo {
  plateCount: number;
  adicionalCount: number;
  bebidaCount: number;
  packagingUsdCents: number;
  deliveryUsdCents: number;
  totalSurchargeUsdCents: number;
}

interface OrderSummaryProps {
  items: CartItem[];
  itemCount: number;
  summaryExpanded: boolean;
  onToggleSummary: () => void;
  totalBsCents: number;
  totalUsdCents: number;
  surcharges: SurchargeInfo;
  rate: number;
  grandTotalBsCents: number;
  grandTotalUsdCents: number;
  settings: CheckoutSettings | null;
}

export function OrderSummary({
  items,
  itemCount,
  summaryExpanded,
  onToggleSummary,
  totalBsCents,
  totalUsdCents,
  surcharges,
  rate,
  grandTotalBsCents,
  grandTotalUsdCents,
  settings,
}: OrderSummaryProps) {
  const [envasesExpanded, setEnvasesExpanded] = useState(false);

  return (
    <div className="bg-bg-card rounded-[20px] border border-border overflow-hidden shadow-sm transition-all duration-300">
      {/* Header / Trigger - Heritage Editorial Style */}
      <button
        type="button"
        onClick={onToggleSummary}
        className="w-full flex items-center justify-between p-5 cursor-pointer active:bg-surface-section transition-colors group"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2">
            <h2 className="text-[clamp(14px,4vw,16px)] font-display font-black text-text-main tracking-tight uppercase">
              Resumen del pedido
            </h2>
            {itemCount > 0 && (
              <span className="px-2 py-0.5 bg-[#7B2D2D]/10 text-[#7B2D2D] text-[10px] font-black rounded-md border border-[#7B2D2D]/20 uppercase tracking-tighter">
                {itemCount} {itemCount === 1 ? 'plato' : 'platos'}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
            <span className="text-[clamp(15px,4.5vw,17px)] font-display font-black text-[#7B2D2D]">
              {formatBs(grandTotalBsCents)}
            </span>
          </div>
          <div className={cn(
            "w-6 h-6 rounded-full flex items-center justify-center transition-all duration-500",
            summaryExpanded ? "rotate-180 bg-[#7B2D2D]/5" : "bg-surface-section"
          )}>
            <ChevronDown className={cn("w-3.5 h-3.5 transition-colors", summaryExpanded ? "text-[#7B2D2D]" : "text-text-muted")} strokeWidth={3} />
          </div>
        </div>
      </button>

      {/* Expandable Content */}
      <div className={cn(
        "overflow-hidden transition-all duration-500 ease-in-out",
        summaryExpanded ? "max-h-[3000px] opacity-100 border-t border-border/40" : "max-h-0 opacity-0"
      )}>
        <div className="p-5 space-y-5">
          {items.map((item, idx) => (
            <div key={idx} className="animate-in fade-in slide-in-from-top-2 duration-300" style={{ animationDelay: `${idx * 50}ms` }}>
              <div className="flex justify-between items-start mb-2">
                <div className="flex gap-3 min-w-0">
                  <div className="w-5 h-5 rounded-md bg-surface-section border border-border flex items-center justify-center text-[11px] font-black text-text-main shrink-0 mt-0.5">
                    {item.quantity}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[clamp(13px,3.8vw,15px)] font-display font-black text-text-main leading-tight break-words">
                      {item.name}
                    </div>
                    <div className="text-[11px] font-bold text-text-muted/60 mt-1 uppercase tracking-wider">
                      Base · {formatBs(item.baseBsCents)}
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[clamp(13px,3.8vw,15px)] font-display font-black text-text-main">
                    {formatBs(item.itemTotalBsCents)}
                  </div>
                </div>
              </div>

              {/* Components List */}
              <div className="ml-8 space-y-3">
                {/* Incluye (fixed inclusions) */}
                {item.includedNote && (
                  <>
                    <div className="text-[10px] font-medium uppercase tracking-[0.05em] text-emerald-600 mt-1.5 mb-[2px]">Incluye</div>
                    <div className="flex items-center pl-2 border-l-[1.5px] border-emerald-200 gap-1.5">
                      <span className="text-emerald-600 text-[11px] font-bold">✓</span>
                      <span className="text-[12px] text-emerald-700 font-medium">{item.includedNote}</span>
                    </div>
                  </>
                )}

                {/* Contornos Section */}
                {((item.fixedContornos ?? []).length > 0 || (item.contornoSubstitutions ?? []).length > 0) && (
                  <>
                    <div className="text-[10px] font-medium uppercase tracking-[0.05em] text-[#C4A090] mt-1.5 mb-[2px]">Contornos</div>
                    {(item.fixedContornos ?? []).map((c) => (
                      <div key={c.id} className="flex justify-between items-center pl-2 border-l-[1.5px] border-[#EDD8CF]">
                        <span className="text-[12px] text-[#5A3A3A]">{c.name}</span>
                        <span className="text-[11px] italic text-[#9A6A5A]">incluido</span>
                      </div>
                    ))}
                    {(item.contornoSubstitutions ?? []).map((s, idx2) => (
                      <div key={idx2} className="flex justify-between items-center pl-2 border-l-[1.5px] border-[#EDD8CF]">
                        <span className="text-[12px] text-[#5A3A3A]">
                          {s.substituteName} <span className="opacity-70 text-[11px] ml-1">(en lugar de {s.originalName})</span>
                        </span>
                        {s.priceBsCents > 0 ? (
                          <span className="text-[12px] font-medium text-[#7B2D2D]">+ {formatBs(s.priceBsCents)}</span>
                        ) : (
                          <span className="text-[11px] italic text-[#9A6A5A]">incluido</span>
                        )}
                      </div>
                    ))}
                  </>
                )}

                {/* SIN (Removidos) Section */}
                {(item.removedComponents ?? []).length > 0 && (
                  <>
                    <div className="text-[10px] font-medium uppercase tracking-[0.05em] text-[#C4A090] mt-1.5 mb-[2px]">Removido</div>
                    {(item.removedComponents ?? []).map((r) => (
                      <div key={r.componentId} className="flex justify-between items-center pl-2 border-l-[1.5px] border-red-200">
                        <span className="text-[12px] italic text-red-800/70">Sin {r.name}</span>
                      </div>
                    ))}
                  </>
                )}

                {/* Adicionales Section */}
                {(item.selectedAdicionales ?? []).length > 0 && (
                  <>
                    <div className="text-[10px] font-medium uppercase tracking-[0.05em] text-[#C4A090] mt-1.5 mb-[2px]">Adicionales</div>
                    {item.selectedAdicionales.map((adicional) => (
                      <div key={adicional.id} className="flex justify-between items-center pl-2 border-l-[1.5px] border-[#EDD8CF]">
                        <span className="text-[12px] text-[#5A3A3A]">{adicional.quantity ?? 1}× {adicional.name}</span>
                        <span className="text-[12px] font-medium text-[#7B2D2D]">
                          {adicional.priceBsCents > 0 ? `+ ${formatBs(adicional.priceBsCents * (adicional.quantity ?? 1))}` : "incluido"}
                        </span>
                      </div>
                    ))}
                  </>
                )}

                {/* Bebidas Section */}
                {(item.selectedBebidas ?? []).length > 0 && (
                  <>
                    <div className="text-[10px] font-medium uppercase tracking-[0.05em] text-[#C4A090] mt-1.5 mb-[2px]">Bebidas</div>
                    {(item.selectedBebidas ?? []).map((bebida) => (
                      <div key={bebida.id} className="flex justify-between items-center pl-2 border-l-[1.5px] border-[#EDD8CF]">
                        <span className="text-[12px] text-[#5A3A3A]">{bebida.quantity ?? 1}× {bebida.name}</span>
                        <span className="text-[12px] font-medium text-[#7B2D2D]">
                          {bebida.priceBsCents > 0 ? `+ ${formatBs(bebida.priceBsCents * (bebida.quantity ?? 1))}` : "incluido"}
                        </span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          ))}

          {/* Surcharges Section */}
          <div className="bg-surface-section rounded-[16px] p-4 space-y-3 mt-6 border border-border/40">
            <div className="flex justify-between text-[13px] font-bold text-text-main uppercase tracking-tight">
              <span>Subtotal platos</span>
              <span>{formatBs(totalBsCents)}</span>
            </div>

            {surcharges.totalSurchargeUsdCents > 0 && (
              <div className="space-y-2 pt-2 border-t border-border/20">
                {surcharges.packagingUsdCents > 0 && (
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => setEnvasesExpanded(!envasesExpanded)}
                      className="flex justify-between items-center text-[12px] font-medium text-text-muted hover:text-text-main transition-colors"
                    >
                      <span className="flex items-center gap-1.5">
                        <Info className="w-3 h-3" />
                        Cargos por envases
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-[#7B2D2D]">
                          + {formatBs(Math.round(surcharges.packagingUsdCents * rate))}
                        </span>
                        <ChevronDown className={cn("w-3 h-3 transition-transform", envasesExpanded ? "rotate-180" : "")} />
                      </div>
                    </button>
                    
                    <div className={cn(
                      "overflow-hidden transition-all duration-300",
                      envasesExpanded ? "max-h-20 opacity-100 mt-1" : "max-h-0 opacity-0"
                    )}>
                      <div className="pl-4 space-y-1 text-[11px] text-text-muted font-medium border-l border-border/60">
                        {surcharges.plateCount > 0 && settings!.packagingFeePerPlateUsdCents > 0 && (
                          <div className="flex justify-between">
                            <span>{surcharges.plateCount}× Plato</span>
                            <span>{formatBs(Math.round(settings!.packagingFeePerPlateUsdCents * rate))} c/u</span>
                          </div>
                        )}
                        {surcharges.adicionalCount > 0 && settings!.packagingFeePerAdicionalUsdCents > 0 && (
                          <div className="flex justify-between">
                            <span>{surcharges.adicionalCount}× Adicional</span>
                            <span>{formatBs(Math.round(settings!.packagingFeePerAdicionalUsdCents * rate))} c/u</span>
                          </div>
                        )}
                        {surcharges.bebidaCount > 0 && settings!.packagingFeePerBebidaUsdCents > 0 && (
                          <div className="flex justify-between">
                            <span>{surcharges.bebidaCount}× Bebida</span>
                            <span>{formatBs(Math.round(settings!.packagingFeePerBebidaUsdCents * rate))} c/u</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                
                {surcharges.deliveryUsdCents > 0 && (
                  <div className="flex justify-between text-[12px] font-medium text-text-muted">
                    <span>Envío (Delivery)</span>
                    <span className="font-black text-[#7B2D2D]">+ {formatBs(Math.round(surcharges.deliveryUsdCents * rate))}</span>
                  </div>
                )}
              </div>
            )}

            {/* Tax Breakdown (MVP Rule) */}
            <div className="space-y-1.5 pt-3 border-t border-border/20">
              <div className="flex justify-between text-[11px] font-bold text-text-muted uppercase tracking-wider">
                <span>Base imponible</span>
                <span>{formatBs(Math.round(totalBsCents / 1.16))}</span>
              </div>
              <div className="flex justify-between text-[11px] font-bold text-text-muted uppercase tracking-wider">
                <span>IVA incluido (16%)</span>
                <span>{formatBs(totalBsCents - Math.round(totalBsCents / 1.16))}</span>
              </div>
            </div>

            {/* Total Row */}
            <div className="pt-3 border-t-2 border-dashed border-border/60 flex justify-between items-baseline">
              <span className="text-[13px] font-display font-black text-text-main uppercase tracking-widest">Total pedido</span>
              <div className="text-right">
                <div className="text-[clamp(18px,6vw,24px)] font-display font-black text-[#7B2D2D] leading-none">
                  {formatBs(grandTotalBsCents)}
                </div>
                <div className="text-[clamp(10px,2.5vw,12px)] font-bold text-text-muted mt-1">
                  Ref. {formatRef(grandTotalUsdCents)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
