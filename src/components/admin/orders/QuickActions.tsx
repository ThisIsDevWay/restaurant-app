"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  MoreVertical,
  Eye,
  Loader2,
  Hash,
  Phone,
  User,
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Printer,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { reprintOrderAction } from "@/actions/print";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
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

interface RefFields {
  paymentReference: string;
  phone: string;
  customerName: string;
  cedula: string;
}

// ─── QuickActions ─────────────────────────────────────────────────────────────

export function QuickActions({
  orderId,
  orderStatus,
  compact = false,
}: {
  orderId: string;
  orderStatus: OrderStatus;
  compact?: boolean;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const actions = ACTION_MAP[orderStatus] ?? [];
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

  const mutation = useMutation({
    mutationFn: async ({
      actionType,
      refPayload,
    }: {
      actionType: ActionType;
      refPayload?: RefFields;
    }) => {
      const config = ACTION_ENDPOINTS[actionType];
      const url = config.url(orderId);
      const body =
        actionType === "confirm_with_ref" && refPayload
          ? {
            paymentReference: refPayload.paymentReference,
            phone: refPayload.phone,
            customerName: refPayload.customerName || undefined,
            cedula: refPayload.cedula || undefined,
          }
          : config.body
            ? config.body(orderId)
            : {};
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al actualizar la orden");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      router.refresh();
      setRefDialogOpen(false);
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

// ─── Reference Dialog ─────────────────────────────────────────────────────────

function ReferenceDialog({
  open,
  fields,
  errors,
  touched,
  isPending,
  onChange,
  onBlur,
  onConfirm,
  onClose,
}: {
  open: boolean;
  fields: RefFields;
  errors: Partial<RefFields>;
  touched: Partial<Record<keyof RefFields, boolean>>;
  isPending: boolean;
  onChange: (key: keyof RefFields, value: string) => void;
  onBlur: (key: keyof RefFields) => void;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const refOk = fields.paymentReference.trim().length >= 3;
  const phoneOk = fields.phone.trim().length >= 7;
  const isValid = refOk && phoneOk;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent
        className="rounded-2xl max-w-[420px] p-0 overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-muted/40 border-b border-border/50 px-6 py-5">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-base font-bold">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
                <ShieldCheck className="h-4 w-4 text-primary" />
              </span>
              {/* Full label in dialog title */}
              Confirmar con referencia
            </DialogTitle>
            <DialogDescription className="text-xs text-text-muted mt-1 leading-relaxed">
              Registra los datos del comprobante para auditoría.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Fields */}
        <div className="px-6 py-5 space-y-5">
          <div className="space-y-3">
            <SectionDivider label="Obligatorios" />
            <DialogField
              icon={<Hash className="h-3.5 w-3.5" />}
              label="Número de referencia"
              placeholder="Ej: 36785432198"
              value={fields.paymentReference}
              error={touched.paymentReference ? errors.paymentReference : undefined}
              isValid={refOk}
              hasValue={!!fields.paymentReference}
              mono
              autoFocus
              onBlur={() => onBlur("paymentReference")}
              onChange={(v) => onChange("paymentReference", v)}
            />
            <DialogField
              icon={<Phone className="h-3.5 w-3.5" />}
              label="Teléfono del pagador"
              placeholder="Ej: 04121234567"
              value={fields.phone}
              error={touched.phone ? errors.phone : undefined}
              isValid={phoneOk}
              hasValue={!!fields.phone}
              mono
              onBlur={() => onBlur("phone")}
              onChange={(v) => onChange("phone", v)}
            />
          </div>

          <div className="space-y-3">
            <SectionDivider label="Opcionales" />
            <div className="grid grid-cols-2 gap-3">
              <DialogField
                icon={<User className="h-3.5 w-3.5" />}
                label="Nombre"
                placeholder="Juan García"
                value={fields.customerName}
                onChange={(v) => onChange("customerName", v)}
              />
              <DialogField
                icon={<CreditCard className="h-3.5 w-3.5" />}
                label="Cédula"
                placeholder="V-12345678"
                value={fields.cedula}
                mono
                onChange={(v) => onChange("cedula", v)}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 pt-2 flex items-center justify-between gap-3 border-t border-border/40">
          <button
            onClick={onClose}
            disabled={isPending}
            className="text-sm text-text-muted hover:text-text-main transition-colors disabled:opacity-40"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending || !isValid}
            className={cn(
              "inline-flex items-center gap-2 px-5 py-2 rounded-xl",
              "font-bold text-sm text-white",
              "bg-red-600 hover:bg-red-700 active:bg-red-800",
              "shadow-sm shadow-red-500/20",
              "transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50",
              "disabled:opacity-40 disabled:cursor-not-allowed",
            )}
          >
            {isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin" />Confirmando...</>
            ) : (
              <><CheckCircle2 className="h-4 w-4" />Confirmar pago</>
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-px flex-1 bg-border/50" />
      <span className="text-[10px] font-bold text-text-muted/60 uppercase tracking-widest">
        {label}
      </span>
      <span className="h-px flex-1 bg-border/50" />
    </div>
  );
}

function DialogField({
  icon,
  label,
  placeholder,
  value,
  error,
  isValid,
  hasValue = false,
  mono = false,
  autoFocus = false,
  onBlur,
  onChange,
}: {
  icon?: React.ReactNode;
  label: string;
  placeholder?: string;
  value: string;
  error?: string;
  isValid?: boolean;
  hasValue?: boolean;
  mono?: boolean;
  autoFocus?: boolean;
  onBlur?: () => void;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-[11px] font-semibold text-text-muted uppercase tracking-wide">
        {icon && <span className="opacity-50">{icon}</span>}
        {label}
      </label>
      <div className="relative">
        <Input
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          autoFocus={autoFocus}
          className={cn(
            "h-9 text-sm pr-8 transition-all",
            mono && "font-mono",
            error && "border-red-400 focus-visible:ring-red-300/50",
            !error && isValid && hasValue && "border-emerald-400/60 focus-visible:ring-emerald-300/40",
          )}
        />
        {hasValue && (
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
            {isValid
              ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              : <AlertCircle className="h-3.5 w-3.5 text-red-400" />
            }
          </span>
        )}
      </div>
      {error && (
        <p className="text-[11px] text-red-500 font-medium flex items-center gap-1">
          <AlertCircle className="h-3 w-3 flex-shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}