import type {
  PaymentProvider,
  PaymentInitResult,
  PaymentConfirmInput,
  PaymentConfirmResult,
  SettingsRow,
  OrderRow,
} from "./types";

export class MercantilC2PProvider implements PaymentProvider {
  readonly id = "mercantil_c2p" as const;
  readonly mode = "passive" as const;

  constructor(_settings: SettingsRow) {}

  async initiatePayment(
    _order: OrderRow,
    _settings: SettingsRow,
  ): Promise<PaymentInitResult> {
    throw new Error(
      "MercantilC2PProvider: not implemented yet. Configure banesco_reference or whatsapp_manual in settings.",
    );
  }

  async confirmPayment(
    _input: PaymentConfirmInput,
  ): Promise<PaymentConfirmResult> {
    throw new Error(
      "MercantilC2PProvider: not implemented yet. Configure banesco_reference or whatsapp_manual in settings.",
    );
  }
}
