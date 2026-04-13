import type { PaymentProvider, ProviderId, SettingsRow } from "./types";
import { BanescoReferenceProvider } from "./banesco-reference";
import { MercantilC2PProvider } from "./mercantil-c2p";
import { BNCFeedProvider } from "./bnc-feed";
import { WhatsAppManualProvider } from "./whatsapp-manual";

/** Resuelve el proveedor configurado en settings (usado durante checkout) */
export function getActiveProvider(settings: SettingsRow): PaymentProvider {
  return resolveProvider(settings.activePaymentProvider, settings);
}

/**
 * Resuelve un proveedor a partir de su ID almacenado en la orden.
 * Usar en rutas de administración que confirman pagos — garantiza que se
 * use el mismo proveedor con el que se creó la orden, incluso si el admin
 * cambió el proveedor activo después.
 */
export function getProviderById(providerId: string, settings: SettingsRow): PaymentProvider {
  return resolveProvider(providerId, settings);
}

function resolveProvider(providerId: string, settings: SettingsRow): PaymentProvider {
  switch (providerId as ProviderId) {
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
