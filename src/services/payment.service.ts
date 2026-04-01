import { expirePendingOrders } from "@/db/queries/orders";
import { getSettings } from "@/db/queries/settings";
import { getActiveProvider } from "@/lib/payment-providers";

export async function confirmPayment(
    orderId: string,
    reference: string,
    provider?: ReturnType<typeof getActiveProvider>,
) {
    if (!provider) {
        const settings = await getSettings();
        if (!settings) throw new Error("Configuración no encontrada");
        provider = getActiveProvider(settings);
    }

    if (provider.mode !== "active") {
        throw new Error("Este provider no acepta confirmaciones manuales");
    }

    return provider.confirmPayment({
        type: "reference",
        reference,
        orderId,
    });
}

export async function processWebhookPayload(
    payload: string,
    provider?: ReturnType<typeof getActiveProvider>,
    signature?: string,
) {
    if (!provider) {
        const settings = await getSettings();
        if (!settings) throw new Error("Configuración no encontrada");
        provider = getActiveProvider(settings);
    }

    if (provider.mode !== "passive") {
        return { success: false, reason: "ignored", message: "Provider is not passive" };
    }

    return provider.confirmPayment({
        type: "webhook_c2p",
        rawBody: payload,
        signature: signature ?? "",
    });
}

export async function expireUnpaidOrders() {
    return expirePendingOrders();
}
