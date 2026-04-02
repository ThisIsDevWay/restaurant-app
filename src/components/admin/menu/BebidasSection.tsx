"use client";

import { CheckCircle2 } from "lucide-react";
import { formatRef } from "@/lib/money";

interface BebidasSectionProps {
  allBebidas: { id: string; name: string; priceUsdCents: number; isAvailable: boolean }[];
  selectedBebidaIds: string[];
  onToggle: (id: string) => void;
  bebidasEnabled: boolean;
}

export function BebidasSection({
  allBebidas,
  selectedBebidaIds,
  onToggle,
  bebidasEnabled,
}: BebidasSectionProps) {
  return (
    <section className="pt-16 border-t border-gray-200 space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Bebidas sugeridas</h2>
          {!bebidasEnabled && (
            <span className="text-[10px] text-red-400 font-bold ml-2">(DESHABILITADAS GLOBALMENTE)</span>
          )}
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {allBebidas.map((bebida) => {
          const isChecked = selectedBebidaIds.includes(bebida.id);
          return (
            <button
              key={bebida.id}
              type="button"
              onClick={() => onToggle(bebida.id)}
              className={`p-3 text-left rounded-lg border-2 transition-all flex items-center gap-3 ${isChecked
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-gray-200 hover:border-gray-300 bg-white"
                }`}
            >
              <div className={`h-3.5 w-3.5 shrink-0 rounded border-2 flex items-center justify-center transition-colors ${isChecked ? "border-gray-900 bg-gray-900" : "border-gray-300 bg-white"
                }`}>
                {isChecked && <CheckCircle2 className="h-2.5 w-2.5 text-white" strokeWidth={4} />}
              </div>
              <div>
                <p className={`text-xs font-bold truncate ${isChecked ? "text-gray-900" : "text-gray-700"}`}>
                  {bebida.name}
                </p>
                <p className="text-[10px] text-gray-500 mt-0.5">{formatRef(bebida.priceUsdCents)}</p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
