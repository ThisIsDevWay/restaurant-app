import { getSettings } from "@/db/queries/settings";
import { getAllTemplates } from "@/db/queries/whatsapp-templates";
import { SettingsForm } from "./SettingsForm";
import { WhatsAppStatus } from "@/components/admin/whatsapp/WhatsAppStatus";
import type { PaymentProvider } from "./SettingsForm.types";

export default async function SettingsPage() {
  const [settings, templates] = await Promise.all([
    getSettings(),
    getAllTemplates(),
  ]);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-0 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-text-main mb- tracking-tight">Configuración</h1>
          <p className="text-sm text-text-muted font-medium">Gestiona la identidad, operaciones y pagos de tu restaurante.</p>
        </div>
        <WhatsAppStatus />
      </div>

      <SettingsForm
        templates={templates}
        initialData={
          settings
            ? {
              bankName: settings.bankName,
              bankCode: settings.bankCode,
              restaurantName: settings.restaurantName ?? "G&M",
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
              activePaymentProvider: (settings.activePaymentProvider ?? "banesco_reference") as PaymentProvider,
              banescoApiKey: settings.banescoApiKey ?? "",
              mercantilClientId: settings.mercantilClientId ?? "",
              mercantilClientSecret: settings.mercantilClientSecret ?? "",
              mercantilSecretKey: settings.mercantilSecretKey ?? "",
              mercantilMerchantId: settings.mercantilMerchantId ?? "",
              mercantilIntegratorId: settings.mercantilIntegratorId ?? "",
              mercantilTerminalId: settings.mercantilTerminalId ?? "",
              bncApiKey: settings.bncApiKey ?? "",
              whatsappNumber: settings.whatsappNumber,
              whatsappMicroserviceUrl: settings.whatsappMicroserviceUrl ?? "",
              instagramUrl: settings.instagramUrl ?? "",
              logoUrl: settings.logoUrl ?? "",
              logoImagekitFileId: settings.logoImagekitFileId ?? "",
              coverImageUrl: settings.coverImageUrl ?? "",
              coverImagekitFileId: settings.coverImagekitFileId ?? "",
              branchName: settings.branchName ?? "",
              scheduleText: settings.scheduleText ?? "",
              businessHours: settings.businessHours ?? { days: [], open: "", close: "" },
              statusOverride: (settings.statusOverride ?? "auto") as "auto" | "open" | "closed",
              hideMenuWhenClosed: settings.hideMenuWhenClosed ?? false,
              preOpenVisibilityMinutes: settings.preOpenVisibilityMinutes ?? 0,
              adicionalesEnabled: settings.adicionalesEnabled ?? true,
              bebidasEnabled: settings.bebidasEnabled ?? true,
              orderModeOnSiteEnabled: settings.orderModeOnSiteEnabled ?? true,
              orderModeTakeAwayEnabled: settings.orderModeTakeAwayEnabled ?? true,
              orderModeDeliveryEnabled: settings.orderModeDeliveryEnabled ?? true,
              packagingFeePerPlateUsdCents: settings.packagingFeePerPlateUsdCents ?? 0,
              packagingFeePerAdicionalUsdCents: settings.packagingFeePerAdicionalUsdCents ?? 0,
              packagingFeePerBebidaUsdCents: settings.packagingFeePerBebidaUsdCents ?? 0,
              deliveryFeeUsdCents: settings.deliveryFeeUsdCents ?? 0,
              deliveryCoverage: settings.deliveryCoverage ?? "",
              deliveryZones: settings.deliveryZones ?? [],
              requirePaymentBeforeKitchen: settings.requirePaymentBeforeKitchen ?? false,
              paymentPagoMovilEnabled: settings.paymentPagoMovilEnabled ?? true,
              paymentTransferEnabled: settings.paymentTransferEnabled ?? true,
              paymentEfectivoEnabled: settings.paymentEfectivoEnabled ?? false,
              paymentZelleEnabled: settings.paymentZelleEnabled ?? false,
              zelleEmail: settings.zelleEmail ?? "",
              zelleName: settings.zelleName ?? "",
              paymentBinanceEnabled: settings.paymentBinanceEnabled ?? false,
              binanceEmail: settings.binanceEmail ?? "",
              binancePayId: settings.binancePayId ?? "",
              efectivoAskCashAmount: settings.efectivoAskCashAmount ?? true,
              efectivoAskChangeBs: settings.efectivoAskChangeBs ?? true,
              menuLayout: (settings.menuLayout ?? "modern") as "modern" | "classic",
              menuItemSortMode: (settings.menuItemSortMode ?? "custom") as "custom" | "price_asc" | "price_desc",
              applyIgtf: settings.applyIgtf ?? false,
              igtfPercentage: settings.igtfPercentage ?? "3.00",
              printerTargets: (settings.printerTargets ?? [{ name: "main", copies: 1, reprintCopies: 1, enabled: true }]).map(p => ({
                name: p.name,
                copies: p.copies,
                reprintCopies: p.reprintCopies ?? 1,
                enabled: p.enabled,
              })),
            }
            : null
        }
      />
    </div>
  );
}
