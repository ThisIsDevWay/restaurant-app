"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clock, ChefHat } from "lucide-react";
import { obfuscatePhone } from "@/lib/utils";
import { updateOrderStatus } from "@/actions/orders";
import { formatBs } from "@/lib/money";

interface KitchenOrder {
  id: string;
  customerPhone: string;
  itemsSnapshot: Array<{
    id: string;
    name: string;
    selectedContorno: { id: string; name: string } | null;
    selectedAdicionales: Array<{ id: string; name: string }>;
    quantity: number;
  }>;
  status: "paid" | "kitchen" | "delivered" | "whatsapp";
  paymentMethod: string;
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
  if (minutes === 1) return "hace 1 min";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `hace ${hours}h`;
}

export function KitchenQueue() {
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["kitchen-orders"],
    queryFn: fetchKitchenOrders,
    refetchInterval: 15000,
    staleTime: 10000,
  });

  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set());
  const prevOrderIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const paidOrders = orders.filter((o) => o.status === "paid" || o.status === "whatsapp");
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
    await updateOrderStatus(orderId, "kitchen");
  };

  const handleDeliver = async (orderId: string) => {
    await updateOrderStatus(orderId, "delivered");
  };

  const pendingCount = orders.filter((o) => o.status === "paid" || o.status === "whatsapp").length;
  const cookingCount = orders.filter((o) => o.status === "kitchen").length;

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-text-muted">Cargando pedidos...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-app">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-white px-4 py-3 shadow-elevated">
        <div className="flex items-center gap-2">
          <ChefHat className="h-6 w-6 text-primary" />
          <div>
            <h1 className="font-display text-lg font-bold text-primary">
              G&M Cocina
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-amber/15 px-3 py-1 text-sm font-semibold text-amber">
            Pendientes: {pendingCount}
          </span>
          <span className="rounded-full bg-info/15 px-3 py-1 text-sm font-semibold text-info">
            En preparación: {cookingCount}
          </span>
        </div>
      </header>

      {/* Orders grid */}
      <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {orders.map((order) => {
          const isNew = newOrderIds.has(order.id);
          return (
            <div
              key={order.id}
              className={`flex min-h-[320px] flex-col rounded-card border bg-white shadow-card ${
                isNew
                  ? "animate-pulse-dot border-2 border-primary"
                  : "border-border"
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <span className="text-sm font-bold text-text-main">
                  #{order.id.slice(-4).toUpperCase()}
                </span>
                <div className="flex items-center gap-1 text-xs text-text-muted">
                  <Clock className="h-3 w-3" />
                  {timeSince(order.createdAt)}
                </div>
              </div>

              {/* Items */}
              <div className="flex-1 overflow-y-auto px-4 py-3">
                {order.itemsSnapshot.map((item, idx) => (
                  <div key={idx} className="mb-3 last:mb-0">
                    <p className="text-base font-semibold text-text-main">
                      {item.quantity > 1 && `${item.quantity}× `}
                      {item.name}
                    </p>
                    {item.selectedContorno && (
                      <p className="text-sm text-text-muted">
                        Contorno: {item.selectedContorno.name}
                      </p>
                    )}
                    {item.selectedAdicionales.length > 0 && (
                      <p className="text-sm text-primary-hover">
                        +{" "}
                        {item.selectedAdicionales
                          .map((a) => a.name)
                          .join(", ")}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="border-t border-border px-4 py-3">
                <p className="mb-3 text-xs text-text-muted">
                  {obfuscatePhone(order.customerPhone)} ·{" "}
                  {order.paymentMethod === "pago_movil"
                    ? "Pago Móvil"
                    : order.paymentMethod === "whatsapp"
                      ? "WhatsApp"
                      : "Transferencia"}
                </p>
                {(order.status === "paid" || order.status === "whatsapp") ? (
                  <button
                    onClick={() => handleTakeOrder(order.id)}
                    className="w-full min-h-[60px] rounded-input bg-primary py-4 text-base font-bold text-white active:bg-primary-hover"
                  >
                    Tomar pedido
                  </button>
                ) : (
                  <button
                    onClick={() => handleDeliver(order.id)}
                    className="w-full min-h-[60px] rounded-input bg-info py-4 text-base font-bold text-white active:opacity-90"
                  >
                    Entregado ✓
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {orders.length === 0 && (
          <div className="col-span-full flex h-40 items-center justify-center">
            <p className="text-text-muted">No hay pedidos activos</p>
          </div>
        )}
      </div>
    </div>
  );
}
