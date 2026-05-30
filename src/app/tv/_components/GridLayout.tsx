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

export function GridCell({
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

export function GridLayout({
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
