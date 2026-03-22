"use client";

import { useState } from "react";
import { formatBs } from "@/lib/money";
import Link from "next/link";

interface Order {
  id: string;
  status: string;
  subtotalBsCents: number;
  createdAt: string;
  expiresAt: string | null;
  itemsSnapshot: Array<{
    name: string;
    quantity: number;
  }>;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendiente", color: "bg-amber/10 text-amber" },
  whatsapp: { label: "Pendiente (WhatsApp)", color: "bg-amber/10 text-amber" },
  paid: { label: "Pagado", color: "bg-success/10 text-success" },
  kitchen: { label: "En cocina", color: "bg-info/10 text-info" },
  delivered: { label: "Entregado", color: "bg-success/10 text-success" },
  expired: { label: "Expirado", color: "bg-error/10 text-error" },
  cancelled: { label: "Cancelado", color: "bg-error/10 text-error" },
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("es-VE", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
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
      setError("Ingresa un número de teléfono válido");
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
      setError("Error al buscar pedidos");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-app">
      <header className="sticky top-0 z-10 border-b border-border bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-text-main">
            ←
          </Link>
          <h1 className="text-base font-semibold text-text-main">
            Mis pedidos
          </h1>
        </div>
      </header>

      <div className="px-4 py-6">
        {/* Phone input */}
        <div className="rounded-card border border-border bg-white p-4 shadow-card">
          <p className="mb-3 text-sm font-medium text-text-main">
            Ingresa tu número de teléfono para ver tus pedidos
          </p>
          <div className="flex gap-2">
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="04141234567"
              className="flex-1 rounded-input border border-border px-4 py-2.5 text-sm outline-none focus:border-primary"
            />
            <button
              onClick={handleSearch}
              disabled={loading}
              className="rounded-input bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {loading ? "..." : "Buscar"}
            </button>
          </div>
          {error && <p className="mt-2 text-xs text-error">{error}</p>}
        </div>

        {/* Orders list */}
        {orders && (
          <div className="mt-4 space-y-3">
            {orders.length === 0 ? (
              <div className="rounded-card border border-border bg-white p-6 text-center">
                <p className="text-sm text-text-muted">
                  No se encontraron pedidos con este número
                </p>
              </div>
            ) : (
              orders.map((order) => {
                const status = STATUS_LABELS[order.status] ?? {
                  label: order.status,
                  color: "bg-border text-text-muted",
                };
                const shortId = order.id.slice(0, 8).toUpperCase();
                const isActive = ["pending", "whatsapp", "paid", "kitchen"].includes(order.status);

                return (
                  <div
                    key={order.id}
                    className={`rounded-card border p-4 shadow-card ${
                      isActive ? "border-primary/30 bg-primary/5" : "border-border bg-white"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-mono text-sm font-bold text-text-main">
                          #{shortId}
                        </p>
                        <p className="text-xs text-text-muted">
                          {formatDate(order.createdAt)}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${status.color}`}
                      >
                        {status.label}
                      </span>
                    </div>

                    {/* Items preview */}
                    <div className="mt-2">
                      {order.itemsSnapshot.slice(0, 3).map((item, idx) => (
                        <p key={idx} className="text-xs text-text-muted">
                          {item.quantity}× {item.name}
                        </p>
                      ))}
                      {order.itemsSnapshot.length > 3 && (
                        <p className="text-xs text-text-muted">
                          +{order.itemsSnapshot.length - 3} más
                        </p>
                      )}
                    </div>

                    <div className="mt-2 border-t border-border pt-2">
                      <p className="text-sm font-bold text-price-green">
                        {formatBs(order.subtotalBsCents)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Initial state */}
        {orders === null && !loading && (
          <div className="mt-8 text-center">
            <p className="text-sm text-text-muted">
              Ingresa tu número para ver tus pedidos recientes
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
