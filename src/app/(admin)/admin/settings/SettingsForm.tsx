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
  orderExpirationMinutes: number;
  maxPendingOrders: number;
  rateCurrency: "usd" | "eur";
  showRateInMenu: boolean;
  rateOverrideBsPerUsd: string;
  activePaymentProvider: string;
  banescoApiKey: string;
  whatsappNumber: string;
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
      orderExpirationMinutes: 30,
      maxPendingOrders: 99,
      rateCurrency: "usd",
      showRateInMenu: true,
      rateOverrideBsPerUsd: "",
      activePaymentProvider: "banesco_reference",
      banescoApiKey: "",
      whatsappNumber: "",
    },
  );
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});

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
              className={`flex-1 rounded-input border px-4 py-2.5 text-sm font-mono outline-none transition-all ${
                errors.rateOverrideBsPerUsd ? "border-error focus:border-error" : "border-border focus:border-primary"
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
            Si se ingresa un valor, se usa esta tasa en vez de la obtenida del BCV
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
            <option value="whatsapp_manual">
              WhatsApp — Confirmación manual
            </option>
            <option value="mercantil_c2p" disabled>
              Mercantil C2P (próximamente)
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
              className={`w-full rounded-input border px-4 py-2.5 text-sm outline-none transition-all ${
                errors.banescoApiKey ? "border-error focus:border-error" : "border-border focus:border-primary"
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

        <div>
          <label className="mb-1 block text-sm font-medium text-text-main">
            Número de WhatsApp {form.activePaymentProvider === "whatsapp_manual" && "*"}
          </label>
          <input
            type="text"
            value={form.whatsappNumber}
            onChange={(e) => updateField("whatsappNumber", e.target.value)}
            placeholder="584141234567"
            className={`w-full rounded-input border px-4 py-2.5 text-sm outline-none transition-all ${
              errors.whatsappNumber ? "border-error focus:border-error" : "border-border focus:border-primary"
            }`}
          />
          <p className="mt-1 text-xs text-text-muted">
            Requerido para el modo WhatsApp
          </p>
          {errors.whatsappNumber && (
            <p className="mt-1 text-xs text-error">{errors.whatsappNumber}</p>
          )}
        </div>
      </div>

      {/* Bank Details Section */}
      <div className="rounded-card border border-border bg-white p-4 shadow-card">
        <p className="mb-3 text-sm font-semibold text-text-main">
          Datos bancarios
        </p>

        {(
          [
            ["bankName", "Nombre del banco"],
            ["bankCode", "Código del banco"],
            ["accountPhone", "Teléfono de la cuenta"],
            ["accountRif", "RIF / Cédula"],
          ] as const
        ).map(([key, label]) => (
          <div key={key} className="mb-3 last:mb-0">
            <label className="mb-1 block text-sm font-medium text-text-main">
              {label} *
            </label>
            <input
              type="text"
              value={form[key]}
              onChange={(e) => updateField(key, e.target.value)}
              className={`w-full rounded-input border px-4 py-2.5 text-sm outline-none transition-all ${
                errors[key] ? "border-error focus:border-error" : "border-border focus:border-primary"
              }`}
            />
            {errors[key] && (
              <p className="mt-1 text-xs text-error">{errors[key]}</p>
            )}
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
              className={`w-full rounded-input border px-4 py-2.5 text-sm outline-none transition-all ${
                errors[key] ? "border-error focus:border-error" : "border-border focus:border-primary"
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
          className={`rounded-input p-3 text-sm ${
            message.type === "success"
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
