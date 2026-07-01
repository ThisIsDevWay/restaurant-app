"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { formatBs, formatRef } from "@/lib/money";
import { formatOrderDate } from "@/lib/utils";
import { obfuscatePhone } from "@/lib/utils";
import type { OrderLineDetailRow } from "@/db/queries/reports";

const statusLabels: Record<string, { label: string; cls: string }> = {
  paid: { label: "Pagado", cls: "bg-green-100 text-green-800 border-green-200" },
  kitchen: { label: "En cocina", cls: "bg-amber-100 text-amber-800 border-amber-200" },
  delivered: { label: "Entregado", cls: "bg-blue-100 text-blue-800 border-blue-200" },
  pending: { label: "Pendiente", cls: "bg-slate-100 text-slate-800 border-slate-200" },
};

const channelColors: Record<string, string> = {
  "Pedido Web": "bg-indigo-100 text-indigo-800 border-indigo-200",
  "Caja": "bg-emerald-100 text-emerald-800 border-emerald-200",
  "Mesero": "bg-orange-100 text-orange-800 border-orange-200",
  "Admin": "bg-slate-100 text-slate-800 border-slate-200",
};

export function OrderDetailTable({ data }: { data: OrderLineDetailRow[] }) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  function toggleExpand(orderId: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs text-left text-text-main min-w-[900px]">
        <thead>
          <tr className="border-b border-border uppercase tracking-wide text-text-muted font-semibold text-[10px]">
            <th className="py-2.5 px-4 w-6"></th>
            <th className="py-2.5 px-4"># Orden</th>
            <th className="py-2.5 px-4">Cliente</th>
            <th className="py-2.5 px-4">Hora</th>
            <th className="py-2.5 px-4 text-center">Canal</th>
            <th className="py-2.5 px-4">Modo</th>
            <th className="py-2.5 px-4">Pago</th>
            <th className="py-2.5 px-4 text-center">Estado</th>
            <th className="py-2.5 px-4 text-right">Total Bs</th>
            <th className="py-2.5 px-4 text-right">Total USD</th>
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={10} className="py-12 px-4 text-center text-sm text-text-muted">
                Sin pedidos en el rango seleccionado
              </td>
            </tr>
          ) : (
            data.map((order) => {
              const isExpanded = expandedIds.has(order.orderId);
              const st = statusLabels[order.status] ?? statusLabels.pending;
              const chColor = channelColors[order.channel] ?? "bg-slate-100 text-slate-800 border-slate-200";

              return (
                <OrderRow
                  key={order.orderId}
                  order={order}
                  isExpanded={isExpanded}
                  onToggle={() => toggleExpand(order.orderId)}
                  statusBadge={st}
                  channelColor={chColor}
                />
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

function OrderRow({
  order,
  isExpanded,
  onToggle,
  statusBadge,
  channelColor,
}: {
  order: OrderLineDetailRow;
  isExpanded: boolean;
  onToggle: () => void;
  statusBadge: { label: string; cls: string };
  channelColor: string;
}) {
  const Icon = isExpanded ? ChevronDown : ChevronRight;
  const customerDisplay = order.customerName || obfuscatePhone(order.customerPhone);

  return (
    <>
      {/* Main order row */}
      <tr
        className="border-b border-border hover:bg-bg-app/50 cursor-pointer font-medium transition-colors"
        onClick={onToggle}
      >
        <td className="py-2.5 px-4 pl-1">
          <Icon className="h-3.5 w-3.5 text-text-muted" />
        </td>
        <td className="py-2.5 px-4 font-bold">#{order.orderNumber}</td>
        <td className="py-2.5 px-4">
          <div className="flex flex-col">
            <span className="font-medium">{customerDisplay}</span>
            {order.tableNumber && (
              <span className="text-[10px] text-text-muted">Mesa {order.tableNumber}</span>
            )}
          </div>
        </td>
        <td className="py-2.5 px-4 tabular-nums text-text-muted">{formatOrderDate(order.createdAt)}</td>
        <td className="py-2.5 px-4 text-center">
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${channelColor}`}>
            {order.channel}
          </span>
        </td>
        <td className="py-2.5 px-4 text-text-muted">{order.orderMode}</td>
        <td className="py-2.5 px-4 text-text-muted">{order.paymentMethod}</td>
        <td className="py-2.5 px-4 text-center">
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${statusBadge.cls}`}>
            {statusBadge.label}
          </span>
        </td>
        <td className="py-2.5 px-4 text-right tabular-nums font-bold">{formatBs(order.grandTotalBsCents)}</td>
        <td className="py-2.5 px-4 text-right tabular-nums text-primary font-medium">{formatRef(order.grandTotalUsdCents)}</td>
      </tr>

      {/* Expanded item composition */}
      {isExpanded && (
        <tr>
          <td colSpan={10} className="bg-bg-app/30 px-4 py-3 border-b border-border">
            <div className="space-y-3">
              {order.itemsSnapshot.map((item, idx) => (
                <div key={idx} className="bg-white rounded-lg border border-border p-3 shadow-xs">
                  {/* Item header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-text-main">
                        {item.quantity > 1 ? `${item.quantity}× ` : ""}{item.name}
                      </span>
                    </div>
                    <span className="font-bold text-sm tabular-nums text-text-main">
                      {formatBs(item.itemTotalBsCents)}
                    </span>
                  </div>
                  <div className="text-[10px] text-text-muted mt-0.5">
                    Base: {formatBs(item.priceBsCents)} / {formatRef(item.priceUsdCents)}
                  </div>

                  {/* Contornos fijos */}
                  {item.fixedContornos.length > 0 && (
                    <div className="mt-2">
                      <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-0.5">Contornos</div>
                      {item.fixedContornos.map((c, ci) => (
                        <div key={ci} className="flex items-center gap-1 text-xs text-text-main pl-2">
                          <span className="text-amber-600">●</span>
                          <span>{c.name}</span>
                          <span className="text-text-muted ml-auto tabular-nums">
                            {c.priceBsCents > 0 ? formatBs(c.priceBsCents) : "incluido"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Sustituciones de contorno */}
                  {item.selectedAdicionales.filter((a) => a.substitutesComponentId).length > 0 && (
                    <div className="mt-1.5">
                      <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-0.5">Sustituciones</div>
                      {item.selectedAdicionales
                        .filter((a) => a.substitutesComponentId)
                        .map((s, si) => (
                          <div key={si} className="flex items-center gap-1 text-xs text-text-main pl-2">
                            <span className="text-purple-500">↺</span>
                            <span>{s.name} <span className="text-text-muted">(por {s.substitutesComponentName})</span></span>
                            <span className="text-text-muted ml-auto tabular-nums">
                              {s.priceBsCents > 0 ? `+${formatBs(s.priceBsCents)}` : "incluido"}
                            </span>
                          </div>
                        ))}
                    </div>
                  )}

                  {/* Removidos */}
                  {item.removedComponents && item.removedComponents.length > 0 && (
                    <div className="mt-1.5">
                      <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-0.5">Removidos</div>
                      {item.removedComponents.map((r, ri) => (
                        <div key={ri} className="flex items-center gap-1 text-xs text-red-600 pl-2">
                          <span>✕</span>
                          <span>Sin {r.name}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Adicionales puros */}
                  {item.selectedAdicionales.filter((a) => !a.substitutesComponentId).length > 0 && (
                    <div className="mt-1.5">
                      <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-0.5">Adicionales</div>
                      {item.selectedAdicionales
                        .filter((a) => !a.substitutesComponentId)
                        .map((a, ai) => (
                          <div key={ai} className="flex items-center gap-1 text-xs text-text-main pl-2">
                            <span className="text-green-600">+</span>
                            <span>{(a.quantity ?? 1) > 1 ? `${a.quantity}× ` : ""}{a.name}</span>
                            <span className="text-text-muted ml-auto tabular-nums">
                              +{formatBs(a.priceBsCents * (a.quantity ?? 1))}
                            </span>
                          </div>
                        ))}
                    </div>
                  )}

                  {/* Bebidas */}
                  {item.selectedBebidas && item.selectedBebidas.length > 0 && (
                    <div className="mt-1.5">
                      <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-0.5">Bebidas</div>
                      {item.selectedBebidas.map((b, bi) => (
                        <div key={bi} className="flex items-center gap-1 text-xs text-text-main pl-2">
                          <span className="text-teal-600">🥤</span>
                          <span>{(b.quantity ?? 1) > 1 ? `${b.quantity}× ` : ""}{b.name}</span>
                          <span className="text-text-muted ml-auto tabular-nums">
                            +{formatBs(b.priceBsCents * (b.quantity ?? 1))}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* Order-level surcharges */}
              {(order.packagingUsdCents > 0 || order.deliveryUsdCents > 0 || order.igtfBsCents > 0) && (
                <div className="flex gap-3 text-[10px] text-text-muted pt-1 border-t border-border">
                  {order.packagingUsdCents > 0 && (
                    <span>📦 Empaque: {formatRef(order.packagingUsdCents)}</span>
                  )}
                  {order.deliveryUsdCents > 0 && (
                    <span>🚚 Delivery: {formatRef(order.deliveryUsdCents)}</span>
                  )}
                  {order.igtfBsCents > 0 && (
                    <span>🏛️ IGTF: {formatBs(order.igtfBsCents)}</span>
                  )}
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
