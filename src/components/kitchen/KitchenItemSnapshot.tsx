import { resolveContornos } from "@/lib/kitchen-utils";
import type { KitchenOrderItem } from "@/types/kitchen.types";

interface KitchenItemSnapshotProps {
  item: KitchenOrderItem;
  accentColor: "amber" | "info" | "success";
}

export function KitchenItemSnapshot({ item, accentColor }: KitchenItemSnapshotProps) {
  const resolved = resolveContornos(item);
  const accentBg =
    accentColor === "amber"
      ? "bg-amber/10"
      : accentColor === "info"
        ? "bg-info/10"
        : "bg-success/10";
  const accentText =
    accentColor === "amber"
      ? "text-amber"
      : accentColor === "info"
        ? "text-info"
        : "text-success";

  return (
    <div>
      <p className="text-base font-bold text-text-main">
        <span className={`inline-flex items-center justify-center h-6 w-6 rounded-lg ${accentBg} ${accentText} text-sm font-black mr-1.5`}>
          {item.quantity}
        </span>
        {item.name}
      </p>

      {/* Inclusiones fijas */}
      {item.includedNote && (
        <div className="ml-8 mt-1">
          <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
            ✓ {item.includedNote}
          </span>
        </div>
      )}

      {/* Contornos */}
      {resolved.hasAnyContornos || resolved.hasModifications ? (
        <div className="ml-8 mt-1.5 space-y-1">
          {resolved.hasModifications && (
            <p className="text-[10px] font-black uppercase tracking-widest text-amber flex items-center gap-1.5 mb-1">
              Contornos <span className="inline-block w-2 h-2 rounded-full bg-amber" /> modificados
            </p>
          )}

          {resolved.keptDefault && (
            <div>
              <span className="inline-flex items-center rounded-lg bg-success/10 px-2 py-1 text-sm font-bold text-success border border-success/20">
                ● {resolved.keptDefault.name}
              </span>
            </div>
          )}

          {resolved.keptFixed.map((fc) => (
            <div key={fc.id}>
              <span className="inline-flex items-center rounded-lg bg-success/10 px-2 py-1 text-sm font-bold text-success border border-success/20">
                ● {fc.name}
              </span>
            </div>
          ))}

          {resolved.substitutions.map((sub, i) => (
            <div key={`sub-${i}`} className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-lg bg-success/10 px-2 py-1 text-sm font-bold text-success border border-success/20">
                ● {sub.name}
              </span>
              {sub.substitutesComponentName && (
                <span className="text-xs text-text-muted/40 line-through">
                  {sub.substitutesComponentName}
                </span>
              )}
            </div>
          ))}

          {resolved.pureRemovals.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-0.5">
              {resolved.pureRemovals.map((r, i) => (
                <span key={`rem-${i}`} className="text-xs text-text-muted/40 line-through">
                  {r.name}
                </span>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {/* Adicionales regulares */}
      {item.selectedAdicionales?.filter(a => !a.substitutesComponentId).length > 0 && (
        <div className="ml-8 mt-1.5 flex flex-wrap gap-1">
          {item.selectedAdicionales.filter(a => !a.substitutesComponentId).map((ad, adIdx) => (
            <span
              key={adIdx}
              className="inline-flex items-center rounded-lg bg-primary/10 px-2 py-1 text-sm font-bold text-primary border border-primary/20"
            >
              + {ad.quantity ?? 1}× {ad.name}
            </span>
          ))}
        </div>
      )}

      {/* Bebidas */}
      {item.selectedBebidas && item.selectedBebidas.length > 0 && (
        <div className="ml-8 mt-1.5 flex flex-wrap gap-1">
          {item.selectedBebidas.map((b, bIdx) => (
            <span
              key={`beb-${bIdx}`}
              className="inline-flex items-center rounded-lg bg-info/10 px-2 py-1 text-sm font-bold text-info border border-info/20"
            >
              🍹 {b.quantity ?? 1}× {b.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
