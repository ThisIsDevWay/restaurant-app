"use client";
 
import { CreditCard, Smartphone, DollarSign, Bitcoin, Banknote, ShieldCheck, Key, Settings, Info, Copy, RefreshCw } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { SettingsFormData } from "./SettingsForm.types";
import { PAYMENT_PROVIDERS } from "./SettingsForm.types";
import { generateDeviceTokenAction } from "@/actions/settings";
 
interface SettingsPaymentsTabProps {
  form: SettingsFormData;
  updateField: <K extends keyof SettingsFormData>(key: K, value: SettingsFormData[K]) => void;
}
 
interface PaymentSectionProps {
  enabled: boolean;
  onToggle: (v: boolean) => void;
  icon: React.ReactNode;
  title: string;
  badge?: string;
  children?: React.ReactNode;
  note?: string;
}
 
function PaymentSection({ enabled, onToggle, icon, title, badge, children, note }: PaymentSectionProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border transition-all duration-300 overflow-hidden",
        enabled 
          ? "border-primary/20 bg-white shadow-sm" 
          : "border-border/40 bg-bg-app/10 opacity-70 hover:opacity-100 hover:border-border/60"
      )}
    >
      {/* Header row */}
      <div 
        onClick={() => onToggle(!enabled)}
        className="flex items-center justify-between px-5 py-4 cursor-pointer select-none"
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center transition-colors shrink-0",
              enabled ? "bg-primary text-white" : "bg-bg-app text-text-muted"
            )}
          >
            {icon}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn("font-bold text-[14px]", enabled ? "text-text-main" : "text-text-muted")}>
              {title}
            </span>
            {badge && (
              <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                {badge}
              </span>
            )}
          </div>
        </div>
        <Switch 
          checked={enabled} 
          onCheckedChange={onToggle} 
          onClick={(e) => e.stopPropagation()}
        />
      </div>
 
      {/* Body */}
      {enabled && (children || note) && (
        <div className="px-5 pb-5 border-t border-border/20 pt-4 space-y-4 bg-bg-app/5">
          {note && (
            <p className="text-xs text-text-muted bg-surface-section/40 rounded-xl px-3 py-2.5 font-medium leading-relaxed italic border border-border/20">
              {note}
            </p>
          )}
          {children}
        </div>
      )}
    </div>
  );
}
 
export function SettingsPaymentsTab({ form, updateField }: SettingsPaymentsTabProps) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
 
      {/* ── Métodos de Pago ── */}
      <Card className="p-6 border border-border/40 shadow-sm bg-white rounded-2xl hover:border-border/60 transition-all duration-200">
        <h3 className="text-lg font-bold text-text-main mb-2 flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          Cuentas y Métodos de Cobro
        </h3>
        <p className="text-text-muted text-xs mb-6">
          Activa y configura los datos de cobro de los diferentes métodos de pago disponibles en tu checkout público.
        </p>
 
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 
          {/* Pago Móvil C2P */}
          <div className="md:col-span-2">
            <PaymentSection
              enabled={form.paymentPagoMovilEnabled}
              onToggle={(v) => updateField("paymentPagoMovilEnabled", v)}
              icon={<Smartphone className="h-4.5 w-4.5" />}
              title="Pago Móvil Bs."
              badge="INSTANTÁNEO"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-text-muted uppercase tracking-wider">Banco Receptor</Label>
                  <Input
                    value={form.bankName}
                    onChange={(e) => updateField("bankName", e.target.value)}
                    placeholder="Ej. Mercantil"
                    className="rounded-xl border-border/60 focus-visible:ring-primary/20 h-10 text-sm font-semibold"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-text-muted uppercase tracking-wider">Código del Banco</Label>
                  <Input
                    value={form.bankCode}
                    onChange={(e) => updateField("bankCode", e.target.value)}
                    placeholder="Ej. 0105"
                    className="rounded-xl border-border/60 focus-visible:ring-primary/20 h-10 text-sm font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-text-muted uppercase tracking-wider">Teléfono Vinculado</Label>
                  <Input
                    value={form.accountPhone}
                    onChange={(e) => updateField("accountPhone", e.target.value)}
                    placeholder="Ej. 04141234567"
                    className="rounded-xl border-border/60 focus-visible:ring-primary/20 h-10 text-sm font-semibold"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-text-muted uppercase tracking-wider">RIF o Cédula del Titular</Label>
                  <Input
                    value={form.accountRif}
                    onChange={(e) => updateField("accountRif", e.target.value)}
                    placeholder="Ej. V-12345678 o J-12345678-9"
                    className="rounded-xl border-border/60 focus-visible:ring-primary/20 h-10 text-sm font-semibold"
                  />
                </div>
              </div>
            </PaymentSection>
          </div>
 
          {/* Transferencia Bancaria Bs */}
          <PaymentSection
            enabled={form.paymentTransferEnabled}
            onToggle={(v) => updateField("paymentTransferEnabled", v)}
            icon={<CreditCard className="h-4.5 w-4.5" />}
            title="Transferencia Bancaria"
            badge="Bs."
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-text-muted uppercase tracking-wider">Banco de Destino</Label>
                  <Input
                    value={form.transferBankName}
                    onChange={(e) => updateField("transferBankName", e.target.value)}
                    placeholder="Ej. Banesco"
                    className="rounded-xl border-border/60 focus-visible:ring-primary/20 h-10 text-sm font-semibold"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-text-muted uppercase tracking-wider">RIF o Cédula</Label>
                  <Input
                    value={form.transferAccountRif}
                    onChange={(e) => updateField("transferAccountRif", e.target.value)}
                    placeholder="Ej. J-12345678-9"
                    className="rounded-xl border-border/60 focus-visible:ring-primary/20 h-10 text-sm font-semibold"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-text-muted uppercase tracking-wider">Nombre del Titular</Label>
                <Input
                  value={form.transferAccountName}
                  onChange={(e) => updateField("transferAccountName", e.target.value)}
                  className="rounded-xl border-border/60 focus-visible:ring-primary/20 h-10 text-sm font-semibold"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-text-muted uppercase tracking-wider">Número de Cuenta (20 dígitos)</Label>
                <Input
                  value={form.transferAccountNumber}
                  onChange={(e) => updateField("transferAccountNumber", e.target.value)}
                  placeholder="01050000000000000000"
                  className="rounded-xl border-border/60 focus-visible:ring-primary/20 font-mono tracking-widest text-xs h-10 text-center font-bold"
                />
              </div>
            </div>
          </PaymentSection>
 
          {/* Zelle */}
          <PaymentSection
            enabled={form.paymentZelleEnabled}
            onToggle={(v) => updateField("paymentZelleEnabled", v)}
            icon={<DollarSign className="h-4.5 w-4.5" />}
            title="Zelle"
            badge="USD"
          >
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-text-muted uppercase tracking-wider">Correo Electrónico Zelle</Label>
                <Input
                  value={form.zelleEmail}
                  onChange={(e) => updateField("zelleEmail", e.target.value)}
                  placeholder="ejemplo@zelle.com"
                  type="email"
                  className="rounded-xl border-border/60 focus-visible:ring-primary/20 h-10 text-sm font-semibold"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-text-muted uppercase tracking-wider">Nombre del Titular</Label>
                <Input
                  value={form.zelleName}
                  onChange={(e) => updateField("zelleName", e.target.value)}
                  placeholder="Nombre completo del beneficiario"
                  className="rounded-xl border-border/60 focus-visible:ring-primary/20 h-10 text-sm font-semibold"
                />
              </div>
            </div>
          </PaymentSection>
 
          {/* Binance Pay */}
          <PaymentSection
            enabled={form.paymentBinanceEnabled}
            onToggle={(v) => updateField("paymentBinanceEnabled", v)}
            icon={<Bitcoin className="h-4.5 w-4.5" />}
            title="Binance Pay"
            badge="USDT"
          >
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-text-muted uppercase tracking-wider">Binance Pay ID</Label>
                <Input
                  value={form.binancePayId}
                  onChange={(e) => updateField("binancePayId", e.target.value)}
                  placeholder="Ej. 123456789"
                  className="rounded-xl border-border/60 focus-visible:ring-primary/20 font-mono h-10 text-sm text-center font-bold"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-text-muted uppercase tracking-wider">Correo o Teléfono Binance</Label>
                <Input
                  value={form.binanceEmail}
                  onChange={(e) => updateField("binanceEmail", e.target.value)}
                  placeholder="ejemplo@correo.com o +58414..."
                  className="rounded-xl border-border/60 focus-visible:ring-primary/20 h-10 text-sm font-semibold"
                />
              </div>
            </div>
          </PaymentSection>
 
          {/* Efectivo USD */}
          <PaymentSection
            enabled={form.paymentEfectivoEnabled}
            onToggle={(v) => updateField("paymentEfectivoEnabled", v)}
            icon={<Banknote className="h-4.5 w-4.5" />}
            title="Efectivo en Dólares"
            badge="USD"
            note="No requiere datos bancarios. El cliente paga directamente en caja o al despachador al recibir la orden."
          >
            <div className="space-y-3">
              <Label className="text-[10px] font-bold text-text-muted uppercase tracking-widest block mb-1">
                Opciones Adicionales del Checkout
              </Label>
 
              <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-white border border-border/20 hover:border-border/40 transition-colors">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-text-main leading-tight">Preguntar: &quot;¿Con cuánto pagarás?&quot;</p>
                  <p className="text-[10px] text-text-muted">Muestra un campo numérico para especificar el monto a pagar en dólares.</p>
                </div>
                <Switch
                  checked={form.efectivoAskCashAmount}
                  onCheckedChange={(v) => updateField("efectivoAskCashAmount", v)}
                />
              </div>
 
              <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-white border border-border/20 hover:border-border/40 transition-colors">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-text-main leading-tight">Preguntar: &quot;¿Aceptas vuelto en Bs. (BCV)?&quot;</p>
                  <p className="text-[10px] text-text-muted">Consulta si prefiere cambio en bolívares o pagar exacto.</p>
                </div>
                <Switch
                  checked={form.efectivoAskChangeBs}
                  onCheckedChange={(v) => updateField("efectivoAskChangeBs", v)}
                />
              </div>
            </div>
          </PaymentSection>
 
        </div>
      </Card>
 
      {/* ── Pasarelas de Pago e Integraciones ── */}
      <Card className="p-6 border border-border/40 shadow-sm bg-white rounded-2xl hover:border-border/60 transition-all duration-200">
        <h3 className="text-lg font-bold text-text-main mb-2 flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Pasarelas e Integración Bancaria
        </h3>
        <p className="text-text-muted text-xs mb-6">
          Selecciona el proveedor de pagos activo en tu checkout público y administra las credenciales de API para la conciliación automática.
        </p>
        
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          
          {/* Selector de Pasarela Activa */}
          <div className="lg:col-span-2 space-y-4">
            <Label className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-1">Proveedor de Pago Activo</Label>
            <div className="grid grid-cols-1 gap-2.5">
              {PAYMENT_PROVIDERS.map((provider) => {
                const isActive = form.activePaymentProvider === provider.id;
                return (
                  <button
                    key={provider.id}
                    type="button"
                    onClick={() => updateField("activePaymentProvider", provider.id)}
                    className={cn(
                      "px-4 py-3 rounded-xl border-2 text-xs font-bold text-left transition-all duration-200 cursor-pointer flex items-center justify-between active:scale-98 shadow-sm",
                      isActive
                        ? "border-primary bg-primary/5/10 text-primary"
                        : "border-border/40 bg-bg-app/10 text-text-muted hover:border-border/80 hover:bg-bg-app/30"
                    )}
                  >
                    <span>{provider.label}</span>
                    {isActive && (
                      <span className="h-2 w-2 rounded-full bg-primary animate-pulse-dot" />
                    )}
                  </button>
                );
              })}
            </div>
            
            <div className="p-4 bg-bg-app/30 border border-border/20 rounded-xl">
              <p className="text-[11px] text-text-muted leading-relaxed font-medium italic">
                {form.activePaymentProvider === "whatsapp_manual"
                  ? "Modo manual: El cliente deberá enviar el comprobante por WhatsApp para su aprobación manual."
                  : "Modo automático: El sistema verificará el pago en tiempo real usando las credenciales del API bancaria."}
              </p>
            </div>
          </div>
 
          {/* Configuración Dinámica de Credenciales de API */}
          <div className="lg:col-span-3 bg-bg-app/20 p-5 rounded-2xl border border-border/20 min-h-[250px] flex flex-col justify-center">
            
            {/* WhatsApp Manual Active (No Credentials Required) */}
            {form.activePaymentProvider === "whatsapp_manual" && (
              <div className="text-center py-6 animate-in slide-in-from-top-2">
                <Info className="h-8 w-8 text-text-muted mx-auto mb-3 opacity-55" />
                <h4 className="font-bold text-sm text-text-main mb-1">Confirmación Manual Activada</h4>
                <p className="text-xs text-text-muted max-w-sm mx-auto leading-relaxed">
                  No se requieren credenciales de API bancarias externas. Los clientes adjuntarán su recibo y el cajero aprobará el ticket manualmente.
                </p>
              </div>
            )}
 
            {/* BNC Smart Pay */}
            {form.activePaymentProvider === "bnc_feed" && (
              <div className="space-y-4 animate-in slide-in-from-top-2 w-full">
                <h4 className="font-bold text-sm flex items-center gap-2 text-text-main border-b border-border/30 pb-2.5">
                  <Key className="h-4 w-4 text-primary" /> BNC API Configuration
                </h4>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-text-muted uppercase tracking-wider">BNC API Key / Secret</Label>
                  <Input
                    type="password"
                    value={form.bncApiKey}
                    onChange={(e) => updateField("bncApiKey", e.target.value)}
                    className="rounded-xl border-border/60 focus-visible:ring-primary/20 h-10 font-mono text-xs font-semibold"
                    placeholder="••••••••••••••••••••••••••••••••"
                  />
                </div>
              </div>
            )}
 
            {/* Banesco Reference */}
            {form.activePaymentProvider === "banesco_reference" && (
              <div className="space-y-4 animate-in slide-in-from-top-2 w-full">
                <h4 className="font-bold text-sm flex items-center gap-2 text-text-main border-b border-border/30 pb-2.5">
                  <Key className="h-4 w-4 text-primary" /> Banesco API Configuration
                </h4>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-text-muted uppercase tracking-wider">Banesco API Key / Secret</Label>
                  <Input
                    type="password"
                    value={form.banescoApiKey}
                    onChange={(e) => updateField("banescoApiKey", e.target.value)}
                    className="rounded-xl border-border/60 focus-visible:ring-primary/20 h-10 font-mono text-xs font-semibold"
                    placeholder="••••••••••••••••••••••••••••••••"
                  />
                </div>
              </div>
            )}
 
            {/* Mercantil C2P Smart Pay */}
            {form.activePaymentProvider === "mercantil_c2p" && (
              <div className="space-y-4 animate-in slide-in-from-top-2 w-full">
                <h4 className="font-bold text-sm flex items-center gap-2 text-text-main border-b border-border/30 pb-2.5">
                  <Settings className="h-4 w-4 text-primary" /> Mercantil API (P2C) Credentials
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Client ID</Label>
                    <Input
                      type="password"
                      value={form.mercantilClientId}
                      onChange={(e) => updateField("mercantilClientId", e.target.value)}
                      className="rounded-xl border-border/60 focus-visible:ring-primary/20 h-10 font-mono text-xs font-semibold"
                      placeholder="••••••••••••"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Client Secret</Label>
                    <Input
                      type="password"
                      value={form.mercantilClientSecret}
                      onChange={(e) => updateField("mercantilClientSecret", e.target.value)}
                      className="rounded-xl border-border/60 focus-visible:ring-primary/20 h-10 font-mono text-xs font-semibold"
                      placeholder="••••••••••••"
                    />
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Secret Key</Label>
                  <Input
                    type="password"
                    value={form.mercantilSecretKey}
                    onChange={(e) => updateField("mercantilSecretKey", e.target.value)}
                    className="rounded-xl border-border/60 focus-visible:ring-primary/20 h-10 font-mono text-xs font-semibold"
                    placeholder="••••••••••••••••••••••••••••••••"
                  />
                </div>
                
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[9px] font-bold text-text-muted uppercase tracking-wider">Merchant ID</Label>
                    <Input
                      value={form.mercantilMerchantId}
                      onChange={(e) => updateField("mercantilMerchantId", e.target.value)}
                      className="rounded-xl border-border/60 focus-visible:ring-primary/20 h-9 font-semibold text-center text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[9px] font-bold text-text-muted uppercase tracking-wider">Integrator ID</Label>
                    <Input
                      value={form.mercantilIntegratorId}
                      onChange={(e) => updateField("mercantilIntegratorId", e.target.value)}
                      className="rounded-xl border-border/60 focus-visible:ring-primary/20 h-9 font-semibold text-center text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[9px] font-bold text-text-muted uppercase tracking-wider">Terminal ID</Label>
                    <Input
                      value={form.mercantilTerminalId}
                      onChange={(e) => updateField("mercantilTerminalId", e.target.value)}
                      className="rounded-xl border-border/60 focus-visible:ring-primary/20 h-9 font-semibold text-center text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Pabilo BDV Personal */}
            {form.activePaymentProvider === "pabilo_bdv" && (
              <div className="space-y-4 animate-in slide-in-from-top-2 w-full">
                <h4 className="font-bold text-sm flex items-center gap-2 text-text-main border-b border-border/30 pb-2.5">
                  <Key className="h-4 w-4 text-primary" /> Credenciales Pabilo (BDV Personal)
                </h4>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-text-muted uppercase tracking-wider">Pabilo API Key</Label>
                  <Input
                    type="password"
                    value={form.pabiloApiKey || ""}
                    onChange={(e) => updateField("pabiloApiKey", e.target.value)}
                    className="rounded-xl border-border/60 focus-visible:ring-primary/20 h-10 font-mono text-xs font-semibold"
                    placeholder="••••••••••••••••••••••••••••••••"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-text-muted uppercase tracking-wider">User Bank ID (Banco BDV registrado)</Label>
                  <Input
                    value={form.pabiloUserBankId || ""}
                    onChange={(e) => updateField("pabiloUserBankId", e.target.value)}
                    className="rounded-xl border-border/60 focus-visible:ring-primary/20 h-10 text-sm font-semibold"
                    placeholder="bank_user_..."
                  />
                </div>
              </div>
            )}

            {/* Pabilo Notificaciones SMS */}
            {form.activePaymentProvider === "pabilo_notifications" && (
              <div className="space-y-4 animate-in slide-in-from-top-2 w-full">
                <h4 className="font-bold text-sm flex items-center gap-2 text-text-main border-b border-border/30 pb-2.5">
                  <Key className="h-4 w-4 text-primary" /> Credenciales Pabilo (Notificaciones SMS)
                </h4>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-text-muted uppercase tracking-wider">Pabilo API Key</Label>
                  <Input
                    type="password"
                    value={form.pabiloApiKey || ""}
                    onChange={(e) => updateField("pabiloApiKey", e.target.value)}
                    className="rounded-xl border-border/60 focus-visible:ring-primary/20 h-10 font-mono text-xs font-semibold"
                    placeholder="••••••••••••••••••••••••••••••••"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-text-muted uppercase tracking-wider">Notification Bank ID (Cuenta de Notificaciones)</Label>
                  <Input
                    value={form.pabiloNotificationsBankId || ""}
                    onChange={(e) => updateField("pabiloNotificationsBankId", e.target.value)}
                    className="rounded-xl border-border/60 focus-visible:ring-primary/20 h-10 text-sm font-semibold"
                    placeholder="bank_notif_..."
                  />
                </div>
              </div>
            )}

            {/* Pasarela Local (SmsForwarder) */}
            {form.activePaymentProvider === "local_notifications" && (
              <div className="space-y-4 animate-in slide-in-from-top-2 w-full">
                <h4 className="font-bold text-sm flex items-center gap-2 text-text-main border-b border-border/30 pb-2.5">
                  <Smartphone className="h-4 w-4 text-primary" /> Pasarela Local (SmsForwarder)
                </h4>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-text-muted uppercase tracking-wider block">Token de Autenticación Privado</Label>
                  <div className="flex gap-2 items-center bg-white border border-border/60 rounded-xl px-3 py-1.5 shadow-sm">
                    <span className="font-mono text-xs font-bold text-text-main break-all flex-1 select-all">
                      {form.localDeviceToken || "Sin token generado"}
                    </span>
                    {form.localDeviceToken && (
                      <button
                        type="button"
                        onClick={() => navigator.clipboard.writeText(form.localDeviceToken || "")}
                        className="p-2 hover:bg-bg-app rounded-lg text-primary transition-colors shrink-0 cursor-pointer"
                        title="Copiar token"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={async () => {
                        const res = await generateDeviceTokenAction({});
                        if (res?.data?.token) {
                          updateField("localDeviceToken", res.data.token);
                        }
                      }}
                      className="p-2 hover:bg-bg-app rounded-lg text-text-muted transition-colors shrink-0 cursor-pointer"
                      title="Generar nuevo token"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-[10px] text-text-muted leading-tight mt-1">
                    Este token secreto debe colocarse en las cabeceras de SmsForwarder como <code>X-Device-Token</code>.
                  </p>
                </div>
              </div>
            )}
            
          </div>
          
        </div>
      </Card>
 
    </div>
  );
}

