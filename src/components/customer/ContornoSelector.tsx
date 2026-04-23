"use client";

import { formatBs, formatRef } from "@/lib/money";
import type { Contorno, GlobalContorno } from "./ItemDetailModal.types";

interface ContornoSelectorProps {
  fixedContornos: Contorno[];
  removableContornos: Contorno[];
  substitutionMap: Record<string, string | null>;
  expandedContornos: Set<string>;
  onToggleExpand: (contornoId: string) => void;
  onSelectSubstitute: (contornoId: string, substituteId: string | null) => void;
  getSubstituteOptions: (contornoId: string) => GlobalContorno[];
  availableContornos: Contorno[];
  currentRateBsPerUsd: number;
}

export function ContornoSelector({
  fixedContornos,
  removableContornos,
  substitutionMap,
  expandedContornos,
  onToggleExpand,
  onSelectSubstitute,
  getSubstituteOptions,
  availableContornos,
  currentRateBsPerUsd,
}: ContornoSelectorProps) {
  if (availableContornos.length === 0) return null;

  return (
    <div className="border-b border-border px-4 py-3">
      <h3 className="font-display mb-1 text-[14px] font-semibold text-text-main">
        Contornos
      </h3>
      <p className="mb-2 text-[11px] text-text-muted">
        Contornos incluidos en el plato
      </p>
      <div className="flex flex-col gap-0.5">
        {/* Fixed (non-removable) contornos */}
        {fixedContornos.map((contorno) => (
          <div
            key={contorno.id}
            className="flex items-center gap-3 rounded-input px-1 py-2.5"
          >
            <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-primary" />
            <div className="flex-1">
              <span className="text-[14px] text-text-main">
                {contorno.name}
              </span>
            </div>
            <span className="rounded-[4px] bg-border/60 px-1.5 py-0.5 text-[10px] font-semibold text-text-muted">
              Fijo
            </span>
          </div>
        ))}

        {/* Removable contornos with inline substitution picker */}
        {removableContornos.map((contorno) => {
          const substitution = substitutionMap[contorno.id];
          const isExpanded = expandedContornos.has(contorno.id);
          const activeSubstitute = substitution
            ? getSubstituteOptions(contorno.id).length > 0
              ? getSubstituteOptions(contorno.id).find((c) => c.id === substitution)
              : undefined
            : null;

          // Check if substitute is already on the dish
          const isAlreadyOnDish = activeSubstitute && availableContornos.some((c) => {
            if (c.id === contorno.id) return false;
            const subValue = substitutionMap[c.id];
            const currentSlotId = subValue === undefined || subValue === null ? c.id : subValue;
            return currentSlotId === activeSubstitute.id;
          });

          const displayName = activeSubstitute
            ? (isAlreadyOnDish ? `Más ${activeSubstitute.name}` : activeSubstitute.name)
            : contorno.name;
          const isSubstituted = !!activeSubstitute;

          return (
            <div key={contorno.id}>
              <div className="flex w-full items-center gap-3 rounded-input px-1 py-2.5">
                <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${isSubstituted ? "bg-amber" : "bg-primary"}`} />
                <div className="flex-1">
                  <span className="text-[14px] text-text-main">
                    {displayName}
                  </span>
                  {isSubstituted && (
                    <p className="text-[11px] text-text-muted/70">
                      en lugar de {contorno.name}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => onToggleExpand(contorno.id)}
                  className="rounded-[6px] border border-primary/30 px-2 py-0.5 text-[11px] font-semibold text-primary transition-colors active:bg-primary/10"
                >
                  {isExpanded ? "Cerrar" : "Elegir otra opción"}
                </button>
              </div>

              {isExpanded && (
                <div className="ml-6 mt-1 space-y-0.5 rounded-xl border border-border/60 bg-surface-section/60 p-2 animate-in">
                  {/* Original option */}
                  <button
                    onClick={() => onSelectSubstitute(contorno.id, null)}
                    className="flex w-full items-center gap-3 rounded-input px-2 py-2 text-left active:bg-bg-card"
                  >
                    <div
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${!substitution
                        ? "border-primary bg-primary"
                        : "border-input"
                        }`}
                    >
                      {!substitution && (
                        <div className="h-1.5 w-1.5 rounded-full bg-white" />
                      )}
                    </div>
                    <span className="flex-1 text-[13px] text-text-main font-medium">
                      {contorno.name}
                    </span>
                    <span className="text-[11px] text-text-muted">
                      Original
                    </span>
                  </button>

                  {/* Substitute options */}
                  {getSubstituteOptions(contorno.id).map((sub) => {
                    const isAlreadyOnDish = availableContornos.some((c) => {
                      if (c.id === contorno.id) return false;
                      const subValue = substitutionMap[c.id];
                      const currentSlotId = subValue === undefined || subValue === null ? c.id : subValue;
                      return currentSlotId === sub.id;
                    });
                    return (
                      <button
                        key={sub.id}
                        onClick={() => onSelectSubstitute(contorno.id, sub.id)}
                        className="flex w-full items-center gap-3 rounded-input px-2 py-2 text-left active:bg-bg-card"
                      >
                        <div
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${substitution === sub.id
                            ? "border-primary bg-primary"
                            : "border-input"
                            }`}
                        >
                          {substitution === sub.id && (
                            <div className="h-1.5 w-1.5 rounded-full bg-white" />
                          )}
                        </div>
                        <span className="flex-1 text-[13px] text-text-main">
                          {isAlreadyOnDish ? `Más ${sub.name}` : sub.name}
                        </span>
                        <span className="text-[12px] text-text-muted">
                          {sub.priceUsdCents === 0
                            ? "Incluido"
                            : `+${formatBs(Math.round(sub.priceUsdCents * currentRateBsPerUsd))}`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
