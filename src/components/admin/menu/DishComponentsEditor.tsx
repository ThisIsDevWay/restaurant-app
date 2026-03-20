"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatBs } from "@/lib/money";
import { Plus, GripVertical, Trash2 } from "lucide-react";

export interface DishComponent {
  id?: string;
  name: string;
  type: "contorno" | "fixed";
  removable: boolean;
  priceIfRemovedCents: number | null;
  allowPaidSubstitution: boolean;
  sortOrder: number;
}

interface DishComponentsEditorProps {
  menuItemId: string;
  initialComponents: DishComponent[];
  exchangeRate: number;
  onChange: (components: DishComponent[]) => void;
}

export function DishComponentsEditor({
  initialComponents,
  exchangeRate,
  onChange,
}: DishComponentsEditorProps) {
  const [components, setComponents] = useState<DishComponent[]>(
    initialComponents.length > 0
      ? initialComponents
      : [],
  );

  const update = useCallback(
    (updated: DishComponent[]) => {
      setComponents(updated);
      onChange(updated);
    },
    [onChange],
  );

  function addComponent() {
    update([
      ...components,
      {
        name: "",
        type: "contorno",
        removable: false,
        priceIfRemovedCents: null,
        allowPaidSubstitution: false,
        sortOrder: components.length,
      },
    ]);
  }

  function removeComponent(idx: number) {
    update(components.filter((_, i) => i !== idx).map((c, i) => ({ ...c, sortOrder: i })));
  }

  function updateField<K extends keyof DishComponent>(
    idx: number,
    field: K,
    value: DishComponent[K],
  ) {
    const updated = [...components];
    updated[idx] = { ...updated[idx], [field]: value };

    // Reset dependent fields when type changes to fixed
    if (field === "type" && value === "fixed") {
      updated[idx].removable = false;
      updated[idx].priceIfRemovedCents = null;
      updated[idx].allowPaidSubstitution = false;
    }

    // Reset dependent fields when removable is toggled off
    if (field === "removable" && value === false) {
      updated[idx].priceIfRemovedCents = null;
      updated[idx].allowPaidSubstitution = false;
    }

    update(updated);
  }

  return (
    <Card className="ring-1 ring-border">
      <CardHeader className="border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Componentes del plato</CardTitle>
            <p className="text-xs text-text-muted mt-0.5">
              Lo que viene incluido con este plato
            </p>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={addComponent}>
            <Plus />
            Agregar componente
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-3">
        {components.length === 0 && (
          <p className="text-sm text-text-muted text-center py-6">
            Este plato no tiene componentes configurados.
            Los clientes no verán contornos en el menú.
          </p>
        )}

        {components.map((comp, idx) => {
          const isFixed = comp.type === "fixed";
          const discountRef = comp.priceIfRemovedCents
            ? Math.abs(comp.priceIfRemovedCents) / 100
            : null;
          const discountBs = discountRef
            ? Math.round(discountRef * 100 * exchangeRate)
            : null;

          return (
            <div
              key={comp.id ?? `new-${idx}`}
              className="rounded-xl border border-border bg-bg-app/30 p-4 space-y-3"
            >
              {/* Row 1: Name + Type + Remove */}
              <div className="flex items-center gap-3">
                <GripVertical className="h-4 w-4 text-text-muted shrink-0 cursor-grab" />
                <Input
                  value={comp.name}
                  onChange={(e) => updateField(idx, "name", e.target.value)}
                  placeholder="Ej: Arroz blanco"
                  className="flex-1"
                />
                <select
                  value={comp.type}
                  onChange={(e) =>
                    updateField(idx, "type", e.target.value as "contorno" | "fixed")
                  }
                  className="rounded-lg border border-border bg-white px-3 py-1.5 text-sm text-text-main"
                >
                  <option value="contorno">Contorno</option>
                  <option value="fixed">Fijo</option>
                </select>
                <Button
                  type="button"
                  size="icon-xs"
                  variant="ghost"
                  onClick={() => removeComponent(idx)}
                  className="text-error shrink-0"
                >
                  <Trash2 />
                </Button>
              </div>

              {isFixed ? (
                <p className="text-xs text-text-muted pl-7">
                  Los componentes fijos no son editables por el cliente.
                </p>
              ) : (
                <div className="pl-7 space-y-3">
                  {/* Removable toggle */}
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-text-main">
                      El cliente puede quitarlo
                    </label>
                    <Switch
                      checked={comp.removable}
                      onCheckedChange={(val) => updateField(idx, "removable", val)}
                    />
                  </div>

                  {comp.removable && (
                    <>
                      {/* Price if removed */}
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-text-muted">Descuento si lo quita:</span>
                        <span className="text-sm text-text-muted">REF $</span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={discountRef ?? ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateField(
                              idx,
                              "priceIfRemovedCents",
                              val ? -Math.round(parseFloat(val) * 100) : null,
                            );
                          }}
                          className="w-28 font-mono text-sm"
                        />
                        {discountBs !== null && (
                          <span className="text-xs text-text-muted">
                            ≈ {formatBs(discountBs)}
                          </span>
                        )}
                      </div>

                      {/* Allow paid substitution */}
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm text-text-main">
                            Puede sustituir por adicional de pago
                          </label>
                          {comp.allowPaidSubstitution && (
                            <p className="text-xs text-text-muted mt-0.5">
                              El cliente podrá elegir un adicional como reemplazo
                            </p>
                          )}
                        </div>
                        <Switch
                          checked={comp.allowPaidSubstitution}
                          onCheckedChange={(val) =>
                            updateField(idx, "allowPaidSubstitution", val)
                          }
                        />
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
