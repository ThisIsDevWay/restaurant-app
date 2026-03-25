import { getSettings } from "@/db/queries/settings";
import { getAllTemplates } from "@/db/queries/whatsapp-templates";
import { SettingsForm } from "./SettingsForm";
import { WhatsAppStatus } from "@/components/admin/whatsapp/WhatsAppStatus";
import { TemplateEditor } from "@/components/admin/whatsapp/TemplateEditor";

export default async function SettingsPage() {
  const [settings, templates] = await Promise.all([
    getSettings(),
    getAllTemplates(),
  ]);

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-text-main">Configuración</h1>
      <p className="mb-6 text-sm text-text-muted">
        Datos bancarios y parámetros del sistema
      </p>

      <div className="max-w-lg space-y-6">
        {/* WhatsApp Status */}
        <WhatsAppStatus />

        {/* Template Editor */}
        <TemplateEditor templates={templates} />

        {/* Settings Form */}
        <SettingsForm
          initialData={
            settings
              ? {
                bankName: settings.bankName,
                bankCode: settings.bankCode,
                accountPhone: settings.accountPhone,
                accountRif: settings.accountRif,
                orderExpirationMinutes: settings.orderExpirationMinutes,
                maxPendingOrders: settings.maxPendingOrders,
                maxQuantityPerItem: settings.maxQuantityPerItem,
                rateCurrency: (settings.rateCurrency ?? "usd") as "usd" | "eur",
                showRateInMenu: settings.showRateInMenu ?? true,
                rateOverrideBsPerUsd: settings.rateOverrideBsPerUsd ?? "",
                activePaymentProvider: settings.activePaymentProvider,
                banescoApiKey: settings.banescoApiKey ?? "",
                whatsappNumber: settings.whatsappNumber,
                whatsappMicroserviceUrl: settings.whatsappMicroserviceUrl ?? "http://38.171.255.120:3333",
              }
              : null
          }
        />
      </div>
    </div>
  );
}
