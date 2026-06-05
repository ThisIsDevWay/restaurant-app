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

export function PortraitRow({
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
  const gap = data.layout === "grid2" ? cu(14, unit * 4, 100) : cu(10, unit * 3, 80);

  // Render image directly — no wrapper box, no dark background, no clipping.
  // The food photography blends naturally into the dark page gradient.
  const imgSlot = (
    <div
      style={{
        flex: data.layout === "grid2" ? "0 0 58%" : "0 0 60%",
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
            animation: "tv-plate-pulse 6s ease-in-out infinite",
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
        gap: data.layout === "grid2" ? cu(10, unit * 3.6, 96) : cu(6, unit * 2.6, 64),
      }}
    >
      {/* Info group — name, portion, contornos kept tight together */}
      <div style={{ display: "flex", flexDirection: "column", gap: data.layout === "grid2" ? cu(5, unit * 2.0, 48) : cu(3, unit * 1.4, 34) }}>
        {/* Dish name + portionNote inline */}
        <div style={{ lineHeight: 1.06 }}>
          <span
            style={{
              fontSize: data.layout === "grid2" ? cu(22, unit * 5.8, 160) : cu(20, unit * 5.2, 150),
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
                fontSize: data.layout === "grid2" ? cu(12, unit * 2.6, 68) : cu(11, unit * 2.4, 62),
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
          <div style={{ display: "flex", flexWrap: "wrap", gap: data.layout === "grid2" ? cu(4, unit * 1.2, 28) : cu(3, unit * 0.9, 20) }}>
            {item.contornos.map((c) => (
              <span
                key={c}
                style={{
                  fontSize: data.layout === "grid2" ? cu(11, unit * 2.3, 56) : cu(9, unit * 1.9, 48),
                  fontWeight: 700,
                  color: "#fff8f3",
                  background: "rgba(122, 142, 124, 0.12)",
                  border: "1px solid rgba(122, 142, 124, 0.3)",
                  borderRadius: 999,
                  padding: data.layout === "grid2"
                    ? `${cu(3, unit * 0.8, 18)} ${cu(7, unit * 1.8, 40)}`
                    : `${cu(2, unit * 0.6, 14)} ${cu(5, unit * 1.4, 32)}`,
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
                  fontSize: data.layout === "grid2" ? cu(11, unit * 2.3, 56) : cu(9, unit * 1.9, 48),
                  fontWeight: 700,
                  color: "#fff8f3",
                  background: "rgba(122, 142, 124, 0.12)",
                  border: "1px solid rgba(122, 142, 124, 0.3)",
                  borderRadius: 999,
                  padding: data.layout === "grid2"
                    ? `${cu(3, unit * 0.8, 18)} ${cu(7, unit * 1.8, 40)}`
                    : `${cu(2, unit * 0.6, 14)} ${cu(5, unit * 1.4, 32)}`,
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

export function PortraitLayout({
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
  );
}
