"use client";

import { CheckCircle2 } from "lucide-react";
import { formatRef } from "@/lib/money";

interface AdicionalesSectionProps {
  allAdicionales: { id: string; name: string; priceUsdCents: number; isAvailable: boolean }[];
  selectedAdicionalIds: string[];
  onToggle: (id: string) => void;
  adicionalesEnabled: boolean;
}

export function AdicionalesSection({
  allAdicionales,
  selectedAdicionalIds,
  onToggle,
  adicionalesEnabled,
}: AdicionalesSectionProps) {
  return (
    <section className="pt-16 border-t border-gray-200 space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Adicionales</h2>
          {!adicionalesEnabled && (
            <span className="text-[10px] text-red-400 font-bold ml-2">(DESHABILITADOS GLOBALMENTE)</span>
          )}
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {allAdicionales.map((adicional) => {
          const isChecked = selectedAdicionalIds.includes(adicional.id);
          return (
            <button
              key={adicional.id}
              type="button"
              onClick={() => onToggle(adicional.id)}
              className={`p-3 text-left rounded-lg border-2 transition-all flex items-center gap-3 ${isChecked
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-gray-200 hover:border-gray-300 bg-white"
                }`}
            >
              <div className={`h-3.5 w-3.5 shrink-0 rounded border-2 flex items-center justify-center transition-colors ${isChecked ? "border-primary bg-primary" : "border-gray-300 bg-white"
                }`}>
                {isChecked && <CheckCircle2 className="h-2.5 w-2.5 text-white" strokeWidth={4} />}
              </div>
              <div>
                <p className={`text-xs font-bold truncate ${isChecked ? "text-gray-900" : "text-gray-700"}`}>
                  {adicional.name}
                </p>
                <p className="text-[10px] text-gray-500 mt-0.5">{formatRef(adicional.priceUsdCents)}</p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
