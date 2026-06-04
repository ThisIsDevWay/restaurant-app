"use client";

import { useState } from "react";
import { formatBs } from "@/lib/money";
import { createPortal } from "react-dom";
import type { Contorno, GlobalContorno } from "./ItemDetailModal.types";
import { ContornoMiniSheet } from "./ContornoMiniSheet";

const cleanContorno = (name: string) => name.replace(/\s*\([^)]*\)\s*$/, "").trim();

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

/**
 * ContornoSelector — shows fixed contornos as static badges and
 * removable contornos with a "Cambiar" button.
 *
 * On mobile (≤ md) the substitute picker opens as a 50 vh mini bottom-sheet.
 * On desktop it expands inline below the row (existing behaviour).
 */
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
  /* Mobile bottom-sheet state */
  const [sheetContornoId, setSheetContornoId] = useState<string | null>(null);

  if (availableContornos.length === 0) return null;

  const openSheet = (contornoId: string) => setSheetContornoId(contornoId);
  const closeSheet = () => setSheetContornoId(null);

  /** Returns true if a substitute id is already claimed by another slot */
  const isAlreadyUsed = (slotId: string, subId: string): boolean =>
    availableContornos.some((c) => {
      if (c.id === slotId) return false;
      const val = substitutionMap[c.id];
      const current = val === undefined || val === null ? c.id : val;
      return current === subId;
    });

  return (
    <>
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
                <span className="text-[14px] text-text-main">{cleanContorno(contorno.name)}</span>
              </div>
              <span className="rounded-[4px] bg-border/60 px-1.5 py-0.5 text-[10px] font-semibold text-text-muted">
                Fijo
              </span>
            </div>
          ))}

          {/* Removable contornos */}
          {removableContornos.map((contorno) => {
            const substitution = substitutionMap[contorno.id];
            const isExpanded = expandedContornos.has(contorno.id);
            const substituteOptions = getSubstituteOptions(contorno.id);
            const activeSubstitute = substitution
              ? substituteOptions.find((c) => c.id === substitution)
              : null;

            const alreadyOnDish =
              activeSubstitute &&
              availableContornos.some((c) => {
                if (c.id === contorno.id) return false;
                const sv = substitutionMap[c.id];
                return (sv === undefined || sv === null ? c.id : sv) === activeSubstitute.id;
              });

            const displayName = activeSubstitute
              ? alreadyOnDish
                ? `Más ${cleanContorno(activeSubstitute.name)}`
                : cleanContorno(activeSubstitute.name)
              : cleanContorno(contorno.name);
            const isSubstituted = !!activeSubstitute;

            return (
              <div key={contorno.id}>
                <div className="flex w-full items-center gap-3 rounded-input px-1 py-2.5">
                  <span
                    className={`inline-block h-2 w-2 shrink-0 rounded-full ${
                      isSubstituted ? "bg-amber" : "bg-primary"
                    }`}
                  />
                  <div className="flex-1">
                    <span className="text-[14px] text-text-main">{displayName}</span>
                    {isSubstituted && (
                      <p className="text-[11px] text-text-muted/70">
                        en lugar de {cleanContorno(contorno.name)}
                      </p>
                    )}
                  </div>

                  {/* Mobile: open bottom-sheet for 3+ options | Desktop & <3 options: toggle inline */}
                  <button
                    onClick={() => {
                      /* md breakpoint = 768 px — always use bottom-sheet on mobile */
                      const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
                      if (isMobile) {
                        openSheet(contorno.id);
                      } else {
                        onToggleExpand(contorno.id);
                      }
                    }}
                    className="rounded-[6px] border border-primary/30 px-2 py-0.5 text-[11px] font-semibold text-primary transition-colors active:bg-primary/10"
                  >
                    {isExpanded ? "Cerrar" : "Cambiar"}
                  </button>
                </div>

                {/* Inline picker */}
                {isExpanded && (
                  <div className="ml-6 mt-1 space-y-0.5 rounded-xl border border-border/60 bg-surface-section/60 p-2 animate-in">
                    {/* Original */}
                    <button
                      onClick={() => onSelectSubstitute(contorno.id, null)}
                      className="flex w-full items-center gap-3 rounded-input px-2 py-2 text-left active:bg-bg-card"
                    >
                      <div
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                          !substitution ? "border-primary bg-primary" : "border-input"
                        }`}
                      >
                        {!substitution && (
                          <div className="h-1.5 w-1.5 rounded-full bg-white" />
                        )}
                      </div>
                      <span className="flex-1 text-[13px] text-text-main font-medium">
                        {cleanContorno(contorno.name)}
                      </span>
                      <span className="text-[11px] text-text-muted">Original</span>
                    </button>

                    {/* Substitutes */}
                    {substituteOptions.map((sub) => {
                      const alreadyUsedInDesktop = availableContornos.some((c) => {
                        if (c.id === contorno.id) return false;
                        const sv = substitutionMap[c.id];
                        return (sv === undefined || sv === null ? c.id : sv) === sub.id;
                      });
                      return (
                        <button
                          key={sub.id}
                          onClick={() => onSelectSubstitute(contorno.id, sub.id)}
                          className="flex w-full items-center gap-3 rounded-input px-2 py-2 text-left active:bg-bg-card"
                        >
                          <div
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                              substitution === sub.id
                                ? "border-primary bg-primary"
                                : "border-input"
                            }`}
                          >
                            {substitution === sub.id && (
                              <div className="h-1.5 w-1.5 rounded-full bg-white" />
                            )}
                          </div>
                          <span className="flex-1 text-[13px] text-text-main">
                            {alreadyUsedInDesktop ? `Más ${cleanContorno(sub.name)}` : cleanContorno(sub.name)}
                          </span>
                          <span className="text-[12px] text-text-muted">
                            {sub.priceUsdCents === 0
                              ? "Incluido"
                              : `+${formatBs(Math.round(sub.priceUsdCents * currentRateBsPerUsd), { rounded: true })}`}
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

      {/* ── Mobile Mini Bottom-Sheet ── */}
      {sheetContornoId !== null &&
        typeof document !== "undefined" &&
        createPortal(
          (() => {
            const slot = removableContornos.find((c) => c.id === sheetContornoId);
            if (!slot) return null;
            return (
              <ContornoMiniSheet
                slotName={slot.name}
                currentSubstituteId={substitutionMap[sheetContornoId] ?? null}
                options={getSubstituteOptions(sheetContornoId)}
                original={{ id: slot.id, name: slot.name, priceUsdCents: slot.priceUsdCents ?? 0 }}
                currentRateBsPerUsd={currentRateBsPerUsd}
                onSelect={(subId) => onSelectSubstitute(sheetContornoId, subId)}
                onClose={closeSheet}
                isAlreadyUsed={(subId) => isAlreadyUsed(sheetContornoId, subId)}
              />
            );
          })(),
          document.body,
        )}
    </>
  );
}
