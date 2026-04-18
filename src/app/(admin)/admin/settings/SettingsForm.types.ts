import type { ProviderId } from "@/lib/payment-providers/types";

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
  coverImageUrl: string;
  branchName: string;
  scheduleText: string;
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
  menuLayout: "modern" | "classic";
  menuItemSortMode: "custom" | "price_asc" | "price_desc";
}

export type FormErrors = Partial<Record<keyof SettingsFormData, string>>;

export interface SettingsFormProps {
  initialData: SettingsFormData | null;
  templates?: Template[];
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
  { id: "whatsapp_manual" as const satisfies ProviderId, label: "Confirmación WhatsApp" },
] as const;
// ^ Using `satisfies ProviderId` ensures TypeScript errors immediately if any id drifts from the canonical type
