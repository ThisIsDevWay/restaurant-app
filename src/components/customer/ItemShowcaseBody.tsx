"use client";

import { formatRef } from "@/lib/money";
import { getAllowedSubstitutes } from "@/lib/menu/substitutes";
import type { MenuItemWithComponents } from "@/types/menu.types";
import type { SimpleItem } from "./ItemDetailModal.types";

/**
 * Read-only ("vitrina") body for the item-detail modal, used on `/menu-digital`.
 * Layout-agnostic: it renders inside whichever shell (Classic banner / Modern
 * floating image) the public modal uses, so the top of the modal still changes
 * shape per `menuLayout` — only the body content differs from the ordering flow.
 *
 * Purely informational: included sides, allowed swaps, and the day's add-ons as
 * read-only lists. No cart, no quantity steppers, no add button.
 */
export interface ItemShowcaseBodyProps {
  item: MenuItemWithComponents;
  adicionalesEnabled?: boolean;
  bebidasEnabled?: boolean;
  dailyAdicionales: SimpleItem[];
  dailyBebidas: SimpleItem[];
  dailyContornos?: SimpleItem[];
}

/** Strips a trailing "(…)" qualifier from a component name for display. */
function cleanName(name: string): string {
  return name.replace(/\s*\([^)]*\)\s*$/, "").trim();
}

function InfoList({
  title,
  subtitle,
  rows,
}: {
  title: string;
  subtitle?: string;
  rows: { id: string; name: string; trailing: string | null }[];
}) {
  if (rows.length === 0) return null;
  return (
    <div className="px-5 md:px-6">
      <div className="mb-2">
        <h4 className="font-mono text-[11px] text-text-muted tracking-widest uppercase">{title}</h4>
        {subtitle && <p className="text-[12.5px] text-text-muted mt-0.5">{subtitle}</p>}
      </div>
      <div className="bg-bg-card border border-border/60 rounded-xl overflow-hidden shadow-sm">
        {rows.map((row) => (
          <div
            key={row.id}
            className="flex justify-between items-center gap-4 py-2.5 px-4 border-b border-border/45 last:border-0"
          >
            <span className="text-[14.5px] text-text-main font-medium min-w-0 break-words leading-tight mt-0.5">
              {cleanName(row.name)}
            </span>
            {row.trailing && (
              <span className="font-mono text-[13.5px] text-text-main font-bold whitespace-nowrap flex-shrink-0 mt-0.5">
                {row.trailing}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ItemShowcaseBody({
  item,
  adicionalesEnabled = true,
  bebidasEnabled = true,
  dailyAdicionales,
  dailyBebidas,
  dailyContornos = [],
}: ItemShowcaseBodyProps) {
  const allowedSubstitutes = getAllowedSubstitutes(item, dailyContornos);

  const adicionalRows = (adicionalesEnabled && !item.hideAdicionales ? dailyAdicionales : [])
    .filter((a) => a.isAvailable)
    .map((a) => ({ id: a.id, name: a.name, trailing: a.priceUsdCents > 0 ? `+${formatRef(a.priceUsdCents)}` : "Incluido" }));

  const bebidaRows = (bebidasEnabled && !item.hideBebidas ? dailyBebidas : [])
    .filter((b) => b.isAvailable)
    .map((b) => ({ id: b.id, name: b.name, trailing: b.priceUsdCents > 0 ? `+${formatRef(b.priceUsdCents)}` : "Incluido" }));

  const substituteRows = allowedSubstitutes.map((o) => ({
    id: o.id,
    name: o.name,
    trailing: o.priceUsdCents > 0 ? `+${formatRef(o.priceUsdCents)}` : null,
  }));

  return (
    <div className="flex flex-col gap-5 py-2 pb-8">
      {/* Incluido con el plato — chips */}
      {item.contornos && item.contornos.length > 0 && (
        <div className="px-5 md:px-6">
          <h4 className="font-mono text-[12px] text-text-muted tracking-widest uppercase mb-2">
            Incluido con el plato
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {item.contornos.map((c) => (
              <div
                key={c.id}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-section/40 text-text-main border border-border/50 text-[14.5px] font-medium"
              >
                <span className="text-primary text-[11px] font-black">✓</span>
                <span>{cleanName(c.name)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <InfoList
        title="Puedes cambiar por"
        subtitle="Consulta disponibilidad con tu mesonero"
        rows={substituteRows}
      />
      <InfoList title="Adicionales" subtitle="Se cobran aparte" rows={adicionalRows} />
      <InfoList title="Bebidas disponibles" rows={bebidaRows} />
    </div>
  );
}
