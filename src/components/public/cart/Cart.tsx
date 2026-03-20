"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
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

  useEffect(() => {
    setMounted();
  }, [setMounted]);

  if (!mounted || items.length === 0) return null;

  return (
    <>
      {/* Bottom bar trigger */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-white px-4 py-3 shadow-elevated">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-text-muted">
              Mi pedido ({items.reduce((s, i) => s + i.quantity, 0)}{" "}
              {items.reduce((s, i) => s + i.quantity, 0) === 1
                ? "item"
                : "items"}
              )
            </p>
            <p className="text-[15px] font-extrabold text-text-main">
              {formatBs(totalBsCents)}
            </p>
            <p className="text-[11px] text-text-muted">
              {formatRef(totalUsdCents)}
            </p>
          </div>
          <button
            onClick={() => isOnline && openDrawer()}
            disabled={!isOnline}
            title={!isOnline ? "Necesitas conexión para hacer un pedido" : undefined}
            className={`rounded-input bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors active:bg-primary-hover ${
              !isOnline ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            Ver pedido →
          </button>
        </div>
      </div>

      {/* Drawer — always in DOM for animation */}
      <div
        className={`fixed inset-0 z-50 ${isDrawerOpen ? "" : "pointer-events-none"}`}
        aria-hidden={!isDrawerOpen}
      >
        {/* Overlay */}
        <div
          className={`absolute inset-0 pointer-events-auto bg-black/40 transition-opacity duration-200 ${
            isDrawerOpen ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
          onClick={() => closeDrawer()}
        />

        {/* Drawer panel */}
        <div
          className={`absolute bottom-0 left-0 right-0 pointer-events-auto max-h-[80vh] overflow-y-auto rounded-t-[20px] bg-white shadow-modal transition-transform duration-200 ease-out ${
            isDrawerOpen ? "translate-y-0" : "translate-y-full"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-white px-4 py-3">
            <h2 className="text-lg font-bold text-text-main">Mi Pedido</h2>
            <button
              onClick={() => closeDrawer()}
              className="rounded-full p-1 text-text-muted hover:bg-bg-app"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Items */}
          <div className="px-4">
            {items.map((item, index) => (
              <CartItem
                key={`${item.id}-${item.selectedContorno?.id ?? "none"}-${item.selectedAdicionales.map((a) => a.id).join(",")}-${index}`}
                item={item}
                index={index}
                onUpdateQuantity={updateQuantity}
                onRemove={removeItem}
              />
            ))}
          </div>

          {/* Summary + CTA */}
          <div className="sticky bottom-0 border-t border-border bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm text-text-muted">Subtotal</span>
              <div className="text-right">
                <p className="text-sm font-bold text-text-main">
                  {formatBs(totalBsCents)}
                </p>
                <p className="text-[11px] text-text-muted">
                  {formatRef(totalUsdCents)}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                closeDrawer();
                router.push("/checkout");
              }}
              className="w-full rounded-input bg-primary py-3 text-sm font-semibold text-white transition-colors active:bg-primary-hover"
            >
              Confirmar pedido →
            </button>
            <p className="mt-1 text-center text-[11px] text-text-muted">
              {formatBs(totalBsCents)}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
