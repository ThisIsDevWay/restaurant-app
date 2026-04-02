"use client";

import { Switch } from "@/components/ui/switch";
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
    <section className="pt-16 border-t border-gray-200 space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Contornos</h2>
          <p className="text-xs text-gray-500 mt-1">Configura los acompañamientos y sus opciones de sustitución.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {allContornos.map((contorno) => {
          const selected = selectedContornos.find((c) => c.id === contorno.id);
          const isSelected = !!selected;
          return (
            <div
              key={contorno.id}
              className={`p-4 rounded-lg border-2 transition-all duration-200 ${isSelected
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-gray-200 hover:border-gray-300 bg-white"
                }`}
            >
              <div className="flex items-start justify-between gap-3">
                <button
                  type="button"
                  onClick={() => onToggle(contorno)}
                  className="flex-1 text-left flex items-start gap-3"
                >
                  <div className={`mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? "border-primary bg-primary" : "border-gray-300 bg-white"
                    }`}>
                    {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold ${isSelected ? "text-primary" : "text-gray-700"}`}>
                      {contorno.name}
                    </p>
                    <p className="text-[10px] text-gray-500 mt-0.5">{formatRef(contorno.priceUsdCents)}</p>
                  </div>
                </button>
                <div className={`h-1.5 w-1.5 rounded-full mt-1.5 shadow-sm ${contorno.isAvailable ? "bg-green-500" : "bg-red-400"}`} />
              </div>

              {isSelected && (
                <div className="mt-4 pt-4 border-t border-gray-200 space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-gray-400">Intercambiable</span>
                    <Switch
                      checked={selected.removable}
                      onCheckedChange={() => onToggleRemovable(contorno.id)}
                    />
                  </div>

                  {selected.removable && (
                    <div className="space-y-2">
                      <p className="text-[10px] uppercase text-gray-400 font-bold">Sustitutos</p>
                      <div className="flex flex-wrap gap-1.5">
                        {allContornos
                          .filter((c) => c.id !== contorno.id)
                          .map((sub) => {
                            const isSubValue = selected.substituteContornoIds.includes(sub.id);
                            return (
                              <button
                                key={sub.id}
                                type="button"
                                onClick={() => onToggleSubstitute(contorno.id, sub.id)}
                                className={`px-2 py-1 text-[10px] rounded border transition-colors ${isSubValue
                                  ? "bg-primary border-primary text-white"
                                  : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
                                  }`}
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
    </section>
  );
}
