"use client";

import { CreditCard, Smartphone } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { SettingsFormData } from "./SettingsForm.types";
import { PAYMENT_PROVIDERS } from "./SettingsForm.types";

interface SettingsPaymentsTabProps {
  form: SettingsFormData;
  updateField: <K extends keyof SettingsFormData>(key: K, value: SettingsFormData[K]) => void;
}

export function SettingsPaymentsTab({ form, updateField }: SettingsPaymentsTabProps) {
  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      <Card className="p-6 border-none shadow-sm bg-white rounded-2xl">
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-border/40">
          <h3 className="text-xl font-bold text-text-main flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-primary" />
            Cuentas Bancarias
          </h3>
          <div className="flex gap-6">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-text-muted">Pago Móvil</span>
              <Switch
                checked={form.paymentPagoMovilEnabled}
                onCheckedChange={(v) => updateField("paymentPagoMovilEnabled", v)}
              />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-text-muted">Transferencia</span>
              <Switch
                checked={form.paymentTransferEnabled}
                onCheckedChange={(v) => updateField("paymentTransferEnabled", v)}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="space-y-6">
            <h4 className="font-black text-xs uppercase tracking-[0.2em] text-primary flex items-center gap-2">
              <Smartphone className="h-4 w-4" /> Pago Móvil
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Banco</Label>
                <Input
                  value={form.bankName}
                  onChange={(e) => updateField("bankName", e.target.value)}
                  placeholder="Ej. Mercantil"
                  className="rounded-xl border-border/60"
                />
              </div>
              <div className="space-y-2">
                <Label>Código</Label>
                <Input
                  value={form.bankCode}
                  onChange={(e) => updateField("bankCode", e.target.value)}
                  placeholder="0105"
                  className="rounded-xl border-border/60"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Teléfono Vinculado</Label>
              <Input
                value={form.accountPhone}
                onChange={(e) => updateField("accountPhone", e.target.value)}
                placeholder="04141234567"
                className="rounded-xl border-border/60"
              />
            </div>
            <div className="space-y-2">
              <Label>Cédula o RIF</Label>
              <Input
                value={form.accountRif}
                onChange={(e) => updateField("accountRif", e.target.value)}
                placeholder="V-12345678"
                className="rounded-xl border-border/60"
              />
            </div>
          </div>

          <div className="space-y-6">
            <h4 className="font-black text-xs uppercase tracking-[0.2em] text-primary flex items-center gap-2">
              <CreditCard className="h-4 w-4" /> Transferencia
            </h4>
            <div className="space-y-2">
              <Label>Banco de Destino</Label>
              <Input
                value={form.transferBankName}
                onChange={(e) => updateField("transferBankName", e.target.value)}
                className="rounded-xl border-border/60"
              />
            </div>
            <div className="space-y-2">
              <Label>Nombre del Titular</Label>
              <Input
                value={form.transferAccountName}
                onChange={(e) => updateField("transferAccountName", e.target.value)}
                className="rounded-xl border-border/60"
              />
            </div>
            <div className="space-y-2">
              <Label>Número de Cuenta (20 dígitos)</Label>
              <Input
                value={form.transferAccountNumber}
                onChange={(e) => updateField("transferAccountNumber", e.target.value)}
                className="rounded-xl border-border/60 h-10 text-sm font-mono tracking-wider"
              />
            </div>
            <div className="space-y-2">
              <Label>RIF Comercial</Label>
              <Input
                value={form.transferAccountRif}
                onChange={(e) => updateField("transferAccountRif", e.target.value)}
                className="rounded-xl border-border/60"
              />
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6 border-none shadow-sm bg-white rounded-2xl">
        <h3 className="text-lg font-bold text-text-main mb-6">Configuración de Pasarelas</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="space-y-4">
            <Label className="font-bold">Proveedor de Pago Activo</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PAYMENT_PROVIDERS.map((provider) => (
                <button
                  key={provider.id}
                  type="button"
                  onClick={() => updateField("activePaymentProvider", provider.id)}
                  className={cn(
                    "px-4 py-3 rounded-xl border-2 text-xs font-bold transition-all",
                    form.activePaymentProvider === provider.id ? "border-primary bg-primary/5 text-primary" : "border-border/40 text-text-muted hover:border-border"
                  )}
                >
                  {provider.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-text-muted italic px-1">
              {form.activePaymentProvider === "whatsapp_manual"
                ? "Modo manual: El cliente deberá enviar el comprobante por WhatsApp para su aprobación."
                : "Modo automático: El sistema verificará el pago en tiempo real usando el API del banco."}
            </p>
          </div>

          <div className="space-y-6">
            {form.activePaymentProvider === "bnc_p2c" && (
              <div className="space-y-4 animate-in slide-in-from-top-2">
                <h4 className="font-bold text-sm flex items-center gap-2 text-text-main">
                  <CreditCard className="h-4 w-4 text-primary" /> BNC API Configuration
                </h4>
                <div className="space-y-2">
                  <Label>BNC API Key</Label>
                  <Input
                    type="password"
                    value={form.bncApiKey}
                    onChange={(e) => updateField("bncApiKey", e.target.value)}
                    className="rounded-xl border-border/60"
                  />
                </div>
              </div>
            )}

            {form.activePaymentProvider === "banesco_reference" && (
              <div className="space-y-4 animate-in slide-in-from-top-2">
                <h4 className="font-bold text-sm flex items-center gap-2 text-text-main">
                  <CreditCard className="h-4 w-4 text-primary" /> Banesco Configuration
                </h4>
                <div className="space-y-2">
                  <Label>Banesco API Key / Secret</Label>
                  <Input
                    type="password"
                    value={form.banescoApiKey}
                    onChange={(e) => updateField("banescoApiKey", e.target.value)}
                    className="rounded-xl border-border/60"
                  />
                </div>
              </div>
            )}

            <div className={cn("space-y-4 transition-opacity", form.activePaymentProvider !== "mercantil_c2p" && "opacity-50 pointer-events-none")}>
              <h4 className="font-bold text-sm flex items-center gap-2 text-text-main">
                <CreditCard className="h-4 w-4 text-primary" /> Mercantil API (P2C)
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Client ID</Label>
                  <Input
                    type="password"
                    value={form.mercantilClientId}
                    onChange={(e) => updateField("mercantilClientId", e.target.value)}
                    className="rounded-xl border-border/60"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Client Secret</Label>
                  <Input
                    type="password"
                    value={form.mercantilClientSecret}
                    onChange={(e) => updateField("mercantilClientSecret", e.target.value)}
                    className="rounded-xl border-border/60"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Secret Key</Label>
                <Input
                  type="password"
                  value={form.mercantilSecretKey}
                  onChange={(e) => updateField("mercantilSecretKey", e.target.value)}
                  className="rounded-xl border-border/60"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label className="text-[10px]">Merchant ID</Label>
                  <Input
                    value={form.mercantilMerchantId}
                    onChange={(e) => updateField("mercantilMerchantId", e.target.value)}
                    className="rounded-xl border-border/60 text-xs"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px]">Integrator</Label>
                  <Input
                    value={form.mercantilIntegratorId}
                    onChange={(e) => updateField("mercantilIntegratorId", e.target.value)}
                    className="rounded-xl border-border/60 text-xs"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px]">Terminal</Label>
                  <Input
                    value={form.mercantilTerminalId}
                    onChange={(e) => updateField("mercantilTerminalId", e.target.value)}
                    className="rounded-xl border-border/60 text-xs"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
