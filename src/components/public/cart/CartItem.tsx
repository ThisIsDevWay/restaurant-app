"use client";

import { useState } from "react";
import { Minus, Plus, Trash2, AlertTriangle } from "lucide-react";
import { formatBs, formatRef } from "@/lib/money";
import { type CartItem as CartItemType } from "@/store/cartStore";

/* ─────────────────────────────────────────────
   DESIGN TOKENS
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
   HELPERS
───────────────────────────────────────────── */
/**
 * Compute the USD total for a single cart line.
 * Formula mirrors cartStore.computeItemUsdCents exactly:
 *   (base + fixedContornos + substitutions − removals) × quantity
 *   + adicionales (flat) + bebidas (flat)
 *
 * ⚠️  Adicionales & bebidas are FLAT fees per cart entry,
 *     NOT multiplied by plate quantity.
 * ⚠️  Removals are SUBTRACTED (priceUsdCents is stored positive).
 */
function computeItemUsdCents(item: CartItemType): number {
  const fixedUsd  = (item.fixedContornos       ?? []).reduce((s, c) => s + c.priceUsdCents, 0);
  const subUsd    = (item.contornoSubstitutions ?? []).reduce((s, c) => s + c.priceUsdCents, 0);
  const adUsd     = (item.selectedAdicionales   ?? []).reduce((s, a) => s + a.priceUsdCents * (a.quantity ?? 1), 0);
  const bebUsd    = (item.selectedBebidas       ?? []).reduce((s, b) => s + b.priceUsdCents * (b.quantity ?? 1), 0);
  const remUsd    = (item.removedComponents     ?? []).reduce((s, r) => s + r.priceUsdCents, 0);
  // Per-unit components × quantity, then add flat extras/drinks
  return (item.baseUsdCents + fixedUsd + subUsd - remUsd) * item.quantity + adUsd + bebUsd;
}

/* ─────────────────────────────────────────────
   PILL — category tag
───────────────────────────────────────────── */
type PillVariant = "default" | "swap" | "remove" | "extra" | "bebida";

function Pill({ children, variant = "default" }: { children: React.ReactNode; variant?: PillVariant }) {
  const styles: Record<PillVariant, React.CSSProperties> = {
    default: { background: T.surface,   color: T.muted,      border: `1px solid ${T.creamLow}` },
    swap:    { background: T.creamLow,  color: T.ink,        border: "none" },
    remove:  { background: "#fff0f0",   color: "#c0392b",    border: "none" },
    extra:   { background: "rgba(187,0,5,0.06)", color: T.primary, border: "none" },
    bebida:  { background: "rgba(37,26,7,0.05)", color: T.ink,   border: "none" },
  };

  return (
    <span style={{
      display:       "inline-flex",
      alignItems:    "center",
      gap:           4,
      padding:       "3px 9px",
      borderRadius:  99,
      fontSize:      10,
      fontWeight:    600,
      lineHeight:    1.4,
      whiteSpace:    "nowrap",
      fontFamily:    T.fontBody,
      ...styles[variant],
    }}>
      {children}
    </span>
  );
}

/* ─────────────────────────────────────────────
   CATEGORY LABEL
───────────────────────────────────────────── */
function CatLabel({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      width:         58,
      flexShrink:    0,
      fontSize:      9,
      fontWeight:    900,
      textTransform: "uppercase",
      letterSpacing: "0.12em",
      color:         T.muted,
      fontFamily:    T.fontDisplay,
      paddingTop:    2,
    }}>
      {children}
    </span>
  );
}

/* ─────────────────────────────────────────────
   ICON BUTTON
───────────────────────────────────────────── */
function IconBtn({
  onClick, label, danger = false, children,
}: {
  onClick: () => void; label: string; danger?: boolean; children: React.ReactNode;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      aria-label={label}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width:          28, height: 28,
        borderRadius:   8,
        border:         "none",
        cursor:         "pointer",
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        background:     danger
          ? (hovered ? "#fff0f0" : T.cream)
          : (hovered ? T.creamLow : T.cream),
        color: danger
          ? (hovered ? "#c0392b" : T.muted)
          : (hovered ? T.primary : T.muted),
        transition: "background .15s, color .15s, transform .12s",
        transform: hovered ? "scale(1.1)" : "scale(1)",
      }}
    >
      {children}
    </button>
  );
}

/* ─────────────────────────────────────────────
   REMOVE CONFIRMATION MODAL
───────────────────────────────────────────── */
function RemoveModal({
  itemName,
  onConfirm,
  onCancel,
}: {
  itemName: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      onClick={onCancel}
      style={{
        position:       "fixed",
        inset:          0,
        zIndex:         200,
        display:        "flex",
        alignItems:     "flex-end",
        justifyContent: "center",
        padding:        "0 0 16px",
        background:     "rgba(37,26,7,0.52)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        animation:      "rm-bg-in .18s ease",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width:        "100%",
          maxWidth:     360,
          margin:       "0 16px",
          background:   T.surface,
          borderRadius: 20,
          overflow:     "hidden",
          boxShadow:    "0 20px 60px rgba(37,26,7,0.2)",
          animation:    "rm-panel-in .22s cubic-bezier(0.34,1.56,0.64,1)",
        }}
      >
        {/* Icon header */}
        <div style={{
          display:        "flex",
          flexDirection:  "column",
          alignItems:     "center",
          gap:            10,
          padding:        "28px 24px 20px",
          background:     T.cream,
          borderBottom:   `1px solid ${T.creamLow}`,
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: "#fff0f0",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <AlertTriangle style={{ width: 22, height: 22, color: "#c0392b" }} />
          </div>
          <p style={{
            fontFamily:    T.fontDisplay,
            fontSize:      15,
            fontWeight:    900,
            color:         T.ink,
            letterSpacing: "-0.02em",
            textAlign:     "center",
          }}>
            ¿Eliminar este ítem?
          </p>
          <p style={{
            fontSize:   12,
            color:      T.muted,
            fontWeight: 500,
            textAlign:  "center",
            lineHeight: 1.5,
          }}>
            <strong style={{ color: T.ink }}>{itemName}</strong> será removido de tu pedido.
          </p>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "16px 16px 20px" }}>
          <button
            onClick={onConfirm}
            style={{
              height:         50,
              borderRadius:   13,
              border:         "none",
              cursor:         "pointer",
              background:     "#c0392b",
              color:          "#fff",
              fontFamily:     T.fontDisplay,
              fontSize:       13,
              fontWeight:     900,
              letterSpacing:  "0.06em",
              textTransform:  "uppercase",
              boxShadow:      "0 4px 14px rgba(192,57,43,0.3)",
              transition:     "transform .15s",
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.transform = "scale(1.02)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.transform = "scale(1)")}
            onMouseDown={(e)  => ((e.currentTarget as HTMLElement).style.transform = "scale(0.97)")}
          >
            Sí, eliminar
          </button>
          <button
            onClick={onCancel}
            style={{
              height:         44,
              borderRadius:   13,
              border:         "none",
              cursor:         "pointer",
              background:     T.creamLow,
              color:          T.ink,
              fontFamily:     T.fontDisplay,
              fontSize:       12,
              fontWeight:     800,
              letterSpacing:  "0.05em",
              textTransform:  "uppercase",
              transition:     "background .15s",
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "#ffe4d4")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = T.creamLow)}
          >
            Cancelar
          </button>
        </div>
      </div>

      <style>{`
        @keyframes rm-bg-in    { from{opacity:0} to{opacity:1} }
        @keyframes rm-panel-in { from{opacity:0;transform:scale(.93) translateY(16px)} to{opacity:1;transform:scale(1) translateY(0)} }
      `}</style>
    </div>
  );
}

/* ─────────────────────────────────────────────
   QUANTITY STEPPER
───────────────────────────────────────────── */
function Stepper({
  value, onDecrement, onIncrement, maxValue,
}: {
  value: number; onDecrement: () => void; onIncrement: () => void; maxValue: number;
}) {
  const atMax = value >= maxValue;
  return (
    <div style={{
      display:      "flex",
      alignItems:   "center",
      borderRadius: 99,
      background:   T.surface,
      border:       `1.5px solid ${T.creamLow}`,
      overflow:     "hidden",
      height:       30,
    }}>
      {[
        { icon: <Minus style={{ width: 11, height: 11 }} />, fn: onDecrement, label: "Reducir",  disabled: false },
        null,
        { icon: <Plus  style={{ width: 11, height: 11 }} />, fn: onIncrement, label: "Aumentar", disabled: atMax },
      ].map((item, idx) => {
        if (!item) {
          return (
            <span key="val" style={{
              minWidth:      24,
              textAlign:     "center",
              fontFamily:    T.fontDisplay,
              fontSize:      13,
              fontWeight:    900,
              color:         T.ink,
              padding:       "0 2px",
              letterSpacing: "-0.01em",
            }}>
              {value}
            </span>
          );
        }
        return (
          <button
            key={item.label}
            onClick={item.disabled ? undefined : item.fn}
            aria-label={item.label}
            disabled={item.disabled}
            style={{
              width:          28, height: "100%",
              border:         "none",
              background:     "transparent",
              color:          item.disabled ? T.muted : T.primary,
              opacity:        item.disabled ? 0.35 : 1,
              cursor:         item.disabled ? "not-allowed" : "pointer",
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
              transition:     "background .12s",
            }}
            onMouseEnter={(e) => { if (!item.disabled) (e.currentTarget as HTMLElement).style.background = "rgba(187,0,5,0.06)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
          >
            {item.icon}
          </button>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
interface CartItemProps {
  item: CartItemType;
  index: number;
  maxQuantityPerItem?: number;
  onUpdateQuantity: (index: number, qty: number) => void;
  onRemove: (index: number) => void;
}

export function CartItem({ item, index, maxQuantityPerItem = 10, onUpdateQuantity, onRemove }: CartItemProps) {
  const [pendingRemove, setPendingRemove] = useState(false);

  const fixedContornos = item.fixedContornos       ?? [];
  const substitutions  = item.contornoSubstitutions ?? [];
  const adicionales    = item.selectedAdicionales   ?? [];
  const bebidas        = item.selectedBebidas       ?? [];
  const removals       = item.removedComponents     ?? [];

  const hasContornos      = fixedContornos.length > 0 || substitutions.length > 0;
  const hasCustomizations = hasContornos || adicionales.length > 0 || bebidas.length > 0 || removals.length > 0;
  const lineUsdCents      = computeItemUsdCents(item); // quantity already applied inside

  function handleDecrement() {
    if (item.quantity === 1) setPendingRemove(true);
    else onUpdateQuantity(index, item.quantity - 1);
  }

  return (
    <>
      <div style={{
        borderRadius: 14,
        background:   T.cream,
        overflow:     "hidden",
        /* Layered depth: sit slightly above canvas */
        boxShadow:    "0 1px 4px rgba(37,26,7,0.05)",
      }}>

        {/* ── HEADER ROW ── */}
        <div style={{
          display:    "flex",
          alignItems: "center",
          gap:        10,
          padding:    "11px 12px 10px",
        }}>
          {/* Emoji tile */}
          <div style={{
            width:          40, height: 40,
            borderRadius:   11,
            background:     T.surface,
            border:         `1.5px solid ${T.creamLow}`,
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            fontSize:       20,
            flexShrink:     0,
            boxShadow:      "0 1px 3px rgba(37,26,7,0.06)",
          }}>
            {item.emoji}
          </div>

          {/* Name + unit price */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              fontFamily:   T.fontBody,
              fontSize:     "clamp(12px, 3.5vw, 14px)",
              fontWeight:   700,
              color:        T.ink,
              lineHeight:   1.3,
              marginBottom: 2,
              display:      "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow:     "hidden",
            }}>
              {item.quantity > 1 ? (
                <>
                  <span style={{ color: T.primary, fontFamily: T.fontDisplay, fontWeight: 900 }}>
                    {item.quantity}
                  </span>{" "}
                  servicios de {item.name}
                </>
              ) : item.name}
            </p>
            <p style={{ fontSize: 10, color: T.muted, fontWeight: 500 }}>
              {formatBs(item.baseBsCents)} / unidad
            </p>
          </div>

          {/* Controls */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            <Stepper
              value={item.quantity}
              maxValue={maxQuantityPerItem}
              onDecrement={handleDecrement}
              onIncrement={() => onUpdateQuantity(index, Math.min(item.quantity + 1, maxQuantityPerItem))}
            />
            <IconBtn onClick={() => onRemove(index)} label="Eliminar" danger>
              <Trash2 style={{ width: 12, height: 12 }} />
            </IconBtn>
          </div>
        </div>

        {/* ── CUSTOMIZATIONS ── */}
        {hasCustomizations && (
          <div style={{
            display:       "flex",
            flexDirection: "column",
            gap:           7,
            padding:       "8px 12px 10px",
            borderTop:     `1px solid ${T.creamLow}`,
            background:    T.surface,
          }}>
            {hasContornos && (
              <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                <CatLabel>Contornos</CatLabel>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {fixedContornos.map((c) => (
                    <Pill key={c.id} variant="default">{c.name}</Pill>
                  ))}
                  {substitutions.map((s, i) => (
                    <Pill key={i} variant="swap">
                      <span style={{ textDecoration: "line-through", opacity: 0.5, fontSize: 9 }}>{s.originalName}</span>
                      <span style={{ opacity: 0.5, fontSize: 9 }}>→</span>
                      {s.substituteName}
                    </Pill>
                  ))}
                </div>
              </div>
            )}

            {removals.length > 0 && (
              <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                <CatLabel>Sin</CatLabel>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {removals.map((r) => (
                    <Pill key={r.componentId} variant="remove">
                      <span style={{ fontStyle: "italic" }}>{r.name}</span>
                    </Pill>
                  ))}
                </div>
              </div>
            )}

            {adicionales.length > 0 && (
              <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                <CatLabel>Extras</CatLabel>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {adicionales.map((ad) => (
                    <Pill key={ad.id} variant="extra">
                      <span style={{ fontFamily: T.fontDisplay, fontWeight: 800 }}>{ad.quantity ?? 1}×</span>
                      {ad.name}
                      {ad.priceBsCents > 0 && (
                        <span style={{ opacity: 0.7, fontSize: 9 }}>
                          +{formatBs(ad.priceBsCents * (ad.quantity ?? 1))}
                        </span>
                      )}
                    </Pill>
                  ))}
                </div>
              </div>
            )}

            {bebidas.length > 0 && (
              <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                <CatLabel>Bebidas</CatLabel>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {bebidas.map((b) => (
                    <Pill key={b.id} variant="bebida">
                      <span style={{ fontFamily: T.fontDisplay, fontWeight: 800 }}>{b.quantity ?? 1}×</span>
                      {b.name}
                      {b.priceBsCents > 0 && (
                        <span style={{ opacity: 0.7, fontSize: 9 }}>
                          +{formatBs(b.priceBsCents * (b.quantity ?? 1))}
                        </span>
                      )}
                    </Pill>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── SUBTOTAL FOOTER ── */}
        <div style={{
          display:        "flex",
          alignItems:     "center",
          justifyContent: "space-between",
          padding:        "7px 12px 9px",
          borderTop:      `1px solid ${T.creamLow}`,
          background:     T.cream,
        }}>
          <span style={{ fontSize: 10, color: T.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: T.fontDisplay }}>
            Subtotal{item.quantity > 1 ? ` × ${item.quantity}` : ""}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            {/* USD reference chip */}
            <span style={{
              fontSize:     10,
              color:        T.muted,
              background:   T.surface,
              border:       `1px solid ${T.creamLow}`,
              padding:      "2px 7px",
              borderRadius: 6,
              fontFamily:   T.fontDisplay,
              fontWeight:   600,
            }}>
              {formatRef(lineUsdCents)}
            </span>
            {/* Bs amount — display emphasis */}
            <span style={{
              fontFamily:    T.fontDisplay,
              fontSize:      "clamp(13px, 4vw, 15px)",
              fontWeight:    900,
              color:         T.ink,
              letterSpacing: "-0.02em",
            }}>
              {formatBs(item.itemTotalBsCents)}
            </span>
          </div>
        </div>
      </div>

      {/* ── REMOVE CONFIRMATION MODAL ── */}
      {pendingRemove && (
        <RemoveModal
          itemName={item.name}
          onConfirm={() => { onRemove(index); setPendingRemove(false); }}
          onCancel={() => setPendingRemove(false)}
        />
      )}
    </>
  );
}