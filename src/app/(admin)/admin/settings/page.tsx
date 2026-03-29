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
                transferBankName: settings.transferBankName ?? "",
                transferAccountName: settings.transferAccountName ?? "",
                transferAccountNumber: settings.transferAccountNumber ?? "",
                transferAccountRif: settings.transferAccountRif ?? "",
                orderExpirationMinutes: settings.orderExpirationMinutes,
                maxPendingOrders: settings.maxPendingOrders,
                maxQuantityPerItem: settings.maxQuantityPerItem,
                rateCurrency: (settings.rateCurrency ?? "usd") as "usd" | "eur",
                showRateInMenu: settings.showRateInMenu ?? true,
                rateOverrideBsPerUsd: settings.rateOverrideBsPerUsd ?? "",
                activePaymentProvider: settings.activePaymentProvider,
                banescoApiKey: settings.banescoApiKey ?? "",
                mercantilClientId: settings.mercantilClientId ?? "",
                mercantilSecretKey: settings.mercantilSecretKey ?? "",
                mercantilMerchantId: settings.mercantilMerchantId ?? "",
                mercantilIntegratorId: settings.mercantilIntegratorId ?? "",
                mercantilTerminalId: settings.mercantilTerminalId ?? "",
                whatsappNumber: settings.whatsappNumber,
                whatsappMicroserviceUrl: settings.whatsappMicroserviceUrl ?? "http://38.171.255.120:3333",
                instagramUrl: settings.instagramUrl ?? "",
                orderModeOnSiteEnabled: settings.orderModeOnSiteEnabled ?? true,
                orderModeTakeAwayEnabled: settings.orderModeTakeAwayEnabled ?? true,
                orderModeDeliveryEnabled: settings.orderModeDeliveryEnabled ?? true,
                packagingFeePerPlateUsdCents: settings.packagingFeePerPlateUsdCents ?? 0,
                packagingFeePerAdicionalUsdCents: settings.packagingFeePerAdicionalUsdCents ?? 0,
                packagingFeePerBebidaUsdCents: settings.packagingFeePerBebidaUsdCents ?? 0,
                deliveryFeeUsdCents: settings.deliveryFeeUsdCents ?? 0,
                deliveryCoverage: settings.deliveryCoverage ?? "",
                paymentPagoMovilEnabled: settings.paymentPagoMovilEnabled ?? true,
                paymentTransferEnabled: settings.paymentTransferEnabled ?? true,
              }
              : null
          }
        />
      </div>
    </div>
  );
}
