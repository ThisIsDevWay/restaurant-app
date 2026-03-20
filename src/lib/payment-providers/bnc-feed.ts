import type {
  PaymentProvider,
  PaymentInitResult,
  PaymentConfirmInput,
  PaymentConfirmResult,
  SettingsRow,
  OrderRow,
} from "./types";

export class BNCFeedProvider implements PaymentProvider {
  readonly id = "bnc_feed" as const;
  readonly mode = "passive" as const;

  constructor(_settings: SettingsRow) {}

  async initiatePayment(
    _order: OrderRow,
    _settings: SettingsRow,
  ): Promise<PaymentInitResult> {
    throw new Error(
      "BNCFeedProvider: not implemented yet. Configure banesco_reference or whatsapp_manual in settings.",
    );
  }

  async confirmPayment(
    _input: PaymentConfirmInput,
  ): Promise<PaymentConfirmResult> {
    throw new Error(
      "BNCFeedProvider: not implemented yet. Configure banesco_reference or whatsapp_manual in settings.",
    );
  }
}
