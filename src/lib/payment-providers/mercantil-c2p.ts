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
    return {
      screen: "error",
      message: "Mercantil C2P no está configurado. Contacta al administrador.",
    };
  }

  async confirmPayment(
    _input: PaymentConfirmInput,
  ): Promise<PaymentConfirmResult> {
    return {
      success: false,
      reason: "api_error",
      message: "Proveedor no implementado",
    };
  }
}
