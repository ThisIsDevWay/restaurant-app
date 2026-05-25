"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { formatBs, formatRef } from "@/lib/money";
import type { GlobalContorno } from "./ItemDetailModal.types";

const cleanContorno = (name: string) => name.replace(/\s*\([^)]*\)\s*$/, "").trim();

interface ContornoMiniSheetProps {
  /** The contorno slot being edited (its original name) */
  slotName: string;
  /** Currently selected substitute id, or null (= original) */
  currentSubstituteId: string | null;
  /** Available substitutes including the original at index 0 */
  options: GlobalContorno[];
  /** Original contorno (to show in the "keep original" row) */
  original: { id: string; name: string; priceUsdCents: number };
  currentRateBsPerUsd: number;
  onSelect: (substituteId: string | null) => void;
  onClose: () => void;
  /** Whether any other slot is already using a given sub id */
  isAlreadyUsed: (subId: string) => boolean;
}

export function ContornoMiniSheet({
  slotName,
  currentSubstituteId,
  options,
  original,
  currentRateBsPerUsd,
  onSelect,
  onClose,
  isAlreadyUsed,
}: ContornoMiniSheetProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  /* Trap scroll behind sheet */
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  /* Keyboard ESC */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleSelect = (subId: string | null) => {
    onSelect(subId);
    onClose();
  };

  return (
    /* ── Backdrop ── */
    <div
      ref={overlayRef}
      onClick={onClose}
      className="fixed inset-0 z-[200] flex items-end justify-center"
      style={{
        background: "rgba(37,26,7,0.55)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        animation: "contorno-bg-in 0.18s ease",
      }}
    >
      {/* ── Sheet Panel ── */}
      <div
        ref={sheetRef}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg"
        style={{
          background: "#fff",
          borderRadius: "24px 24px 0 0",
          maxHeight: "55vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 -8px 40px rgba(37,26,7,0.18)",
          animation: "contorno-sheet-in 0.26s cubic-bezier(0.32,0.72,0,1)",
        }}
      >
        {/* Drag handle */}
        <div style={{
          width: 36, height: 3.5,
          borderRadius: 99,
          background: "rgba(37,26,7,0.12)",
          margin: "12px auto 0",
          flexShrink: 0,
        }} />

        {/* Header */}
        <div style={{
          display: "flex",
          alignItems: "center",
          padding: "14px 20px 12px",
          borderBottom: "1px solid #fff2e2",
          flexShrink: 0,
          gap: 10,
        }}>
          <div style={{ flex: 1 }}>
            <p style={{
              fontFamily: "'Epilogue', sans-serif",
              fontSize: 11,
              fontWeight: 900,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#9e8e7e",
              marginBottom: 2,
            }}>
              Cambiar contorno
            </p>
            <p style={{
              fontFamily: "'Epilogue', sans-serif",
              fontSize: 16,
              fontWeight: 900,
              color: "#251a07",
              letterSpacing: "-0.02em",
            }}>
              {cleanContorno(slotName)}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            style={{
              width: 34, height: 34,
              borderRadius: 10,
              border: "none",
              background: "#fff2e2",
              color: "#9e8e7e",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {/* Options list */}
        <div style={{
          overflowY: "auto",
          flex: 1,
          padding: "8px 12px 20px",
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}>
          {/* Original option */}
          <OptionRow
            label={cleanContorno(original.name)}
            sublabel="Original · Sin costo adicional"
            selected={!currentSubstituteId}
            onSelect={() => handleSelect(null)}
          />

          {/* Substitute options */}
          {options.map((sub) => {
            const alreadyUsed = isAlreadyUsed(sub.id);
            const priceDiff = sub.priceUsdCents - original.priceUsdCents;
            const priceLabel =
              sub.priceUsdCents === 0 || priceDiff === 0
                ? "Sin costo adicional"
                : priceDiff > 0
                ? `+${formatBs(Math.round(priceDiff * currentRateBsPerUsd))} (${formatRef(priceDiff)})`
                : `${formatBs(Math.round(priceDiff * currentRateBsPerUsd))} (${formatRef(priceDiff)})`;

            const displayName = alreadyUsed ? `Más ${cleanContorno(sub.name)}` : cleanContorno(sub.name);

            return (
              <OptionRow
                key={sub.id}
                label={displayName}
                sublabel={priceLabel}
                selected={currentSubstituteId === sub.id}
                onSelect={() => handleSelect(sub.id)}
              />
            );
          })}
        </div>
      </div>

      <style>{`
        @keyframes contorno-bg-in   { from{opacity:0} to{opacity:1} }
        @keyframes contorno-sheet-in { from{transform:translateY(100%)} to{transform:translateY(0)} }
      `}</style>
    </div>
  );
}

/* ─── Option Row ─── */
function OptionRow({
  label,
  sublabel,
  selected,
  onSelect,
}: {
  label: string;
  sublabel: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "14px 12px",
        borderRadius: 14,
        border: selected ? "2px solid #bb0005" : "2px solid transparent",
        background: selected ? "rgba(187,0,5,0.04)" : "transparent",
        cursor: "pointer",
        textAlign: "left",
        transition: "background 0.12s, border-color 0.12s",
        width: "100%",
      }}
    >
      {/* Radio indicator */}
      <div style={{
        width: 20, height: 20,
        borderRadius: "50%",
        border: selected ? "6px solid #bb0005" : "2px solid #d0c9c0",
        flexShrink: 0,
        transition: "border 0.15s",
      }} />

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 14,
          fontWeight: selected ? 700 : 500,
          color: "#251a07",
          lineHeight: 1.3,
          marginBottom: 1,
        }}>
          {label}
        </p>
        <p style={{
          fontSize: 11,
          color: "#9e8e7e",
          fontWeight: 500,
        }}>
          {sublabel}
        </p>
      </div>

      {selected && (
        <span style={{
          fontSize: 11,
          fontWeight: 900,
          color: "#bb0005",
          fontFamily: "'Epilogue', sans-serif",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          flexShrink: 0,
        }}>
          ✓
        </span>
      )}
    </button>
  );
}
