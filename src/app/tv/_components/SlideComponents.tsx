"use client";

import React from "react";
import type { MenuBoardData } from "../_types";

/* ─────────────── Formatters ─────────────── */

export function fmtRef(cents: number): string {
  return `REF. ${(cents / 100).toFixed(2).replace(".", ",")}`;
}

const BS_FMT = new Intl.NumberFormat("es-VE", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function fmtBs(cents: number, rate: number | null) {
  if (!rate || rate <= 0) return "";
  return BS_FMT.format(Math.round((cents / 100) * rate));
}

/** clamp(minPx, unitBasedPx, maxPx) as a CSS string. */
export function cu(min: number, val: number, max: number): string {
  return `clamp(${min}px, ${val.toFixed(2)}px, ${max}px)`;
}

/* ─────────────── Placeholder palette ─────────────── */

export const PALETTE: [string, string][] = [
  ["#92400e", "#451a03"],
  ["#7f1d1d", "#450a0a"],
  ["#365314", "#1a2e05"],
  ["#134e4a", "#042f2e"],
  ["#1e3a8a", "#172554"],
  ["#581c87", "#3b0764"],
  ["#713f12", "#422006"],
  ["#831843", "#500724"],
];

export function strHash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function initials(name: string) {
  const words = name
    .trim()
    .split(/\s+/)
    .filter((w) => !/^(de|del|la|el|los|las|y|con|en|al)$/i.test(w));
  const src = words.length ? words : [name.trim()];
  return ((src[0]?.[0] ?? "") + (src[1]?.[0] ?? "")).toUpperCase().slice(0, 2) || "•";
}

/** Spanish lowercase words — kept lowercase mid-phrase in title casing. */
const ES_LOWER_WORDS = new Set([
  "de", "del", "la", "el", "los", "las", "y", "con", "en", "al", "a", "e", "o", "u",
]);

/**
 * Consistent Spanish title case: first letter of each significant word
 * uppercased, articles/prepositions kept lowercase (except as first word).
 * "pasta china" → "Pasta China"; "pechuga a la plancha" → "Pechuga a la Plancha".
 */
export function titleCaseEs(s: string): string {
  return s
    .trim()
    .split(/\s+/)
    .map((w, i) => {
      const lw = w.toLowerCase();
      if (i > 0 && ES_LOWER_WORDS.has(lw)) return lw;
      return lw.charAt(0).toUpperCase() + lw.slice(1);
    })
    .join(" ");
}

/**
 * Strips a trailing parenthetical from a contorno name so the board shows
 * "Arroz" instead of the raw DB name "Arroz (Contorno)".
 */
export function cleanContorno(name: string): string {
  return name.replace(/\s*\([^)]*\)\s*$/, "").trim() || name.trim();
}

/* ─────────────── ImageSlot ─────────────── */

export function ImageSlot({
  item,
  unit,
  radius,
  style,
}: {
  item: MenuBoardData["items"][number];
  unit: number;
  radius?: number;
  style?: React.CSSProperties;
}) {
  const r = radius ?? unit * 0.8;
  const base: React.CSSProperties = {
    width: "100%",
    height: "100%",
    borderRadius: r,
    overflow: "hidden",
    ...style,
  };

  if (item.imageUrl) {
    return (
      <div style={{ ...base, background: "#0a0604" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.imageUrl}
          alt=""
          draggable={false}
          style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
        />
      </div>
    );
  }

  const [c1, c2] = PALETTE[strHash(item.id || item.name) % PALETTE.length];
  const monoFs = cu(14, unit * 3.8, 80);

  return (
    <div
      style={{
        ...base,
        background: `linear-gradient(135deg, ${c1} 0%, ${c2} 100%)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}
    >
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at top left, rgba(255,255,255,0.12) 0%, transparent 55%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", inset: Math.max(2, unit * 0.3), borderRadius: Math.max(4, r - unit * 0.2), border: "1px solid rgba(255,255,255,0.08)", pointerEvents: "none" }} />
      <span style={{ fontSize: monoFs, fontWeight: 800, color: "rgba(255,255,255,0.7)", letterSpacing: "0.04em", lineHeight: 1, textShadow: "0 2px 10px rgba(0,0,0,0.5)", position: "relative" }}>
        {initials(item.name)}
      </span>
    </div>
  );
}

/* ─────────────── PriceTag ─────────────── */

export function PriceTag({
  item,
  data,
  unit,
  variant,
}: {
  item: MenuBoardData["items"][number];
  data: MenuBoardData;
  unit: number;
  /** Scale multipliers per context. */
  variant: "grid" | "list" | "portrait";
}) {
  const usd = fmtRef(item.priceUsdCents);
  const categoryLower = item.categoryName
    ? item.categoryName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    : "";
  const isAdicionalOrBebida = categoryLower.includes("adicional") || categoryLower.includes("bebida");
  const bs = isAdicionalOrBebida ? "" : fmtBs(item.priceUsdCents, data.rateBsPerUsd);

  // Primary price size and secondary (Bs) size per variant.
  const [mainFs, subFs] = {
    grid:     [cu(15, unit * 2.8,  80), cu(11, unit * 1.7,  50)],
    list:     [cu(14, unit * 2.2,  72), cu(11, unit * 1.4,  46)],
    portrait: [cu(14, unit * 3.0,  80), cu(10, unit * 2.0,  56)],
  }[variant];

  if (variant === "portrait") {
    return (
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: cu(3, unit * 0.8, 16),
          background: "rgba(0,0,0,0.4)",
          border: "1px solid rgba(184, 91, 53, 0.25)",
          padding: `${cu(1.5, unit * 0.6, 12)} ${cu(4, unit * 1.5, 32)}`,
          borderRadius: 999,
          width: "fit-content",
        }}
      >
        {(data.currency === "usd" || data.currency === "both") && (
          <span style={{ color: "#b85b35", fontWeight: 800, fontSize: mainFs, fontVariantNumeric: "tabular-nums" }}>
            {usd}
          </span>
        )}
        {data.currency === "both" && bs && (
          <div style={{ width: 1, height: "1em", background: "rgba(184, 91, 53, 0.3)" }} />
        )}
        {(data.currency === "ves" || data.currency === "both") && bs && (
          <span
            style={{
              color: data.currency === "both" ? "rgba(184, 91, 53, 0.7)" : "#b85b35",
              fontWeight: data.currency === "both" ? 500 : 800,
              fontSize: data.currency === "both" ? subFs : mainFs,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            Bs {bs}
          </span>
        )}
      </div>
    );
  }

  return (
    <div 
      style={{ 
        display: "flex", 
        flexDirection: "column", 
        alignItems: variant === "grid" ? "center" : "flex-start", 
        gap: cu(1, unit * 0.4, 8), 
        lineHeight: 1.05, 
        flexShrink: 0 
      }}
    >
      {(data.currency === "usd" || data.currency === "both") && (
        <span style={{ color: "#b85b35", fontWeight: 800, fontSize: mainFs, fontVariantNumeric: "tabular-nums" }}>
          {usd}
        </span>
      )}
      {(data.currency === "ves" || data.currency === "both") && bs && (
        <span
          style={{
            color: data.currency === "both" ? "rgba(184, 91, 53, 0.7)" : "#b85b35",
            fontWeight: data.currency === "both" ? 500 : 800,
            fontSize: data.currency === "both" ? subFs : mainFs,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          Bs {bs}
        </span>
      )}
    </div>
  );
}
