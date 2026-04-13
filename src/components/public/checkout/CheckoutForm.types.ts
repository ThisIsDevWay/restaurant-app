import type { CartItem } from "@/store/cartStore";
import type { SurchargeResult } from "@/hooks/useCheckoutSurcharges";

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
  onSubmit: (
    phone: string,
    paymentMethod: PaymentMethod,
    name?: string,
    cedula?: string,
    orderMode?: OrderMode,
    deliveryAddress?: string,
    clientSurcharges?: SurchargeResult,
    gpsCoords?: GpsCoords | null,
  ) => void;
  settings: CheckoutSettings | null;
}

export interface GpsCoords {
  lat: number;
  lng: number;
  accuracy: number; // metros
}

export interface ComprobanteData {
  file: File;
  previewUrl: string;       // URL.createObjectURL(file) — para thumbnail
  uploadedUrl: string | null; // URL pública de Supabase tras subida exitosa
  isUploading: boolean;
  uploadError: string | null;
}
