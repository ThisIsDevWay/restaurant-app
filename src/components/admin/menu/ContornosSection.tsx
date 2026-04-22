"use client";

import { formatRef } from "@/lib/money";
import type { ContornoSelection } from "./MenuItemForm.types";

interface ContornosSectionProps {
  allContornos: { id: string; name: string; priceUsdCents: number; isAvailable: boolean }[];
  selectedContornos: ContornoSelection[];
  onToggle: (contorno: { id: string; name: string }) => void;
  onToggleRemovable: (id: string) => void;
  onToggleSubstitute: (contornoId: string, subId: string) => void;
}

export function ContornosSection({
  allContornos,
  selectedContornos,
  onToggle,
  onToggleRemovable,
  onToggleSubstitute,
}: ContornosSectionProps) {
  return (
    <>
      <style>{`
        .cs-card {
          background: #fff8f3;
          border: 1.5px solid #ede0d8;
          border-radius: 14px;
          padding: 14px 16px;
          cursor: pointer;
          transition: border-color 0.15s ease, background 0.15s ease;
          user-select: none;
        }
        .cs-card:hover { border-color: #d4a99f; }
        .cs-card-active {
          background: #fff;
          border-color: #bb0005 !important;
        }

        .cs-radio {
          width: 18px; height: 18px; border-radius: 50%; flex-shrink: 0;
          border: 2px solid #d4a99f;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.15s ease; margin-top: 1px;
        }
        .cs-radio-active {
          border-color: #bb0005;
          background: #bb0005;
        }
        .cs-radio-dot {
          width: 6px; height: 6px; border-radius: 50%; background: #fff;
        }

        .cs-name {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 13.5px; font-weight: 600;
          color: #251a07; line-height: 1.3;
        }
        .cs-price {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 11.5px; font-weight: 500;
          color: #9c8c78; margin-top: 2px;
        }

        .cs-expand {
          margin-top: 14px; padding-top: 14px;
          border-top: 1px solid #f0e6df;
        }

        .cs-micro-label {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 10px; font-weight: 700;
          letter-spacing: 0.08em; text-transform: uppercase;
          color: #9c8c78;
        }

        .cs-toggle-track {
          width: 34px; height: 19px; border-radius: 100px;
          transition: background 0.2s ease; flex-shrink: 0;
          position: relative; cursor: pointer;
        }
        .cs-toggle-thumb {
          position: absolute; top: 2.5px;
          width: 14px; height: 14px; border-radius: 50%;
          background: #fff;
          transition: left 0.18s ease;
          box-shadow: 0 1px 3px rgba(0,0,0,0.18);
        }

        .cs-sub-pill {
          padding: 4px 10px;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 11px; font-weight: 600;
          border-radius: 100px;
          border: 1px solid #ede0d8;
          background: #fff8f3;
          color: #5f5e5e;
          cursor: pointer;
          transition: all 0.13s ease;
          white-space: nowrap;
        }
        .cs-sub-pill:hover { border-color: #bb0005; color: #bb0005; }
        .cs-sub-pill-active {
          background: #bb0005 !important;
          border-color: #bb0005 !important;
          color: #fff !important;
        }
      `}</style>

      <div>
        <div style={{ marginBottom: 16 }}>
          <p style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 13, fontWeight: 600, color: "#5f5e5e",
          }}>
            Contornos
          </p>
          <p style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 12, color: "#9c8c78", marginTop: 2,
          }}>
            Selecciona los acompañamientos disponibles para este plato
          </p>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: 10,
        }}>
          {allContornos.map((contorno) => {
            const selected = selectedContornos.find((c) => c.id === contorno.id);
            const isSelected = !!selected;

            return (
              <div
                key={contorno.id}
                className={`cs-card ${isSelected ? "cs-card-active" : ""}`}
                onClick={() => onToggle(contorno)}
              >
                {/* Top row */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <div className={`cs-radio ${isSelected ? "cs-radio-active" : ""}`}>
                    {isSelected && <div className="cs-radio-dot" />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="cs-name">{contorno.name}</p>
                    <p className="cs-price">{formatRef(contorno.priceUsdCents)}</p>
                  </div>
                  {/* Availability dot */}
                  <div style={{
                    width: 7, height: 7, borderRadius: "50%", flexShrink: 0, marginTop: 4,
                    background: contorno.isAvailable ? "#1a7a45" : "#b00020",
                  }} />
                </div>

                {/* Expanded options */}
                {isSelected && (
                  <div
                    className="cs-expand"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Intercambiable toggle */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span className="cs-micro-label">Intercambiable</span>
                      <div
                        className="cs-toggle-track"
                        style={{ background: selected.removable ? "#bb0005" : "#d4c5bc" }}
                        onClick={() => onToggleRemovable(contorno.id)}
                      >
                        <div
                          className="cs-toggle-thumb"
                          style={{ left: selected.removable ? 17 : 2 }}
                        />
                      </div>
                    </div>

                    {/* Substitutes */}
                    {selected.removable && (
                      <div style={{ marginTop: 12 }}>
                        <p className="cs-micro-label" style={{ marginBottom: 8 }}>Sustitutos</p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {allContornos
                            .filter((c) => c.id !== contorno.id)
                            .map((sub) => {
                              const isSubSelected = selected.substituteContornoIds.includes(sub.id);
                              return (
                                <button
                                  key={sub.id}
                                  type="button"
                                  className={`cs-sub-pill ${isSubSelected ? "cs-sub-pill-active" : ""}`}
                                  onClick={() => onToggleSubstitute(contorno.id, sub.id)}
                                >
                                  {sub.name}
                                </button>
                              );
                            })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}