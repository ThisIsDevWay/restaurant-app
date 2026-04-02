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
    <>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-text-main">Menú del día</h1>
            <button
              onClick={onSave}
              disabled={!isDirty || isPending}
              className={`flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${isDirty
                ? "bg-primary text-white hover:bg-primary/90 shadow-sm"
                : "bg-bg-app text-text-muted cursor-not-allowed"
                }`}
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : isDirty ? (
                "Guardar cambios"
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Guardado
                </>
              )}
            </button>
          </div>
          <p className="text-sm text-text-muted mt-0.5">
            Activa los platos disponibles para cada día.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { value: itemCount, label: "Platos del día" },
          { value: contornoCount, label: "Contornos del día" },
          { value: adicionalCount, label: "Adicionales del día" },
          { value: bebidaCount, label: "Bebidas del día" },
        ].map(({ value, label }) => (
          <div key={label} className="bg-bg-app rounded-xl px-4 py-3">
            <p className="text-2xl font-bold text-text-main">{value}</p>
            <p className="text-xs text-text-muted mt-0.5">{label}</p>
          </div>
        ))}
      </div>
    </>
  );
}
