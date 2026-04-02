"use client";

import { TrendingUp, AlertTriangle, Settings } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { SettingsFormData } from "./SettingsForm.types";

interface SettingsGeneralTabProps {
  form: SettingsFormData;
  updateField: <K extends keyof SettingsFormData>(key: K, value: SettingsFormData[K]) => void;
}

export function SettingsGeneralTab({ form, updateField }: SettingsGeneralTabProps) {
  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      <Card className="p-6 border-none shadow-sm bg-white rounded-2xl">
        <h3 className="text-lg font-bold text-text-main mb-6 flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          Información del Restaurante
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="restaurantName">Nombre del Restaurante</Label>
            <Input
              id="restaurantName"
              value={form.restaurantName}
              onChange={(e) => updateField("restaurantName", e.target.value)}
              placeholder="Ej. G&M Restaurante"
              className="rounded-xl border-border/60 focus-visible:ring-primary/20"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="instagramUrl">Instagram URL / Usuario</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">@</span>
              <Input
                id="instagramUrl"
                value={form.instagramUrl.replace(/^@/, "").replace(/https:\/\/instagram.com\//, "")}
                onChange={(e) => updateField("instagramUrl", e.target.value)}
                placeholder="usuario"
                className="pl-7 rounded-xl border-border/60 focus-visible:ring-primary/20"
              />
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6 border-none shadow-sm bg-white rounded-2xl">
        <h3 className="text-lg font-bold text-text-main mb-6 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Divisas y Tasa de Cambio
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 rounded-xl bg-bg-app border border-border/40">
              <div className="space-y-0.5">
                <Label className="text-base font-bold">Mostrar Tasa en Menú</Label>
                <p className="text-xs text-text-muted">Si se desactiva, los precios solo se verán en divisas.</p>
              </div>
              <Switch
                checked={form.showRateInMenu}
                onCheckedChange={(v) => updateField("showRateInMenu", v)}
              />
            </div>
            <div className="space-y-2">
              <Label className="font-bold">Moneda de Referencia</Label>
              <div className="grid grid-cols-2 gap-2">
                {(["usd", "eur"] as const).map((currency) => (
                  <button
                    key={currency}
                    type="button"
                    onClick={() => updateField("rateCurrency", currency)}
                    className={cn(
                      "flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all",
                      form.rateCurrency === currency ? "border-primary bg-primary/5 text-primary font-bold shadow-sm" : "border-border/40 text-text-muted hover:border-border"
                    )}
                  >
                    {currency === "usd" ? "USD ($)" : "EUR (€)"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rateOverrideBsPerUsd" className="font-bold">Tasa Fija (Opcional)</Label>
              <Input
                id="rateOverrideBsPerUsd"
                type="number"
                step="0.01"
                value={form.rateOverrideBsPerUsd}
                onChange={(e) => updateField("rateOverrideBsPerUsd", e.target.value)}
                placeholder="Ej. 36.50"
                className="rounded-xl border-border/60 h-10 text-lg font-mono"
              />
              <p className="text-[11px] text-amber flex items-center gap-1.5 p-2 bg-amber/5 rounded-lg border border-amber/10">
                <AlertTriangle className="h-3.5 w-3.5" />
                Si se deja vacío, se usará la tasa BCV automática.
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
