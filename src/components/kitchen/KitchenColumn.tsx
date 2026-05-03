import type { KitchenOrder, CardVariant } from "@/types/kitchen.types";
import { KitchenOrderCard } from "./KitchenOrderCard";

interface KitchenColumnProps {
  variant: CardVariant;
  orders: KitchenOrder[];
  newOrderIds?: Set<string>;
  onAction: (id: string) => void;
  onReprint: (id: string) => void;
}

const COLUMN_CONFIG = {
  pending: { dot: "bg-amber animate-pulse", label: "Nuevos", labelColor: "text-amber" },
  cooking: { dot: "bg-info", label: "En preparación", labelColor: "text-info" },
  ready:   { dot: "bg-success", label: "Listos", labelColor: "text-success" },
} as const;

export function KitchenColumn({ variant, orders, newOrderIds, onAction, onReprint }: KitchenColumnProps) {
  if (orders.length === 0) return null;
  const config = COLUMN_CONFIG[variant];

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <div className={`h-2 w-2 rounded-full ${config.dot}`} />
        <h2 className={`text-sm font-bold uppercase tracking-wider ${config.labelColor}`}>
          {config.label} — {orders.length}
        </h2>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {orders.map((order) => (
          <KitchenOrderCard
            key={order.id}
            order={order}
            variant={variant}
            isNew={newOrderIds?.has(order.id)}
            onAction={onAction}
            onReprint={onReprint}
          />
        ))}
      </div>
    </div>
  );
}
