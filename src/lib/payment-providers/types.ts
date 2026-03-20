import type { settings } from "@/db/schema";
import type { orders } from "@/db/schema";

export type ProviderId =
  | "banesco_reference"
  | "mercantil_c2p"
  | "bnc_feed"
  | "whatsapp_manual";

export type PaymentInitResult =
  | {
      screen: "enter_reference";
      totalBsCents: number;
      bankDetails: BankDetails;
    }
  | {
      screen: "c2p_pending";
      instructions: string;
      expiresAt: string;
    }
  | {
      screen: "waiting_auto";
      totalBsCents: number;
      bankDetails: BankDetails;
    }
  | {
      screen: "whatsapp";
      waLink: string;
      prefilledMessage: string;
    };

export type PaymentConfirmInput =
  | { type: "reference"; reference: string; orderId: string }
  | { type: "webhook_c2p"; rawBody: string; signature: string }
  | { type: "feed_event"; event: unknown; signature: string }
  | { type: "manual"; adminUserId: string; orderId: string };

export type PaymentConfirmResult =
  | { success: true; providerRaw: unknown; reference?: string }
  | {
      success: false;
      reason:
        | "invalid_reference"
        | "amount_mismatch"
        | "already_used"
        | "expired"
        | "api_error";
      message: string;
    };

export interface BankDetails {
  bankName: string;
  bankCode: string;
  accountPhone: string;
  accountRif: string;
}

export type SettingsRow = typeof settings.$inferSelect;
export type OrderRow = typeof orders.$inferSelect;

export interface PaymentProvider {
  readonly id: ProviderId;
  readonly mode: "active" | "passive";
  initiatePayment(
    order: OrderRow,
    settings: SettingsRow,
  ): Promise<PaymentInitResult>;
  confirmPayment(input: PaymentConfirmInput): Promise<PaymentConfirmResult>;
}
