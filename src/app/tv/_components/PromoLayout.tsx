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

export function PromoLayout({
  data,
  unit,
  isPortrait,
}: {
  data: MenuBoardData;
  unit: number;
  isPortrait: boolean;
}) {
  const item = data.items[0];
  if (!item) return null;

  const showImages = data.showImages;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        minHeight: 0,
        boxSizing: "border-box",
      }}
    >
      {/* "Plato del Día" Indicator (below standard header) */}
      {isPortrait && (
        <div
          style={{
            width: "100%",
            textAlign: "center",
            marginBottom: cu(4, unit * 1.0, 32),
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: cu(26, unit * 6.5, 200),
              fontWeight: 900,
              color: "#e2c2a0",
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              fontFamily: "var(--font-display), system-ui, sans-serif",
            }}
          >
            Plato del Día
          </span>
        </div>
      )}

      {/* Main Content Area */}
      <div style={{ flex: 1, minHeight: 0 }}>
        {isPortrait ? (
          // ── Portrait Layout (stacked) ──
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: "100%",
              height: "100%",
              gap: cu(4, unit * 1.0, 40),
              boxSizing: "border-box",
            }}
          >
            {/* Top: Image (64% height) */}
            {showImages && (
              <div
                style={{
                  height: "64%",
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                  flexShrink: 0,
                  // TÉCNICA: Margen negativo dinámico abajo para "absorber" descripciones largas
                  marginBottom: cu(-15, unit * -3, -40),
                }}
              >
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.imageUrl}
                    alt=""
                    draggable={false}
                    style={{
                      width: "100%", // Obliga a usar todo el ancho
                      height: "100%",
                      maxHeight: "none",
                      maxWidth: "none",
                      objectFit: "cover", // Llena el ancho sin deformar el plato
                      display: "block",
                      filter: "drop-shadow(0 15px 25px rgba(0,0,0,0.6))",
                      transform: `translateY(-${unit * 1.5}px)`,
                    }}
                  />
                ) : (
                  <div style={{ width: "98%", height: "100%", position: "relative", transform: `translateY(-${unit * 1.5}px)` }}>
                    <ImageSlot item={item} unit={unit} radius={unit * 2} />
                  </div>
                )}
              </div>
            )}

            {/* Bottom: Details (36% height) */}
            <div
              style={{
                height: showImages ? "36%" : "100%",
                width: "100%",
                display: "flex",
                flexDirection: "column",
                gap: cu(4, unit * 1.0, 32),
                justifyContent: "flex-start", // Obliga a los textos a ir hacia arriba
                textAlign: "center",
                alignItems: "center",
                padding: `0 ${cu(10, unit * 2.5, 80)}`,
                boxSizing: "border-box",
              }}
            >
              {/* Category (Reducido) */}
              <div
                style={{
                  fontSize: cu(12, unit * 3.0, 110),
                  color: "#e2c2a0",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.24em",
                  lineHeight: 1.1,
                  marginBottom: cu(2, unit * 0.5, 16),
                }}
              >
                {item.categoryName}
              </div>

              {/* Name */}
              <div style={{ lineHeight: 1.15 }}>
                <span
                  style={{
                    fontSize: cu(28, unit * 6.5, 190),
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
                      fontSize: cu(13, unit * 2.8, 80),
                      color: "#e2c2a0",
                      fontWeight: 600,
                      marginLeft: cu(4, unit * 1.0, 32),
                      fontStyle: "italic",
                    }}
                  >
                    ({item.portionNote.toLowerCase()})
                  </span>
                )}
              </div>

              {/* Description (Optimizado para varias líneas) */}
              {data.showDescriptions && item.description && (
                <div
                  style={{
                    borderTop: "1px solid rgba(226, 194, 160, 0.2)",
                    borderBottom: "1px solid rgba(226, 194, 160, 0.2)",
                    padding: `${cu(3, unit * 0.8, 24)} 0`,
                    margin: `${cu(1, unit * 0.3, 12)} 0`,
                    maxWidth: "85%",
                  }}
                >
                  <p
                    style={{
                      fontSize: cu(16, unit * 3.6, 110),
                      color: "rgba(255, 248, 243, 0.75)",
                      lineHeight: 1.4, // Interlineado más compacto
                      letterSpacing: "0.02em",
                      margin: 0,
                      fontWeight: 300,
                      fontStyle: "italic",
                      fontFamily: "var(--font-serif), Georgia, serif",
                      textAlign: "center",
                    }}
                  >
                    &quot;{item.description}&quot;
                  </p>
                </div>
              )}

              {/* Price */}
              {data.showPrices && (
                <div style={{ transform: "scale(1.35)", margin: `${cu(1, unit * 0.3, 12)} 0` }}>
                  <PriceTag item={item} data={data} unit={unit} variant="portrait" />
                </div>
              )}

              {/* Included Note */}
              {item.includedNote && (
                <div
                  style={{
                    fontSize: cu(13, unit * 2.8, 80),
                    color: "#b85b35",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    marginTop: 0,
                  }}
                >
                  {item.includedNote}
                </div>
              )}

              {/* Contornos/Sides */}
              {item.contornos.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: cu(4, unit * 0.9, 28),
                    justifyContent: "center",
                    marginTop: cu(1, unit * 0.3, 12),
                  }}
                >
                  {item.contornos.map((name) => (
                    <span
                      key={name}
                      style={{
                        fontSize: cu(11, unit * 2.4, 70),
                        fontWeight: 700,
                        color: "#e2c2a0",
                        background: "rgba(226, 194, 160, 0.08)",
                        border: "1px solid rgba(226, 194, 160, 0.15)",
                        padding: `${cu(2, unit * 0.5, 16)} ${cu(4, unit * 1.0, 32)}`,
                        borderRadius: unit * 0.8,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      {cleanContorno(name)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          // ── Landscape Layout (split screen) ──
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              width: "100%",
              height: "100%",
              alignItems: "stretch",
              gap: cu(10, unit * 2.5, 80),
              boxSizing: "border-box",
              padding: `0 ${cu(8, unit * 2.0, 64)}`,
            }}
          >
            {/* Left Column */}
            {showImages && (
              <div
                style={{
                  flex: 1.8,
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "flex-start",
                  position: "relative",
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    marginBottom: cu(4, unit * 1.0, 32),
                    flexShrink: 0,
                    textAlign: "center",
                    zIndex: 2,
                  }}
                >
                  <span
                    style={{
                      fontSize: cu(18, unit * 4.5, 200),
                      fontWeight: 900,
                      color: "#e2c2a0",
                      letterSpacing: "0.28em",
                      textTransform: "uppercase",
                      fontFamily: "var(--font-display), system-ui, sans-serif",
                    }}
                  >
                    Plato del Día
                  </span>
                </div>

                <div
                  style={{
                    flex: 1,
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                    minHeight: 0,
                  }}
                >
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt=""
                      draggable={false}
                      style={{
                        maxHeight: "100%",
                        maxWidth: "100%",
                        objectFit: "contain",
                        display: "block",
                        filter: "drop-shadow(0 15px 25px rgba(0,0,0,0.6))",
                        transform: `translateY(-${unit * 2}px) scale(1.2)`,
                        transformOrigin: "center center",
                      }}
                    />
                  ) : (
                    <div style={{ width: "98%", height: "98%", position: "relative", transform: `translateY(-${unit * 2}px) scale(1.2)`, transformOrigin: "center center" }}>
                      <ImageSlot item={item} unit={unit} radius={unit * 2} />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Right Column */}
            <div
              style={{
                flex: 1,
                height: "100%",
                display: "flex",
                flexDirection: "column",
                gap: cu(6, unit * 1.4, 48),
                alignItems: "flex-start",
                justifyContent: "flex-start",
                paddingTop: cu(2, unit * 0.5, 16),
                boxSizing: "border-box",
                minWidth: 0,
              }}
            >
              {!showImages && (
                <div style={{ marginBottom: cu(4, unit * 1.0, 32) }}>
                  <span
                    style={{
                      fontSize: cu(26, unit * 6.5, 200),
                      fontWeight: 900,
                      color: "#e2c2a0",
                      letterSpacing: "0.28em",
                      textTransform: "uppercase",
                      fontFamily: "var(--font-display), system-ui, sans-serif",
                    }}
                  >
                    Plato del Día
                  </span>
                </div>
              )}

              <div
                style={{
                  fontSize: cu(12, unit * 3.0, 110),
                  color: "#e2c2a0",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.24em",
                  lineHeight: 1.1,
                  marginBottom: cu(6, unit * 1.5, 40),
                }}
              >
                {item.categoryName}
              </div>

              <div style={{ lineHeight: 1.1 }}>
                <h2
                  style={{
                    fontSize: cu(30, unit * 7.2, 220),
                    fontWeight: 800,
                    color: "#fff8f3",
                    fontFamily: "var(--font-display), system-ui, sans-serif",
                    margin: 0,
                    display: "inline",
                  }}
                >
                  {titleCaseEs(item.name)}
                </h2>
                {item.portionNote && (
                  <span
                    style={{
                      fontSize: cu(15, unit * 3.4, 100),
                      color: "#e2c2a0",
                      fontWeight: 600,
                      marginLeft: cu(4, unit * 1.0, 32),
                      fontStyle: "italic",
                    }}
                  >
                    ({item.portionNote.toLowerCase()})
                  </span>
                )}
              </div>

              {data.showDescriptions && item.description && (
                <div
                  style={{
                    borderLeft: "2px solid rgba(226, 194, 160, 0.4)",
                    paddingLeft: cu(6, unit * 1.5, 48),
                    margin: `${cu(8, unit * 2.0, 48)} 0`,
                    maxWidth: "95%",
                  }}
                >
                  <p
                    style={{
                      fontSize: cu(15, unit * 3.4, 96),
                      color: "rgba(255, 248, 243, 0.75)",
                      lineHeight: 1.6,
                      letterSpacing: "0.02em",
                      margin: 0,
                      fontWeight: 300,
                      fontStyle: "italic",
                      fontFamily: "var(--font-serif), Georgia, serif",
                    }}
                  >
                    &quot;{item.description}&quot;
                  </p>
                </div>
              )}

              {data.showPrices && (
                <div style={{ transform: "scale(1.45)", transformOrigin: "left center", margin: `${cu(2, unit * 0.5, 16)} 0` }}>
                  <PriceTag item={item} data={data} unit={unit} variant="portrait" />
                </div>
              )}

              {item.includedNote && (
                <div
                  style={{
                    fontSize: cu(13, unit * 3.0, 90),
                    color: "#b85b35",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    marginTop: cu(1, unit * 0.2, 8),
                  }}
                >
                  {item.includedNote}
                </div>
              )}

              {item.contornos.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: cu(3, unit * 0.8, 24),
                    marginTop: cu(3, unit * 0.8, 24),
                  }}
                >
                  {item.contornos.map((name) => (
                    <span
                      key={name}
                      style={{
                        fontSize: cu(12, unit * 2.6, 76),
                        fontWeight: 700,
                        color: "#e2c2a0",
                        background: "rgba(226, 194, 160, 0.08)",
                        border: "1px solid rgba(226, 194, 160, 0.15)",
                        padding: `${cu(1.5, unit * 0.4, 12)} ${cu(3, unit * 0.8, 24)}`,
                        borderRadius: unit * 0.8,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      {cleanContorno(name)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}