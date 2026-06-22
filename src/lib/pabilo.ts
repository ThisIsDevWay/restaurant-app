import { PabiloClient } from "@pabilo/sdk";

/**
 * Singleton PabiloClient — usado exclusivamente por PabiloBdvProvider
 * para verificación directa de pagos vía `pabilo.payments.verify()`.
 *
 * ⚠️ Estrategia B (NOTIFICATION_ACCOUNT) usa fetch directo a la API REST
 * porque el SDK no expone /v1/bank-pay-notifications.
 */
export const pabilo = new PabiloClient({
  apiKey: process.env.PABILO_API_KEY!,
});
