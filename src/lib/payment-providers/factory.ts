import type { PaymentProvider, SettingsRow } from "./types";
import { BanescoReferenceProvider } from "./banesco-reference";
import { MercantilC2PProvider } from "./mercantil-c2p";
import { BNCFeedProvider } from "./bnc-feed";
import { WhatsAppManualProvider } from "./whatsapp-manual";

export function getActiveProvider(settings: SettingsRow): PaymentProvider {
  switch (settings.activePaymentProvider) {
    case "banesco_reference":
      return new BanescoReferenceProvider(settings);
    case "mercantil_c2p":
      return new MercantilC2PProvider(settings);
    case "bnc_feed":
      return new BNCFeedProvider(settings);
    case "whatsapp_manual":
      return new WhatsAppManualProvider(settings);
    default:
      return new BanescoReferenceProvider(settings);
  }
}
