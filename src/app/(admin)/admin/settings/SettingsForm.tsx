"use client";

import { useState } from "react";
import { saveSettings } from "@/actions/settings";
import {
  Loader2,
  Save,
  Smartphone,
  CreditCard,
  TrendingUp,
  AlertTriangle,
  Store,
  Package,
  MapPin,
  Settings
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TemplateEditor } from "@/components/admin/whatsapp/TemplateEditor";
import { WhatsAppStatus } from "@/components/admin/whatsapp/WhatsAppStatus";

interface Template {
  id: string;
  key: string;
  label: string;
  body: string;
  isActive: boolean;
}

interface SettingsFormData {
  bankName: string;
  bankCode: string;
  restaurantName: string;
  accountPhone: string;
  accountRif: string;
  transferBankName: string;
  transferAccountName: string;
  transferAccountNumber: string;
  transferAccountRif: string;
  adicionalesEnabled: boolean;
  bebidasEnabled: boolean;
  bncApiKey: string;
  orderExpirationMinutes: number;
  maxPendingOrders: number;
  maxQuantityPerItem: number;
  rateCurrency: "usd" | "eur";
  showRateInMenu: boolean;
  rateOverrideBsPerUsd: string;
  activePaymentProvider: string;
  banescoApiKey: string;
  mercantilClientId: string;
  mercantilClientSecret: string;
  mercantilSecretKey: string;
  mercantilMerchantId: string;
  mercantilIntegratorId: string;
  mercantilTerminalId: string;
  whatsappNumber: string;
  whatsappMicroserviceUrl: string;
  instagramUrl: string;
  orderModeOnSiteEnabled: boolean;
  orderModeTakeAwayEnabled: boolean;
  orderModeDeliveryEnabled: boolean;
  packagingFeePerPlateUsdCents: number;
  packagingFeePerAdicionalUsdCents: number;
  packagingFeePerBebidaUsdCents: number;
  deliveryFeeUsdCents: number;
  deliveryCoverage: string;
  paymentPagoMovilEnabled: boolean;
  paymentTransferEnabled: boolean;
}

type FormErrors = Partial<Record<keyof SettingsFormData, string>>;

export function SettingsForm({
  initialData,
  templates = [],
}: {
  initialData: SettingsFormData | null;
  templates?: Template[];
}) {
  const [form, setForm] = useState<SettingsFormData>(
    initialData ?? {
      bankName: "",
      bankCode: "",
      restaurantName: "G&M",
      accountPhone: "",
      accountRif: "",
      transferBankName: "",
      transferAccountName: "",
      transferAccountNumber: "",
      transferAccountRif: "",
      adicionalesEnabled: true,
      bebidasEnabled: true,
      bncApiKey: "",
      orderExpirationMinutes: 30,
      maxPendingOrders: 99,
      maxQuantityPerItem: 10,
      rateCurrency: "usd",
      showRateInMenu: true,
      rateOverrideBsPerUsd: "",
      activePaymentProvider: "banesco_reference",
      banescoApiKey: "",
      mercantilClientId: "",
      mercantilClientSecret: "",
      mercantilSecretKey: "",
      mercantilMerchantId: "",
      mercantilIntegratorId: "",
      mercantilTerminalId: "",
      whatsappNumber: "",
      whatsappMicroserviceUrl: "",
      instagramUrl: "",
      orderModeOnSiteEnabled: true,
      orderModeTakeAwayEnabled: true,
      orderModeDeliveryEnabled: true,
      packagingFeePerPlateUsdCents: 0,
      packagingFeePerAdicionalUsdCents: 0,
      packagingFeePerBebidaUsdCents: 0,
      deliveryFeeUsdCents: 0,
      deliveryCoverage: "",
      paymentPagoMovilEnabled: true,
      paymentTransferEnabled: true,
    },
  );
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [decimalInputs, setDecimalInputs] = useState<Record<string, string>>(() => {
    const data = initialData as Partial<SettingsFormData> ?? {};
    return {
      packagingFeePerPlateUsdCents: data.packagingFeePerPlateUsdCents ? (data.packagingFeePerPlateUsdCents / 100).toString() : "0",
      packagingFeePerAdicionalUsdCents: data.packagingFeePerAdicionalUsdCents ? (data.packagingFeePerAdicionalUsdCents / 100).toString() : "0",
      packagingFeePerBebidaUsdCents: data.packagingFeePerBebidaUsdCents ? (data.packagingFeePerBebidaUsdCents / 100).toString() : "0",
      deliveryFeeUsdCents: data.deliveryFeeUsdCents ? (data.deliveryFeeUsdCents / 100).toString() : "0",
    };
  });

  function updateField<K extends keyof SettingsFormData>(key: K, value: SettingsFormData[K]) {
    setForm({ ...form, [key]: value });
    if (errors[key]) setErrors((prev) => { const n = { ...prev }; delete n[key]; return n; });
  }

  function validate(): boolean {
    const e: FormErrors = {};
    if (!form.bankName.trim()) e.bankName = "Nombre del banco requerido";
    if (!form.bankCode.trim()) e.bankCode = "Código del banco requerido";
    if (!form.accountPhone.trim()) e.accountPhone = "Teléfono requerido";
    if (!form.accountRif.trim()) e.accountRif = "RIF requerido";
    if (form.orderExpirationMinutes < 1) e.orderExpirationMinutes = "Mínimo 1 minuto";
    if (form.maxPendingOrders < 1) e.maxPendingOrders = "Mínimo 1";
    if (form.maxQuantityPerItem < 1) e.maxQuantityPerItem = "Mínimo 1";
    if (form.rateOverrideBsPerUsd && (isNaN(parseFloat(form.rateOverrideBsPerUsd)) || parseFloat(form.rateOverrideBsPerUsd) <= 0)) {
      e.rateOverrideBsPerUsd = "Tasa inválida";
    }
    if (form.activePaymentProvider === "whatsapp_manual" && !form.whatsappNumber.trim()) {
      e.whatsappNumber = "Número de WhatsApp requerido para este modo";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSaving(true);
    setMessage(null);

    const result = await saveSettings({
      ...form,
      rateOverrideBsPerUsd: form.rateOverrideBsPerUsd || undefined,
    });

    if (result.success) {
      setMessage({ type: "success", text: "Configuración guardada" });
    } else {
      setMessage({ type: "error", text: result.error });
    }

    setIsSaving(false);
  };

  return (
    <div className="relative pb-24">
      <form onSubmit={handleSubmit} className="space-y-6">
        {message && (
          <div className={cn(
            "rounded-xl p-4 text-sm font-semibold animate-in fade-in slide-in-from-top-2 mb-6",
            message.type === "success" ? "bg-success/10 text-success border border-success/20" : "bg-error/10 text-error border border-error/20"
          )}>
            {message.text}
          </div>
        )}

        <Tabs defaultValue="general" className="w-full flex flex-col gap-0">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 gap-2 mb-10 bg-muted/50 p-1 rounded-2xl h-auto border-none !w-full">
            <TabsTrigger value="general" className="rounded-xl py-3.5 data-active:bg-white data-active:text-primary data-active:shadow-md transition-all">
              <Settings className="h-4 w-4 mr-2" />
              General
            </TabsTrigger>
            <TabsTrigger value="operation" className="rounded-xl py-3.5 data-active:bg-white data-active:text-primary data-active:shadow-md transition-all">
              <Package className="h-4 w-4 mr-2" />
              Operación
            </TabsTrigger>
            <TabsTrigger value="payments" className="rounded-xl py-3.5 data-active:bg-white data-active:text-primary data-active:shadow-md transition-all">
              <CreditCard className="h-4 w-4 mr-2" />
              Pagos
            </TabsTrigger>
            <TabsTrigger value="messaging" className="rounded-xl py-3.5 data-active:bg-white data-active:text-primary data-active:shadow-md transition-all">
              <Smartphone className="h-4 w-4 mr-2" />
              Mensajería
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6 animate-in fade-in-50 duration-300">
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
                      <button
                        type="button"
                        onClick={() => updateField("rateCurrency", "usd")}
                        className={cn(
                          "flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all",
                          form.rateCurrency === "usd" ? "border-primary bg-primary/5 text-primary font-bold shadow-sm" : "border-border/40 text-text-muted hover:border-border"
                        )}
                      >
                        USD ($)
                      </button>
                      <button
                        type="button"
                        onClick={() => updateField("rateCurrency", "eur")}
                        className={cn(
                          "flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all",
                          form.rateCurrency === "eur" ? "border-primary bg-primary/5 text-primary font-bold shadow-sm" : "border-border/40 text-text-muted hover:border-border"
                        )}
                      >
                        EUR (€)
                      </button>
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
          </TabsContent>

          <TabsContent value="operation" className="space-y-6 animate-in fade-in-50 duration-300">
            <Card className="p-6 border-none shadow-sm bg-white rounded-2xl">
              <h3 className="text-lg font-bold text-text-main mb-6">Modos de Pedido Activos</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { id: "orderModeOnSiteEnabled", label: "Comer en Sitio", icon: Store },
                  { id: "orderModeTakeAwayEnabled", label: "Para Llevar", icon: Package },
                  { id: "orderModeDeliveryEnabled", label: "Delivery", icon: MapPin },
                ].map((mode) => (
                  <div
                    key={mode.id}
                    onClick={() => updateField(mode.id as any, !form[mode.id as keyof SettingsFormData])}
                    className={cn(
                      "flex flex-col items-center gap-4 p-8 rounded-2xl border-2 cursor-pointer transition-all hover:shadow-md",
                      form[mode.id as keyof SettingsFormData] ? "border-primary bg-primary/5 shadow-sm" : "border-border/40 opacity-60 grayscale hover:grayscale-0"
                    )}
                  >
                    <div className={cn(
                      "p-4 rounded-full transition-colors",
                      form[mode.id as keyof SettingsFormData] ? "bg-primary text-white" : "bg-bg-app text-text-muted"
                    )}>
                      <mode.icon className="h-8 w-8" />
                    </div>
                    <span className="font-bold text-base text-center">{mode.label}</span>
                    <Switch
                      checked={form[mode.id as keyof SettingsFormData] as boolean}
                      onCheckedChange={(v) => updateField(mode.id as any, v)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                ))}
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
                  <p className="text-[10px] text-text-muted">Límite de pedidos en cola.</p>
                </div>
              </div>
            </Card>

            <Card className="p-6 border-none shadow-sm bg-white rounded-2xl">
              <h3 className="text-lg font-bold text-text-main mb-6">Configuración de Inventario y Empaque</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Toggles */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-xl bg-bg-app border border-border/40">
                    <div className="space-y-1">
                      <Label className="text-sm font-bold">Habilitar Adicionales (Extras / Toppings)</Label>
                      <p className="text-[11px] text-text-muted leading-snug">
                        Permite a los clientes agregar ingredientes extra (como tocineta, queso o aguacate)
                        directamente desde el detalle de su plato con un costo adicional.
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
                        Muestra la sección de bebidas dentro del plato seleccionado, ideal para combos
                        o compras rápidas de refrescos sin salir del detalle del producto.
                      </p>
                    </div>
                    <Switch
                      checked={form.bebidasEnabled}
                      onCheckedChange={(v) => updateField("bebidasEnabled", v)}
                    />
                  </div>
                </div>

                {/* Packaging Fees */}
                <div className="space-y-4">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-text-muted pl-1">Cargos por Empaquetado ($)</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold">Por Plato</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={decimalInputs.packagingFeePerPlateUsdCents}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDecimalInputs(prev => ({ ...prev, packagingFeePerPlateUsdCents: val }));
                          const cents = Math.round(parseFloat(val) * 100);
                          if (!isNaN(cents)) updateField("packagingFeePerPlateUsdCents", cents);
                        }}
                        className="rounded-xl h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold">Adicional</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={decimalInputs.packagingFeePerAdicionalUsdCents}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDecimalInputs(prev => ({ ...prev, packagingFeePerAdicionalUsdCents: val }));
                          const cents = Math.round(parseFloat(val) * 100);
                          if (!isNaN(cents)) updateField("packagingFeePerAdicionalUsdCents", cents);
                        }}
                        className="rounded-xl h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold">Bebida</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={decimalInputs.packagingFeePerBebidaUsdCents}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDecimalInputs(prev => ({ ...prev, packagingFeePerBebidaUsdCents: val }));
                          const cents = Math.round(parseFloat(val) * 100);
                          if (!isNaN(cents)) updateField("packagingFeePerBebidaUsdCents", cents);
                        }}
                        className="rounded-xl h-9 text-sm"
                      />
                    </div>
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
                        setDecimalInputs(prev => ({ ...prev, deliveryFeeUsdCents: val }));
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
            </Card>
          </TabsContent>

          <TabsContent value="payments" className="space-y-6 animate-in fade-in-50 duration-300">
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
                    {[
                      { id: "banesco_reference", label: "Banesco (P2P / Ref.)" },
                      { id: "mercantil_c2p", label: "Mercantil (Smart Pay)" },
                      { id: "bnc_p2c", label: "BNC (Smart Pay)" },
                      { id: "whatsapp_manual", label: "Confirmación WhatsApp" },
                    ].map((provider) => (
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

                  {(form.activePaymentProvider === "mercantil_c2p" || true) && (
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
                  )}
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="messaging" className="space-y-6 animate-in fade-in-50 duration-300">
            <Card className="p-4 border-none shadow-sm bg-white rounded-2xl">
              <WhatsAppStatus />
            </Card>

            <Card className="p-6 border-none shadow-sm bg-white rounded-2xl">
              <h3 className="text-lg font-bold text-text-main mb-6">WhatsApp y Notificaciones</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <Label className="font-bold">Número de WhatsApp (Notificaciones)</Label>
                  <Input
                    value={form.whatsappNumber}
                    onChange={(e) => updateField("whatsappNumber", e.target.value)}
                    placeholder="Ej. 584141234567"
                    className="rounded-xl h-10"
                  />
                  <p className="text-xs text-text-muted italic">Incluye el código de país sin el símbolo +</p>
                </div>
                <div className="space-y-2">
                  <Label className="font-bold">URL Microservicio Baileys</Label>
                  <Input
                    value={form.whatsappMicroserviceUrl}
                    onChange={(e) => updateField("whatsappMicroserviceUrl", e.target.value)}
                    placeholder="https://su-microservicio.com"
                    className="rounded-xl h-10 font-mono text-xs"
                  />
                  <p className="text-xs text-text-muted">Necesario para automatizar el envío de tickets.</p>
                </div>
              </div>
            </Card>

            <Card className="p-6 border-none shadow-sm bg-white rounded-2xl">
              <h3 className="text-lg font-bold text-text-main mb-6">Plantillas de Mensajería</h3>
              <p className="text-sm text-text-muted mb-8 p-4 bg-bg-app rounded-xl border border-border/40">
                Personaliza los mensajes automáticos que reciben tus clientes. Usa las variables dinámicas para personalizar cada envío.
              </p>
              <TemplateEditor templates={templates} />
            </Card>
          </TabsContent>
        </Tabs>

        {/* Padding for sticky bar */}
        <div className="h-32" />

        {/* Sticky Save Bar */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-border z-[100] animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <div className="hidden sm:block">
              <p className="text-sm font-black text-text-main leading-none mb-1">Configuración del Restaurante</p>
              <p className="text-[11px] text-text-muted font-medium">Los cambios se aplicarán al presionar guardar.</p>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Button
                type="button"
                variant="outline"
                onClick={() => window.location.reload()}
                className="flex-1 sm:flex-none h-12 px-6 rounded-xl border-border/60 font-bold hover:bg-muted"
                disabled={isSaving}
              >
                Descartar
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="flex-[2] sm:flex-none px-10 h-12 rounded-xl bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/20 transition-all font-bold text-base"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-5 w-5" />
                    Guardar Cambios
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
