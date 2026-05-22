"use client";

import Image from "next/image";
import { X, Settings2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type {
  ContornoSelection,
  CatalogItem,
  SimpleItem,
} from "@/app/(admin)/admin/menu-del-dia/DailyMenu.types";

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
    <div className="flex flex-col gap-2.5 rounded-2xl border border-border bg-white p-3">
      {/* Top row */}
      <div className="flex items-center gap-2.5">
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={item.name}
            width={34}
            height={34}
            className="size-[34px] shrink-0 rounded-lg border border-border object-cover"
          />
        ) : (
          <span className="size-[34px] shrink-0 rounded-lg border border-border bg-surface-section" />
        )}
        <p className="min-w-0 flex-1 truncate text-[13px] font-bold text-text-main">
          {item.name}
        </p>
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          aria-label={`Quitar ${item.name}`}
          className="flex size-[26px] shrink-0 items-center justify-center rounded-lg border border-border text-text-muted transition-colors hover:border-error/30 hover:bg-error/10 hover:text-error focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error/30"
        >
          <X size={13} />
        </button>
      </div>

      {/* Contornos */}
      <div>
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.07em] text-text-muted">
          Acompañamientos
        </p>

        {availableDailyContornos.length === 0 ? (
          <p className="rounded-lg border border-error/30 bg-error/5 px-2.5 py-1.5 text-[11px] font-medium text-error">
            Configura primero los Contornos del día
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {availableDailyContornos.map((contorno) => {
              const selection = currentContornos.find((c) => c.id === contorno.id);
              const isSelected = !!selection;
              const isExpanded = isSelected && expandedItemId === `${item.id}-${contorno.id}`;

              return (
                <div key={contorno.id} className="relative">
                  <div className="flex items-center">
                    <button
                      type="button"
                      onClick={() => onToggleContorno(contorno.id, contorno.name)}
                      className={cn(
                        "flex h-[26px] items-center px-2.5 text-[11.5px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                        isSelected
                          ? "rounded-l-lg border border-r-0 border-primary bg-bg-app text-primary"
                          : "rounded-lg border border-border bg-white text-text-muted hover:border-primary/40 hover:text-primary",
                      )}
                    >
                      {contorno.name}
                    </button>
                    {isSelected && (
                      <button
                        type="button"
                        onClick={() =>
                          onToggleExpanded(isExpanded ? null : `${item.id}-${contorno.id}`)
                        }
                        aria-label={`Ajustes de ${contorno.name}`}
                        className={cn(
                          "flex size-[26px] items-center justify-center rounded-r-lg border border-l-0 border-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                          isExpanded ? "bg-primary text-white" : "bg-bg-app text-primary",
                        )}
                      >
                        <Settings2 size={12} />
                      </button>
                    )}
                  </div>

                  {/* Settings popup */}
                  {isExpanded && selection && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => onToggleExpanded(null)}
                      />
                      <div className="absolute left-0 top-[calc(100%+6px)] z-50 w-52 rounded-2xl border border-border bg-white p-3.5 shadow-elevated">
                        <div className="mb-3 flex items-center justify-between">
                          <span className="text-[11px] font-bold text-text-main">
                            {contorno.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => onToggleExpanded(null)}
                            aria-label="Cerrar"
                            className="text-text-muted hover:text-text-main"
                          >
                            <X size={13} />
                          </button>
                        </div>

                        {/* Intercambiable toggle */}
                        <div className="mb-2.5 flex items-center justify-between rounded-lg border border-border bg-bg-app px-2.5 py-2">
                          <span className="text-[11px] font-semibold text-text-muted">
                            Intercambiable
                          </span>
                          <Switch
                            size="sm"
                            checked={selection.removable}
                            onCheckedChange={(checked) =>
                              onUpdateContornoSettings(contorno.id, { removable: checked })
                            }
                          />
                        </div>

                        {selection.removable && (
                          <div>
                            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.07em] text-text-muted">
                              Sustitutos
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {availableDailyContornos
                                .filter((c) => c.id !== contorno.id)
                                .map((sub) => {
                                  const isSub = selection.substituteContornoIds?.includes(sub.id);
                                  return (
                                    <button
                                      key={sub.id}
                                      type="button"
                                      onClick={() => {
                                        const newSubs = isSub
                                          ? selection.substituteContornoIds.filter(
                                              (id) => id !== sub.id,
                                            )
                                          : [
                                              ...(selection.substituteContornoIds || []),
                                              sub.id,
                                            ];
                                        onUpdateContornoSettings(contorno.id, {
                                          substituteContornoIds: newSubs,
                                        });
                                      }}
                                      className={cn(
                                        "rounded-full px-2.5 py-[3px] text-[11px] font-semibold transition-colors",
                                        isSub
                                          ? "bg-primary text-white"
                                          : "border border-border bg-bg-app text-text-muted hover:border-primary/40 hover:text-primary",
                                      )}
                                    >
                                      {sub.name}
                                    </button>
                                  );
                                })}
                            </div>
                            {(!selection.substituteContornoIds ||
                              selection.substituteContornoIds.length === 0) && (
                              <p className="mt-1.5 text-[10px] italic text-text-muted">
                                Cualquiera del día
                              </p>
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
