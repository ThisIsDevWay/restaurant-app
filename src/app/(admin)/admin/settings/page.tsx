import { getSettings } from "@/db/queries/settings";
import { SettingsForm } from "./SettingsForm";

export default async function SettingsPage() {
  const settings = await getSettings();

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-text-main">Configuración</h1>
      <p className="mb-6 text-sm text-text-muted">
        Datos bancarios y parámetros del sistema
      </p>

      <div className="max-w-lg">
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
                  activePaymentProvider: settings.activePaymentProvider,
                  banescoApiKey: settings.banescoApiKey ?? "",
                  whatsappNumber: settings.whatsappNumber,
                }
              : null
          }
        />
      </div>
    </div>
  );
}
