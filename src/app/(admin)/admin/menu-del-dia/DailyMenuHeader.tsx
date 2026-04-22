"use client";

import { Loader2, CheckCircle2 } from "lucide-react";

interface DailyMenuHeaderProps {
  itemCount: number;
  contornoCount: number;
  adicionalCount: number;
  bebidaCount: number;
  isDirty: boolean;
  isPending: boolean;
  onSave: () => void;
}

export function DailyMenuHeader({
  itemCount,
  contornoCount,
  adicionalCount,
  bebidaCount,
  isDirty,
  isPending,
  onSave,
}: DailyMenuHeaderProps) {
  return (
    <div style={{ marginBottom: 8 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Epilogue:wght@700;900&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
        .dmh-save-btn {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 9px 20px;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 13px; font-weight: 700;
          border-radius: 100px; border: none; cursor: pointer;
          transition: background 0.15s ease, transform 0.1s ease;
          letter-spacing: 0.01em;
        }
        .dmh-save-btn:active:not(:disabled) { transform: scale(0.97); }
        .dmh-stat-card {
          background: #fff;
          border: 1px solid #f0e6df;
          border-radius: 16px;
          padding: 16px 20px;
          flex: 1; min-width: 0;
        }
      `}</style>

      {/* Title row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{
            fontFamily: "'Epilogue', sans-serif",
            fontSize: 30, fontWeight: 900, color: "#251a07",
            letterSpacing: "-0.03em", margin: 0, lineHeight: 1.1,
          }}>
            Menú del día
          </h1>
          <p style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 13, color: "#9c8c78", margin: "5px 0 0",
          }}>
            Activa los platos disponibles para cada día
          </p>
        </div>

        <button
          onClick={onSave}
          disabled={!isDirty || isPending}
          className="dmh-save-btn"
          style={{
            background: isDirty ? "#bb0005" : "#f0e6df",
            color: isDirty ? "#fff" : "#9c8c78",
            cursor: !isDirty || isPending ? "not-allowed" : "pointer",
            opacity: isPending ? 0.7 : 1,
          }}
        >
          {isPending ? (
            <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />Guardando...</>
          ) : isDirty ? (
            "Guardar cambios"
          ) : (
            <><CheckCircle2 size={14} />Guardado</>
          )}
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {[
          { value: itemCount, label: "Platos activos" },
          { value: contornoCount, label: "Contornos activos" },
          { value: adicionalCount, label: "Adicionales activos" },
          { value: bebidaCount, label: "Bebidas activas" },
        ].map(({ value, label }) => (
          <div key={label} className="dmh-stat-card">
            <p style={{
              fontFamily: "'Epilogue', sans-serif",
              fontSize: 26, fontWeight: 900, color: "#251a07",
              margin: 0, lineHeight: 1,
            }}>
              {value}
            </p>
            <p style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: 11, color: "#9c8c78", margin: "4px 0 0",
              fontWeight: 600, letterSpacing: "0.02em",
            }}>
              {label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}