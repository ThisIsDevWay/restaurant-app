"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  MoreVertical,
  Eye,
  Loader2,
  Printer,
  Check,
} from "lucide-react";
import { useOrderActionMutation } from "@/hooks/useOrderActionMutation";
import { reprintOrderAction } from "@/actions/print";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ReferenceDialog, type RefFields } from "@/components/admin/orders/ReferenceDialog";
import {
  ACTION_MAP,
  ACTION_ENDPOINTS,
  type OrderStatus,
  type ActionType,
} from "@/lib/constants/order-status";

/**
 * Short labels for table cells — the full labels from ACTION_MAP are used in
 * the dialog/dropdown but are too long for a fixed-width ACCIONES column.
 *
 * Max ~10 chars so the button fits in 15% of an 820px+ table (~123px).
 */
const SHORT_LABEL: Partial<Record<ActionType, string>> = {
  confirm_with_ref: "Confirmar Referencia",
  confirm: "Confirmar",
  confirm_manual: "Confirmar",
  mark_kitchen: "Preparar",
  mark_delivered: "Entregar",
  cancel: "Cancelar",
};

// ─── QuickActions ─────────────────────────────────────────────────────────────

export function QuickActions({
  orderId,
  orderStatus,
  paymentMethod,
  compact = false,
}: {
  orderId: string;
  orderStatus: OrderStatus;
  paymentMethod?: string | null;
  compact?: boolean;
}) {
  const router = useRouter();
  const isEfectivo = paymentMethod === "Efectivo $";
  const actions = orderStatus === "pending" && isEfectivo
    ? [
        {
          label: "Confirmar Efectivo",
          icon: Check,
          action: "confirm_manual" as ActionType,
          variant: "default" as const,
        },
      ]
    : (ACTION_MAP[orderStatus] ?? []);
  const primary = actions[0];

  const [refDialogOpen, setRefDialogOpen] = useState(false);
  const [fields, setFields] = useState<RefFields>({
    paymentReference: "",
    phone: "",
    customerName: "",
    cedula: "",
  });
  const [errors, setErrors] = useState<Partial<RefFields>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof RefFields, boolean>>>({});

  const mutation = useOrderActionMutation({
    orderId,
    onSuccess: () => {
      setRefDialogOpen(false);
    },
    onError: (err) => {
      setErrors((prev) => ({
        ...prev,
        paymentReference: err.message,
      }));
      setTouched((prev) => ({
        ...prev,
        paymentReference: true,
      }));
    },
  });

  function handleAction(actionType: ActionType, e?: React.MouseEvent) {
    e?.preventDefault();
    e?.stopPropagation();
    if (actionType === "confirm_with_ref") {
      setFields({ paymentReference: "", phone: "", customerName: "", cedula: "" });
      setErrors({});
      setTouched({});
      setRefDialogOpen(true);
      return;
    }
    mutation.mutate({ actionType });
  }

  function validate(): boolean {
    const newErrors: Partial<RefFields> = {};
    if (fields.paymentReference.trim().length < 3)
      newErrors.paymentReference = "Mínimo 3 caracteres";
    if (fields.phone.trim().length < 7)
      newErrors.phone = "Mínimo 7 dígitos";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleConfirmWithRef(e?: React.MouseEvent) {
    e?.stopPropagation();
    setTouched({ paymentReference: true, phone: true });
    if (!validate()) return;
    mutation.mutate({ actionType: "confirm_with_ref", refPayload: fields });
  }

  function setField(key: keyof RefFields, value: string) {
    setFields((f) => ({ ...f, [key]: value }));
    if (touched[key]) {
      const newErrors = { ...errors };
      if (key === "paymentReference") {
        if (value.trim().length >= 3) delete newErrors.paymentReference;
        else newErrors.paymentReference = "Mínimo 3 caracteres";
      }
      if (key === "phone") {
        if (value.trim().length >= 7) delete newErrors.phone;
        else newErrors.phone = "Mínimo 7 dígitos";
      }
      setErrors(newErrors);
    }
  }

  const handleReprint = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const result = await reprintOrderAction({ orderId });
    if (result?.data?.success) {
      toast.success("Impresión enviada");
    } else {
      toast.error("Error al enviar impresión");
    }
  };

  function handleForceManual() {
    mutation.mutate({ actionType: "confirm_manual", refPayload: fields });
  }

  const dialog = (
    <ReferenceDialog
      open={refDialogOpen}
      fields={fields}
      errors={errors}
      touched={touched}
      isPending={mutation.isPending}
      onChange={setField}
      onBlur={(k) => setTouched((t) => ({ ...t, [k]: true }))}
      onConfirm={handleConfirmWithRef}
      onClose={() => setRefDialogOpen(false)}
      onForceManual={handleForceManual}
    />
  );

  // ── Compact mode ──────────────────────────────────────────────────────────
  if (compact) {
    if (!primary) return null;
    const Icon = primary.icon;
    return (
      <div className="flex items-center gap-1">
        <EyeBtn size="sm" onClick={(e) => { e.stopPropagation(); router.push(`/admin/orders/${orderId}`); }} />
        <button
          onClick={handleReprint}
          className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted/50 hover:text-primary hover:bg-primary/10 transition-colors"
          title="Imprimir ticket"
        >
          <Printer className="h-3.5 w-3.5" />
        </button>
        <ActionBtn
          size="sm"
          destructive={primary.variant === "destructive"}
          disabled={mutation.isPending}
          pending={mutation.isPending}
          icon={<Icon className="h-3 w-3" />}
          label={SHORT_LABEL[primary.action] ?? primary.label}
          onClick={(e) => handleAction(primary.action, e)}
        />
        {dialog}
      </div>
    );
  }

  // ── Normal mode ───────────────────────────────────────────────────────────
  return (
    <div className="flex items-center justify-end gap-1">
      <EyeBtn onClick={() => router.push(`/admin/orders/${orderId}`)} />
      <button
        onClick={handleReprint}
        className="flex h-8 w-7 items-center justify-center rounded-md text-text-muted/50 hover:text-primary hover:bg-primary/10 transition-colors"
        title="Imprimir ticket"
      >
        <Printer className="h-4 w-4" />
      </button>

      {primary && (
        <ActionBtn
          destructive={primary.variant === "destructive"}
          disabled={mutation.isPending}
          pending={mutation.isPending}
          icon={<primary.icon className="h-3.5 w-3.5 flex-shrink-0" />}
          /*
           * Use SHORT_LABEL so the button fits in the fixed ACCIONES column.
           * Full label is still shown in the dialog title and dropdown items.
           */
          label={SHORT_LABEL[primary.action] ?? primary.label}
          onClick={(e) => handleAction(primary.action, e)}
        />
      )}

      {actions.length > 1 && (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                className={cn(
                  "flex h-8 w-7 items-center justify-center rounded-md",
                  "text-text-muted/60 hover:text-text-main hover:bg-muted/50",
                  "transition-colors focus:outline-none focus-visible:ring-2",
                  "focus-visible:ring-primary/40 flex-shrink-0",
                )}
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            }
          />
          <DropdownMenuContent align="end" className="min-w-[160px]">
            {actions.slice(1).map((action) => {
              const Icon = action.icon;
              return (
                <DropdownMenuItem
                  key={action.action}
                  variant={action.variant === "destructive" ? "destructive" : "default"}
                  onClick={(e) => handleAction(action.action, e)}
                  className="gap-2 text-sm"
                >
                  <Icon className="h-3.5 w-3.5" />
                  {/* Full label in dropdown — space is not constrained here */}
                  {action.label}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {dialog}
    </div>
  );
}

// ─── Eye Button ───────────────────────────────────────────────────────────────

function EyeBtn({
  size = "md",
  onClick,
}: {
  size?: "sm" | "md";
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      onClick={onClick}
      title="Ver detalles"
      className={cn(
        "flex items-center justify-center rounded-md flex-shrink-0",
        "text-text-muted/50 hover:text-text-muted hover:bg-muted/50",
        "transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        size === "sm" ? "h-7 w-7" : "h-8 w-7",
      )}
    >
      <Eye className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />
    </button>
  );
}

// ─── Action Button ────────────────────────────────────────────────────────────

function ActionBtn({
  icon,
  label,
  destructive = false,
  disabled = false,
  pending = false,
  size = "md",
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  destructive?: boolean;
  disabled?: boolean;
  pending?: boolean;
  size?: "sm" | "md";
  onClick: (e: React.MouseEvent) => void;
}) {
  const base = cn(
    "inline-flex items-center gap-1.5 rounded-lg font-bold uppercase tracking-tight",
    "transition-colors focus:outline-none focus-visible:ring-2",
    "disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap",
    size === "sm" ? "h-7 px-2.5 text-[10px]" : "h-8 px-2.5 text-[11px]",
  );

  if (destructive) {
    return (
      <button
        disabled={disabled}
        onClick={onClick}
        className={cn(
          base,
          "border border-red-300 text-red-600",
          "hover:bg-red-50 hover:border-red-400 active:bg-red-100",
          "focus-visible:ring-red-400/50",
        )}
      >
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin flex-shrink-0" /> : icon}
        {label}
      </button>
    );
  }

  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={cn(
        base,
        "bg-red-600 text-white",
        "hover:bg-red-700 active:bg-red-800",
        "shadow-sm shadow-red-500/20",
        "focus-visible:ring-red-500/50",
      )}
    >
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin flex-shrink-0" /> : icon}
      {label}
    </button>
  );
}
