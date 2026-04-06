import { cn } from "@/lib/utils";
import { Check, X, Clock } from "lucide-react";
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

  if (isExpired || isFailed || isCancelled) {
    return (
      <div className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border shadow-sm w-fit",
        isCancelled ? "bg-red-50 text-red-700 border-red-100" : "bg-black text-white border-black"
      )} data-timeline>
        {isCancelled ? <X className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
        <span>
          Orden {isExpired ? "expirada" : isFailed ? "fallida" : "cancelada"}
        </span>
      </div>
    );
  }

  const currentIdx = STEP_INDEX[status] ?? 0;

  return (
    <div className="flex items-center gap-0 w-full overflow-x-auto no-scrollbar py-2" data-timeline>
      {TIMELINE_STEPS.map((step, idx) => {
        const isCompleted = idx < currentIdx;
        const isCurrent = idx === currentIdx;
        const isFuture = idx > currentIdx;

        const nodeColors: Record<number, string> = {
          0: "bg-amber-500", // Pending
          1: "bg-emerald-500", // Paid
          2: "bg-orange-500", // Kitchen
          3: "bg-green-600", // Delivered
        };

        return (
          <div key={step.status} className="flex items-center shrink-0 last:flex-1">
            <div className="flex flex-col items-center gap-2">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold transition-all shadow-sm",
                  isCompleted && "bg-primary text-white",
                  isCurrent && cn(nodeColors[idx] ?? "bg-primary", "text-white ring-4 ring-offset-2", idx === 0 ? "ring-amber-100" : idx === 1 ? "ring-emerald-100" : idx === 2 ? "ring-orange-100" : "ring-green-100"),
                  isFuture && "bg-slate-200 text-slate-500",
                )}
              >
                {isCompleted ? (
                  <Check className="h-5 w-5 stroke-[3]" />
                ) : (
                  idx + 1
                )}
              </div>
              <span
                className={cn(
                  "text-[11px] font-bold uppercase tracking-tight whitespace-nowrap",
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
                  "mx-2 h-1 w-12 sm:w-20 md:w-24 rounded-full transition-colors",
                  idx < currentIdx ? "bg-primary" : "bg-slate-200",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
