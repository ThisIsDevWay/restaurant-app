"use client";

import { useState } from "react";
import { Store, Package, MapPin, Plus, Trash2, ShieldAlert, Cpu, Truck, Printer, Info } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SettingsFormData, PrinterCategoryOption } from "./SettingsForm.types";
import { ORDER_MODES } from "./SettingsForm.types";
import {
  PRINTER_STATIONS,
  STATION_PRESETS,
  type PrinterStation,
  type PrinterSections,
  type PrinterTarget,
} from "@/lib/print/printer-target";

interface SettingsOperationTabProps {
  form: SettingsFormData;
  updateField: <K extends keyof SettingsFormData>(key: K, value: SettingsFormData[K]) => void;
  errors: Partial<Record<keyof SettingsFormData, string>>;
  decimalInputs: Record<string, string>;
  setDecimalInputs: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  categories: PrinterCategoryOption[];
}

const SECTION_LABELS: { key: keyof PrinterSections; label: string }[] = [
  { key: "header", label: "Encabezado" },
  { key: "orderMeta", label: "N°, fecha y mesero" },
  { key: "location", label: "Cliente, mesa y modo" },
  { key: "contactData", label: "Datos de contacto" },
  { key: "totals", label: "Precios y totales" },
  { key: "surcharges", label: "Recargos (empaque/delivery/IGTF)" },
];

const ITEM_MODE_LABELS: { value: PrinterTarget["items"]["mode"]; label: string }[] = [
  { value: "all", label: "Todo el pedido" },
  { value: "drinks", label: "Solo bebidas" },
  { value: "categories", label: "Por categoría" },
];

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
  categories,
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

  const printerTargets: PrinterTarget[] = form.printerTargets?.length
    ? form.printerTargets
    : [{ ...STATION_PRESETS.cashier, name: "main", station: "cashier", copies: 1, reprintCopies: 1, enabled: true }];

  const setPrinters = (next: PrinterTarget[]) => updateField("printerTargets", next);

  const addPrinter = () => {
    setPrinters([
      ...printerTargets,
      { name: "", station: "kitchen", ...STATION_PRESETS.kitchen, copies: 1, reprintCopies: 1, enabled: true },
    ]);
  };

  const removePrinter = (index: number) => {
    setPrinters(printerTargets.filter((_, i) => i !== index));
  };

  const updatePrinter = <K extends keyof PrinterTarget>(index: number, key: K, value: PrinterTarget[K]) => {
    setPrinters(printerTargets.map((p, i) => (i === index ? { ...p, [key]: value } : p)));
  };

  // Cambiar de lugar aplica el preset (items + secciones) de esa estación.
  const changeStation = (index: number, station: PrinterStation) => {
    setPrinters(
      printerTargets.map((p, i) =>
        i === index
          ? { ...p, station, items: { ...STATION_PRESETS[station].items }, sections: { ...STATION_PRESETS[station].sections } }
          : p,
      ),
    );
  };

  const updateItemMode = (index: number, mode: PrinterTarget["items"]["mode"]) => {
    setPrinters(
      printerTargets.map((p, i) =>
        i === index ? { ...p, items: { mode, categoryIds: mode === "categories" ? p.items.categoryIds : [] } } : p,
      ),
    );
  };

  const toggleCategory = (index: number, categoryId: string) => {
    setPrinters(
      printerTargets.map((p, i) => {
        if (i !== index) return p;
        const has = p.items.categoryIds.includes(categoryId);
        return {
          ...p,
          items: {
            mode: "categories",
            categoryIds: has
              ? p.items.categoryIds.filter((c) => c !== categoryId)
              : [...p.items.categoryIds, categoryId],
          },
        };
      }),
    );
  };

  const toggleSection = (index: number, key: keyof PrinterSections) => {
    setPrinters(
      printerTargets.map((p, i) =>
        i === index ? { ...p, sections: { ...p.sections, [key]: !p.sections[key] } } : p,
      ),
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      <Card className="p-6 border border-border/40 shadow-sm bg-white rounded-2xl hover:border-border/60 transition-all duration-200">
        <h3 className="text-lg font-bold text-text-main mb-2 flex items-center gap-2">
          <Store className="h-5 w-5 text-primary" />
          Canales de Venta Activos
        </h3>
        <p className="text-text-muted text-xs mb-6">
          Activa o desactiva los modos de pedido disponibles para tus clientes en el menú digital y el punto de venta.
        </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {ORDER_MODES.map((mode) => {
            const Icon = ORDER_MODE_ICONS[mode.id];
            const isEnabled = form[mode.id];
            return (
              <div
                key={mode.id}
                onClick={() => updateField(mode.id, !isEnabled)}
                className={cn(
                  "flex flex-col sm:items-center justify-between gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all duration-200 hover:shadow-md hover:border-border select-none relative",
                  isEnabled 
                    ? "border-primary bg-primary/5/10 shadow-sm" 
                    : "border-border/40 bg-bg-app/10 opacity-70 grayscale hover:grayscale-0 hover:opacity-100"
                )}
              >
                <div className="flex items-center sm:flex-col gap-3 sm:gap-4 w-full">
                  <div className={cn(
                    "p-3 rounded-xl transition-colors shrink-0",
                    isEnabled ? "bg-primary text-white" : "bg-bg-app text-text-muted"
                  )}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1 sm:text-center">
                    <span className="font-bold text-sm text-text-main block">{mode.label}</span>
                    <span className="text-[10px] text-text-muted hidden sm:block mt-1">
                      {isEnabled ? "Activo" : "Inactivo"}
                    </span>
                  </div>
                  
                  <div className="shrink-0 sm:absolute sm:top-4 sm:right-4">
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={(v) => updateField(mode.id, v)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="p-6 border border-border/40 shadow-sm bg-white rounded-2xl hover:border-border/60 transition-all duration-200">
        <h3 className="text-lg font-bold text-text-main mb-2 flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-primary" />
          Restricciones y Capacidad
        </h3>
        <p className="text-text-muted text-xs mb-6">
          Establece los límites operacionales para el procesamiento de pedidos, controlando la saturación de la cocina.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="space-y-1.5">
            <Label htmlFor="maxQuantityPerItem" className="text-xs font-bold text-text-muted uppercase tracking-wider">
              Límite de Items por Plato
            </Label>
            <Input
              id="maxQuantityPerItem"
              type="number"
              value={form.maxQuantityPerItem}
              onChange={(e) => updateField("maxQuantityPerItem", parseInt(e.target.value))}
              className="rounded-xl focus-visible:ring-primary/20 h-10 text-sm font-semibold font-mono"
            />
            {errors.maxQuantityPerItem && <p className="text-xs text-red-500 font-medium">{errors.maxQuantityPerItem}</p>}
            <p className="text-[10px] text-text-muted leading-tight">Cantidad máxima permitida por plato individual.</p>
          </div>
          
          <div className="space-y-1.5">
            <Label htmlFor="orderExpirationMinutes" className="text-xs font-bold text-text-muted uppercase tracking-wider">
              Expiración de Pedido (Minutos)
            </Label>
            <Input
              id="orderExpirationMinutes"
              type="number"
              value={form.orderExpirationMinutes}
              onChange={(e) => updateField("orderExpirationMinutes", parseInt(e.target.value))}
              className="rounded-xl focus-visible:ring-primary/20 h-10 text-sm font-semibold font-mono"
            />
            {errors.orderExpirationMinutes && <p className="text-xs text-red-500 font-medium">{errors.orderExpirationMinutes}</p>}
            <p className="text-[10px] text-text-muted leading-tight">Tiempo para pagar el pedido antes de expirar.</p>
          </div>
          
          <div className="space-y-1.5">
            <Label htmlFor="maxPendingOrders" className="text-xs font-bold text-text-muted uppercase tracking-wider">
              Cola Máxima de Pendientes
            </Label>
            <Input
              id="maxPendingOrders"
              type="number"
              value={form.maxPendingOrders}
              onChange={(e) => updateField("maxPendingOrders", parseInt(e.target.value))}
              className="rounded-xl focus-visible:ring-primary/20 h-10 text-sm font-semibold font-mono"
            />
            {errors.maxPendingOrders && <p className="text-xs text-red-500 font-medium">{errors.maxPendingOrders}</p>}
            <p className="text-[10px] text-text-muted leading-tight">Límite de órdenes pendientes toleradas en simultáneo.</p>
          </div>
        </div>
      </Card>

      <Card className="p-6 border border-border/40 shadow-sm bg-white rounded-2xl hover:border-border/60 transition-all duration-200">
        <h3 className="text-lg font-bold text-text-main mb-2 flex items-center gap-2">
          <Cpu className="h-5 w-5 text-primary" />
          Ingredientes y Cargos de Empaque
        </h3>
        <p className="text-text-muted text-xs mb-6">
          Habilita los pools de ingredientes y configura las tarifas para el costo de los recipientes y el empaquetado.
        </p>
        
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-bg-app/40 border border-border/20 hover:border-border/40 transition-colors">
              <div className="space-y-0.5 pr-2">
                <Label className="text-sm font-bold text-text-main cursor-pointer">Habilitar Adicionales</Label>
                <p className="text-[10px] text-text-muted leading-snug">
                  Permite ingredientes extra directamente en el detalle de compra del plato.
                </p>
              </div>
              <Switch
                checked={form.adicionalesEnabled}
                onCheckedChange={(v) => updateField("adicionalesEnabled", v)}
              />
            </div>
            
            <div className="flex items-center justify-between p-4 rounded-xl bg-bg-app/40 border border-border/20 hover:border-border/40 transition-colors">
              <div className="space-y-0.5 pr-2">
                <Label className="text-sm font-bold text-text-main cursor-pointer">Habilitar Bebidas</Label>
                <p className="text-[10px] text-text-muted leading-snug">
                  Muestra la sección de bebidas dentro del plato, ideal para combos de comida rápida.
                </p>
              </div>
              <Switch
                checked={form.bebidasEnabled}
                onCheckedChange={(v) => updateField("bebidasEnabled", v)}
              />
            </div>
          </div>

          <div className="lg:col-span-3 space-y-3.5 bg-bg-app/30 p-4 rounded-2xl border border-border/20">
            <Label className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-1">
              Cargos por Empaquetado ($ USD)
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { field: "packagingFeePerPlateUsdCents" as const, label: "Por Plato Base" },
                { field: "packagingFeePerAdicionalUsdCents" as const, label: "Por Adicional" },
                { field: "packagingFeePerBebidaUsdCents" as const, label: "Por Bebida" },
              ].map(({ field, label }) => (
                <div key={field} className="space-y-1.5 bg-white p-3 rounded-xl border border-border/20 hover:border-border/40 transition-colors">
                  <Label className="text-[11px] font-bold text-text-main">{label}</Label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted text-[11px] font-bold">$</span>
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
                      className="pl-5 rounded-lg h-8 text-xs font-mono font-semibold"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6 border border-border/40 shadow-sm bg-white rounded-2xl hover:border-border/60 transition-all duration-200">
        <h3 className="text-lg font-bold text-text-main mb-2 flex items-center gap-2">
          <Truck className="h-5 w-5 text-primary" />
          Delivery y Cobertura de Entrega
        </h3>
        <p className="text-text-muted text-xs mb-6">
          Establece los costos de envío a domicilio generales, zonas con recargo especial y la descripción de tu alcance.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <Label htmlFor="deliveryFeeUsdCents" className="text-xs font-bold text-text-muted uppercase tracking-wider">Costo General de Delivery ($)</Label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted text-sm font-bold">$</span>
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
                className="pl-7 rounded-xl h-10 text-sm font-semibold font-mono"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="deliveryCoverage" className="text-xs font-bold text-text-muted uppercase tracking-wider">Descripción de Cobertura</Label>
            <Input
              id="deliveryCoverage"
              value={form.deliveryCoverage}
              onChange={(e) => updateField("deliveryCoverage", e.target.value)}
              placeholder="Ej. Zonas Centro, Norte, Av. Bolívar..."
              className="rounded-xl h-10 text-sm"
            />
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-border/40 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <Label className="text-sm font-bold text-text-main">Zonas de Entrega Especiales (Uso del Mesero)</Label>
              <p className="text-[11px] text-text-muted leading-tight">
                Permite al personal seleccionar zonas personalizadas con tarifas de delivery diferentes al tomar un pedido.
              </p>
            </div>
            <Button
              type="button"
              onClick={addZone}
              className="flex items-center gap-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-xs font-bold text-primary px-4 h-9 active:scale-95 transition-all self-start sm:self-auto"
            >
              <Plus className="h-4 w-4" /> Agregar Zona
            </Button>
          </div>

          {form.deliveryZones.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/60 py-8 text-center bg-bg-app/10">
              <Info className="h-5 w-5 text-text-muted mx-auto mb-2 opacity-50" />
              <p className="text-xs text-text-muted font-medium">Sin zonas de entrega adicionales configuradas.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1 no-scrollbar">
              {form.deliveryZones.map((zone, index) => (
                <div 
                  key={index} 
                  className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 p-3 rounded-xl bg-bg-app/40 border border-border/20 hover:border-border/40 hover:bg-bg-app/60 transition-all duration-200"
                >
                  <Input
                    value={zone.label}
                    onChange={(e) => updateZoneLabel(index, e.target.value)}
                    placeholder="Nombre de la zona (ej: Zona 1)"
                    className="rounded-lg h-9 text-xs flex-1"
                  />
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="relative w-24">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted text-xs font-bold">$</span>
                      <Input
                        type="number"
                        step="0.01"
                        value={zonePrices[index] ?? ""}
                        onChange={(e) => updateZonePrice(index, e.target.value)}
                        className="pl-5 rounded-lg h-9 text-xs font-mono font-semibold"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeZone(index)}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/40 text-text-muted hover:border-red-300 hover:bg-red-50 hover:text-red-500 transition-colors shrink-0 cursor-pointer"
                      title="Eliminar zona"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      <Card className="p-6 border border-border/40 shadow-sm bg-white rounded-2xl hover:border-border/60 transition-all duration-200 space-y-6">
        <div>
          <h3 className="text-lg font-bold text-text-main mb-2 flex items-center gap-2">
            <Printer className="h-5 w-5 text-primary" />
            Flujo de Cocina e Impresoras Térmicas
          </h3>
          <p className="text-text-muted text-xs">
            Configura si los pedidos requieren confirmación de pago antes de ir a cocina, y gestiona las impresoras térmicas.
          </p>
        </div>

        <div className="flex items-center justify-between p-4 rounded-xl bg-bg-app/40 border border-border/20 hover:border-border/40 transition-colors">
          <div className="space-y-0.5 pr-2">
            <Label className="text-sm font-bold text-text-main cursor-pointer flex items-center gap-2">
              Exigir cobro antes de enviar a cocina
            </Label>
            <p className="text-[11px] text-text-muted leading-snug">
              Si está activo, los pedidos quedan pendientes en caja y solo pasan a cocina al confirmarse el cobro.
            </p>
          </div>
          <Switch
            checked={form.requirePaymentBeforeKitchen}
            onCheckedChange={(v) => updateField("requirePaymentBeforeKitchen", v)}
          />
        </div>

        <div className="h-px bg-border/20" />

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-bold text-text-main">Administrador de Impresoras Locales</h4>
              <p className="text-[10px] text-text-muted leading-snug">
                Configura los nombres de las impresoras térmicas tal cual se registran en tu sistema operativo Windows.
              </p>
            </div>
            <Button
              type="button"
              onClick={addPrinter}
              className="flex items-center gap-1.5 rounded-xl bg-primary px-4 h-9 text-xs font-bold text-white shadow-sm hover:bg-primary/95 transition-all self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" /> Agregar Impresora
            </Button>
          </div>

          <div className="space-y-3">
            {printerTargets.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-border/60 rounded-2xl bg-bg-app/10">
                <Info className="h-5 w-5 text-text-muted mx-auto mb-2 opacity-50" />
                <p className="text-xs text-text-muted font-medium">No hay impresoras conectadas. Se usará la configuración por defecto.</p>
              </div>
            ) : (
              printerTargets.map((printer, index) => (
                <div
                  key={index}
                  className="p-4 rounded-2xl bg-bg-app/20 border border-border/20 hover:border-border/50 transition-all duration-200 space-y-4"
                >
                  {/* Fila 1: nombre + lugar + activa + eliminar */}
                  <div className="flex flex-col md:flex-row md:items-end gap-4">
                    <div className="flex-1 space-y-1">
                      <Label htmlFor={`printer-name-${index}`} className="text-[11px] font-bold text-text-muted uppercase tracking-wider">
                        Nombre de la Impresora en Windows
                      </Label>
                      <Input
                        id={`printer-name-${index}`}
                        placeholder="Ej: POS-80-Caja"
                        value={printer.name}
                        onChange={(e) => updatePrinter(index, "name", e.target.value)}
                        className="rounded-lg h-9 text-xs font-semibold"
                      />
                    </div>

                    <div className="space-y-1 w-full md:w-44">
                      <Label className="text-[11px] font-bold text-text-muted uppercase tracking-wider block">
                        Lugar
                      </Label>
                      <select
                        value={printer.station}
                        onChange={(e) => changeStation(index, e.target.value as PrinterStation)}
                        className="w-full rounded-lg h-9 text-xs font-semibold border border-border/40 bg-white px-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                      >
                        {PRINTER_STATIONS.map((s) => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-border/20 h-9">
                        <Switch
                          checked={printer.enabled}
                          onCheckedChange={(v) => updatePrinter(index, "enabled", v)}
                          className="scale-90"
                        />
                        <Label className="text-xs font-bold text-text-main cursor-pointer select-none">Activa</Label>
                      </div>
                      <button
                        type="button"
                        onClick={() => removePrinter(index)}
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/40 text-text-muted hover:border-red-300 hover:bg-red-50 hover:text-red-500 transition-colors cursor-pointer shrink-0"
                        title="Eliminar impresora"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Fila 2: copias */}
                  <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center">
                    <div className="space-y-1 w-full sm:w-32">
                      <Label htmlFor={`printer-copies-${index}`} className="text-[11px] font-bold text-text-muted uppercase tracking-wider block">
                        Copias
                      </Label>
                      <Input
                        id={`printer-copies-${index}`}
                        type="number"
                        min={1}
                        max={10}
                        value={printer.copies}
                        onChange={(e) => updatePrinter(index, "copies", Math.max(1, parseInt(e.target.value) || 1))}
                        className="rounded-lg h-9 text-xs font-semibold font-mono text-center"
                      />
                    </div>
                    <div className="space-y-1 w-full sm:w-32">
                      <Label htmlFor={`printer-reprint-copies-${index}`} className="text-[11px] font-bold text-text-muted uppercase tracking-wider block">
                        Copias (Reimpr.)
                      </Label>
                      <Input
                        id={`printer-reprint-copies-${index}`}
                        type="number"
                        min={1}
                        max={10}
                        value={printer.reprintCopies ?? 1}
                        onChange={(e) => updatePrinter(index, "reprintCopies", Math.max(1, parseInt(e.target.value) || 1))}
                        className="rounded-lg h-9 text-xs font-semibold font-mono text-center"
                      />
                    </div>
                  </div>

                  {/* Fila 3: qué imprime */}
                  <div className="space-y-2">
                    <Label className="text-[11px] font-bold text-text-muted uppercase tracking-wider block">
                      Qué imprime
                    </Label>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex flex-wrap gap-1.5">
                        {ITEM_MODE_LABELS.map((m) => (
                          <button
                            key={m.value}
                            type="button"
                            onClick={() => updateItemMode(index, m.value)}
                            className={cn(
                              "px-3 h-8 rounded-lg text-[11px] font-bold border transition-colors",
                              printer.items.mode === m.value
                                ? "bg-primary text-white border-primary"
                                : "bg-white text-text-muted border-border/40 hover:border-border",
                            )}
                          >
                            {m.label}
                          </button>
                        ))}
                      </div>

                      {printer.station === "kitchen" && (
                        <label className="flex items-center gap-2 bg-white px-3 h-8 rounded-lg border border-border/20 cursor-pointer select-none">
                          <Switch
                            checked={!!printer.items.includeDrinks}
                            onCheckedChange={(v) =>
                              updatePrinter(index, "items", {
                                ...printer.items,
                                includeDrinks: v,
                              })
                            }
                            className="scale-75"
                          />
                          <span className="text-[11px] font-bold text-text-main leading-tight">
                            Con Bebidas
                          </span>
                        </label>
                      )}
                    </div>
                    {printer.items.mode === "categories" && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {categories.length === 0 ? (
                          <p className="text-[11px] text-text-muted italic">No hay categorías configuradas.</p>
                        ) : (
                          categories.map((cat) => {
                            const active = printer.items.categoryIds.includes(cat.id);
                            return (
                              <button
                                key={cat.id}
                                type="button"
                                onClick={() => toggleCategory(index, cat.id)}
                                className={cn(
                                  "px-2.5 h-7 rounded-full text-[11px] font-semibold border transition-colors",
                                  active
                                    ? "bg-primary/10 text-primary border-primary/30"
                                    : "bg-white text-text-muted border-border/40 hover:border-border",
                                )}
                              >
                                {cat.name}
                              </button>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>

                  {/* Fila 4: secciones */}
                  <div className="space-y-2">
                    <Label className="text-[11px] font-bold text-text-muted uppercase tracking-wider block">
                      Secciones del ticket
                    </Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {SECTION_LABELS.map((s) => (
                        <label
                          key={s.key}
                          className="flex items-center gap-2 bg-white px-2.5 py-1.5 rounded-lg border border-border/20 cursor-pointer select-none"
                        >
                          <Switch
                            checked={printer.sections[s.key]}
                            onCheckedChange={() => toggleSection(index, s.key)}
                            className="scale-75"
                          />
                          <span className="text-[11px] font-semibold text-text-main leading-tight">{s.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
