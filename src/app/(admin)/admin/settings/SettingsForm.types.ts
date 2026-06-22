import type { ProviderId } from "@/lib/payment-providers/types";
import type { PrinterTarget } from "@/lib/print/printer-target";

export interface Template {
  id: string;
  key: string;
  label: string;
  body: string;
  isActive: boolean;
}

// Re-export so existing imports of PaymentProvider still compile
export type { ProviderId };
/** @deprecated Use ProviderId from @/lib/payment-providers/types */
export type PaymentProvider = ProviderId;

export interface SettingsFormData {
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
  pabiloApiKey?: string;
  pabiloUserBankId?: string;
  pabiloNotificationsBankId?: string;
  orderExpirationMinutes: number;
  maxPendingOrders: number;
  maxQuantityPerItem: number;
  rateCurrency: "usd" | "eur";
  showRateInMenu: boolean;
  rateOverrideBsPerUsd: string;
  activePaymentProvider: ProviderId;
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
  logoUrl: string;
  logoImagekitFileId: string;
  coverImageUrl: string;
  coverImagekitFileId: string;
  branchName: string;
  scheduleText: string;
  businessHours: any;
  statusOverride: "auto" | "open" | "closed";
  hideMenuWhenClosed: boolean;
  preOpenVisibilityMinutes: number;
  orderModeOnSiteEnabled: boolean;
  orderModeTakeAwayEnabled: boolean;
  orderModeDeliveryEnabled: boolean;
  packagingFeePerPlateUsdCents: number;
  packagingFeePerAdicionalUsdCents: number;
  packagingFeePerBebidaUsdCents: number;
  deliveryFeeUsdCents: number;
  deliveryCoverage: string;
  deliveryZones: Array<{ label: string; feeUsdCents: number }>;
  requirePaymentBeforeKitchen: boolean;
  paymentPagoMovilEnabled: boolean;
  paymentTransferEnabled: boolean;
  paymentEfectivoEnabled: boolean;
  paymentZelleEnabled: boolean;
  zelleEmail: string;
  zelleName: string;
  paymentBinanceEnabled: boolean;
  binanceEmail: string;
  binancePayId: string;
  efectivoAskCashAmount: boolean;
  efectivoAskChangeBs: boolean;
  menuLayout: "modern" | "classic";
  menuItemSortMode: "custom" | "price_asc" | "price_desc";
  applyIgtf: boolean;
  igtfPercentage: string;
  printerTargets: PrinterTarget[];
}

export type FormErrors = Partial<Record<keyof SettingsFormData, string>>;

export interface PrinterCategoryOption {
  id: string;
  name: string;
}

export interface SettingsFormProps {
  initialData: SettingsFormData | null;
  templates?: Template[];
  categories?: PrinterCategoryOption[];
}

// Order mode config — typed to match SettingsFormData keys
export const ORDER_MODES = [
  { id: "orderModeOnSiteEnabled" as const, label: "Comer en Sitio" },
  { id: "orderModeTakeAwayEnabled" as const, label: "Para Llevar" },
  { id: "orderModeDeliveryEnabled" as const, label: "Delivery" },
] as const;

export const PAYMENT_PROVIDERS = [
  { id: "banesco_reference" as const satisfies ProviderId, label: "Banesco (P2P / Ref.)" },
  { id: "mercantil_c2p" as const satisfies ProviderId, label: "Mercantil (Smart Pay)" },
  { id: "bnc_feed" as const satisfies ProviderId, label: "BNC (Smart Pay)" },
  { id: "pabilo_bdv" as const satisfies ProviderId, label: "Pabilo (BDV Personal)" },
  { id: "pabilo_notifications" as const satisfies ProviderId, label: "Pabilo (Notificaciones SMS)" },
  { id: "whatsapp_manual" as const satisfies ProviderId, label: "Confirmación WhatsApp" },
] as const;
// ^ Using `satisfies ProviderId` ensures TypeScript errors immediately if any id drifts from the canonical type
