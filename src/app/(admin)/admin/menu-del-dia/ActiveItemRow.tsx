"use client";

import Image from "next/image";
import { X, Settings2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import type { ContornoSelection, CatalogItem, SimpleItem } from "@/app/(admin)/admin/menu-del-dia/DailyMenu.types";

interface ActiveItemRowProps {
  item: CatalogItem;
  currentContornos: ContornoSelection[];
  availableDailyContornos: SimpleItem[];
  expandedItemId: string | null;
  onToggleExpanded: (id: string | null) => void;
  onToggleContorno: (contornoId: string, name: string) => void;
  onUpdateContornoSettings: (contornoId: string, updates: Partial<ContornoSelection>) => void;
  onRemove: (id: string) => void;
}

export function ActiveItemRow({
  item,
  currentContornos,
  availableDailyContornos,
  expandedItemId,
  onToggleExpanded,
  onToggleContorno,
  onUpdateContornoSettings,
  onRemove,
}: ActiveItemRowProps) {
  return (
    <div
      key={item.id}
      className="group flex flex-col gap-2 p-2.5 rounded-2xl bg-white border border-border/60 hover:border-primary/20 hover:shadow-md transition-all animate-in fade-in slide-in-from-left-2 duration-300"
    >
      <div className="flex items-center gap-3">
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={item.name}
            width={36}
            height={36}
            className="h-9 w-9 rounded-xl object-cover flex-shrink-0 ring-1 ring-border/50 shadow-sm"
          />
        ) : (
          <div className="h-9 w-9 rounded-xl bg-bg-app flex-shrink-0 ring-1 ring-border/50 shadow-sm" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold text-text-main leading-tight truncate">
            {item.name}
          </p>
        </div>
        <button
          onClick={() => onRemove(item.id)}
          className="h-7 w-7 flex items-center justify-center rounded-lg text-text-muted hover:text-white hover:bg-error transition-all opacity-0 group-hover:opacity-100 flex-shrink-0"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Minimalist Contorno Selection */}
      <div className="mt-1 px-1">
        <p className="text-[9px] font-bold text-text-muted/60 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
          Acompañamientos
        </p>

        {availableDailyContornos.length === 0 ? (
          <p className="text-[10px] text-error font-medium italic bg-error/5 border border-error/10 p-2 rounded-lg">
            ⚠️ Configura primero los &quot;Contornos del día&quot;
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {availableDailyContornos.map((contorno) => {
              const selection = currentContornos.find(c => c.id === contorno.id);
              const isSelected = !!selection;
              const isExpanded = isSelected && expandedItemId === `${item.id}-${contorno.id}`;

              return (
                <div key={contorno.id} className="relative flex items-center gap-1">
                  <button
                    onClick={() => onToggleContorno(contorno.id, contorno.name)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all border shadow-sm ${isSelected
                      ? "bg-primary/10 border-primary/30 text-primary"
                      : "bg-white border-border/80 text-text-muted hover:border-primary/30 hover:text-text-main"
                      }`}
                  >
                    {contorno.name}
                  </button>
                  {isSelected && (
                    <button
                      onClick={() => onToggleExpanded(isExpanded ? null : `${item.id}-${contorno.id}`)}
                      className={`h-6 w-6 rounded-lg flex items-center justify-center transition-all border shadow-sm ${isExpanded
                        ? "bg-primary text-white border-primary"
                        : "bg-white border-border/60 text-text-muted hover:border-primary/30 hover:text-primary"
                        }`}
                      title="Ajustes"
                    >
                      <Settings2 className="h-3.5 w-3.5" />
                    </button>
                  )}

                  {/* Popup for Settings */}
                  {isExpanded && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => onToggleExpanded(null)} />
                      <div className="absolute top-full left-0 z-50 mt-1 w-48 bg-white border border-border shadow-elevated rounded-xl p-3 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold text-text-main uppercase">Ajustes: {contorno.name}</span>
                          <button onClick={() => onToggleExpanded(null)}><X className="h-3 w-3 text-text-muted" /></button>
                        </div>

                        <div className="flex items-center justify-between mb-3 bg-bg-app p-2 rounded-lg border border-border/50">
                          <span className="text-[10px] font-medium text-text-muted">¿Intercambiable?</span>
                          <Switch
                            checked={selection.removable}
                            onCheckedChange={(val) => onUpdateContornoSettings(contorno.id, { removable: val })}
                            className="scale-75"
                          />
                        </div>

                        {selection.removable && (
                          <div className="space-y-2">
                            <p className="text-[9px] font-bold text-text-muted/60 uppercase px-1">Sustitutos</p>
                            <div className="flex flex-wrap gap-1">
                              {availableDailyContornos
                                .filter(c => c.id !== contorno.id)
                                .map(sub => {
                                  const isSubSelected = selection.substituteContornoIds?.includes(sub.id);
                                  return (
                                    <button
                                      key={sub.id}
                                      onClick={() => {
                                        const newSubs = isSubSelected
                                          ? selection.substituteContornoIds.filter(id => id !== sub.id)
                                          : [...(selection.substituteContornoIds || []), sub.id];
                                        onUpdateContornoSettings(contorno.id, { substituteContornoIds: newSubs });
                                      }}
                                      className={`px-1.5 py-0.5 rounded-md text-[9px] font-medium transition-all border ${isSubSelected
                                        ? "bg-primary/10 border-primary/20 text-primary"
                                        : "bg-white border-border text-text-muted hover:text-text-main hover:border-primary/20"
                                        }`}
                                    >
                                      {sub.name}
                                    </button>
                                  );
                                })}
                            </div>
                            {(!selection.substituteContornoIds || selection.substituteContornoIds.length === 0) && (
                              <p className="text-[8px] text-text-muted/60 italic px-1">Cualquiera del día</p>
                            )}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
