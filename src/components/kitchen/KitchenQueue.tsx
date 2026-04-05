"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clock, ChefHat, Timer, Flame, CheckCircle2, AlertCircle, MapPin, Store, Package } from "lucide-react";
import { obfuscatePhone } from "@/lib/utils";
import { updateOrderStatusAction } from "@/actions/orders";

const ORDER_MODE_LABELS: Record<string, { label: string; icon: typeof Store; color: string }> = {
  on_site: { label: "En sitio", icon: Store, color: "bg-info/10 text-info border-info/20" },
  take_away: { label: "Para llevar", icon: Package, color: "bg-amber/10 text-amber border-amber/20" },
  delivery: { label: "Delivery", icon: MapPin, color: "bg-success/10 text-success border-success/20" },
};

interface KitchenOrder {
  id: string;
  orderNumber: number;
  customerPhone: string;
  itemsSnapshot: Array<{
    id: string;
    name: string;
    selectedContorno: { id: string; name: string } | null;
    fixedContornos?: Array<{ id: string; name: string; priceUsdCents: number; priceBsCents: number }>;
    selectedAdicionales: Array<{
      id: string;
      name: string;
      quantity?: number;
      substitutesComponentId?: string;
      substitutesComponentName?: string;
    }>;
    selectedBebidas?: Array<{
      id: string;
      name: string;
      quantity?: number;
    }>;
    removedComponents: Array<{
      isRemoval: true;
      componentId: string;
      name: string;
    }>;
    quantity: number;
  }>;
  status: "paid" | "kitchen" | "delivered" | "whatsapp";
  paymentMethod: string;
  orderMode?: "on_site" | "take_away" | "delivery" | null;
  deliveryAddress?: string | null;
  subtotalBsCents: number;
  createdAt: string;
}

async function fetchKitchenOrders(): Promise<KitchenOrder[]> {
  const res = await fetch("/api/kitchen-orders");
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
}

function timeSince(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "ahora";
  if (minutes === 1) return "1 min";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

function getElapsedMinutes(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
}

function useClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);
  return time;
}

export function KitchenQueue({ restaurantName, logoUrl }: { restaurantName: string; logoUrl?: string }) {
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["kitchen-orders"],
    queryFn: fetchKitchenOrders,
    refetchInterval: 15000,
    staleTime: 10000,
  });

  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set());
  const prevOrderIdsRef = useRef<Set<string>>(new Set());
  const currentTime = useClock();

  useEffect(() => {
    const paidOrders = orders.filter((o) => o.status === "paid");
    const currentIds = new Set(paidOrders.map((o) => o.id));

    const newlyAdded = new Set<string>();
    for (const id of currentIds) {
      if (!prevOrderIdsRef.current.has(id)) {
        newlyAdded.add(id);
      }
    }
    prevOrderIdsRef.current = currentIds;

    if (newlyAdded.size > 0) {
      setNewOrderIds(newlyAdded);
      const timeout = setTimeout(() => setNewOrderIds(new Set()), 5000);
      return () => clearTimeout(timeout);
    }
  }, [orders]);

  const handleTakeOrder = async (orderId: string) => {
    const result = await updateOrderStatusAction({ orderId, status: "kitchen" });
    if (result?.serverError) throw new Error(result.serverError);
    if (result?.validationErrors) throw new Error("Error de validación al tomar pedido");
  };

  const handleDeliver = async (orderId: string) => {
    const result = await updateOrderStatusAction({ orderId, status: "delivered" });
    if (result?.serverError) throw new Error(result.serverError);
    if (result?.validationErrors) throw new Error("Error de validación al entregar pedido");
  };

  const pendingOrders = orders.filter((o) => o.status === "paid");
  const cookingOrders = orders.filter((o) => o.status === "kitchen");
  const readyOrders = orders.filter((o) => o.status === "delivered");

  const timeStr = currentTime.toLocaleTimeString("es-VE", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-app">
        <div className="text-center">
          <ChefHat className="mx-auto mb-3 h-12 w-12 text-primary/30 animate-pulse" />
          <p className="text-lg font-medium text-text-muted">Cargando pedidos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-app">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-white/90 backdrop-blur-md shadow-sm">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3">
          <div className="flex items-center gap-4">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt={restaurantName}
                className="h-12 w-auto max-w-[180px] object-contain rounded-sm"
              />
            ) : (
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white">
                  <ChefHat className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="font-display text-xl font-bold text-primary leading-tight">
                    {restaurantName} Cocina
                  </h1>
                </div>
              </div>
            )}
            {!logoUrl && <p className="text-xs text-text-muted">Sistema KDS</p>}
            {logoUrl && (
              <div className="hidden sm:block">
                <h1 className="font-display text-lg font-bold text-primary leading-tight">Cocina</h1>
                <p className="text-xs text-text-muted">Sistema KDS</p>
              </div>
            )}
          </div>

          {/* Clock */}
          <div className="hidden sm:flex items-center gap-2 text-2xl font-bold font-mono text-text-main tabular-nums">
            <Clock className="h-5 w-5 text-text-muted" />
            {timeStr}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1.5 rounded-xl bg-amber/10 px-3 py-1.5">
              <AlertCircle className="h-4 w-4 text-amber" />
              <span className="text-sm font-bold text-amber">{pendingOrders.length}</span>
              <span className="hidden sm:inline text-xs text-amber/80">Nuevos</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-xl bg-info/10 px-3 py-1.5">
              <Flame className="h-4 w-4 text-info" />
              <span className="text-sm font-bold text-info">{cookingOrders.length}</span>
              <span className="hidden sm:inline text-xs text-info/80">Cocinando</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-xl bg-success/10 px-3 py-1.5">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <span className="text-sm font-bold text-success">{readyOrders.length}</span>
              <span className="hidden sm:inline text-xs text-success/80">Listos</span>
            </div>
          </div>
        </div>
      </header>

      {/* Orders Grid - Kanban Style */}
      <div className="p-4 sm:p-6">
        {/* Pending Column */}
        {pendingOrders.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-2 w-2 rounded-full bg-amber animate-pulse" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-amber">
                Nuevos — {pendingOrders.length}
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {pendingOrders.map((order) => {
                const isNew = newOrderIds.has(order.id);
                const elapsed = getElapsedMinutes(order.createdAt);
                const isUrgent = elapsed > 15;
                const modeLabel = order.orderMode ? ORDER_MODE_LABELS[order.orderMode] : null;
                const ModeIcon = modeLabel?.icon;

                return (
                  <div
                    key={order.id}
                    className={`flex flex-col rounded-2xl border-2 bg-white shadow-md transition-all ${isNew
                      ? "border-amber shadow-amber/20 animate-pulse-subtle"
                      : isUrgent
                        ? "border-error/50 shadow-error/10"
                        : "border-amber/30"
                      }`}
                  >
                    {/* Card Header */}
                    <div className="flex items-center justify-between border-b border-border px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-black text-text-main font-mono">
                          #{order.orderNumber}
                        </span>
                        {modeLabel && ModeIcon && (
                          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${modeLabel.color}`}>
                            <ModeIcon className="h-3 w-3" />
                            {modeLabel.label}
                          </span>
                        )}
                        {isNew && (
                          <span className="rounded-full bg-amber px-2 py-0.5 text-[10px] font-bold text-white animate-bounce">
                            ¡NUEVO!
                          </span>
                        )}
                        {isUrgent && !isNew && (
                          <span className="rounded-full bg-error px-2 py-0.5 text-[10px] font-bold text-white">
                            ¡URGENTE!
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-sm font-semibold text-amber">
                        <Timer className="h-4 w-4" />
                        {timeSince(order.createdAt)}
                      </div>
                    </div>

                    {/* Items */}
                    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                      {order.itemsSnapshot.map((item, idx) => (
                        <div key={idx}>
                          <p className="text-base font-bold text-text-main">
                            {item.quantity > 1 && (
                              <span className="inline-flex items-center justify-center h-6 w-6 rounded-lg bg-amber/10 text-amber text-sm font-black mr-1.5">
                                {item.quantity}
                              </span>
                            )}
                            {item.name}
                          </p>
                          {/* Contornos — Option C: resolved final state */}
                          {(() => {
                            const substitutions = item.selectedAdicionales?.filter(a => a.substitutesComponentId) ?? [];
                            const hasModifications = (item.removedComponents?.length ?? 0) > 0 || substitutions.length > 0;

                            const hasFixedContornos = (item.fixedContornos?.length ?? 0) > 0;

                            if (!hasModifications && !item.selectedContorno && !hasFixedContornos) {
                              return null;
                            }

                            if (!hasModifications) {
                              return (
                                <div className="ml-8 mt-1.5 space-y-1">
                                  {item.selectedContorno && (
                                    <div>
                                      <span className="inline-flex items-center rounded-lg bg-success/10 px-2 py-1 text-sm font-bold text-success border border-success/20">
                                        ● {item.selectedContorno.name}
                                      </span>
                                    </div>
                                  )}
                                  {item.fixedContornos?.map(fc => (
                                    <div key={fc.id}>
                                      <span className="inline-flex items-center rounded-lg bg-success/10 px-2 py-1 text-sm font-bold text-success border border-success/20">
                                        ● {fc.name}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              );
                            }

                            // Map of what replaced what to avoid showing it twice in "pure removals"
                            const replacedComponentIds = new Set(substitutions.map(s => s.substitutesComponentId));
                            const pureRemovals = item.removedComponents?.filter(r => !replacedComponentIds.has(r.componentId)) ?? [];

                            return (
                              <div className="ml-8 mt-1.5 space-y-1">
                                <p className="text-[10px] font-black uppercase tracking-widest text-amber flex items-center gap-1.5 mb-1">
                                  Contornos <span className="inline-block w-2 h-2 rounded-full bg-amber" /> modificados
                                </p>

                                {/* 1. Kept default contorno (if not replaced/removed) */}
                                {item.selectedContorno && !item.removedComponents?.some(r => r.componentId === item.selectedContorno?.id) && (
                                  <div>
                                    <span className="inline-flex items-center rounded-lg bg-success/10 px-2 py-1 text-sm font-bold text-success border border-success/20">
                                      ● {item.selectedContorno.name}
                                    </span>
                                  </div>
                                )}

                                {/* 1.b Kept fixed contornos */}
                                {item.fixedContornos?.filter(fc => !item.removedComponents?.some(r => r.componentId === fc.id)).map(fc => (
                                  <div key={fc.id}>
                                    <span className="inline-flex items-center rounded-lg bg-success/10 px-2 py-1 text-sm font-bold text-success border border-success/20">
                                      ● {fc.name}
                                    </span>
                                  </div>
                                ))}

                                {/* 2. Substitutions: Green active + Strikethrough original on the right */}
                                {substitutions.map((sub, i) => (
                                  <div key={`sub-${i}`} className="flex items-center gap-2">
                                    <span className="inline-flex items-center rounded-lg bg-success/10 px-2 py-1 text-sm font-bold text-success border border-success/20">
                                      ● {sub.name}
                                    </span>
                                    {sub.substitutesComponentName && (
                                      <span className="text-xs text-text-muted/40 line-through">
                                        {sub.substitutesComponentName}
                                      </span>
                                    )}
                                  </div>
                                ))}

                                {/* 3. Pure removals (omitted without replacement) */}
                                {pureRemovals.length > 0 && (
                                  <div className="flex flex-wrap gap-2 pt-0.5">
                                    {pureRemovals.map((r, i) => (
                                      <span key={`rem-${i}`} className="text-xs text-text-muted/40 line-through">
                                        {r.name}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                          {/* Regular adicionales */}
                          {item.selectedAdicionales?.filter(a => !a.substitutesComponentId).length > 0 && (
                            <div className="ml-8 mt-1.5 flex flex-wrap gap-1">
                              {item.selectedAdicionales.filter(a => !a.substitutesComponentId).map((ad, adIdx) => (
                                <span
                                  key={adIdx}
                                  className="inline-flex items-center rounded-lg bg-primary/10 px-2 py-1 text-sm font-bold text-primary border border-primary/20"
                                >
                                  + {(ad.quantity ?? 1) > 1 ? `${ad.quantity}× ` : ""}{ad.name}
                                </span>
                              ))}
                            </div>
                          )}
                          {/* Bebidas */}
                          {item.selectedBebidas && item.selectedBebidas.length > 0 && (
                            <div className="ml-8 mt-1.5 flex flex-wrap gap-1">
                              {item.selectedBebidas.map((b, bIdx) => (
                                <span
                                  key={`beb-${bIdx}`}
                                  className="inline-flex items-center rounded-lg bg-info/10 px-2 py-1 text-sm font-bold text-info border border-info/20"
                                >
                                  🍹 {(b.quantity ?? 1) > 1 ? `${b.quantity}× ` : ""}{b.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Footer */}
                    <div className="border-t border-border px-4 py-3">
                      <button
                        onClick={() => handleTakeOrder(order.id)}
                        className="w-full rounded-xl bg-amber py-4 text-base font-bold text-white shadow-sm active:scale-[0.98] transition-transform hover:bg-amber/90"
                      >
                        Tomar pedido
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Cooking Column */}
        {cookingOrders.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-2 w-2 rounded-full bg-info" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-info">
                En preparación — {cookingOrders.length}
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {cookingOrders.map((order) => {
                const elapsed = getElapsedMinutes(order.createdAt);
                const modeLabel = order.orderMode ? ORDER_MODE_LABELS[order.orderMode] : null;
                const ModeIcon = modeLabel?.icon;

                return (
                  <div
                    key={order.id}
                    className={`flex flex-col rounded-2xl border-2 bg-white shadow-md ${elapsed > 20
                      ? "border-error/50"
                      : "border-info/30"
                      }`}
                  >
                    {/* Card Header */}
                    <div className="flex items-center justify-between border-b border-border bg-info/5 px-4 py-3 rounded-t-xl">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-black text-text-main font-mono">
                          #{order.orderNumber}
                        </span>
                        {modeLabel && ModeIcon && (
                          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${modeLabel.color}`}>
                            <ModeIcon className="h-3 w-3" />
                            {modeLabel.label}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-sm font-semibold text-info">
                        <Timer className="h-4 w-4" />
                        {timeSince(order.createdAt)}
                      </div>
                    </div>

                    {/* Items */}
                    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                      {order.itemsSnapshot.map((item, idx) => (
                        <div key={idx}>
                          <p className="text-base font-bold text-text-main">
                            {item.quantity > 1 && (
                              <span className="inline-flex items-center justify-center h-6 w-6 rounded-lg bg-info/10 text-info text-sm font-black mr-1.5">
                                {item.quantity}
                              </span>
                            )}
                            {item.name}
                          </p>
                          {/* Contornos — Option C: resolved final state */}
                          {(() => {
                            const substitutions = item.selectedAdicionales?.filter(a => a.substitutesComponentId) ?? [];
                            const hasModifications = (item.removedComponents?.length ?? 0) > 0 || substitutions.length > 0;

                            const hasFixedContornos = (item.fixedContornos?.length ?? 0) > 0;

                            if (!hasModifications && !item.selectedContorno && !hasFixedContornos) {
                              return null;
                            }

                            if (!hasModifications) {
                              return (
                                <div className="ml-8 mt-1.5 space-y-1">
                                  {item.selectedContorno && (
                                    <div>
                                      <span className="inline-flex items-center rounded-lg bg-success/10 px-2 py-1 text-sm font-bold text-success border border-success/20">
                                        ● {item.selectedContorno.name}
                                      </span>
                                    </div>
                                  )}
                                  {item.fixedContornos?.map(fc => (
                                    <div key={fc.id}>
                                      <span className="inline-flex items-center rounded-lg bg-success/10 px-2 py-1 text-sm font-bold text-success border border-success/20">
                                        ● {fc.name}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              );
                            }

                            const replacedComponentIds = new Set(substitutions.map(s => s.substitutesComponentId));
                            const pureRemovals = item.removedComponents?.filter(r => !replacedComponentIds.has(r.componentId)) ?? [];

                            return (
                              <div className="ml-8 mt-1.5 space-y-1">
                                <p className="text-[10px] font-black uppercase tracking-widest text-amber flex items-center gap-1.5 mb-1">
                                  Contornos <span className="inline-block w-2 h-2 rounded-full bg-amber" /> modificados
                                </p>

                                {item.selectedContorno && !item.removedComponents?.some(r => r.componentId === item.selectedContorno?.id) && (
                                  <div>
                                    <span className="inline-flex items-center rounded-lg bg-success/10 px-2 py-1 text-sm font-bold text-success border border-success/20">
                                      ● {item.selectedContorno.name}
                                    </span>
                                  </div>
                                )}

                                {/* 1.b Kept fixed contornos */}
                                {item.fixedContornos?.filter(fc => !item.removedComponents?.some(r => r.componentId === fc.id)).map(fc => (
                                  <div key={fc.id}>
                                    <span className="inline-flex items-center rounded-lg bg-success/10 px-2 py-1 text-sm font-bold text-success border border-success/20">
                                      ● {fc.name}
                                    </span>
                                  </div>
                                ))}

                                {substitutions.map((sub, i) => (
                                  <div key={`sub-${i}`} className="flex items-center gap-2">
                                    <span className="inline-flex items-center rounded-lg bg-success/10 px-2 py-1 text-sm font-bold text-success border border-success/20">
                                      ● {sub.name}
                                    </span>
                                    {sub.substitutesComponentName && (
                                      <span className="text-xs text-text-muted/40 line-through">
                                        {sub.substitutesComponentName}
                                      </span>
                                    )}
                                  </div>
                                ))}

                                {pureRemovals.length > 0 && (
                                  <div className="flex flex-wrap gap-2 pt-0.5">
                                    {pureRemovals.map((r, i) => (
                                      <span key={`rem-${i}`} className="text-xs text-text-muted/40 line-through">
                                        {r.name}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                          {item.selectedAdicionales?.filter(a => !a.substitutesComponentId).length > 0 && (
                            <div className="ml-8 mt-1.5 flex flex-wrap gap-1">
                              {item.selectedAdicionales.filter(a => !a.substitutesComponentId).map((ad, adIdx) => (
                                <span
                                  key={adIdx}
                                  className="inline-flex items-center rounded-lg bg-primary/10 px-2 py-1 text-sm font-bold text-primary border border-primary/20"
                                >
                                  + {(ad.quantity ?? 1) > 1 ? `${ad.quantity}× ` : ""}{ad.name}
                                </span>
                              ))}
                            </div>
                          )}
                          {/* Bebidas */}
                          {item.selectedBebidas && item.selectedBebidas.length > 0 && (
                            <div className="ml-8 mt-1.5 flex flex-wrap gap-1">
                              {item.selectedBebidas.map((b, bIdx) => (
                                <span
                                  key={`beb-${bIdx}`}
                                  className="inline-flex items-center rounded-lg bg-info/10 px-2 py-1 text-sm font-bold text-info border border-info/20"
                                >
                                  🍹 {(b.quantity ?? 1) > 1 ? `${b.quantity}× ` : ""}{b.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Footer */}
                    <div className="border-t border-border px-4 py-3">
                      <button
                        onClick={() => handleDeliver(order.id)}
                        className="w-full rounded-xl bg-info py-4 text-base font-bold text-white shadow-sm active:scale-[0.98] transition-transform hover:bg-info/90"
                      >
                        Entregado ✓
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Ready Column */}
        {readyOrders.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-2 w-2 rounded-full bg-success" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-success">
                Listos — {readyOrders.length}
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {readyOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex flex-col rounded-2xl border-2 border-success/30 bg-white/60 shadow-sm opacity-70"
                >
                  <div className="flex items-center justify-between border-b border-border bg-success/5 px-4 py-3 rounded-t-xl">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      <span className="text-base font-bold text-text-main font-mono">
                        #{order.orderNumber}
                      </span>
                    </div>
                    <span className="text-xs text-success font-semibold">
                      Entregado
                    </span>
                  </div>
                  <div className="px-4 py-3">
                    <p className="text-sm text-text-muted">
                      {order.itemsSnapshot.length} items
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {orders.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/5">
              <ChefHat className="h-10 w-10 text-primary/30" />
            </div>
            <p className="text-xl font-bold text-text-main">Cocina libre</p>
            <p className="text-sm text-text-muted mt-1">
              No hay pedidos activos en este momento
            </p>
            <div className="mt-4 text-3xl font-mono font-bold text-text-muted/30">
              {timeStr}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
