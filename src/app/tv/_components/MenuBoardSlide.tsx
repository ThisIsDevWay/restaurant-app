"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import type { MenuBoardData } from "../_types";
export type { MenuBoardData };
import { cu } from "./SlideComponents";
import { PortraitLayout } from "./PortraitLayout";
import { GridLayout } from "./GridLayout";
import { ListLayout } from "./ListLayout";

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
    if (data.layout === "grid2") {
      if (n <= 1) return n;
      return 2;
    }
    if (n <= 2) return n;
    return 3;
  }, [data.layout, isList, isPortrait, n]);

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
        @keyframes tv-plate-pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.02); }
          100% { transform: scale(1); }
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
