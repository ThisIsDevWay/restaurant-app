"use client";
 
import { TrendingUp, AlertTriangle, Coins, FileText } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { SettingsFormData, FormErrors } from "./SettingsForm.types";
 
interface SettingsGeneralTabProps {
  form: SettingsFormData;
  errors?: FormErrors;
  updateField: <K extends keyof SettingsFormData>(key: K, value: SettingsFormData[K]) => void;
}
 
export function SettingsGeneralTab({ form, updateField, errors = {} }: SettingsGeneralTabProps) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Card 1: Moneda y Visualización */}
        <Card className="p-6 border border-border/40 shadow-sm bg-white rounded-2xl flex flex-col justify-between hover:border-border/60 transition-all duration-200">
          <div>
            <h3 className="text-lg font-bold text-text-main mb-5 flex items-center gap-2">
              <Coins className="h-5 w-5 text-primary" />
              Moneda y Exhibición
            </h3>
            <p className="text-xs text-text-muted mb-6">
              Configura la moneda base del catálogo de tu restaurante y cómo se presentará en el menú de cara al cliente.
            </p>
            
            <div className="space-y-5">
              {/* Switch Mostrar Tasa */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-bg-app/40 border border-border/20 hover:border-border/40 transition-colors">
                <div className="space-y-0.5 pr-2">
                  <Label className="text-sm font-bold text-text-main cursor-pointer">Mostrar Tasa en Menú</Label>
                  <p className="text-[11px] text-text-muted">Si se desactiva, los precios solo se verán en divisas.</p>
                </div>
                <Switch
                  checked={form.showRateInMenu}
                  onCheckedChange={(v) => updateField("showRateInMenu", v)}
                />
              </div>
              
              {/* Moneda de Referencia */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-text-muted uppercase tracking-wider">Moneda de Referencia</Label>
                <div className="grid grid-cols-2 gap-3">
                  {(["usd", "eur"] as const).map((currency) => (
                    <button
                      key={currency}
                      type="button"
                      onClick={() => updateField("rateCurrency", currency)}
                      className={cn(
                        "flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-bold transition-all duration-200 active:scale-95 cursor-pointer text-sm",
                        form.rateCurrency === currency 
                          ? "border-primary bg-primary/5 text-primary shadow-sm" 
                          : "border-border/30 text-text-muted hover:border-border/80 hover:bg-bg-app/30"
                      )}
                    >
                      {currency === "usd" ? "USD ($)" : "EUR (€)"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Card>
 
        {/* Card 2: Divisas y Tasa de Cambio */}
        <Card className="p-6 border border-border/40 shadow-sm bg-white rounded-2xl flex flex-col justify-between hover:border-border/60 transition-all duration-200">
          <div>
            <h3 className="text-lg font-bold text-text-main mb-5 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Tasa de Cambio Oficial
            </h3>
            <p className="text-xs text-text-muted mb-6">
              Establece una tasa de cambio fija para la conversión de divisas, o deja el campo vacío para utilizar la tasa del BCV automáticamente.
            </p>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rateOverrideBsPerUsd" className="text-xs font-bold text-text-muted uppercase tracking-wider">
                  Tasa Fija Opcional (Bs.)
                </Label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted text-sm font-bold">Bs.</span>
                  <Input
                    id="rateOverrideBsPerUsd"
                    type="number"
                    step="0.01"
                    value={form.rateOverrideBsPerUsd}
                    onChange={(e) => updateField("rateOverrideBsPerUsd", e.target.value)}
                    placeholder="Ej. 36.50"
                    className="pl-10 rounded-xl border-border/60 focus-visible:ring-primary/20 h-11 text-base font-mono font-bold"
                  />
                </div>
              </div>
 
              <div className="flex items-start gap-2.5 p-3.5 bg-amber/5 rounded-xl border border-amber/10 text-amber mt-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-snug font-medium">
                  <strong>Nota del sistema:</strong> Si dejas este campo vacío, el menú utilizará de forma automática la tasa oficial del día del Banco Central de Venezuela (BCV).
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
 
      {/* Card 3: Impuesto IGTF */}
      <Card className="p-6 border border-border/40 shadow-sm bg-white rounded-2xl hover:border-border/60 transition-all duration-200">
        <h3 className="text-lg font-bold text-text-main mb-5 flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Impuesto de Transacciones (IGTF)
        </h3>
        <p className="text-xs text-text-muted mb-6">
          Habilita y personaliza el recargo del Impuesto a las Grandes Transacciones Financieras aplicable a los pagos recibidos en divisas.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          <div className="md:col-span-2 flex items-center justify-between p-4 rounded-xl bg-bg-app/40 border border-border/20 hover:border-border/40 transition-colors">
            <div className="space-y-0.5 pr-2">
              <Label className="text-sm font-bold text-text-main cursor-pointer flex items-center gap-2">
                Aplicar Recargo IGTF
              </Label>
              <p className="text-[11px] text-text-muted">Aplica un porcentaje adicional a las facturas que sean pagadas en divisas.</p>
            </div>
            <Switch
              checked={form.applyIgtf}
              onCheckedChange={(v) => updateField("applyIgtf", v)}
            />
          </div>
 
          <div className="space-y-2">
            <Label htmlFor="igtfPercentage" className="text-xs font-bold text-text-muted uppercase tracking-wider">
              Porcentaje del Recargo (%)
            </Label>
            <div className="relative">
              <Input
                id="igtfPercentage"
                type="number"
                step="0.01"
                min="0"
                value={form.igtfPercentage}
                onChange={(e) => updateField("igtfPercentage", e.target.value)}
                placeholder="3.00"
                className="rounded-xl border-border/60 focus-visible:ring-primary/20 h-11 text-base font-mono font-bold pr-8"
                disabled={!form.applyIgtf}
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted text-sm font-bold">%</span>
            </div>
            <p className="text-[10px] text-text-muted">
              Porcentaje oficial por defecto: 3.00%.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

