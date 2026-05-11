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
    imageUrl: string | null;
    priceUsdCents: number;
    categoryId: string;
    categoryName: string;
  }>;
};

/* ─────────────── Formatters ─────────────── */

const USD_FMT = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

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
  const usd = USD_FMT.format(item.priceUsdCents / 100);
  const bs = fmtBs(item.priceUsdCents, data.rateBsPerUsd);

  // Primary price size and secondary (Bs) size per variant.
  const [mainFs, subFs] = {
    grid:     [cu(12, unit * 1.75, 60), cu(10, unit * 1.15, 40)],
    list:     [cu(14, unit * 2.2,  72), cu(11, unit * 1.4,  46)],
    portrait: [cu(16, unit * 3.6, 100), cu(12, unit * 2.2,  64)],
  }[variant];

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 1, lineHeight: 1.05, flexShrink: 0 }}>
      {(data.currency === "usd" || data.currency === "both") && (
        <span style={{ color: "#f59e0b", fontWeight: 800, fontSize: mainFs, fontVariantNumeric: "tabular-nums" }}>
          {usd}
        </span>
      )}
      {(data.currency === "ves" || data.currency === "both") && bs && (
        <span
          style={{
            color: data.currency === "both" ? "rgba(255,255,255,0.6)" : "#f59e0b",
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
    const measure = () => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) setBox({ w: r.width, h: r.height });
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
    if (n <= 6) return 3;
    return 4;
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
        background: "radial-gradient(ellipse at top, #1a1208 0%, #0a0604 60%, #000 100%)",
        color: "#fff",
        fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
        padding: pad,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      {/* ── Header ── */}
      <div style={{ textAlign: "center", marginBottom: cu(4, unit * 2, 48), flexShrink: 0 }}>
        <div
          style={{
            fontSize: cu(8, unit * 1.1, 32),
            color: "#f59e0b",
            letterSpacing: "0.4em",
            textTransform: "uppercase",
            fontWeight: 600,
            marginBottom: cu(2, unit * 0.5, 12),
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
            background: "linear-gradient(180deg, #fff 0%, #fcd34d 60%, #f59e0b 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          {data.title}
        </h1>
        {data.subtitle && (
          <div
            style={{
              fontSize: cu(11, unit * 1.9, 56),
              color: "rgba(255,255,255,0.7)",
              marginTop: cu(2, unit * 0.6, 16),
              fontWeight: 300,
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
        ) : isPortrait ? (
          <PortraitLayout grouped={grouped} data={data} hasMultipleCategories={hasMultipleCategories} unit={unit} />
        ) : isList ? (
          <ListLayout grouped={grouped} data={data} hasMultipleCategories={hasMultipleCategories} reserveSlot={reserveSlot} unit={unit} />
        ) : (
          <GridLayout grouped={grouped} data={data} hasMultipleCategories={hasMultipleCategories} reserveSlot={reserveSlot} cols={cols} unit={unit} />
        )}
      </div>

      {/* ── Footer ── */}
      <div style={{ flexShrink: 0, marginTop: cu(4, unit * 1.2, 32), display: "flex", alignItems: "center", justifyContent: "center", gap: cu(8, unit * 2, 48) }}>
        {data.showPrices && (data.currency === "both" || data.currency === "ves") && data.rateBsPerUsd != null && (
          <div style={{ fontSize: cu(8, unit * 1.0, 28), color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em" }}>
            Tasa: 1 USD = Bs {BS_FMT.format(data.rateBsPerUsd)}
          </div>
        )}
        {multiPage && (
          <div style={{ display: "flex", alignItems: "center", gap: cu(3, unit * 0.45, 12) }}>
            {Array.from({ length: data.totalPages }, (_, i) => (
              <div
                key={i}
                style={{
                  width:  i === data.pageIndex ? cu(12, unit * 1.8, 52) : cu(4, unit * 0.65, 18),
                  height: cu(4, unit * 0.65, 18),
                  borderRadius: 999,
                  background: i === data.pageIndex ? "#f59e0b" : "rgba(255,255,255,0.22)",
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
    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: cu(6, unit * 1.5, 40), overflow: "hidden" }}>
      {hasMultipleCategories && (
        <div style={{ flexShrink: 0, display: "flex", gap: cu(8, unit * 2, 48), flexWrap: "wrap" }}>
          {grouped.map((g) => (
            <div
              key={g.name}
              style={{
                fontSize: cu(9, unit * 1.5, 42),
                color: "#f59e0b",
                fontWeight: 700,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                borderBottom: "1px solid rgba(245,158,11,0.35)",
                paddingBottom: "0.3em",
              }}
            >
              {g.name}
            </div>
          ))}
        </div>
      )}
      {flat.map(({ item, idx }) => (
        <PortraitRow key={item.id} item={item} data={data} imageLeft={idx % 2 === 0} unit={unit} />
      ))}
    </div>
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
  const pad = cu(6, unit * 3, 80);

  const imgSlot = (
    <div style={{ flex: "0 0 38%", minWidth: 0, minHeight: 0 }}>
      <ImageSlot item={item} unit={unit} radius={unit * 1.2} />
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
        gap: cu(4, unit * 0.8, 20),
        paddingLeft: imageLeft ? pad : "0",
        paddingRight: imageLeft ? "0" : pad,
      }}
    >
      <div
        style={{
          fontSize: cu(14, unit * 3.8, 110),
          fontWeight: 700,
          color: "#fff",
          lineHeight: 1.15,
          overflow: "hidden",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
        }}
      >
        {item.name}
      </div>
      {data.showDescriptions && item.description && (
        <div
          style={{
            fontSize: cu(10, unit * 2.2, 64),
            color: "rgba(255,255,255,0.58)",
            lineHeight: 1.35,
            fontWeight: 300,
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
          }}
        >
          {item.description}
        </div>
      )}
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
                color: "#f59e0b",
                fontWeight: 700,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                borderBottom: "1px solid rgba(245,158,11,0.35)",
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
    <div style={{ display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden", gap: cu(3, unit * 0.6, 16) }}>
      {reserveSlot && (
        <div style={{ flex: 1, minHeight: 0 }}>
          <ImageSlot item={item} unit={unit} radius={unit * 0.9} />
        </div>
      )}
      <div style={{ flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: cu(4, unit * 0.8, 20) }}>
          <span
            style={{
              fontSize: cu(11, unit * 1.75, 52),
              fontWeight: 700,
              color: "#fff",
              lineHeight: 1.15,
              minWidth: 0,
              flex: 1,
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            {item.name}
          </span>
          {data.showPrices && <PriceTag item={item} data={data} unit={unit} variant="grid" />}
        </div>
        {data.showDescriptions && item.description && (
          <div
            style={{
              fontSize: cu(9, unit * 1.15, 34),
              color: "rgba(255,255,255,0.52)",
              lineHeight: 1.3,
              fontWeight: 300,
              marginTop: cu(2, unit * 0.25, 8),
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {item.description}
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
}: {
  grouped: { name: string; items: MenuBoardData["items"] }[];
  data: MenuBoardData;
  hasMultipleCategories: boolean;
  reserveSlot: boolean;
  unit: number;
}) {
  const totalRows = grouped.reduce(
    (acc, g) => acc + g.items.length + (hasMultipleCategories ? 0.5 : 0),
    0,
  );

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: cu(4, unit * 1, 28), overflow: "hidden" }}>
      {grouped.map((cat) => (
        <div key={cat.name} style={{ display: "contents" }}>
          {hasMultipleCategories && (
            <div
              style={{
                flexShrink: 0,
                fontSize: cu(9, unit * 1.5, 42),
                color: "#f59e0b",
                fontWeight: 700,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                borderBottom: "1px solid rgba(245,158,11,0.3)",
                paddingBottom: "0.3em",
              }}
            >
              {cat.name}
            </div>
          )}
          {cat.items.map((item) => (
            <ListRow key={item.id} item={item} data={data} reserveSlot={reserveSlot} unit={unit} totalRows={totalRows} />
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
  totalRows,
}: {
  item: MenuBoardData["items"][number];
  data: MenuBoardData;
  reserveSlot: boolean;
  unit: number;
  totalRows: number;
}) {
  const imgSize = cu(40, unit * 8, 220);

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", gap: cu(8, unit * 2, 52), overflow: "hidden" }}>
      {reserveSlot && (
        <div style={{ flexShrink: 0, width: imgSize, height: imgSize }}>
          <ImageSlot item={item} unit={unit} radius={unit * 0.8} />
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
        <div
          style={{
            fontSize: cu(13, unit * 2.1, 64),
            fontWeight: 700,
            color: "#fff",
            lineHeight: 1.2,
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
          }}
        >
          {item.name}
        </div>
        {data.showDescriptions && item.description && (
          <div
            style={{
              fontSize: cu(9, unit * 1.3, 38),
              color: "rgba(255,255,255,0.55)",
              marginTop: cu(2, unit * 0.25, 8),
              lineHeight: 1.35,
              fontWeight: 300,
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: totalRows <= 6 ? 2 : 1,
              WebkitBoxOrient: "vertical",
            }}
          >
            {item.description}
          </div>
        )}
      </div>
      {/* Dotted leader */}
      <div
        style={{ flex: "0 1 5%", borderBottom: `${Math.max(1, unit * 0.15)}px dotted rgba(255,255,255,0.13)`, alignSelf: "center", minWidth: cu(12, unit * 1.5, 40) }}
        aria-hidden
      />
      {data.showPrices && <PriceTag item={item} data={data} unit={unit} variant="list" />}
    </div>
  );
}
