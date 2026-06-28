"use client";

import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Loader2,
  Hash,
  Phone,
  User,
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface RefFields {
  paymentReference: string;
  phone: string;
  customerName: string;
  cedula: string;
}

// ─── Reference Dialog ─────────────────────────────────────────────────────────
// Modal de captura del comprobante para confirmar un pago manual con referencia.
// Componente controlado: el estado (fields/errors/touched) lo administra el
// consumidor, lo que permite pre-llenar campos (p.ej. teléfono/nombre del
// cliente en caja). Reutilizado por QuickActions (admin) y WebOrdersSheet (caja).

export function ReferenceDialog({
  open,
  fields,
  errors,
  touched,
  isPending,
  onChange,
  onBlur,
  onConfirm,
  onClose,
  onForceManual,
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
  onForceManual?: () => void;
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
        <div className="px-6 pb-5 pt-2 flex flex-col gap-3 border-t border-border/40">
          {onForceManual && isValid && errors.paymentReference && (
            <div className="flex flex-col gap-1.5 p-3 bg-amber-50/50 border border-amber-100 rounded-xl animate-in fade-in duration-300">
              <p className="text-[11px] text-amber-800 font-medium leading-tight">
                ¿El reenvío automático está caído? Puedes autorizar este pago de forma manual si ya lo verificaste en tu teléfono.
              </p>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  onForceManual();
                }}
                disabled={isPending}
                className="w-full py-2 px-4 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm transition-colors text-center disabled:opacity-50"
              >
                {isPending ? "Confirmando..." : "Forzar aprobación manual"}
              </button>
            </div>
          )}
          <div className="flex items-center justify-between gap-3">
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
