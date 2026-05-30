"use client";

import React from "react";
import type { MenuBoardData } from "../_types";
import {
  cu,
  titleCaseEs,
  cleanContorno,
  ImageSlot,
  PriceTag,
} from "./SlideComponents";

export function ListRow({
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

export function ListLayout({
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
