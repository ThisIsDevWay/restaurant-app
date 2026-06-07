"use client";

import { useState, useEffect } from "react";
import { formatBs, formatRef } from "@/lib/money";
import Link from "next/link";
import {
  Search,
  ShoppingBag,
  Calendar,
  Clock,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  XCircle,
  UtensilsCrossed,
  MapPin,
  Package,
  Receipt,
  User,
  CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabaseBrowser } from "@/lib/supabase-client";

interface Order {
  id: string;
  orderNumber: string | null;
  status: string;
  subtotalBsCents: number;
  grandTotalBsCents: number;
  subtotalUsdCents: number | null;
  grandTotalUsdCents: number | null;
  createdAt: string;
  expiresAt: string | null;
  deliveryAddress: string | null;
  paymentMethod: string | null;
  orderMode: string | null;
  tableNumber: string | null;
  customerName: string | null;
  packagingUsdCents: number | null;
  deliveryUsdCents: number | null;
  igtfUsdCents: number | null;
  igtfBsCents: number | null;
  itemsSnapshot: Array<{
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
      substitutesComponentId?: string;
      substitutesComponentName?: string;
      quantity?: number;
    }>;
    selectedBebidas?: Array<{
      id: string;
      name: string;
      priceUsdCents: number;
      priceBsCents: number;
      quantity?: number;
    }>;
    removedComponents: Array<{
      isRemoval: true;
      componentId: string;
      name: string;
      priceUsdCents: number;
    }>;
    quantity: number;
    itemTotalBsCents: number;
  }>;
}

const STATUS_LABELS: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "Pendiente", color: "bg-[rgba(184,137,58,0.08)] text-[#B8893A] border border-[rgba(184,137,58,0.2)]", icon: Clock },
  whatsapp: { label: "Verificando pago", color: "bg-[rgba(184,137,58,0.08)] text-[#B8893A] border border-[rgba(184,137,58,0.2)]", icon: Clock },
  paid: { label: "Pago Verificado", color: "bg-[#E8EFE3] text-[#3F6B4A] border border-[rgba(63,107,74,0.2)]", icon: CheckCircle2 },
  kitchen: { label: "En Cocina", color: "bg-primary/5 text-primary border border-primary/10", icon: UtensilsCrossed },
  delivered: { label: "Listo / Entregado", color: "bg-[#E8EFE3] text-[#3F6B4A] border border-[rgba(63,107,74,0.2)]", icon: CheckCircle2 },
  expired: { label: "Expirado", color: "bg-border text-text-muted border border-border", icon: XCircle },
  cancelled: { label: "Cancelado", color: "bg-primary/5 text-primary border border-primary/10", icon: XCircle },
};

const ORDER_MODE_LABELS: Record<string, { label: string; icon: any; color: string }> = {
  delivery: { label: "Delivery", icon: MapPin, color: "text-primary bg-primary/5 border border-primary/10" },
  take_away: { label: "Para llevar", icon: Package, color: "text-[#B8893A] bg-[#B8893A]/5 border border-[#B8893A]/10" },
  on_site: { label: "En local", icon: UtensilsCrossed, color: "text-[#3F6B4A] bg-[#E8EFE3] border border-[rgba(63,107,74,0.15)]" },
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("es-VE", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export default function MisPedidosPage() {
  const [phone, setPhone] = useState("");
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    const sanitized = phone.replace(/\D/g, "");
    if (sanitized.length < 7) {
      setError("Ingresa un número de teléfono válido.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/orders/by-phone/${sanitized}`);
      if (!res.ok) throw new Error("Error al buscar pedidos");
      const data = await res.json();
      setOrders(data.orders);
    } catch {
      setError("No pudimos cargar tus pedidos. Revisa tu conexión.");
    } finally {
      setLoading(false);
    }
  };

  // Realtime subscription for search results
  useEffect(() => {
    if (!orders || orders.length === 0) return;

    const channel = supabaseBrowser
      .channel("mis-pedidos-realtime")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
        },
        (payload) => {
          const updatedOrder = payload.new as { id: string; status: string };
          if (updatedOrder && updatedOrder.id) {
            setOrders((prev) => {
              if (!prev) return null;
              return prev.map((o) =>
                o.id === updatedOrder.id
                  ? { ...o, status: updatedOrder.status }
                  : o
              );
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabaseBrowser.removeChannel(channel);
    };
  }, [orders]);

  return (
    <div className="min-h-[100dvh] bg-bg-app flex flex-col font-sans">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-bg-card/95 md:backdrop-blur-md md:bg-bg-card/70 border-b border-border/40 px-5 py-4">
        <div className="max-w-xl mx-auto flex items-center gap-3.5">
          <Link
            href="/"
            className="w-9 h-9 rounded-full bg-bg-card border border-border/60 flex items-center justify-center text-text-main shadow-sm active:scale-95 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="font-display text-lg font-bold text-text-main leading-tight">
              Mis pedidos
            </h1>
            <p className="text-[11px] text-text-muted font-medium mt-0.5">
              Sigue tus pedidos en tiempo real
            </p>
          </div>
        </div>
      </header>

      {/* Main container */}
      <main className="flex-1 max-w-xl mx-auto w-full px-5 py-6 flex flex-col gap-6">
        {/* Search card */}
        <div className="rounded-[22px] border border-border/80 bg-bg-card p-5 shadow-[0_8px_30px_rgb(0,0,0,0.015)]">
          <label className="font-sans text-[10px] uppercase tracking-[0.12em] text-text-muted pl-1 block mb-2 font-semibold">
            Número de WhatsApp registrado
          </label>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-0 rounded-[14px] border border-border bg-bg-card transition-all focus-within:border-primary/50 overflow-hidden pr-3 pl-3.5 py-2.5">
              <span className="text-[14px]">🇻🇪</span>
              <span className="font-sans text-[14px] font-semibold text-text-muted ml-2.5">+58</span>
              <div className="w-px h-4 bg-border shrink-0 mx-2.5" />
              <input
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="0414 123 4567"
                className="flex-1 bg-transparent outline-none font-sans text-[14px] text-text-main placeholder:text-text-muted/40 min-w-0 py-1"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={loading || !phone}
              className="w-full rounded-[14px] bg-primary hover:bg-primary-hover py-3 text-[14px] font-bold text-white shadow-sm active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Buscar pedidos
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2 mt-3 text-[12px] text-primary font-medium px-1 animate-in fade-in">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Orders list */}
        {orders && (
          <div className="flex flex-col gap-4">
            <h2 className="font-display text-[15px] font-extrabold text-text-main px-1">
              Pedidos encontrados ({orders.length})
            </h2>

            {orders.length === 0 ? (
              <div className="rounded-[22px] border border-border/80 bg-bg-card p-8 text-center flex flex-col items-center justify-center gap-3">
                <div className="w-12 h-12 rounded-full bg-border/40 flex items-center justify-center text-text-muted">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[14px] font-bold text-text-main">
                    No encontramos pedidos
                  </p>
                  <p className="text-[12px] text-text-muted mt-0.5">
                    Verifica que el número coincida con tu pedido.
                  </p>
                </div>
              </div>
            ) : (
              orders.map((order) => {
                const status = STATUS_LABELS[order.status] ?? {
                  label: order.status,
                  color: "bg-border text-text-muted border border-border",
                  icon: Clock,
                };
                const StatusIcon = status.icon;

                const mode = order.orderMode ? ORDER_MODE_LABELS[order.orderMode] : null;
                const ModeIcon = mode?.icon;

                const shortId = order.id.slice(-6).toUpperCase();
                const isActive = ["pending", "whatsapp", "paid", "kitchen"].includes(order.status);

                return (
                  <div
                    key={order.id}
                    className={cn(
                      "rounded-[24px] border p-5.5 shadow-[0_4px_20px_rgba(0,0,0,0.01)] transition-all flex flex-col gap-4.5 bg-bg-card [transform:translate3d(0,0,0)] [will-change:transform]",
                      isActive
                        ? "border-primary/20 shadow-[0_8px_24px_rgba(187,0,5,0.035)] bg-primary/[0.01]"
                        : "border-border/60"
                    )}
                  >
                    {/* Header: Short ID & Status */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                          <p className="font-display text-[16px] font-black text-text-main tracking-wider leading-none">
                            PEDIDO #{shortId}
                          </p>
                        </div>
                        {order.customerName && (
                          <div className="flex items-center gap-1 mt-1.5 text-text-main">
                            <User className="w-3.5 h-3.5 text-text-muted" />
                            <p className="text-[12px] font-bold leading-none">
                              {order.customerName}
                            </p>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 text-text-muted mt-1.5">
                          <Calendar className="w-3 h-3" />
                          <p className="text-[11px] font-medium leading-none">
                            {formatDate(order.createdAt)}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1.5">
                        <span
                          className={cn(
                            "rounded-full px-3 py-1 text-[11px] font-bold flex items-center gap-1.5 shadow-sm leading-none shrink-0",
                            status.color
                          )}
                        >
                          <StatusIcon className="w-3 h-3 shrink-0" />
                          {status.label}
                        </span>

                        {mode && (
                          <span
                            className={cn(
                              "rounded-full px-2.5 py-0.5 text-[10px] font-semibold flex items-center gap-1 shadow-sm leading-none shrink-0",
                              mode.color
                            )}
                          >
                            <ModeIcon className="w-2.5 h-2.5 shrink-0" />
                            {mode.label}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Detailed Items list */}
                    <div className="bg-surface-section/60 rounded-[16px] p-4.5 space-y-3.5 border border-border/30">
                      {order.itemsSnapshot.map((item, idx) => (
                        <div key={idx} className="space-y-1.5 text-[13px]">
                          {/* Item name and Qty */}
                          <div className="flex justify-between items-baseline text-text-main font-semibold">
                            <p className="min-w-0 truncate">
                              <span className="font-bold text-primary mr-1">{item.quantity}×</span>
                              {item.name}
                            </p>
                          </div>

                          {/* Fixed contornos */}
                          {item.fixedContornos && item.fixedContornos.length > 0 && (
                            <div className="pl-4.5 text-[11px] text-text-muted flex gap-1.5 flex-wrap">
                              <span className="font-semibold text-text-muted/70">Acompañantes:</span>
                              <span className="font-medium text-text-main/70">{item.fixedContornos.map((c) => c.name).join(", ")}</span>
                            </div>
                          )}

                          {/* Swaps/Removals */}
                          {item.removedComponents && item.removedComponents.length > 0 && (
                            <div className="pl-4.5 text-[11px] text-text-muted flex gap-1.5 flex-wrap">
                              <span className="font-semibold text-amber-700/80">Removido:</span>
                              <span className="font-medium text-amber-900/70">{item.removedComponents.map((c) => c.name).join(", ")}</span>
                            </div>
                          )}

                          {/* Adicionales (sides swaps) */}
                          {item.selectedAdicionales && item.selectedAdicionales.length > 0 && (
                            <div className="pl-4.5 space-y-0.5 text-[11px] text-text-muted/90">
                              {item.selectedAdicionales.map((a, aIdx) => (
                                <div key={aIdx} className="flex justify-between">
                                  <span>
                                    + {a.quantity ? `${a.quantity}× ` : ""}{a.name}
                                    {a.substitutesComponentName && (
                                      <span className="text-[10px] text-text-muted/60 italic"> (Sustituye a {a.substitutesComponentName})</span>
                                    )}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Bebidas */}
                          {item.selectedBebidas && item.selectedBebidas.length > 0 && (
                            <div className="pl-4.5 space-y-0.5 text-[11px] text-text-muted/90">
                              {item.selectedBebidas.map((b, bIdx) => (
                                <div key={bIdx} className="flex justify-between">
                                  <span>+ {b.quantity ? `${b.quantity}× ` : ""}{b.name}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Order Mode Details (Address/Table details) */}
                      {(order.deliveryAddress || order.tableNumber) && (
                        <div className="mt-3 pt-3 border-t border-border/30 space-y-1.5 text-[12px] text-text-muted">
                          {order.deliveryAddress && (
                            <div className="flex items-start gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                              <span><strong>Dirección de envío:</strong> {order.deliveryAddress}</span>
                            </div>
                          )}
                          {order.tableNumber && (
                            <div className="flex items-center gap-1.5">
                              <UtensilsCrossed className="w-3.5 h-3.5 text-primary shrink-0" />
                              <span><strong>Mesa asignada:</strong> {order.tableNumber}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Receipt Pricing breakdown & Payment Method */}
                    <div className="text-[12px] text-text-muted space-y-1.5 px-1 border-t border-border/30 pt-3 flex flex-col gap-0.5">
                      <div className="flex justify-between items-center text-[12px]">
                        <span className="flex items-center gap-1 text-text-muted"><CreditCard className="w-3.5 h-3.5" /> Método de pago:</span>
                        <span className="font-semibold text-text-main">{order.paymentMethod || "No especificado"}</span>
                      </div>

                      {/* Itemized surcharges */}
                      {(order.packagingUsdCents !== null && order.packagingUsdCents > 0) && (
                        <div className="flex justify-between text-[11px] text-text-muted/80">
                          <span>Empaque:</span>
                          <span className="tabular-nums">+ {formatRef(order.packagingUsdCents)}</span>
                        </div>
                      )}

                      {(order.deliveryUsdCents !== null && order.deliveryUsdCents > 0) && (
                        <div className="flex justify-between text-[11px] text-text-muted/80">
                          <span>Envío (Delivery):</span>
                          <span className="tabular-nums">+ {formatRef(order.deliveryUsdCents)}</span>
                        </div>
                      )}

                      {(order.igtfUsdCents !== null && order.igtfUsdCents > 0) && (
                        <div className="flex justify-between text-[11px] text-text-muted/80">
                          <span>IGTF (3%):</span>
                          <span className="tabular-nums">+ {formatRef(order.igtfUsdCents)}</span>
                        </div>
                      )}
                    </div>

                    {/* Footer: Dual Currency Total */}
                    <div className="flex items-baseline justify-between border-t border-border/40 pt-3 px-1">
                      <p className="text-[12px] font-sans text-text-muted font-medium flex items-center gap-1">
                        <Receipt className="w-3.5 h-3.5" /> Total cobrado:
                      </p>
                      <div className="text-right">
                        <p className="font-display text-[18px] font-black text-text-main leading-tight tabular-nums">
                          {formatBs(order.grandTotalBsCents || order.subtotalBsCents, { rounded: true })}
                        </p>
                        {(order.grandTotalUsdCents || order.subtotalUsdCents) && (
                          <p className="font-sans text-[12px] text-text-muted font-bold tracking-tight tabular-nums mt-0.5">
                            {formatRef(order.grandTotalUsdCents || order.subtotalUsdCents)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Initial state placeholder */}
        {orders === null && !loading && (
          <div className="mt-8 text-center flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 rounded-full bg-border/20 flex items-center justify-center text-text-muted">
              <ShoppingBag className="w-7 h-7 stroke-[1.25]" />
            </div>
            <div className="max-w-[280px]">
              <p className="text-[14px] font-bold text-text-main">
                Consulta tu historial
              </p>
              <p className="text-[12px] text-text-muted leading-relaxed mt-1">
                Ingresa tu número de teléfono arriba para ver tus pedidos recientes y su estado en tiempo real.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
