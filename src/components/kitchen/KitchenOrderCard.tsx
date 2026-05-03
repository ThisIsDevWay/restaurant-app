import { Printer, Timer } from "lucide-react";
import { timeSince, getElapsedMinutes } from "@/lib/kitchen-utils";
import { ORDER_MODE_LABELS, type KitchenOrder, type CardVariant } from "@/types/kitchen.types";
import { KitchenItemSnapshot } from "./KitchenItemSnapshot";
import * as Icons from "lucide-react";

interface KitchenOrderCardProps {
  order: KitchenOrder;
  variant: CardVariant;
  isNew?: boolean;
  onAction: (id: string) => void;
  onReprint: (id: string) => void;
}

export function KitchenOrderCard({
  order, variant, isNew = false, onAction, onReprint,
}: KitchenOrderCardProps) {
  const elapsed = getElapsedMinutes(order.createdAt);
  const isUrgent = elapsed > (variant === "pending" ? 15 : 20);
  
  const modeLabel = order.orderMode ? ORDER_MODE_LABELS[order.orderMode] : null;
  const ModeIcon = modeLabel ? (Icons as any)[modeLabel.icon] : null;

  let borderClass = "border-border/30";
  if (variant === "pending") {
    borderClass = isNew 
      ? "border-amber shadow-amber/20 animate-pulse-subtle" 
      : isUrgent ? "border-error/50 shadow-error/10" : "border-amber/30";
  } else if (variant === "cooking") {
    borderClass = isUrgent ? "border-error/50" : "border-info/30";
  } else if (variant === "ready") {
    borderClass = "border-success/30 opacity-70";
  }

  const headerBg = variant === "cooking" ? "bg-info/5" : variant === "ready" ? "bg-success/5" : "bg-white";
  const timerColor = variant === "cooking" ? "text-info" : "text-amber";

  return (
    <div className={`flex flex-col rounded-2xl border-2 bg-white shadow-md transition-all ${borderClass}`}>
      {/* Header */}
      <div className={`flex items-center justify-between border-b border-border px-4 py-3 rounded-t-xl ${headerBg}`}>
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
          {order.tableNumber && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 text-xs font-black">
              MESA {order.tableNumber}
            </span>
          )}
          {variant === "pending" && isNew && (
            <span className="rounded-full bg-amber px-2 py-0.5 text-[10px] font-bold text-white animate-bounce">
              ¡NUEVO!
            </span>
          )}
          {isUrgent && variant !== "ready" && !isNew && (
            <span className="rounded-full bg-error px-2 py-0.5 text-[10px] font-bold text-white">
              ¡URGENTE!
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onReprint(order.id)}
            className="p-2 rounded-lg bg-text-muted/5 text-text-muted hover:bg-primary/10 hover:text-primary transition-colors"
            title="Re-imprimir ticket"
          >
            <Printer className="h-4 w-4" />
          </button>
          {variant !== "ready" && (
            <div className={`flex items-center gap-1.5 text-sm font-semibold ${timerColor}`}>
              <Timer className="h-4 w-4" />
              {timeSince(order.createdAt)}
            </div>
          )}
          {variant === "ready" && (
            <span className="text-xs text-success font-semibold">Entregado</span>
          )}
        </div>
      </div>

      {/* Items */}
      {variant !== "ready" ? (
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {order.itemsSnapshot.map((item, idx) => (
            <KitchenItemSnapshot
              key={idx}
              item={item}
              accentColor={variant === "pending" ? "amber" : "info"}
            />
          ))}
        </div>
      ) : (
        <div className="px-4 py-3">
          <p className="text-sm text-text-muted">{order.itemsSnapshot.length} items</p>
        </div>
      )}

      {/* Footer / Action */}
      {variant !== "ready" && (
        <div className="border-t border-border px-4 py-3">
          <button
            onClick={() => onAction(order.id)}
            className={`w-full rounded-xl py-4 text-base font-bold text-white shadow-sm active:scale-[0.98] transition-transform ${
              variant === "pending" ? "bg-amber hover:bg-amber/90" : "bg-info hover:bg-info/90"
            }`}
          >
            {variant === "pending" ? "Tomar pedido" : "Entregado ✓"}
          </button>
        </div>
      )}
    </div>
  );
}
