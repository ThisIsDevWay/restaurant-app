"use client";

import { useEffect, useState } from "react";
import { X, Info } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { CartItem } from "./CartItem";
import { formatBs, formatRef } from "@/lib/money";
import { useRouter } from "next/navigation";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export function Cart() {
  const items = useCartStore((s) => s.items);
  const mounted = useCartStore((s) => s.mounted);
  const setMounted = useCartStore((s) => s.setMounted);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const totalBsCents = useCartStore((s) => s.totalBsCents());
  const totalUsdCents = useCartStore((s) => s.totalUsdCents());
  const isDrawerOpen = useCartStore((s) => s.isDrawerOpen);
  const openDrawer = useCartStore((s) => s.openDrawer);
  const closeDrawer = useCartStore((s) => s.closeDrawer);
  const router = useRouter();
  const isOnline = useOnlineStatus();
  const [taxOpen, setTaxOpen] = useState(false);

  useEffect(() => {
    setMounted();
  }, [setMounted]);

  if (!mounted || items.length === 0) return null;

  const itemCount = items.reduce((s, i) => s + i.quantity, 0);
  const baseImponible = Math.round(totalBsCents / 1.16);
  const ivaBs = totalBsCents - baseImponible;

  return (
    <>
      {/* Bottom bar trigger */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-white px-4 py-3 shadow-elevated">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <p className="text-[15px] font-extrabold text-text-main">
                {formatBs(totalBsCents)}
              </p>
              <p className="text-[11px] font-semibold text-primary/70">
                {formatRef(totalUsdCents)}
              </p>
            </div>
            <p className="text-[11px] text-text-muted">
              {itemCount} {itemCount === 1 ? "item" : "items"}
            </p>
          </div>
          <button
            onClick={() => isOnline && openDrawer()}
            disabled={!isOnline}
            title={!isOnline ? "Necesitas conexión para hacer un pedido" : undefined}
            className={`rounded-input bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors active:bg-primary-hover ${!isOnline ? "opacity-50 cursor-not-allowed" : ""
              }`}
          >
            Ver pedido →
          </button>
        </div>
      </div>

      {/* Drawer — always in DOM for animation */}
      <div
        className={`fixed inset-0 z-50 ${isDrawerOpen ? "" : "pointer-events-none"}`}
        inert={!isDrawerOpen}
      >
        {/* Overlay */}
        <div
          className={`absolute inset-0 pointer-events-auto bg-black/40 transition-opacity duration-200 ${isDrawerOpen ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          onClick={() => closeDrawer()}
        />

        {/* Drawer panel */}
        <div
          className={`absolute bottom-0 left-0 right-0 pointer-events-auto max-h-[85vh] flex flex-col rounded-t-[20px] bg-white shadow-modal transition-transform duration-200 ease-out ${isDrawerOpen ? "translate-y-0" : "translate-y-full"
            }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Header ── */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <h2 className="text-[15px] font-semibold text-text-main">Mi pedido</h2>
              <span className="text-xs text-text-muted bg-bg-app rounded-full px-2 py-0.5">
                {itemCount} {itemCount === 1 ? "ítem" : "ítems"}
              </span>
            </div>
            <button
              onClick={() => closeDrawer()}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-bg-app text-text-muted"
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* ── Scrollable items ── */}
          <div className="flex-1 overflow-y-auto px-2 py-2">
            <div className="flex flex-col gap-1.5">
              {items.map((item, index) => (
                <CartItem
                  key={`${item.id}-${(item.fixedContornos ?? []).map((c) => c.id).join(",")}-${(item.contornoSubstitutions ?? []).map((s) => s.substituteId).join(",")}-${(item.selectedAdicionales ?? []).map((a) => a.id).join(",")}-${(item.selectedBebidas ?? []).map((b) => b.id).join(",")}-${index}`}
                  item={item}
                  index={index}
                  onUpdateQuantity={updateQuantity}
                  onRemove={removeItem}
                />
              ))}
            </div>
          </div>

          {/* ── Totals + CTA (sticky bottom) ── */}
          <div className="border-t border-border bg-white px-3 pt-2 pb-4">
            {/* Tax toggle */}
            <button
              onClick={() => setTaxOpen((p) => !p)}
              className="flex w-full items-center justify-between py-[7px] text-left"
            >
              <span className="flex items-center gap-1.5 text-xs text-text-muted">
                <Info className="h-3.5 w-3.5 opacity-50" />
                Desglose fiscal (IVA 16%)
                <span className={`inline-block text-[10px] text-text-muted transition-transform duration-200 ${taxOpen ? "rotate-180" : ""}`}>
                  ▾
                </span>
              </span>
              <span className="text-xs text-text-muted">{formatBs(ivaBs)}</span>
            </button>

            {taxOpen && (
              <div className="pb-1 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="flex justify-between text-[11px] text-text-muted py-[3px]">
                  <span>Base imponible</span>
                  <span>{formatBs(baseImponible)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-text-muted py-[3px]">
                  <span>IVA (16%)</span>
                  <span>{formatBs(ivaBs)}</span>
                </div>
              </div>
            )}

            {/* Total row */}
            <div className="flex items-baseline justify-between pt-2.5 mt-1 border-t border-black/[0.09]">
              <span className="text-sm font-semibold text-text-main">Total a pagar</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-[11px] text-text-muted bg-bg-app rounded px-1.5 py-0.5 border border-black/[0.06]">
                  {formatRef(totalUsdCents)}
                </span>
                <span className="text-lg font-bold text-text-main">
                  {formatBs(totalBsCents)}
                </span>
              </div>
            </div>

            {/* Info note (conditional) */}
            {items.some((item) => item.quantity > 1) && (
              <div className="flex items-start gap-1.5 mt-2 text-[11px] text-text-muted leading-snug">
                <Info className="h-3 w-3 shrink-0 mt-0.5 opacity-50" />
                Para contornos o extras distintos por plato, agrégalos uno a uno.
              </div>
            )}

            {/* CTA */}
            <button
              onClick={() => {
                closeDrawer();
                router.push("/checkout");
              }}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-[10px] bg-primary py-3.5 text-sm font-semibold text-white transition-opacity active:opacity-90"
            >
              Confirmar pedido
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2.5 7h9M8 3.5 11.5 7 8 10.5" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
