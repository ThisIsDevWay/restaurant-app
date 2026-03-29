"use client";

import { useState } from "react";
import { saveSettings } from "@/actions/settings";
import { Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface SettingsFormData {
  bankName: string;
  bankCode: string;
  accountPhone: string;
  accountRif: string;
  transferBankName: string;
  transferAccountName: string;
  transferAccountNumber: string;
  transferAccountRif: string;
  orderExpirationMinutes: number;
  maxPendingOrders: number;
  maxQuantityPerItem: number;
  rateCurrency: "usd" | "eur";
  showRateInMenu: boolean;
  rateOverrideBsPerUsd: string;
  activePaymentProvider: string;
  banescoApiKey: string;
  mercantilClientId: string;
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
}: {
  initialData: SettingsFormData | null;
}) {
  const [form, setForm] = useState<SettingsFormData>(
    initialData ?? {
      bankName: "",
      bankCode: "",
      accountPhone: "",
      accountRif: "",
      transferBankName: "",
      transferAccountName: "",
      transferAccountNumber: "",
      transferAccountRif: "",
      orderExpirationMinutes: 30,
      maxPendingOrders: 99,
      maxQuantityPerItem: 10,
      rateCurrency: "usd",
      showRateInMenu: true,
      rateOverrideBsPerUsd: "",
      activePaymentProvider: "banesco_reference",
      banescoApiKey: "",
      mercantilClientId: "",
      mercantilSecretKey: "",
      mercantilMerchantId: "",
      mercantilIntegratorId: "",
      mercantilTerminalId: "",
      whatsappNumber: "",
      whatsappMicroserviceUrl: "http://38.171.255.120:3333",
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-input bg-amber/10 p-3 text-xs text-amber">
        Cambiar estos datos afecta los checkouts futuros. Las órdenes ya creadas
        tienen los datos en su snapshot y no se ven afectadas.
      </div>

      {/* Rate Section */}
      <div className="rounded-card border border-border bg-white p-4 shadow-card">
        <p className="mb-3 text-sm font-semibold text-text-main">
          Tasa de cambio
        </p>

        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-text-main">
            Moneda de referencia
          </label>
          <select
            value={form.rateCurrency}
            onChange={(e) => updateField("rateCurrency", e.target.value as "usd" | "eur")}
            className="w-full rounded-input border border-border px-4 py-2.5 text-sm outline-none focus:border-primary"
          >
            <option value="usd">Dólar (USD)</option>
            <option value="eur">Euro (EUR)</option>
          </select>
        </div>

        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-text-main">
            Tasa manual — opcional
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              step="0.0001"
              min="0"
              value={form.rateOverrideBsPerUsd}
              onChange={(e) => updateField("rateOverrideBsPerUsd", e.target.value)}
              placeholder="Vacío = usar tasa BCV automática"
              className={`flex-1 rounded-input border px-4 py-2.5 text-sm font-mono outline-none transition-all ${errors.rateOverrideBsPerUsd ? "border-error focus:border-error" : "border-border focus:border-primary"
                }`}
            />
            <button
              type="button"
              onClick={async () => {
                if (form.rateOverrideBsPerUsd && (isNaN(parseFloat(form.rateOverrideBsPerUsd)) || parseFloat(form.rateOverrideBsPerUsd) <= 0)) {
                  setErrors((prev) => ({ ...prev, rateOverrideBsPerUsd: "Tasa inválida" }));
                  return;
                }
                setIsSaving(true);
                const result = await saveSettings({
                  ...form,
                  rateOverrideBsPerUsd: form.rateOverrideBsPerUsd || undefined,
                });
                if (result.success) {
                  setMessage({ type: "success", text: "Tasa actualizada" });
                } else {
                  setMessage({ type: "error", text: result.error });
                }
                setIsSaving(false);
              }}
              disabled={isSaving}
              className="shrink-0 rounded-input bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {isSaving ? "..." : "Guardar"}
            </button>
          </div>
          <p className="mt-1 text-xs text-text-muted">
            Si se ingresa un valor, se usa esta tasa en lugar de la obtenida del BCV
          </p>
          {errors.rateOverrideBsPerUsd && (
            <p className="mt-1 text-xs text-error">{errors.rateOverrideBsPerUsd}</p>
          )}
        </div>

        <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
          <div>
            <p className="text-sm font-medium text-text-main">
              Mostrar tasa en menú público
            </p>
            <p className="text-xs text-text-muted">
              {form.showRateInMenu
                ? "Los clientes verán la tasa BCV en el menú"
                : "La tasa no se mostrará en el menú"}
            </p>
          </div>
          <Switch
            checked={form.showRateInMenu}
            onCheckedChange={async (val) => {
              updateField("showRateInMenu", val);
              const result = await saveSettings({
                ...form,
                showRateInMenu: val,
                rateOverrideBsPerUsd: form.rateOverrideBsPerUsd || undefined,
              });
              if (result.success) {
                setMessage({ type: "success", text: "Tasa actualizada" });
              } else {
                setMessage({ type: "error", text: result.error });
                updateField("showRateInMenu", !val);
              }
            }}
          />
        </div>
      </div>

      {/* Payment Provider Section */}
      <div className="rounded-card border border-border bg-white p-4 shadow-card">
        <p className="mb-3 text-sm font-semibold text-text-main">
          Provider de pago
        </p>

        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-text-main">
            Provider activo
          </label>
          <select
            value={form.activePaymentProvider}
            onChange={(e) =>
              setForm({ ...form, activePaymentProvider: e.target.value })
            }
            className="w-full rounded-input border border-border px-4 py-2.5 text-sm outline-none focus:border-primary"
          >
            <option value="banesco_reference">
              Banesco — Referencia manual
            </option>
            <option value="mercantil_c2p">
              Mercantil — C2P automático
            </option>
            <option value="whatsapp_manual">
              WhatsApp — Confirmación manual
            </option>
            <option value="bnc_feed" disabled>
              BNC Feed (próximamente)
            </option>
          </select>
        </div>

        {form.activePaymentProvider === "banesco_reference" && (
          <div>
            <label className="mb-1 block text-sm font-medium text-text-main">
              Banesco API Key
            </label>
            <input
              type="password"
              value={form.banescoApiKey}
              onChange={(e) => updateField("banescoApiKey", e.target.value)}
              placeholder="sk-..."
              className={`w-full rounded-input border px-4 py-2.5 text-sm outline-none transition-all ${errors.banescoApiKey ? "border-error focus:border-error" : "border-border focus:border-primary"
                }`}
            />
            <p className="mt-1 text-xs text-text-muted">
              Dejar vacío para usar modo mock (desarrollo)
            </p>
            {errors.banescoApiKey && (
              <p className="mt-1 text-xs text-error">{errors.banescoApiKey}</p>
            )}
          </div>
        )}

        {form.activePaymentProvider === "mercantil_c2p" && (
          <div className="space-y-3">
            <p className="text-xs text-text-muted">
              Dejar vacío para usar modo mock (desarrollo). Credenciales entregadas por Mercantil tras suscripción.
            </p>
            {(
              [
                ["mercantilClientId", "Client ID", "text", "X-IBM-Client-ID del portal"],
                ["mercantilSecretKey", "Secret Key", "password", "Clave para cifrado AES (Terminal Secret)"],
                ["mercantilMerchantId", "Merchant ID", "text", "ID del comercio"],
                ["mercantilIntegratorId", "Integrator ID", "text", "ID del integrador"],
                ["mercantilTerminalId", "Terminal ID", "text", "ID de la terminal"],
              ] as const
            ).map(([key, label, type, hint]) => (
              <div key={key}>
                <label className="mb-1 block text-sm font-medium text-text-main">
                  {label}
                </label>
                <input
                  type={type}
                  value={form[key]}
                  onChange={(e) => updateField(key, e.target.value)}
                  placeholder={hint}
                  className="w-full rounded-input border border-border px-4 py-2.5 text-sm font-mono outline-none focus:border-primary"
                />
              </div>
            ))}
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-text-main">
            Número de WhatsApp {form.activePaymentProvider === "whatsapp_manual" && "*"}
          </label>
          <input
            type="text"
            value={form.whatsappNumber}
            onChange={(e) => updateField("whatsappNumber", e.target.value)}
            placeholder="584141234567"
            className={`w-full rounded-input border px-4 py-2.5 text-sm outline-none transition-all ${errors.whatsappNumber ? "border-error focus:border-error" : "border-border focus:border-primary"
              }`}
          />
          <p className="mt-1 text-xs text-text-muted">
            Requerido para el modo WhatsApp
          </p>
          {errors.whatsappNumber && (
            <p className="mt-1 text-xs text-error">{errors.whatsappNumber}</p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-text-main">
            URL microservicio WhatsApp
          </label>
          <input
            type="url"
            value={form.whatsappMicroserviceUrl}
            onChange={(e) => updateField("whatsappMicroserviceUrl", e.target.value)}
            placeholder="http://38.171.255.120:3333"
            className="w-full rounded-input border border-border px-4 py-2.5 text-sm outline-none focus:border-primary font-mono"
          />
          <p className="mt-1 text-xs text-text-muted">
            URL del servidor Baileys para envío de mensajes
          </p>
        </div>
      </div>

      {/* Social Links */}
      <div className="rounded-card border border-border bg-white p-4 shadow-card">
        <p className="mb-3 text-sm font-semibold text-text-main">
          Redes sociales
        </p>

        <div>
          <label className="mb-1 block text-sm font-medium text-text-main">
            Instagram
          </label>
          <input
            type="url"
            value={form.instagramUrl}
            onChange={(e) => updateField("instagramUrl", e.target.value)}
            placeholder="https://instagram.com/tu_restaurante"
            className="w-full rounded-input border border-border px-4 py-2.5 text-sm outline-none focus:border-primary"
          />
          <p className="mt-1 text-xs text-text-muted">
            Se mostrará como ícono en el menú del cliente
          </p>
        </div>
      </div>

      {/* Order Modes Section */}
      <div className="rounded-card border border-border bg-white p-4 shadow-card">
        <p className="mb-3 text-sm font-semibold text-text-main">
          Modos de pedido
        </p>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-main">Comer en sitio</p>
              <p className="text-xs text-text-muted">Permite a los clientes pedir desde la mesa</p>
            </div>
            <Switch
              checked={form.orderModeOnSiteEnabled}
              onCheckedChange={(val) => updateField("orderModeOnSiteEnabled", val)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-main">Para llevar</p>
              <p className="text-xs text-text-muted">Permite hacer pedidos y pasarlos buscando luego</p>
            </div>
            <Switch
              checked={form.orderModeTakeAwayEnabled}
              onCheckedChange={(val) => updateField("orderModeTakeAwayEnabled", val)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-main">Delivery</p>
              <p className="text-xs text-text-muted">Permite solicitar envíos a domicilio</p>
            </div>
            <Switch
              checked={form.orderModeDeliveryEnabled}
              onCheckedChange={(val) => updateField("orderModeDeliveryEnabled", val)}
            />
          </div>
        </div>

        {/* Payment Methods Section */}
        <div className="mt-4 space-y-4 border-t border-border pt-4">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Métodos de cobro</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-main">Pago Móvil</p>
              <p className="text-xs text-text-muted">Aceptar transferencias al número de teléfono</p>
            </div>
            <Switch
              checked={form.paymentPagoMovilEnabled}
              onCheckedChange={(val) => updateField("paymentPagoMovilEnabled", val)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-main">Transferencia Bancaria</p>
              <p className="text-xs text-text-muted">Aceptar depósitos a la cuenta (20 dígitos)</p>
            </div>
            <Switch
              checked={form.paymentTransferEnabled}
              onCheckedChange={(val) => updateField("paymentTransferEnabled", val)}
            />
          </div>
        </div>

        {/* Packaging fees — visible when takeaway or delivery is on */}
        {(form.orderModeTakeAwayEnabled || form.orderModeDeliveryEnabled) && (
          <div className="mt-4 space-y-3 border-t border-border pt-4">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Tarifas de envase</p>
            {([
              ["packagingFeePerPlateUsdCents", "Envase por plato"] as const,
              ["packagingFeePerAdicionalUsdCents", "Envase por adicional"] as const,
              ["packagingFeePerBebidaUsdCents", "Envase por bebida"] as const,
            ]).map(([key, label]) => (
              <div key={key}>
                <label className="mb-1 block text-sm font-medium text-text-main">{label}</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-muted">$</span>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={decimalInputs[key] ?? ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDecimalInputs(prev => ({ ...prev, [key]: val }));
                      updateField(key, Math.round(parseFloat(val || "0") * 100));
                    }}
                    placeholder="0.50"
                    className="w-full rounded-input border border-border pl-7 pr-4 py-2.5 text-sm font-mono outline-none focus:border-primary"
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Delivery fee + coverage — visible when delivery is on */}
        {form.orderModeDeliveryEnabled && (
          <div className="mt-4 space-y-3 border-t border-border pt-4">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Delivery</p>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-main">Tarifa de delivery</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-muted">$</span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={decimalInputs.deliveryFeeUsdCents ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setDecimalInputs(prev => ({ ...prev, deliveryFeeUsdCents: val }));
                    updateField("deliveryFeeUsdCents", Math.round(parseFloat(val || "0") * 100));
                  }}
                  placeholder="1.00"
                  className="w-full rounded-input border border-border pl-7 pr-4 py-2.5 text-sm font-mono outline-none focus:border-primary"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-main">Alcance de delivery</label>
              <input
                type="text"
                value={form.deliveryCoverage}
                onChange={(e) => updateField("deliveryCoverage", e.target.value)}
                placeholder="Ej: Toda Ciudad Ojeda, solo hasta Tamare"
                className="w-full rounded-input border border-border px-4 py-2.5 text-sm outline-none focus:border-primary"
              />
              <p className="mt-1 text-xs text-text-muted">Se mostrará al cliente en el checkout cuando seleccione delivery</p>
            </div>
          </div>
        )}
      </div>

      {/* Bank Details Section */}
      <div className="rounded-card border border-border bg-white p-4 shadow-card">
        <p className="mb-3 text-sm font-semibold text-text-main">
          Datos bancarios (Pago Móvil)
        </p>

        {(
          [
            ["bankName", "Nombre del banco"],
            ["bankCode", "Código del banco"],
            ["accountPhone", "Teléfono vinculado"],
            ["accountRif", "RIF / Cédula"],
          ] as const
        ).map(([key, label]) => (
          <div key={key} className="mb-3 last:mb-0">
            <label className="mb-1 block text-sm font-medium text-text-main">
              {label} *
            </label>
            <input
              type="text"
              value={form[key as keyof SettingsFormData] as string}
              onChange={(e) => updateField(key as keyof SettingsFormData, e.target.value)}
              className={`w-full rounded-input border px-4 py-2.5 text-sm outline-none transition-all ${errors[key as keyof SettingsFormData] ? "border-error focus:border-error" : "border-border focus:border-primary"
                }`}
            />
            {errors[key as keyof SettingsFormData] && (
              <p className="mt-1 text-xs text-error">{errors[key as keyof SettingsFormData]}</p>
            )}
          </div>
        ))}

        <p className="mt-6 mb-3 text-sm font-semibold text-text-main border-t border-border pt-4">
          Datos de Transferencia
        </p>

        {(
          [
            ["transferBankName", "Banco destino"],
            ["transferAccountName", "Nombre del Titular"],
            ["transferAccountNumber", "Número de Cuenta (20 dígitos)"],
            ["transferAccountRif", "RIF / Cédula"],
          ] as const
        ).map(([key, label]) => (
          <div key={key} className="mb-3 last:mb-0">
            <label className="mb-1 block text-sm font-medium text-text-main">
              {label}
            </label>
            <input
              type="text"
              value={form[key as keyof SettingsFormData] as string}
              onChange={(e) => updateField(key as keyof SettingsFormData, e.target.value)}
              className="w-full rounded-input border border-border px-4 py-2.5 text-sm outline-none transition-all focus:border-primary"
            />
          </div>
        ))}
      </div>

      {/* System Settings */}
      <div className="rounded-card border border-border bg-white p-4 shadow-card">
        <p className="mb-3 text-sm font-semibold text-text-main">
          Parámetros del sistema
        </p>

        {(
          [
            ["orderExpirationMinutes", "Minutos de expiración *", "number"],
            ["maxPendingOrders", "Máx. órdenes pendientes *", "number"],
            ["maxQuantityPerItem", "Máx. cantidad por ítem *", "number"],
          ] as const
        ).map(([key, label, type]) => (
          <div key={key} className="mb-3 last:mb-0">
            <label className="mb-1 block text-sm font-medium text-text-main">
              {label}
            </label>
            <input
              type={type}
              value={form[key]}
              onChange={(e) =>
                updateField(key, parseInt(e.target.value) || 0)
              }
              min={1}
              className={`w-full rounded-input border px-4 py-2.5 text-sm outline-none transition-all ${errors[key] ? "border-error focus:border-error" : "border-border focus:border-primary"
                }`}
            />
            {errors[key] && (
              <p className="mt-1 text-xs text-error">{errors[key]}</p>
            )}
          </div>
        ))}
      </div>

      {message && (
        <div
          className={`rounded-input p-3 text-sm ${message.type === "success"
            ? "bg-success/10 text-success"
            : "bg-error/10 text-error"
            }`}
        >
          {message.text}
        </div>
      )}

      <button
        type="submit"
        disabled={isSaving}
        className="rounded-input bg-primary px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {isSaving ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Guardando...
          </span>
        ) : (
          "Guardar"
        )}
      </button>
    </form>
  );
}
