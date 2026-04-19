"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle,
  ChefHat,
  Truck,
  XCircle,
  Printer,
  MoreHorizontal,
  Hash,
  Loader2,
  Phone,
  User,
  CreditCard,
  AlertTriangle,
  X,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ACTION_MAP,
  ACTION_ENDPOINTS,
  type OrderStatus,
  type ActionType,
} from "@/lib/constants/order-status";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────
   DESIGN TOKENS (Heritage Editorial)
───────────────────────────────────────────── */
const T = {
  primary:     "#bb0005",
  primaryDeep: "#e2231a",
  ink:         "#251a07",
  cream:       "#fff8f3",
  creamLow:    "#fff2e2",
  muted:       "#9e8e7e",
  surface:     "#ffffff",
  fontDisplay: "'Epilogue', sans-serif",
  fontBody:    "'Plus Jakarta Sans', sans-serif",
} as const;

/* ─────────────────────────────────────────────
   ACTION CONFIG
───────────────────────────────────────────── */
const DETAIL_ACTION_CONFIG: Record<
  string,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    tier: "primary" | "secondary" | "danger";
    actionType: ActionType | "print";
  }
> = {
  confirm:          { label: "Confirmar orden",        icon: CheckCircle, tier: "primary",   actionType: "confirm" },
  confirm_manual:   { label: "Confirmar pago",         icon: CheckCircle, tier: "primary",   actionType: "confirm_manual" },
  confirm_with_ref: { label: "Confirmar con ref.",     icon: Hash,        tier: "primary",   actionType: "confirm_with_ref" },
  mark_kitchen:     { label: "Enviar a cocina",        icon: ChefHat,     tier: "primary",   actionType: "mark_kitchen" },
  mark_delivered:   { label: "Marcar entregada",       icon: Truck,       tier: "primary",   actionType: "mark_delivered" },
  cancel:           { label: "Cancelar orden",         icon: XCircle,     tier: "danger",    actionType: "cancel" },
  print:            { label: "Imprimir ticket",        icon: Printer,     tier: "secondary", actionType: "print" },
};

const DESTRUCTIVE_ACTIONS = new Set(["cancel"]);
const REFERENCE_ACTIONS   = new Set(["confirm_with_ref"]);

interface RefFields { paymentReference: string; phone: string; customerName: string; cedula: string; }

/* ─────────────────────────────────────────────
   PRIMITIVE: HERITAGE BUTTON
───────────────────────────────────────────── */
function HButton({
  children,
  onClick,
  disabled,
  tier = "primary",
  size = "md",
  loading = false,
  className,
  style,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  tier?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const base: React.CSSProperties = {
    display:        "inline-flex",
    alignItems:     "center",
    justifyContent: "center",
    gap:            "7px",
    border:         "none",
    cursor:         disabled || loading ? "not-allowed" : "pointer",
    fontFamily:     T.fontDisplay,
    fontWeight:     800,
    textTransform:  "uppercase",
    letterSpacing:  "0.07em",
    transition:     "transform 0.15s, box-shadow 0.2s, opacity 0.2s",
    opacity:        disabled && !loading ? 0.55 : 1,
    position:       "relative",
    overflow:       "hidden",
    whiteSpace:     "nowrap",
  };

  const sizes: Record<string, React.CSSProperties> = {
    sm: { height: 32, padding: "0 14px", fontSize: 10, borderRadius: 9 },
    md: { height: 38, padding: "0 18px", fontSize: 11, borderRadius: 10 },
    lg: { height: 44, padding: "0 24px", fontSize: 12, borderRadius: 12 },
  };

  const tiers: Record<string, React.CSSProperties> = {
    primary: {
      background: `linear-gradient(135deg, ${T.primary} 0%, ${T.primaryDeep} 100%)`,
      color:      "#fff",
      boxShadow:  "0 4px 14px rgba(187,0,5,0.28)",
    },
    secondary: {
      background: T.creamLow,
      color:      T.ink,
      boxShadow:  "0 2px 6px rgba(37,26,7,0.06)",
    },
    danger: {
      background: "#fff0f0",
      color:      "#c0392b",
      boxShadow:  "0 2px 6px rgba(192,57,43,0.10)",
    },
    ghost: {
      background: "transparent",
      color:      T.muted,
      boxShadow:  "none",
    },
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={className}
      style={{ ...base, ...sizes[size], ...tiers[tier], ...style }}
      onMouseEnter={(e) => { if (!disabled && !loading) (e.currentTarget as HTMLElement).style.transform = "scale(1.04)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
      onMouseDown={(e)  => { if (!disabled && !loading) (e.currentTarget as HTMLElement).style.transform = "scale(0.97)"; }}
      onMouseUp={(e)    => { if (!disabled && !loading) (e.currentTarget as HTMLElement).style.transform = "scale(1.04)"; }}
    >
      {loading && (
        <span
          aria-hidden
          style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(100deg, transparent 20%, rgba(255,255,255,0.16) 50%, transparent 80%)",
            backgroundSize: "200% 100%",
            animation: "hb-shimmer 1.2s infinite",
            borderRadius: "inherit",
          }}
        />
      )}
      <span style={{ position: "relative", zIndex: 1, display: "inline-flex", alignItems: "center", gap: 7 }}>
        {children}
      </span>
      <style>{`
        @keyframes hb-shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        @keyframes hb-spin    { to{transform:rotate(360deg)} }
      `}</style>
    </button>
  );
}

/* ─────────────────────────────────────────────
   PRIMITIVE: MODAL OVERLAY
───────────────────────────────────────────── */
function Modal({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 50,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
        background: "rgba(37,26,7,0.45)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        animation: "modal-bg-in 0.18s ease",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: T.surface,
          borderRadius: 20,
          width: "100%",
          maxWidth: 420,
          boxShadow: "0 24px 64px rgba(37,26,7,0.18), 0 4px 16px rgba(37,26,7,0.1)",
          animation: "modal-in 0.2s cubic-bezier(0.34,1.56,0.64,1)",
          overflow: "hidden",
        }}
      >
        {children}
      </div>
      <style>{`
        @keyframes modal-bg-in { from{opacity:0} to{opacity:1} }
        @keyframes modal-in    { from{opacity:0;transform:scale(.93) translateY(10px)} to{opacity:1;transform:scale(1) translateY(0)} }
      `}</style>
    </div>
  );
}

/* ─────────────────────────────────────────────
   PRIMITIVE: MODAL HEADER
───────────────────────────────────────────── */
function ModalHeader({
  title,
  description,
  icon: Icon,
  accent,
  onClose,
}: {
  title: string;
  description?: string;
  icon?: React.ComponentType<{ style?: React.CSSProperties }>;
  accent?: "red" | "green";
  onClose?: () => void;
}) {
  const accentBg    = accent === "red" ? "#fff0f0"  : "#f0fdf4";
  const accentColor = accent === "red" ? "#c0392b"  : "#059669";

  return (
    <div style={{ padding: "22px 22px 16px", borderBottom: `1px solid ${T.creamLow}` }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {Icon && (
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: accentBg,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <Icon style={{ width: 18, height: 18, color: accentColor }} />
            </div>
          )}
          <div>
            <h2 style={{
              fontFamily: T.fontDisplay, fontWeight: 900, fontSize: 15,
              color: T.ink, letterSpacing: "-0.02em", lineHeight: 1.2, marginBottom: 4,
            }}>
              {title}
            </h2>
            {description && (
              <p style={{ fontSize: 12, color: T.muted, lineHeight: 1.5, fontWeight: 500 }}>
                {description}
              </p>
            )}
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: 8, border: "none", cursor: "pointer",
              background: T.creamLow, color: T.muted, display: "flex",
              alignItems: "center", justifyContent: "center", flexShrink: 0,
              transition: "background .15s",
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#ffe4e4")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = T.creamLow)}
          >
            <X style={{ width: 13, height: 13 }} />
          </button>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   PRIMITIVE: REF INPUT FIELD
───────────────────────────────────────────── */
function RefField({
  label, placeholder, value, error, icon: Icon,
  mono = false, autoFocus = false, onChange,
}: {
  label: string; placeholder?: string; value: string;
  error?: string; icon?: React.ComponentType<{ style?: React.CSSProperties }>;
  mono?: boolean; autoFocus?: boolean; onChange: (v: string) => void;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label style={{
        display: "flex", alignItems: "center", gap: 5,
        fontSize: 10, fontWeight: 800, textTransform: "uppercase",
        letterSpacing: "0.13em", color: focused ? T.primary : T.muted,
        fontFamily: T.fontDisplay, transition: "color .15s",
      }}>
        {Icon && <Icon style={{ width: 11, height: 11 }} />}
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          autoFocus={autoFocus}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: "100%",
            height: 38,
            padding: "0 12px",
            borderRadius: 10,
            border: `1.5px solid ${error ? "#fca5a5" : focused ? T.primary : T.creamLow}`,
            background: focused ? "#fff" : T.cream,
            fontFamily: mono ? "'Courier New', monospace" : T.fontBody,
            fontSize: 13,
            fontWeight: 600,
            color: T.ink,
            outline: "none",
            transition: "border-color .15s, background .15s",
            boxSizing: "border-box",
          }}
        />
        {error && (
          <p style={{
            marginTop: 4, fontSize: 10, fontWeight: 700,
            color: "#c0392b", letterSpacing: "0.04em",
          }}>
            ↑ {error}
          </p>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   PRIMITIVE: DROPDOWN MENU (custom)
───────────────────────────────────────────── */
function ActionDropdown({
  items,
  disabled,
}: {
  items: Array<{ key: string; label: string; icon: React.ComponentType<{ style?: React.CSSProperties }>; danger?: boolean; onClick: () => void }>;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <HButton
        tier="secondary"
        size="md"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        style={{ padding: "0 12px" }}
      >
        <MoreHorizontal style={{ width: 18, height: 18 }} />
      </HButton>

      {open && (
        <>
          {/* click-away backdrop */}
          <div
            style={{ position: "fixed", inset: 0, zIndex: 40 }}
            onClick={() => setOpen(false)}
          />
          <div style={{
            position: "absolute", top: "calc(100% + 8px)", right: 0,
            zIndex: 50,
            minWidth: 200,
            background: T.surface,
            borderRadius: 14,
            boxShadow: "0 12px 40px rgba(37,26,7,0.13), 0 2px 8px rgba(37,26,7,0.07)",
            padding: "6px",
            animation: "drop-in 0.14s cubic-bezier(0.34,1.56,0.64,1)",
          }}>
            {items.map((item, idx) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  onClick={() => { item.onClick(); setOpen(false); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    width: "100%", padding: "9px 12px",
                    borderRadius: 9, border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    fontFamily: T.fontBody,
                    fontSize: 12, fontWeight: 600,
                    color: item.danger ? "#c0392b" : T.ink,
                    textAlign: "left",
                    transition: "background .12s",
                  }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = item.danger ? "#fff0f0" : T.cream)}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
                >
                  <span style={{
                    width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                    background: item.danger ? "#fff0f0" : T.creamLow,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Icon style={{ width: 13, height: 13, color: item.danger ? "#c0392b" : T.muted }} />
                  </span>
                  {item.label}
                </button>
              );
            })}
            <style>{`@keyframes drop-in{from{opacity:0;transform:scale(.95) translateY(-6px)}to{opacity:1;transform:scale(1) translateY(0)}}`}</style>
          </div>
        </>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
export function OrderActions({
  orderId,
  orderStatus,
}: {
  orderId: string;
  orderStatus: OrderStatus;
}) {
  const router      = useRouter();
  const queryClient = useQueryClient();

  const [confirmKey,    setConfirmKey]    = useState<string | null>(null);
  const [refDialogOpen, setRefDialogOpen] = useState(false);
  const [refFields, setRefFields] = useState<RefFields>({
    paymentReference: "", phone: "", customerName: "", cedula: "",
  });
  const [refErrors, setRefErrors] = useState<Partial<RefFields>>({});

  const quickActions = ACTION_MAP[orderStatus] ?? [];

  const mutation = useMutation({
    mutationFn: async ({ actionType, refPayload }: { actionType: ActionType; refPayload?: RefFields }) => {
      const config = ACTION_ENDPOINTS[actionType];
      const url    = config.url(orderId);
      const body   = actionType === "confirm_with_ref" && refPayload
        ? { paymentReference: refPayload.paymentReference, phone: refPayload.phone, customerName: refPayload.customerName || undefined, cedula: refPayload.cedula || undefined }
        : config.body ? config.body(orderId) : {};

      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Error al actualizar"); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      router.refresh();
      setConfirmKey(null);
      setRefDialogOpen(false);
    },
  });

  function handleAction(key: string) {
    if (key === "print")                   { window.print(); return; }
    if (DESTRUCTIVE_ACTIONS.has(key))      { setConfirmKey(key); return; }
    if (REFERENCE_ACTIONS.has(key))        { setRefFields({ paymentReference: "", phone: "", customerName: "", cedula: "" }); setRefErrors({}); setRefDialogOpen(true); return; }
    const cfg = DETAIL_ACTION_CONFIG[key];
    if (cfg?.actionType && cfg.actionType !== "print") mutation.mutate({ actionType: cfg.actionType as ActionType });
  }

  function validateRef(): boolean {
    const err: Partial<RefFields> = {};
    if (refFields.paymentReference.trim().length < 3) err.paymentReference = "Mínimo 3 caracteres";
    if (refFields.phone.trim().length < 7)            err.phone = "Teléfono inválido (mínimo 7 dígitos)";
    setRefErrors(err);
    return Object.keys(err).length === 0;
  }

  function setRefField(key: keyof RefFields, value: string) {
    setRefFields((f) => ({ ...f, [key]: value }));
    setRefErrors((e) => ({ ...e, [key]: undefined }));
  }

  if (quickActions.length === 0) return null;

  const primaryQA     = quickActions[0];
  const secondaryQAs  = quickActions.slice(1);
  const primaryConfig = DETAIL_ACTION_CONFIG[primaryQA.action];

  const PrimaryIcon = primaryConfig?.icon;

  /* Build dropdown items */
  const dropdownItems = [
    {
      key:   "print",
      label: "Imprimir ticket",
      icon:  Printer,
      onClick: () => window.print(),
    },
    ...secondaryQAs
      .map((qa) => {
        const cfg = DETAIL_ACTION_CONFIG[qa.action];
        if (!cfg) return null;
        return {
          key:    qa.action,
          label:  cfg.label,
          icon:   cfg.icon,
          danger: DESTRUCTIVE_ACTIONS.has(qa.action),
          onClick: () => handleAction(qa.action),
        };
      })
      .filter(Boolean) as Array<{ key: string; label: string; icon: React.ComponentType<{ style?: React.CSSProperties }>; danger?: boolean; onClick: () => void }>,
  ];

  return (
    <>
      {/* ── ACTION BAR ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
        padding: "12px 16px",
        background: T.surface,
        borderRadius: 14,
        boxShadow: "0 2px 10px rgba(37,26,7,0.05)",
      }}>

        {/* Primary CTA */}
        {primaryConfig && PrimaryIcon && (
          <HButton
            tier="primary"
            size="lg"
            loading={mutation.isPending}
            onClick={() => handleAction(primaryQA.action)}
            disabled={mutation.isPending}
          >
            {mutation.isPending
              ? <><Loader2 style={{ width: 14, height: 14, animation: "hb-spin .75s linear infinite" }} /> Actualizando…</>
              : <><PrimaryIcon className="h-[14px] w-[14px]" /> {primaryConfig.label}</>
            }
          </HButton>
        )}

        {/* Divider */}
        {dropdownItems.length > 0 && (
          <div style={{ width: 1, height: 24, background: T.creamLow, flexShrink: 0 }} />
        )}

        {/* More actions */}
        {dropdownItems.length > 0 && (
          <ActionDropdown items={dropdownItems} disabled={mutation.isPending} />
        )}
      </div>

      {/* ── CANCEL CONFIRMATION MODAL ── */}
      <Modal open={confirmKey !== null} onClose={() => setConfirmKey(null)}>
        <ModalHeader
          title="Cancelar orden"
          description="Esta acción es irreversible. El stock no se restaura automáticamente."
          icon={AlertTriangle}
          accent="red"
          onClose={() => setConfirmKey(null)}
        />
        <div style={{ padding: "16px 22px 22px", display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Warning card */}
          <div style={{
            padding: "12px 14px", borderRadius: 12,
            background: "#fff0f0", border: "1px solid #fca5a5",
            fontSize: 12, color: "#7f1d1d", lineHeight: 1.6, fontWeight: 500,
          }}>
            ¿Estás seguro? Esta operación marcará la orden como <strong>cancelada</strong> y notificará al cliente.
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
            <HButton tier="secondary" size="md" onClick={() => setConfirmKey(null)}>
              Volver
            </HButton>
            <HButton
              tier="danger"
              size="md"
              loading={mutation.isPending}
              disabled={mutation.isPending}
              onClick={() => {
                if (!confirmKey) return;
                const cfg = DETAIL_ACTION_CONFIG[confirmKey];
                if (cfg?.actionType && cfg.actionType !== "print")
                  mutation.mutate({ actionType: cfg.actionType as ActionType });
              }}
              style={{ background: "#c0392b", color: "#fff", boxShadow: "0 4px 12px rgba(192,57,43,0.3)" }}
            >
              {mutation.isPending
                ? <><Loader2 style={{ width: 12, height: 12, animation: "hb-spin .75s linear infinite" }} />Procesando…</>
                : <><XCircle className="h-3.5 w-3.5" />Sí, cancelar</>
              }
            </HButton>
          </div>
        </div>
      </Modal>

      {/* ── REFERENCE DIALOG ── */}
      <Modal open={refDialogOpen} onClose={() => setRefDialogOpen(false)}>
        <ModalHeader
          title="Confirmar pago pendiente"
          description="Registra los datos del pago para auditoría y trazabilidad."
          icon={Hash}
          accent="green"
          onClose={() => setRefDialogOpen(false)}
        />
        <div style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: 12 }}>
          <RefField
            label="Número de referencia *"
            placeholder="Ej: 36785432198"
            value={refFields.paymentReference}
            error={refErrors.paymentReference}
            icon={Hash}
            mono autoFocus
            onChange={(v) => setRefField("paymentReference", v)}
          />
          <RefField
            label="Teléfono del pagador *"
            placeholder="Ej: 04121234567"
            value={refFields.phone}
            error={refErrors.phone}
            icon={Phone}
            mono
            onChange={(v) => setRefField("phone", v)}
          />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <RefField
              label="Nombre (opc.)"
              placeholder="Juan García"
              value={refFields.customerName}
              icon={User}
              onChange={(v) => setRefField("customerName", v)}
            />
            <RefField
              label="Cédula (opc.)"
              placeholder="V-12345678"
              value={refFields.cedula}
              icon={CreditCard}
              mono
              onChange={(v) => setRefField("cedula", v)}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: "12px 22px 20px",
          borderTop: `1px solid ${T.creamLow}`,
          display: "flex", gap: 8, justifyContent: "flex-end",
        }}>
          <HButton tier="secondary" size="md" disabled={mutation.isPending} onClick={() => setRefDialogOpen(false)}>
            Cancelar
          </HButton>
          <HButton
            tier="primary"
            size="md"
            loading={mutation.isPending}
            disabled={
              mutation.isPending ||
              refFields.paymentReference.trim().length < 3 ||
              refFields.phone.trim().length < 7
            }
            onClick={() => { if (validateRef()) mutation.mutate({ actionType: "confirm_with_ref", refPayload: refFields }); }}
          >
            {mutation.isPending
              ? <><Loader2 style={{ width: 12, height: 12, animation: "hb-spin .75s linear infinite" }} />Confirmando…</>
              : <><CheckCircle className="h-3.5 w-3.5" />Confirmar pago</>
            }
          </HButton>
        </div>
      </Modal>
    </>
  );
}