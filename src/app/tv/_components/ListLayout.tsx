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
  spacingFactor = 1.0,
}: {
  item: MenuBoardData["items"][number];
  data: MenuBoardData;
  reserveSlot: boolean;
  unit: number;
  showDivider: boolean;
  isPortrait: boolean;
  spacingFactor?: number;
}) {
  const imgSize = isPortrait
    ? cu(72, unit * 7.5, 200)
    : cu(35, unit * 6.5, 140);

  const titleFs = isPortrait
    ? cu(15, unit * 3.5, 80)
    : cu(13, unit * 2.2, 64);

  // Use list variant to keep price right aligned in grid
  const priceVariant = "list" as const;

  const rowPadding = isPortrait
    ? (reserveSlot ? cu(4, unit * 1.0 * spacingFactor, 30) : cu(8, unit * 2.0 * spacingFactor, 50))
    : (reserveSlot ? cu(2, unit * 0.5, 12) : cu(4, unit * 1.0, 24));

  const rowMargin = isPortrait
    ? (reserveSlot ? cu(4, unit * 1.0 * spacingFactor, 30) : cu(8, unit * 2.0 * spacingFactor, 50))
    : (reserveSlot ? cu(2, unit * 0.5, 12) : cu(4, unit * 1.0, 24));

  return (
    <div
      style={{
        borderBottom: showDivider ? "1px solid rgba(255,255,255,0.1)" : "none",
        paddingBottom: rowPadding,
        marginBottom: rowMargin,
        background: "radial-gradient(ellipse at center, rgba(255,255,255,0.03) 0%, transparent 70%)",
        borderRadius: unit * 1,
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: reserveSlot ? `${imgSize} 1fr` : "1fr",
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

        {/* ── Columna 2: Contenido Completo (Name, Dots, Price, Description, Contornos) ── */}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", minWidth: 0, gap: cu(2, unit * 0.4, 10) }}>
          {/* Fila superior: Nombre + Conector de Puntos + Precio */}
          <div style={{ display: "flex", alignItems: "baseline", width: "100%", justifyContent: "space-between", gap: cu(2, unit * 0.5, 12) }}>
            <div style={{ display: "flex", alignItems: "baseline", flexShrink: 1, minWidth: 0 }}>
              <span
                style={{
                  fontSize: titleFs,
                  fontWeight: 700,
                  color: "#fff8f3",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {titleCaseEs(item.name)}
              </span>
              {item.portionNote && (
                <span
                  style={{
                    fontSize: cu(9, unit * 1.5, 40),
                    color: "rgba(255, 248, 243, 0.45)",
                    fontWeight: 500,
                    marginLeft: "0.35em",
                    display: "inline-block",
                    whiteSpace: "nowrap",
                    verticalAlign: "middle",
                    fontFamily: "var(--font-sans), system-ui, sans-serif",
                  }}
                >
                  ({item.portionNote})
                </span>
              )}
            </div>
            {data.showPrices && (
              <>
                <div style={{ flex: 1, borderBottom: "2px dotted rgba(226, 194, 160, 0.15)", margin: `0 ${cu(3, unit * 0.8, 18)}`, alignSelf: "center", minWidth: 16 }} />
                <PriceTag item={item} data={data} unit={unit} variant={priceVariant} />
              </>
            )}
          </div>

          {/* Fila 2: Descripción (si está activada en la config de la pantalla) */}
          {data.showDescriptions && item.description && (
            <p
              style={{
                fontSize: isPortrait ? cu(11, unit * 2.2, 50) : cu(9, unit * 1.5, 36),
                color: "rgba(255, 248, 243, 0.65)",
                margin: 0,
                lineHeight: 1.2,
                overflow: "hidden",
                textOverflow: "ellipsis",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                fontFamily: "var(--font-sans), system-ui, sans-serif",
              }}
            >
              {item.description}
            </p>
          )}

          {/* Fila 3: Contornos y Acompañantes */}
          {(item.contornos.length > 0 || item.includedNote) && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: cu(2, unit * 0.5, 12), marginTop: cu(1, unit * 0.2, 6) }}>
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
  const spacingFactor = isPortrait
    ? Math.max(1.2, Math.min(3.5, 4.0 - totalRows * 0.25))
    : 1.0;

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: isPortrait ? "flex-start" : "center",
        overflow: "hidden",
        width: isPortrait ? "90%" : "85%",
        margin: "0 auto",
        paddingTop: isPortrait ? cu(10, unit * 3, 60) : 0,
      }}
    >
      {grouped.map((cat, ci) => (
        <div key={cat.name} style={{ width: "100%" }}>
          {true && (
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
              spacingFactor={spacingFactor}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
