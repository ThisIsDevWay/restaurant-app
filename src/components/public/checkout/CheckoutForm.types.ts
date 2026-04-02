import type { CartItem } from "@/store/cartStore";

export interface CheckoutSettings {
  rate: number | null;
  orderModeOnSiteEnabled: boolean;
  orderModeTakeAwayEnabled: boolean;
  orderModeDeliveryEnabled: boolean;
  packagingFeePerPlateUsdCents: number;
  packagingFeePerAdicionalUsdCents: number;
  packagingFeePerBebidaUsdCents: number;
  deliveryFeeUsdCents: number;
  deliveryCoverage: string | null;
  transferBankName: string;
  transferAccountName: string;
  transferAccountNumber: string;
  transferAccountRif: string;
  paymentPagoMovilEnabled: boolean;
  paymentTransferEnabled: boolean;
}

export type PaymentMethod = "pago_movil" | "transfer";
export type OrderMode = "on_site" | "take_away" | "delivery";

export interface CheckoutFormProps {
  items: CartItem[];
  totalBsCents: number;
  totalUsdCents: number;
  isSubmitting: boolean;
  error: string | null;
  onSubmit: (phone: string, paymentMethod: PaymentMethod, name?: string, cedula?: string, orderMode?: OrderMode, deliveryAddress?: string) => void;
  settings: CheckoutSettings | null;
}
