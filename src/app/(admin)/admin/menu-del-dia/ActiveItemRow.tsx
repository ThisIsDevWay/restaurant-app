"use client";

import Image from "next/image";
import { X, Settings2 } from "lucide-react";
import type { ContornoSelection, CatalogItem, SimpleItem } from "@/app/(admin)/admin/menu-del-dia/DailyMenu.types";

interface ActiveItemRowProps {
  item: CatalogItem;
  currentContornos: ContornoSelection[];
  availableDailyContornos: SimpleItem[];
  expandedItemId: string | null;
  onToggleExpanded: (id: string | null) => void;
  onToggleContorno: (contornoId: string, name: string) => void;
  onUpdateContornoSettings: (contornoId: string, updates: Partial<ContornoSelection>) => void;
  onRemove: (id: string) => void;
}

export function ActiveItemRow({
  item,
  currentContornos,
  availableDailyContornos,
  expandedItemId,
  onToggleExpanded,
  onToggleContorno,
  onUpdateContornoSettings,
  onRemove,
}: ActiveItemRowProps) {
  return (
    <div style={{
      background: "#fff",
      border: "1px solid #f0e6df",
      borderRadius: 14,
      padding: "10px 12px",
      display: "flex", flexDirection: "column", gap: 10,
    }}>
      {/* Top row */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={item.name}
            width={34}
            height={34}
            style={{
              width: 34, height: 34, borderRadius: 8,
              objectFit: "cover", flexShrink: 0,
              border: "1px solid #f0e6df",
            }}
          />
        ) : (
          <div style={{
            width: 34, height: 34, borderRadius: 8, flexShrink: 0,
            background: "#fff2e2", border: "1px solid #f0e6df",
          }} />
        )}
        <p style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 13, fontWeight: 700, color: "#251a07",
          flex: 1, minWidth: 0,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          margin: 0,
        }}>
          {item.name}
        </p>
        <button
          onClick={() => onRemove(item.id)}
          style={{
            width: 26, height: 26, borderRadius: 8, flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "transparent", border: "1px solid #f0e6df",
            cursor: "pointer", color: "#9c8c78",
            transition: "all 0.13s ease",
          }}
          onMouseEnter={(e) => {
            const b = e.currentTarget;
            b.style.background = "#fdeaec";
            b.style.borderColor = "#f5c5c8";
            b.style.color = "#b00020";
          }}
          onMouseLeave={(e) => {
            const b = e.currentTarget;
            b.style.background = "transparent";
            b.style.borderColor = "#f0e6df";
            b.style.color = "#9c8c78";
          }}
        >
          <X size={13} />
        </button>
      </div>

      {/* Contornos */}
      <div>
        <p style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 10, fontWeight: 700,
          color: "#9c8c78", letterSpacing: "0.07em",
          textTransform: "uppercase", margin: "0 0 7px",
        }}>
          Acompañamientos
        </p>

        {availableDailyContornos.length === 0 ? (
          <p style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 11, color: "#b00020", fontWeight: 500,
            background: "#fdeaec", border: "1px solid #f5c5c8",
            borderRadius: 8, padding: "7px 10px", margin: 0,
          }}>
            Configura primero los Contornos del día
          </p>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {availableDailyContornos.map((contorno) => {
              const selection = currentContornos.find((c) => c.id === contorno.id);
              const isSelected = !!selection;
              const isExpanded = isSelected && expandedItemId === `${item.id}-${contorno.id}`;

              return (
                <div key={contorno.id} style={{ position: "relative" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
                    <button
                      onClick={() => onToggleContorno(contorno.id, contorno.name)}
                      style={{
                        height: 26,
                        display: "flex", alignItems: "center",
                        padding: "0 10px",
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        fontSize: 11.5, fontWeight: 600,
                        borderRadius: isSelected ? "8px 0 0 8px" : 8,
                        border: `1.5px solid ${isSelected ? "#bb0005" : "#ede0d8"}`,
                        borderRight: isSelected ? "none" : undefined,
                        background: isSelected ? "#fff8f3" : "#fff",
                        color: isSelected ? "#bb0005" : "#5f5e5e",
                        cursor: "pointer",
                        transition: "all 0.13s ease",
                      }}
                    >
                      {contorno.name}
                    </button>
                    {isSelected && (
                      <button
                        onClick={() => onToggleExpanded(isExpanded ? null : `${item.id}-${contorno.id}`)}
                        style={{
                          width: 26, height: 26,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          borderRadius: "0 8px 8px 0",
                          border: `1.5px solid #bb0005`,
                          borderLeft: "none",
                          background: isExpanded ? "#bb0005" : "#fff8f3",
                          color: isExpanded ? "#fff" : "#bb0005",
                          cursor: "pointer",
                          transition: "all 0.13s ease",
                        }}
                      >
                        <Settings2 size={12} />
                      </button>
                    )}
                  </div>

                  {/* Settings popup */}
                  {isExpanded && (
                    <>
                      <div
                        style={{ position: "fixed", inset: 0, zIndex: 40 }}
                        onClick={() => onToggleExpanded(null)}
                      />
                      <div style={{
                        position: "absolute", top: "calc(100% + 6px)", left: 0,
                        zIndex: 50, width: 200,
                        background: "#fff", border: "1px solid #f0e6df",
                        borderRadius: 14, padding: "12px 14px",
                        boxShadow: "0 8px 24px rgba(37,26,7,0.10)",
                      }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                          <span style={{
                            fontFamily: "'Plus Jakarta Sans', sans-serif",
                            fontSize: 11, fontWeight: 700, color: "#251a07",
                          }}>
                            {contorno.name}
                          </span>
                          <button
                            onClick={() => onToggleExpanded(null)}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "#9c8c78", padding: 0 }}
                          >
                            <X size={13} />
                          </button>
                        </div>

                        {/* Intercambiable toggle */}
                        <div style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          padding: "8px 10px",
                          background: "#fff8f3", borderRadius: 9,
                          border: "1px solid #f0e6df",
                          marginBottom: 10,
                        }}>
                          <span style={{
                            fontFamily: "'Plus Jakarta Sans', sans-serif",
                            fontSize: 11, fontWeight: 600, color: "#5f5e5e",
                          }}>
                            Intercambiable
                          </span>
                          <div
                            style={{
                              width: 34, height: 19, borderRadius: 100,
                              background: selection!.removable ? "#bb0005" : "#d4c5bc",
                              position: "relative", cursor: "pointer",
                              transition: "background 0.2s ease", flexShrink: 0,
                            }}
                            onClick={() => onUpdateContornoSettings(contorno.id, { removable: !selection!.removable })}
                          >
                            <div style={{
                              position: "absolute", top: 2.5,
                              left: selection!.removable ? 17 : 2,
                              width: 14, height: 14, borderRadius: "50%",
                              background: "#fff",
                              boxShadow: "0 1px 3px rgba(0,0,0,0.18)",
                              transition: "left 0.18s ease",
                            }} />
                          </div>
                        </div>

                        {selection!.removable && (
                          <div>
                            <p style={{
                              fontFamily: "'Plus Jakarta Sans', sans-serif",
                              fontSize: 10, fontWeight: 700, color: "#9c8c78",
                              letterSpacing: "0.07em", textTransform: "uppercase",
                              margin: "0 0 7px",
                            }}>
                              Sustitutos
                            </p>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                              {availableDailyContornos
                                .filter((c) => c.id !== contorno.id)
                                .map((sub) => {
                                  const isSub = selection!.substituteContornoIds?.includes(sub.id);
                                  return (
                                    <button
                                      key={sub.id}
                                      onClick={() => {
                                        const newSubs = isSub
                                          ? selection!.substituteContornoIds.filter((id) => id !== sub.id)
                                          : [...(selection!.substituteContornoIds || []), sub.id];
                                        onUpdateContornoSettings(contorno.id, { substituteContornoIds: newSubs });
                                      }}
                                      style={{
                                        padding: "3px 9px",
                                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                                        fontSize: 11, fontWeight: 600,
                                        borderRadius: 100,
                                        border: `1.5px solid ${isSub ? "#bb0005" : "#ede0d8"}`,
                                        background: isSub ? "#bb0005" : "#fff8f3",
                                        color: isSub ? "#fff" : "#5f5e5e",
                                        cursor: "pointer",
                                        transition: "all 0.13s ease",
                                      }}
                                    >
                                      {sub.name}
                                    </button>
                                  );
                                })}
                            </div>
                            {(!selection!.substituteContornoIds || selection!.substituteContornoIds.length === 0) && (
                              <p style={{
                                fontFamily: "'Plus Jakarta Sans', sans-serif",
                                fontSize: 10, color: "#9c8c78",
                                fontStyle: "italic", marginTop: 6,
                              }}>
                                Cualquiera del día
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}