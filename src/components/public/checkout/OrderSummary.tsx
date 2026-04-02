import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import Image from "next/image";
import { formatBs, formatRef } from "@/lib/money";
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
    <div className="bg-white rounded-[16px] p-4 border border-black/[0.06]">
      <div
        onClick={onToggleSummary}
        className="flex items-center justify-between cursor-pointer"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="bg-[#7B2D2D] text-white text-[11px] font-medium rounded-full px-2 py-[2.5px] whitespace-nowrap shrink-0">
            {itemCount} {itemCount === 1 ? "plato" : "platos"}
          </span>
          <span className="text-[11px] font-medium tracking-[0.06em] text-[#9A6A5A] uppercase m-0 truncate">
            Resumen del pedido
          </span>
        </div>
        <div className="flex items-center gap-2.5 shrink-0 ml-2">
          <span className="text-[13px] text-[#3C1A1A] font-medium whitespace-nowrap">
            {formatBs(grandTotalBsCents)}
          </span>
          <div className={`transition-transform duration-200 flex ${summaryExpanded ? "rotate-180" : ""}`}>
            <ChevronDown className="w-3.5 h-3.5 text-[#7B2D2D]" strokeWidth={1.8} />
          </div>
        </div>
      </div>

      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${summaryExpanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"}`}>
        <div className="h-[0.5px] bg-black/[0.07] my-3"></div>

        {items.map((item, idx) => (
          <div key={idx}>
            <div className="flex justify-between items-start">
              <div>
                <div className="text-[14px] font-medium text-[#1A0A0A]">
                  {item.quantity > 1 ? `${item.quantity}× ` : ""}{item.name}
                </div>
                <div className="text-[12px] text-[#9A6A5A] mt-0.5">
                  Base · {formatBs(item.baseBsCents)} / {formatRef(item.baseUsdCents)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[14px] font-medium text-[#1A0A0A]">
                  {formatBs(item.itemTotalBsCents * item.quantity)}
                </div>
                <div className="text-[11px] text-[#9A6A5A]">
                  {formatRef(Math.round((item.itemTotalBsCents * item.quantity) / (totalBsCents / totalUsdCents)))}
                </div>
              </div>
            </div>

            <div className="mt-2.5 flex flex-col gap-[5px]">
              {/* Contornos */}
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

              {/* Sin (Removidos) */}
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

              {/* Adicionales */}
              {item.selectedAdicionales.length > 0 && (
                <>
                  <div className="text-[10px] font-medium uppercase tracking-[0.05em] text-[#C4A090] mt-1.5 mb-[2px]">Adicionales</div>
                  {item.selectedAdicionales.map((adicional) => (
                    <div key={adicional.id} className="flex justify-between items-center pl-2 border-l-[1.5px] border-[#EDD8CF]">
                      <span className="text-[12px] text-[#5A3A3A]">{adicional.name}</span>
                      <span className="text-[12px] font-medium text-[#7B2D2D]">
                        {adicional.priceBsCents > 0 ? `+ ${formatBs(adicional.priceBsCents)}` : "incluido"}
                      </span>
                    </div>
                  ))}
                </>
              )}

              {/* Bebidas */}
              {(item.selectedBebidas ?? []).length > 0 && (
                <>
                  <div className="text-[10px] font-medium uppercase tracking-[0.05em] text-[#C4A090] mt-1.5 mb-[2px]">Bebidas</div>
                  {(item.selectedBebidas ?? []).map((bebida) => (
                    <div key={bebida.id} className="flex justify-between items-center pl-2 border-l-[1.5px] border-[#EDD8CF]">
                      <span className="text-[12px] text-[#5A3A3A]">{bebida.name}</span>
                      <span className="text-[12px] font-medium text-[#7B2D2D]">
                        {bebida.priceBsCents > 0 ? `+ ${formatBs(bebida.priceBsCents)}` : "incluido"}
                      </span>
                    </div>
                  ))}
                </>
              )}
            </div>
            {idx !== items.length - 1 && <div className="h-[0.5px] bg-black/[0.07] my-3"></div>}
          </div>
        ))}

        <div className="h-[0.5px] bg-black/[0.07] my-3"></div>

        <div className="bg-[#FAF5F2] rounded-[10px] p-3 mt-3">
          <div className="flex justify-between text-[12px] text-[#6A4040] py-[3px]">
            <span>Subtotal platos</span>
            <span>{formatBs(totalBsCents)}</span>
          </div>

          {surcharges.totalSurchargeUsdCents > 0 && (
            <>
              {surcharges.packagingUsdCents > 0 && (
                <>
                  <span
                    className="text-[11px] text-[#7B2D2D] underline cursor-pointer mt-1.5 mb-1 inline-block"
                    onClick={() => setEnvasesExpanded(!envasesExpanded)}
                  >
                    + Cargos por envases ({rate > 0 ? formatBs(Math.round(surcharges.packagingUsdCents * rate)) : formatRef(surcharges.packagingUsdCents)}) {envasesExpanded ? '▴' : '▾'}
                  </span>
                  <div className={`overflow-hidden transition-all duration-200 ease-in-out ${envasesExpanded ? "max-h-[100px]" : "max-h-0"}`}>
                    <div className="mt-1">
                      {surcharges.plateCount > 0 && settings!.packagingFeePerPlateUsdCents > 0 && (
                        <div className="flex justify-between text-[12px] text-[#8A5050] py-[3px]">
                          <span className="pl-2 relative before:content-[''] before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-1 before:h-[1.5px] before:bg-[#EDD8CF]">{surcharges.plateCount}× plato</span>
                          <span>{rate > 0 ? `${formatBs(Math.round(settings!.packagingFeePerPlateUsdCents * rate))}/u` : `${formatRef(settings!.packagingFeePerPlateUsdCents)}/u`}</span>
                        </div>
                      )}
                      {surcharges.adicionalCount > 0 && settings!.packagingFeePerAdicionalUsdCents > 0 && (
                        <div className="flex justify-between text-[12px] text-[#8A5050] py-[3px]">
                          <span className="pl-2 relative before:content-[''] before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-1 before:h-[1.5px] before:bg-[#EDD8CF]">{surcharges.adicionalCount}× adicional</span>
                          <span>{rate > 0 ? `${formatBs(Math.round(settings!.packagingFeePerAdicionalUsdCents * rate))}/u` : `${formatRef(settings!.packagingFeePerAdicionalUsdCents)}/u`}</span>
                        </div>
                      )}
                      {surcharges.bebidaCount > 0 && settings!.packagingFeePerBebidaUsdCents > 0 && (
                        <div className="flex justify-between text-[12px] text-[#8A5050] py-[3px]">
                          <span className="pl-2 relative before:content-[''] before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-1 before:h-[1.5px] before:bg-[#EDD8CF]">{surcharges.bebidaCount}× bebida</span>
                          <span>{rate > 0 ? `${formatBs(Math.round(settings!.packagingFeePerBebidaUsdCents * rate))}/u` : `${formatRef(settings!.packagingFeePerBebidaUsdCents)}/u`}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
              {surcharges.deliveryUsdCents > 0 && (
                <div className="flex justify-between text-[12px] text-[#6A4040] py-[3px]">
                  <span>Envío (Delivery)</span>
                  <span>{rate > 0 ? formatBs(Math.round(surcharges.deliveryUsdCents * rate)) : formatRef(surcharges.deliveryUsdCents)}</span>
                </div>
              )}
            </>
          )}

          <div className="h-[0.5px] bg-black/[0.08] my-1.5"></div>
          <div className="flex justify-between text-[12px] text-[#8A5050] py-[3px]">
            <span>Base imponible</span>
            <span>{formatBs(Math.round(grandTotalBsCents / 1.16))}</span>
          </div>
          <div className="flex justify-between text-[12px] text-[#8A5050] py-[3px]">
            <span>IVA incluido (16%)</span>
            <span>{formatBs(grandTotalBsCents - Math.round(grandTotalBsCents / 1.16))}</span>
          </div>
          <div className="h-[0.5px] bg-black/[0.08] my-1.5"></div>
          <div className="flex justify-between items-baseline mt-1">
            <span className="text-[13px] font-medium text-[#1A0A0A]">Total a pagar</span>
            <div className="text-right">
              <div className="text-[17px] font-medium text-[#7B2D2D]">{formatBs(grandTotalBsCents)}</div>
              <div className="text-[12px] text-[#9A6A5A]">
                {formatRef(grandTotalUsdCents)} · tasa BCV
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
