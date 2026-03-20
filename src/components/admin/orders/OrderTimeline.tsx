import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";
import type { OrderStatus } from "@/lib/constants/order-status";

type TimelineStep = {
  status: OrderStatus;
  label: string;
};

const TIMELINE_STEPS: TimelineStep[] = [
  { status: "pending", label: "Pendiente" },
  { status: "paid", label: "Pagado" },
  { status: "kitchen", label: "En cocina" },
  { status: "delivered", label: "Entregado" },
];

const STEP_INDEX: Record<string, number> = {
  pending: 0,
  whatsapp: 0,
  paid: 1,
  kitchen: 2,
  delivered: 3,
};

export function OrderTimeline({ status }: { status: OrderStatus | string }) {
  const isCancelled = status === "cancelled";
  const isExpired = status === "expired";
  const isFailed = status === "failed";

  if (isExpired || isFailed) {
    return (
      <div className="flex items-center gap-2 text-sm text-red-600" data-timeline>
        <X className="h-4 w-4" />
        <span>
          Orden {isExpired ? "expirada" : "fallida"}
        </span>
      </div>
    );
  }

  const currentIdx = STEP_INDEX[status] ?? 0;

  return (
    <div className="flex items-center gap-0" data-timeline>
      {TIMELINE_STEPS.map((step, idx) => {
        const isCompleted = idx < currentIdx;
        const isCurrent = idx === currentIdx;
        const isFuture = idx > currentIdx;

        return (
          <div key={step.status} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-colors",
                  isCancelled && isCurrent &&
                    "bg-red-100 text-red-600 ring-2 ring-red-300",
                  isCompleted &&
                    "bg-primary text-primary-foreground",
                  isCurrent &&
                    !isCancelled &&
                    "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2",
                  isFuture && "bg-muted text-muted-foreground",
                )}
              >
                {isCompleted ? (
                  <Check className="h-3.5 w-3.5" />
                ) : isCancelled && isCurrent ? (
                  <X className="h-3.5 w-3.5" />
                ) : (
                  idx + 1
                )}
              </div>
              <span
                className={cn(
                  "text-[10px] font-medium whitespace-nowrap",
                  isCompleted || isCurrent
                    ? "text-text-main"
                    : "text-text-muted",
                )}
              >
                {step.label}
              </span>
            </div>
            {idx < TIMELINE_STEPS.length - 1 && (
              <div
                className={cn(
                  "mx-1 h-px w-8 sm:w-12",
                  idx < currentIdx ? "bg-primary" : "bg-border",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
