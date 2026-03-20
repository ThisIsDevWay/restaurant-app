"use client";

import { useState } from "react";
import { saveSettings } from "@/actions/settings";
import { Loader2 } from "lucide-react";

interface SettingsFormData {
  bankName: string;
  bankCode: string;
  accountPhone: string;
  accountRif: string;
  orderExpirationMinutes: number;
  maxPendingOrders: number;
  activePaymentProvider: string;
  banescoApiKey: string;
  whatsappNumber: string;
}

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    const result = await saveSettings(form);

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
              onChange={(e) =>
                setForm({ ...form, banescoApiKey: e.target.value })
              }
              placeholder="sk-..."
              className="w-full rounded-input border border-border px-4 py-2.5 text-sm outline-none focus:border-primary"
            />
            <p className="mt-1 text-xs text-text-muted">
              Dejar vacío para usar modo mock (desarrollo)
            </p>
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-text-main">
            Número de WhatsApp
          </label>
          <input
            type="text"
            value={form.whatsappNumber}
            onChange={(e) =>
              setForm({ ...form, whatsappNumber: e.target.value })
            }
            placeholder="584141234567"
            className="w-full rounded-input border border-border px-4 py-2.5 text-sm outline-none focus:border-primary"
          />
          <p className="mt-1 text-xs text-text-muted">
            Requerido para el modo WhatsApp
          </p>
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
              {label}
            </label>
            <input
              type="text"
              value={form[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              className="w-full rounded-input border border-border px-4 py-2.5 text-sm outline-none focus:border-primary"
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
            ["orderExpirationMinutes", "Minutos de expiración", "number"],
            ["maxPendingOrders", "Máx. órdenes pendientes", "number"],
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
                setForm({
                  ...form,
                  [key]: parseInt(e.target.value) || 0,
                })
              }
              className="w-full rounded-input border border-border px-4 py-2.5 text-sm outline-none focus:border-primary"
            />
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
