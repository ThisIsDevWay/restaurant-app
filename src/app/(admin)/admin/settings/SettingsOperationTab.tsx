"use client";

import { useState } from "react";
import { Store, Package, MapPin, Plus, Trash2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { SettingsFormData } from "./SettingsForm.types";
import { ORDER_MODES } from "./SettingsForm.types";

interface SettingsOperationTabProps {
  form: SettingsFormData;
  updateField: <K extends keyof SettingsFormData>(key: K, value: SettingsFormData[K]) => void;
  errors: Partial<Record<keyof SettingsFormData, string>>;
  decimalInputs: Record<string, string>;
  setDecimalInputs: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}

const ORDER_MODE_ICONS = {
  orderModeOnSiteEnabled: Store,
  orderModeTakeAwayEnabled: Package,
  orderModeDeliveryEnabled: MapPin,
} as const;

export function SettingsOperationTab({
  form,
  updateField,
  errors,
  decimalInputs,
  setDecimalInputs,
}: SettingsOperationTabProps) {
  const [zonePrices, setZonePrices] = useState<string[]>(() =>
    form.deliveryZones.map((z) => (z.feeUsdCents / 100).toFixed(2)),
  );

  const addZone = () => {
    updateField("deliveryZones", [
      ...form.deliveryZones,
      { label: "", feeUsdCents: 0 },
    ]);
    setZonePrices((prev) => [...prev, "0.00"]);
  };

  const removeZone = (index: number) => {
    updateField(
      "deliveryZones",
      form.deliveryZones.filter((_, i) => i !== index),
    );
    setZonePrices((prev) => prev.filter((_, i) => i !== index));
  };

  const updateZoneLabel = (index: number, label: string) => {
    updateField(
      "deliveryZones",
      form.deliveryZones.map((z, i) => (i === index ? { ...z, label } : z)),
    );
  };

  const updateZonePrice = (index: number, value: string) => {
    setZonePrices((prev) => prev.map((p, i) => (i === index ? value : p)));
    const cents = Math.round(parseFloat(value) * 100);
    if (!isNaN(cents)) {
      updateField(
        "deliveryZones",
        form.deliveryZones.map((z, i) =>
          i === index ? { ...z, feeUsdCents: cents } : z,
        ),
      );
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      <Card className="p-6 border-none shadow-sm bg-white rounded-2xl">
        <h3 className="text-lg font-bold text-text-main mb-6">Modos de Pedido Activos</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {ORDER_MODES.map((mode) => {
            const Icon = ORDER_MODE_ICONS[mode.id];
            const isEnabled = form[mode.id];
            return (
              <div
                key={mode.id}
                onClick={() => updateField(mode.id, !isEnabled)}
                className={cn(
                  "flex flex-col items-center gap-4 p-8 rounded-2xl border-2 cursor-pointer transition-all hover:shadow-md",
                  isEnabled ? "border-primary bg-primary/5 shadow-sm" : "border-border/40 opacity-60 grayscale hover:grayscale-0"
                )}
              >
                <div className={cn(
                  "p-4 rounded-full transition-colors",
                  isEnabled ? "bg-primary text-white" : "bg-bg-app text-text-muted"
                )}>
                  <Icon className="h-8 w-8" />
                </div>
                <span className="font-bold text-base text-center">{mode.label}</span>
                <Switch
                  checked={isEnabled}
                  onCheckedChange={(v) => updateField(mode.id, v)}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="p-6 border-none shadow-sm bg-white rounded-2xl">
        <h3 className="text-lg font-bold text-text-main mb-6">Restricciones y Límites</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label htmlFor="maxQuantityPerItem">Items por Pedido</Label>
            <Input
              id="maxQuantityPerItem"
              type="number"
              value={form.maxQuantityPerItem}
              onChange={(e) => updateField("maxQuantityPerItem", parseInt(e.target.value))}
              className="rounded-xl"
            />
            {errors.maxQuantityPerItem && <p className="text-xs text-red-500">{errors.maxQuantityPerItem}</p>}
            <p className="text-[10px] text-text-muted">Máx. productos de un mismo tipo.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="orderExpirationMinutes">Expiración (Minutos)</Label>
            <Input
              id="orderExpirationMinutes"
              type="number"
              value={form.orderExpirationMinutes}
              onChange={(e) => updateField("orderExpirationMinutes", parseInt(e.target.value))}
              className="rounded-xl"
            />
            {errors.orderExpirationMinutes && <p className="text-xs text-red-500">{errors.orderExpirationMinutes}</p>}
            <p className="text-[10px] text-text-muted">Tiempo para pagar antes de cancelar.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="maxPendingOrders">Órdenes Pendientes Máx.</Label>
            <Input
              id="maxPendingOrders"
              type="number"
              value={form.maxPendingOrders}
              onChange={(e) => updateField("maxPendingOrders", parseInt(e.target.value))}
              className="rounded-xl"
            />
            {errors.maxPendingOrders && <p className="text-xs text-red-500">{errors.maxPendingOrders}</p>}
            <p className="text-[10px] text-text-muted">Límite de pedidos en cola.</p>
          </div>
        </div>
      </Card>

      <Card className="p-6 border-none shadow-sm bg-white rounded-2xl">
        <h3 className="text-lg font-bold text-text-main mb-6">Configuración de Inventario y Empaque</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-bg-app border border-border/40">
              <div className="space-y-1">
                <Label className="text-sm font-bold">Habilitar Adicionales (Extras / Toppings)</Label>
                <p className="text-[11px] text-text-muted leading-snug">
                  Permite a los clientes agregar ingredientes extra directamente desde el detalle de su plato con un costo adicional.
                </p>
              </div>
              <Switch
                checked={form.adicionalesEnabled}
                onCheckedChange={(v) => updateField("adicionalesEnabled", v)}
              />
            </div>
            <div className="flex items-center justify-between p-4 rounded-xl bg-bg-app border border-border/40">
              <div className="space-y-1">
                <Label className="text-sm font-bold">Habilitar Bebidas e Hidratación</Label>
                <p className="text-[11px] text-text-muted leading-snug">
                  Muestra la sección de bebidas dentro del plato seleccionado, ideal para combos o compras rápidas de refrescos.
                </p>
              </div>
              <Switch
                checked={form.bebidasEnabled}
                onCheckedChange={(v) => updateField("bebidasEnabled", v)}
              />
            </div>
          </div>

          <div className="space-y-4">
            <Label className="text-[10px] font-black uppercase tracking-widest text-text-muted pl-1">Cargos por Empaquetado ($)</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { field: "packagingFeePerPlateUsdCents" as const, label: "Por Plato" },
                { field: "packagingFeePerAdicionalUsdCents" as const, label: "Adicional" },
                { field: "packagingFeePerBebidaUsdCents" as const, label: "Bebida" },
              ].map(({ field, label }) => (
                <div key={field} className="space-y-2">
                  <Label className="text-[11px] font-bold">{label}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={decimalInputs[field]}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDecimalInputs((prev) => ({ ...prev, [field]: val }));
                      const cents = Math.round(parseFloat(val) * 100);
                      if (!isNaN(cents)) updateField(field, cents);
                    }}
                    className="rounded-xl h-9 text-sm"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6 border-none shadow-sm bg-white rounded-2xl">
        <h3 className="text-lg font-bold text-text-main mb-6">Delivery y Cobertura</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-2">
            <Label htmlFor="deliveryFeeUsdCents" className="font-bold">Costo de Delivery ($)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm font-bold">$</span>
              <Input
                id="deliveryFeeUsdCents"
                type="number"
                step="0.01"
                value={decimalInputs.deliveryFeeUsdCents}
                onChange={(e) => {
                  const val = e.target.value;
                  setDecimalInputs((prev) => ({ ...prev, deliveryFeeUsdCents: val }));
                  const cents = Math.round(parseFloat(val) * 100);
                  if (!isNaN(cents)) updateField("deliveryFeeUsdCents", cents);
                }}
                className="pl-7 rounded-xl h-10 text-lg font-mono"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="deliveryCoverage" className="font-bold">Cobertura de Delivery</Label>
            <Input
              id="deliveryCoverage"
              value={form.deliveryCoverage}
              onChange={(e) => updateField("deliveryCoverage", e.target.value)}
              placeholder="Zonas cubiertas..."
              className="rounded-xl h-10"
            />
          </div>
        </div>

        <div className="mt-8 space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="font-bold">Zonas de Delivery (Mesero)</Label>
              <p className="text-[11px] text-text-muted leading-snug">
                Tarifas por zona que el mesero elige al tomar un pedido a domicilio. El costo de delivery fijo de arriba se mantiene para el checkout público.
              </p>
            </div>
            <button
              type="button"
              onClick={addZone}
              className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" /> Agregar zona
            </button>
          </div>
          {form.deliveryZones.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border/60 py-4 text-center text-xs text-text-muted">
              Sin zonas configuradas.
            </p>
          ) : (
            <div className="space-y-2">
              {form.deliveryZones.map((zone, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={zone.label}
                    onChange={(e) => updateZoneLabel(index, e.target.value)}
                    placeholder="Nombre de la zona (ej: Delivery 1)"
                    className="rounded-xl h-10 flex-1"
                  />
                  <div className="relative w-32">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm font-bold">$</span>
                    <Input
                      type="number"
                      step="0.01"
                      value={zonePrices[index] ?? ""}
                      onChange={(e) => updateZonePrice(index, e.target.value)}
                      className="pl-7 rounded-xl h-10 font-mono"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeZone(index)}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/60 text-text-muted transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-500"
                    title="Eliminar zona"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      <Card className="p-6 border-none shadow-sm bg-white rounded-2xl">
        <h3 className="text-lg font-bold text-text-main mb-6">Flujo de Cobro</h3>
        <div className="flex items-center justify-between p-4 rounded-xl bg-bg-app border border-border/40">
          <div className="space-y-1">
            <Label className="text-sm font-bold">Exigir cobro antes de enviar a cocina</Label>
            <p className="text-[11px] text-text-muted leading-snug">
              Si está activo, los pedidos del mesero quedan pendientes hasta cobrarse en caja y solo entonces pasan a cocina. Si está inactivo, el pedido va a cocina de inmediato y el cobro se registra después.
            </p>
          </div>
          <Switch
            checked={form.requirePaymentBeforeKitchen}
            onCheckedChange={(v) => updateField("requirePaymentBeforeKitchen", v)}
          />
        </div>
      </Card>
    </div>
  );
}
