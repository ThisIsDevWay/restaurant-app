"use client";

import { useEffect, useRef, useState, useMemo } from "react";

/**
 * Live Menu Board slide — one page of items.
 *
 * Sizing strategy:
 *   All font sizes, gaps and image dimensions are derived from a single
 *   `unit = min(containerW, containerH) / 100` value measured via
 *   ResizeObserver.  This means every element scales linearly with the
 *   actual container — 1080p, 4K, 8K, rotated TVs all look identical
 *   in proportion.  clamp() provides safety rails (never tinier than
 *   the minimum, never larger than the maximum) but the middle value
 *   is always unit-based so it actually grows on large screens.
 */

export type MenuBoardData = {
  title: string;
  subtitle?: string;
  layout: "list" | "grid";
  showPrices: boolean;
  showDescriptions: boolean;
  showImages: boolean;
  currency: "usd" | "ves" | "both";
  rateBsPerUsd: number | null;
  restaurantName: string;
  pageIndex: number;
  totalPages: number;
  items: Array<{
    id: string;
    name: string;
    description: string | null;
    /** Free-text protein quantity, e.g. "200g" or "3 tenders". Null = not set. */
    portionNote: string | null;
    /** Free-text "includes" note, e.g. "Papas fritas y bebida". Null = not set. */
    includedNote: string | null;
    /** Names of contornos included with the dish (display only). */
    contornos: string[];
    imageUrl: string | null;
    priceUsdCents: number;
    categoryId: string;
    categoryName: string;
  }>;
};

/* ─────────────── Formatters ─────────────── */

function fmtRef(cents: number): string {
  return `REF. ${(cents / 100).toFixed(2).replace(".", ",")}`;
}

const BS_FMT = new Intl.NumberFormat("es-VE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function fmtBs(cents: number, rate: number | null) {
  if (!rate || rate <= 0) return "";
  return BS_FMT.format((cents / 100) * rate);
}

/** clamp(minPx, unitBasedPx, maxPx) as a CSS string. */
function cu(min: number, val: number, max: number): string {
  return `clamp(${min}px, ${val.toFixed(2)}px, ${max}px)`;
}

/* ─────────────── Placeholder palette ─────────────── */

const PALETTE: [string, string][] = [
  ["#92400e", "#451a03"],
  ["#7f1d1d", "#450a0a"],
  ["#365314", "#1a2e05"],
  ["#134e4a", "#042f2e"],
  ["#1e3a8a", "#172554"],
  ["#581c87", "#3b0764"],
  ["#713f12", "#422006"],
  ["#831843", "#500724"],
];

function strHash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function initials(name: string) {
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
function titleCaseEs(s: string): string {
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
function cleanContorno(name: string): string {
  return name.replace(/\s*\([^)]*\)\s*$/, "").trim() || name.trim();
}

/* ─────────────── ImageSlot ─────────────── */

function ImageSlot({
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

function PriceTag({
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
  const bs = fmtBs(item.priceUsdCents, data.rateBsPerUsd);

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

/* ─────────────── Main component ─────────────── */

export function MenuBoardSlide({ data }: { data: MenuBoardData }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 1920, h: 1080 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    // Use offsetWidth/offsetHeight instead of getBoundingClientRect().
    // getBoundingClientRect() returns post-transform dimensions, so a
    // 1080×1920 container rotated 90° via CSS reports 1920×1080 — making
    // isPortrait always false. offset* gives the pre-transform layout
    // dimensions which correctly reflect the intended orientation.
    const measure = () => {
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      if (w > 0 && h > 0) setBox({ w, h });
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /**
   * Base unit: 1% of the container's smaller dimension.
   * 1080p landscape  → unit = 10.8 px
   * 4K landscape     → unit = 21.6 px  (exactly 2×)
   * 8K landscape     → unit = 43.2 px  (exactly 4×)
   * 1080p portrait   → unit = 10.8 px  (min is still 1080)
   * 4K portrait      → unit = 21.6 px
   */
  const unit = Math.min(box.w, box.h) / 100;

  const isPortrait = box.h > box.w * 1.05;
  const n = data.items.length;
  const isList = data.layout === "list";

  const cols = useMemo(() => {
    if (isList || isPortrait) return 1; // portrait handled separately
    if (n <= 2) return n;
    return 3;
  }, [isList, isPortrait, n]);

  const grouped = useMemo(() => {
    const map = new Map<string, { name: string; items: MenuBoardData["items"] }>();
    for (const it of data.items) {
      const g = map.get(it.categoryId) ?? { name: it.categoryName, items: [] };
      g.items.push(it);
      map.set(it.categoryId, g);
    }
    return Array.from(map.values());
  }, [data.items]);

  const hasMultipleCategories = grouped.length > 1;
  const multiPage = data.totalPages > 1;
  const anyHasImage = data.items.some((it) => !!it.imageUrl);
  const reserveSlot = data.showImages && anyHasImage;

  const pad = cu(8, unit * 3.5, 80);

  return (
    <div
      ref={containerRef}
      style={{
        position: "absolute",
        inset: 0,
        background: "radial-gradient(ellipse at top, #21130d 0%, #0d0705 60%, #000000 100%)",
        color: "#fff8f3",
        fontFamily: "var(--font-sans), ui-sans-serif, system-ui, -apple-system, sans-serif",
        padding: pad,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      <style>{`
        @keyframes tv-ken-burns {
          0% { transform: scale(1); }
          100% { transform: scale(1.05); }
        }
      `}</style>
      {/* ── Header ── */}
      <div style={{ textAlign: "center", marginBottom: cu(4, unit * 2, 48), flexShrink: 0 }}>
        <div
          style={{
            fontSize: cu(12, unit * 2.8, 72),
            color: "#fff8f3",
            letterSpacing: "0.4em",
            textTransform: "uppercase",
            fontWeight: 700,
            marginBottom: cu(3, unit * 0.8, 16),
            fontFamily: "var(--font-display), system-ui, sans-serif",
          }}
        >
          {data.restaurantName}
        </div>
        <h1
          style={{
            fontSize: cu(22, unit * 5.2, 160),
            fontWeight: 800,
            lineHeight: 1.05,
            margin: 0,
            background: "linear-gradient(180deg, #ffffff 0%, #fff8f3 40%, #e2c2a0 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            fontFamily: "var(--font-display), system-ui, sans-serif",
          }}
        >
          {data.title}
        </h1>
        {data.subtitle && (
          <div
            style={{
              fontSize: cu(9, unit * 1.5, 44),
              color: "rgba(255, 248, 243, 0.78)",
              marginTop: cu(3, unit * 1, 22),
              fontWeight: 600,
              letterSpacing: "0.32em",
              textTransform: "uppercase",
              fontFamily: "var(--font-display), system-ui, sans-serif",
            }}
          >
            {data.subtitle}
          </div>
        )}
      </div>

      {/* ── Body ── */}
      <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
        {n === 0 ? (
          <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.4)", fontSize: cu(14, unit * 2, 56) }}>
            No hay productos para mostrar
          </div>
        ) : isList ? (
          <ListLayout grouped={grouped} data={data} hasMultipleCategories={hasMultipleCategories} reserveSlot={reserveSlot} unit={unit} isPortrait={isPortrait} />
        ) : isPortrait ? (
          <PortraitLayout grouped={grouped} data={data} hasMultipleCategories={hasMultipleCategories} unit={unit} />
        ) : (
          <GridLayout grouped={grouped} data={data} hasMultipleCategories={hasMultipleCategories} reserveSlot={reserveSlot} cols={cols} unit={unit} />
        )}
      </div>

      {/* ── Footer ── */}
      <div style={{ flexShrink: 0, marginTop: cu(4, unit * 1.2, 32), display: "flex", alignItems: "center", justifyContent: "center", gap: cu(8, unit * 2, 48) }}>
        {multiPage && (
          <div style={{ display: "flex", alignItems: "center", gap: cu(3, unit * 0.45, 12) }}>
            {Array.from({ length: data.totalPages }, (_, i) => (
              <div
                key={i}
                style={{
                  width:  i === data.pageIndex ? cu(12, unit * 1.8, 52) : cu(4, unit * 0.65, 18),
                  height: cu(4, unit * 0.65, 18),
                  borderRadius: 999,
                  background: i === data.pageIndex ? "#fff8f3" : "rgba(255, 248, 243, 0.22)",
                  transition: "all 0.4s ease",
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────── Portrait layout ─────────────── */

function PortraitLayout({
  grouped,
  data,
  hasMultipleCategories,
  unit,
}: {
  grouped: { name: string; items: MenuBoardData["items"] }[];
  data: MenuBoardData;
  hasMultipleCategories: boolean;
  unit: number;
}) {
  const flat: { item: MenuBoardData["items"][number]; idx: number }[] = [];
  for (const g of grouped)
    for (const item of g.items) flat.push({ item, idx: flat.length });

  return (
    <>
      <div
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          gap: cu(6, unit * 1.8, 44),
          overflow: "hidden",
        }}
      >
      {/* Category labels — separated by amber bullets */}
      {hasMultipleCategories && (
        <div
          style={{
            flexShrink: 0,
            display: "flex",
            gap: cu(5, unit * 1.4, 32),
            flexWrap: "wrap",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {grouped.map((g, i) => (
            <div key={g.name} style={{ display: "flex", alignItems: "center", gap: cu(5, unit * 1.4, 32) }}>
              {i > 0 && (
                <span style={{ color: "rgba(122, 142, 124, 0.6)", fontSize: cu(7, unit * 1.1, 28) }}>•</span>
              )}
              <span
                style={{
                  fontSize: cu(9, unit * 1.5, 42),
                  color: "#d6d3d1",
                  fontWeight: 700,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                }}
              >
                {g.name}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Item rows — 3 per page, alternating image side */}
      {flat.map(({ item, idx }) => (
        <PortraitRow
          key={item.id}
          item={item}
          data={data}
          imageLeft={idx % 2 === 0}
          unit={unit}
        />
      ))}
      </div>
    </>
  );
}

function PortraitRow({
  item,
  data,
  imageLeft,
  unit,
}: {
  item: MenuBoardData["items"][number];
  data: MenuBoardData;
  imageLeft: boolean;
  unit: number;
}) {
  const gap = cu(10, unit * 3, 80);

  // Render image directly — no wrapper box, no dark background, no clipping.
  // The food photography blends naturally into the dark page gradient.
  const imgSlot = (
    <div
      style={{
        flex: "0 0 60%",
        minWidth: 0,
        minHeight: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}
    >
      {/* Spotlight Glow */}
      <div
        style={{
          position: "absolute",
          inset: "10%",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255, 248, 243, 0.08) 0%, transparent 65%)",
          zIndex: 0,
        }}
      />
      {item.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.imageUrl}
          alt=""
          draggable={false}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            display: "block",
            position: "relative",
            zIndex: 1,
            animation: "tv-ken-burns 15s ease-in-out infinite alternate",
            filter: "drop-shadow(0 20px 35px rgba(0,0,0,0.8))",
          }}
        />
      ) : (
        /* Monogram placeholder — keep ImageSlot only for items without image */
        <ImageSlot item={item} unit={unit} radius={unit * 1.4} />
      )}
    </div>
  );

  const textSlot = (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "flex-start",
        textAlign: "left",
        gap: cu(6, unit * 2.6, 64),
      }}
    >
      {/* Info group — name, portion, contornos kept tight together */}
      <div style={{ display: "flex", flexDirection: "column", gap: cu(3, unit * 1.4, 34) }}>
        {/* Dish name + portionNote inline */}
        <div style={{ lineHeight: 1.06 }}>
          <span
            style={{
              fontSize: cu(20, unit * 5.2, 150),
              fontWeight: 800,
              color: "#fff8f3",
              letterSpacing: "-0.01em",
            }}
          >
            {titleCaseEs(item.name)}
          </span>
          {item.portionNote && (
            <span
              style={{
                fontSize: cu(11, unit * 2.4, 62),
                color: "rgba(255, 248, 243, 0.45)",
                fontWeight: 500,
                marginLeft: "0.35em",
                display: "inline-block",
                whiteSpace: "normal",
                lineHeight: 1.25,
                verticalAlign: "middle",
                fontFamily: "var(--font-sans), system-ui, sans-serif",
              }}
            >
              ({item.portionNote})
            </span>
          )}
        </div>

        {/* Contornos + includedNote — pill badges */}
        {(item.contornos.length > 0 || item.includedNote) && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: cu(3, unit * 0.9, 20) }}>
            {item.contornos.map((c) => (
              <span
                key={c}
                style={{
                  fontSize: cu(9, unit * 1.9, 48),
                  fontWeight: 700,
                  color: "#fff8f3",
                  background: "rgba(122, 142, 124, 0.12)",
                  border: "1px solid rgba(122, 142, 124, 0.3)",
                  borderRadius: 999,
                  padding: `${cu(2, unit * 0.6, 14)} ${cu(5, unit * 1.4, 32)}`,
                  letterSpacing: "0.01em",
                  whiteSpace: "nowrap" as const,
                }}
              >
                {cleanContorno(c)}
              </span>
            ))}
            {item.includedNote && item.includedNote.split(/[,·•]+/).map((part) => part.trim()).filter(Boolean).map((part) => (
              <span
                key={part}
                style={{
                  fontSize: cu(9, unit * 1.9, 48),
                  fontWeight: 700,
                  color: "#fff8f3",
                  background: "rgba(122, 142, 124, 0.12)",
                  border: "1px solid rgba(122, 142, 124, 0.3)",
                  borderRadius: 999,
                  padding: `${cu(2, unit * 0.6, 14)} ${cu(5, unit * 1.4, 32)}`,
                  letterSpacing: "0.01em",
                  whiteSpace: "nowrap" as const,
                }}
              >
                {part}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Price — separated from the info group */}
      {data.showPrices && (
        <PriceTag item={item} data={data} unit={unit} variant="portrait" />
      )}
    </div>
  );

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: imageLeft ? "row" : "row-reverse",
        alignItems: "stretch",
        gap,
        overflow: "hidden",
      }}
    >
      {imgSlot}
      {textSlot}
    </div>
  );
}

/* ─────────────── Grid layout ─────────────── */

function GridLayout({
  grouped,
  data,
  hasMultipleCategories,
  reserveSlot,
  cols,
  unit,
}: {
  grouped: { name: string; items: MenuBoardData["items"] }[];
  data: MenuBoardData;
  hasMultipleCategories: boolean;
  reserveSlot: boolean;
  cols: number;
  unit: number;
}) {
  const allItems = grouped.flatMap((g) => g.items);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: cu(4, unit * 1, 28), overflow: "hidden" }}>
      {hasMultipleCategories && (
        <div style={{ flexShrink: 0, display: "flex", gap: cu(8, unit * 2, 48), flexWrap: "wrap" }}>
          {grouped.map((g) => (
            <div
              key={g.name}
              style={{
                fontSize: cu(9, unit * 1.5, 42),
                color: "#fff8f3",
                fontWeight: 700,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                borderBottom: "1px solid rgba(122, 142, 124, 0.45)",
                paddingBottom: "0.3em",
              }}
            >
              {g.name}
            </div>
          ))}
        </div>
      )}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridAutoRows: "1fr",
          gap: `${cu(4, unit * 1.5, 36)} ${cu(6, unit * 1.5, 36)}`,
          overflow: "hidden",
        }}
      >
        {allItems.map((item) => (
          <GridCell key={item.id} item={item} data={data} reserveSlot={reserveSlot} unit={unit} />
        ))}
      </div>
    </div>
  );
}

function GridCell({
  item,
  data,
  reserveSlot,
  unit,
}: {
  item: MenuBoardData["items"][number];
  data: MenuBoardData;
  reserveSlot: boolean;
  unit: number;
}) {
  return (
    <div 
      style={{ 
        display: "flex", 
        flexDirection: "column", 
        minHeight: 0, 
        overflow: "hidden", 
        gap: cu(6, unit * 1.6, 48),
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
      }}
    >
      {/* Image Container with Ken Burns Zoom & Spotlight Glow */}
      {reserveSlot && (
        <div 
          style={{ 
            flex: "0 0 68%", 
            width: "100%",
            minHeight: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          {/* Spotlight Glow */}
          <div
            style={{
              position: "absolute",
              inset: "0%",
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(255, 248, 243, 0.09) 0%, transparent 70%)",
              zIndex: 0,
            }}
          />
          {item.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.imageUrl}
              alt=""
              draggable={false}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                display: "block",
                position: "relative",
                zIndex: 1,
                animation: "tv-ken-burns 16s ease-in-out infinite alternate",
                filter: "drop-shadow(0 25px 35px rgba(0,0,0,0.85))",
              }}
            />
          ) : (
            <div style={{ width: "95%", height: "95%", position: "relative", zIndex: 1 }}>
              <ImageSlot item={item} unit={unit} radius={unit * 1.6} />
            </div>
          )}
        </div>
      )}

      {/* Centered Typography Details */}
      <div 
        style={{ 
          flexShrink: 0, 
          display: "flex", 
          flexDirection: "column", 
          gap: cu(4, unit * 1.2, 32),
          alignItems: "center",
          textAlign: "center"
        }}
      >
        {/* Name + portionNote inline */}
        <div style={{ lineHeight: 1.15 }}>
          <span
            style={{
              fontSize: cu(15, unit * 2.6, 76),
              fontWeight: 800,
              color: "#fff8f3",
              fontFamily: "var(--font-display), system-ui, sans-serif",
            }}
          >
            {titleCaseEs(item.name)}
          </span>
          {item.portionNote && (
            <span
              style={{
                fontSize: cu(10, unit * 1.8, 42),
                color: "rgba(255, 248, 243, 0.45)",
                fontWeight: 500,
                marginLeft: "0.35em",
                display: "inline-block",
                whiteSpace: "normal",
                lineHeight: 1.2,
                verticalAlign: "middle",
                fontFamily: "var(--font-sans), system-ui, sans-serif",
              }}
            >
              ({item.portionNote})
            </span>
          )}
        </div>

        {/* Contornos + includedNote — pill badges */}
        {(item.contornos.length > 0 || item.includedNote) && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: cu(3, unit * 0.7, 16), justifyContent: "center" }}>
            {item.contornos.map((c) => (
              <span
                key={c}
                style={{
                  fontSize: cu(9, unit * 1.6, 38),
                  fontWeight: 700,
                  color: "#fff8f3",
                  background: "rgba(122, 142, 124, 0.12)",
                  border: "1px solid rgba(122, 142, 124, 0.3)",
                  borderRadius: 999,
                  padding: `${cu(1.5, unit * 0.5, 10)} ${cu(5, unit * 1.2, 28)}`,
                  whiteSpace: "nowrap" as const,
                  fontFamily: "var(--font-sans), system-ui, sans-serif",
                }}
              >
                {cleanContorno(c)}
              </span>
            ))}
            {item.includedNote && item.includedNote.split(/[,·•]+/).map((p) => p.trim()).filter(Boolean).map((p) => (
              <span
                key={p}
                style={{
                  fontSize: cu(9, unit * 1.6, 38),
                  fontWeight: 700,
                  color: "#fff8f3",
                  background: "rgba(122, 142, 124, 0.12)",
                  border: "1px solid rgba(122, 142, 124, 0.3)",
                  borderRadius: 999,
                  padding: `${cu(1.5, unit * 0.5, 10)} ${cu(5, unit * 1.2, 28)}`,
                  whiteSpace: "nowrap" as const,
                  fontFamily: "var(--font-sans), system-ui, sans-serif",
                }}
              >
                {p}
              </span>
            ))}
          </div>
        )}

        {/* Price — below text, centered */}
        {data.showPrices && (
          <div style={{ marginTop: cu(3, unit * 0.6, 16) }}>
            <PriceTag item={item} data={data} unit={unit} variant="grid" />
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────── List layout ─────────────── */

function ListLayout({
  grouped,
  data,
  hasMultipleCategories,
  reserveSlot,
  unit,
  isPortrait,
}: {
  grouped: { name: string; items: MenuBoardData["items"] }[];
  data: MenuBoardData;
  hasMultipleCategories: boolean;
  reserveSlot: boolean;
  unit: number;
  isPortrait: boolean;
}) {
  const totalRows = grouped.reduce((acc, g) => acc + g.items.length, 0);

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: totalRows <= 4 ? "center" : "flex-start",
        overflow: "hidden",
        width: isPortrait ? "90%" : "85%",
        margin: "0 auto",
      }}
    >
      {grouped.map((cat, ci) => (
        <div key={cat.name} style={{ width: "100%" }}>
          {hasMultipleCategories && (
            <div
              style={{
                width: "100%",
                fontSize: isPortrait ? cu(11, unit * 2.5, 60) : cu(10, unit * 1.8, 50),
                color: "#d6d3d1", /* text-stone-300 */
                fontWeight: 700,
                letterSpacing: "0.1em", /* tracking-widest style */
                textTransform: "uppercase",
                paddingBottom: cu(3, unit * 0.8, 18),
                marginBottom: cu(4, unit * 1.2, 24),
                marginTop: ci > 0 ? cu(8, unit * 2.5, 50) : 0,
                borderBottom: "1px solid rgba(122, 142, 124, 0.25)",
              }}
            >
              {cat.name}
            </div>
          )}
          {cat.items.map((item, idx) => (
            <ListRow
              key={item.id}
              item={item}
              data={data}
              reserveSlot={reserveSlot}
              unit={unit}
              showDivider={idx < cat.items.length - 1 || ci < grouped.length - 1}
              isPortrait={isPortrait}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function ListRow({
  item,
  data,
  reserveSlot,
  unit,
  showDivider,
  isPortrait,
}: {
  item: MenuBoardData["items"][number];
  data: MenuBoardData;
  reserveSlot: boolean;
  unit: number;
  showDivider: boolean;
  isPortrait: boolean;
}) {
  const imgSize = isPortrait
    ? cu(70, unit * 16, 360)
    : cu(55, unit * 12, 280);

  const titleFs = isPortrait
    ? cu(15, unit * 3.5, 80)
    : cu(13, unit * 2.2, 64);

  // Use list variant to keep price right aligned in grid
  const priceVariant = "list" as const;

  return (
    <div
      style={{
        borderBottom: showDivider ? "1px solid rgba(255,255,255,0.1)" : "none",
        paddingBottom: cu(4, unit * 1.2, 24),
        marginBottom: cu(4, unit * 1.2, 24),
        background: "radial-gradient(ellipse at center, rgba(255,255,255,0.03) 0%, transparent 70%)",
        borderRadius: unit * 1,
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: reserveSlot ? `${imgSize}px 1fr auto` : "1fr auto",
          gap: isPortrait ? cu(8, unit * 2.5, 56) : cu(6, unit * 1.8, 48),
          alignItems: "center",
          width: "100%",
        }}
      >
        {/* ── Columna 1: Imagen ── */}
        {reserveSlot && (
          <div
            style={{
              width: imgSize,
              height: imgSize,
              position: "relative",
              borderRadius: "50%",
            }}
          >
            {item.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.imageUrl}
                alt=""
                draggable={false}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  display: "block",
                  borderRadius: "50%",
                  filter: "drop-shadow(0 25px 25px rgba(0,0,0,0.5))", /* drop-shadow-2xl */
                  position: "relative",
                  zIndex: 1,
                }}
              />
            ) : (
              <ImageSlot item={item} unit={unit} radius={unit * 5} />
            )}
          </div>
        )}

        {/* ── Columna 2: Texto ── */}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", minWidth: 0, gap: cu(2, unit * 0.6, 14) }}>
          {/* Name + portionNote inline */}
          <div style={{ lineHeight: 1.2, overflow: "hidden" }}>
            <span
              style={{
                fontSize: titleFs,
                fontWeight: 700,
                color: "#fff8f3",
              }}
            >
              {titleCaseEs(item.name)}
            </span>
            {item.portionNote && (
              <span
                style={{
                  fontSize: cu(9, unit * 1.7, 44),
                  color: "rgba(255, 248, 243, 0.45)",
                  fontWeight: 500,
                  marginLeft: "0.35em",
                  display: "inline-block",
                  whiteSpace: "normal",
                  lineHeight: 1.2,
                  verticalAlign: "middle",
                  fontFamily: "var(--font-sans), system-ui, sans-serif",
                }}
              >
                ({item.portionNote})
              </span>
            )}
          </div>

          {/* Contornos + includedNote — pill badges */}
          {(item.contornos.length > 0 || item.includedNote) && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: cu(2, unit * 0.6, 14) }}>
              {item.contornos.map((c) => (
                <span
                  key={c}
                  style={{
                    fontSize: cu(8, unit * 1.5, 38),
                    fontWeight: 700,
                    color: "#fff8f3",
                    background: "rgba(122, 142, 124, 0.12)",
                    border: "1px solid rgba(122, 142, 124, 0.3)",
                    borderRadius: 999,
                    padding: `${cu(2, unit * 0.5, 12)} ${cu(4, unit * 1.1, 26)}`,
                    whiteSpace: "nowrap" as const,
                  }}
                >
                  {cleanContorno(c)}
                </span>
              ))}
              {item.includedNote && item.includedNote.split(/[,·•]+/).map((p) => p.trim()).filter(Boolean).map((p) => (
                <span
                  key={p}
                  style={{
                    fontSize: cu(8, unit * 1.5, 38),
                    fontWeight: 700,
                    color: "#fff8f3",
                    background: "rgba(122, 142, 124, 0.12)",
                    border: "1px solid rgba(122, 142, 124, 0.3)",
                    borderRadius: 999,
                    padding: `${cu(2, unit * 0.5, 12)} ${cu(4, unit * 1.1, 26)}`,
                    whiteSpace: "nowrap" as const,
                  }}
                >
                  {p}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ── Columna 3: Precio ── */}
        {data.showPrices && (
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "flex-end" }}>
            <PriceTag item={item} data={data} unit={unit} variant={priceVariant} />
          </div>
        )}
      </div>
    </div>
  );
}
