import { updateOrderStatus as updateOrderStatusDb, createOrder as createOrderDb } from "@/db/queries/orders";
import { orders } from "@/db/schema";

type OrderStatus = NonNullable<typeof orders.$inferSelect["status"]>;
import { CheckoutItem } from "@/lib/types/checkout";
import { CheckoutInput } from "@/lib/validations/checkout";
import { getSettings, getActiveRate } from "@/db/queries/settings";
import { createOrderWithCapacityCheck } from "@/db/queries/orders";
import { getActiveProvider } from "@/lib/payment-providers";
import { getMenuItemWithOptionsAndComponents } from "@/db/queries/menu";
import { usdCentsToBsCents } from "@/lib/money";
import { generateDailyMenuSnapshot } from "@/services/menu.service";

export async function createOrder(data: typeof orders.$inferInsert) {
    return createOrderDb(data);
}

export async function cancelOrder(orderId: string, _reason: string) {
    return updateOrderStatusDb(orderId, "cancelled");
}

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
    return updateOrderStatusDb(orderId, status);
}

export async function calculateOrderTotals(items: CheckoutItem[], rate: number, date: string) {
    let subtotalUsdCents = 0;
    const snapshotItems = [];

    const { dailyAdicionalMap, dailyBebidaMap, globalContornoMap } = await generateDailyMenuSnapshot(date);

    for (const clientItem of items) {
        const menuItem = await getMenuItemWithOptionsAndComponents(clientItem.id);
        if (!menuItem) {
            throw new Error(`Item no encontrado: ${clientItem.id}`);
        }
        if (!menuItem.isAvailable) {
            throw new Error(`"${menuItem.name}" ya no está disponible.`);
        }

        let optionPriceUsdCents = 0;
        const fixedContornos = [];
        const selectedAdicionales = [];
        const selectedBebidas = [];

        // Validate and process removed components (discounts)
        let removalAdjustmentUsdCents = 0;
        const validatedRemovals = [];
        for (const removal of clientItem.removedComponents) {
            const validContorno = menuItem.contornos.find(
                (c) => c.id === removal.componentId && c.removable
            );
            if (validContorno) {
                removalAdjustmentUsdCents -= validContorno.priceUsdCents;
                validatedRemovals.push({
                    isRemoval: true as const,
                    componentId: validContorno.id,
                    name: validContorno.name,
                    priceUsdCents: validContorno.priceUsdCents,
                });
            }
        }

        // Validate and add fixed contornos prices
        for (const fc of clientItem.fixedContornos) {
            const validContorno = menuItem.contornos.find(
                (c) => c.id === fc.id && c.isAvailable,
            );
            if (validContorno) {
                optionPriceUsdCents += validContorno.priceUsdCents;
                fixedContornos.push({
                    id: validContorno.id,
                    name: validContorno.name,
                    priceUsdCents: validContorno.priceUsdCents,
                    priceBsCents: usdCentsToBsCents(validContorno.priceUsdCents, rate),
                });
            }
        }

        // Validate adicionales against daily pool
        for (const ad of clientItem.selectedAdicionales) {
            let found = false;

            const dailyAdicional = dailyAdicionalMap.get(ad.id);
            if (dailyAdicional && dailyAdicional.isAvailable) {
                const qty = ad.quantity ?? 1;
                optionPriceUsdCents += dailyAdicional.priceUsdCents * qty;
                selectedAdicionales.push({
                    id: dailyAdicional.id,
                    name: dailyAdicional.name,
                    priceUsdCents: dailyAdicional.priceUsdCents,
                    priceBsCents: usdCentsToBsCents(dailyAdicional.priceUsdCents, rate),
                    substitutesComponentId: ad.substitutesComponentId,
                    substitutesComponentName: ad.substitutesComponentName,
                    quantity: qty,
                });
                found = true;
            }

            if (!found) {
                const validAdicional = menuItem.adicionales.find(
                    (a) => a.id === ad.id && a.isAvailable,
                );
                if (validAdicional) {
                    const qty = ad.quantity ?? 1;
                    optionPriceUsdCents += validAdicional.priceUsdCents * qty;
                    selectedAdicionales.push({
                        id: validAdicional.id,
                        name: validAdicional.name,
                        priceUsdCents: validAdicional.priceUsdCents,
                        priceBsCents: usdCentsToBsCents(validAdicional.priceUsdCents, rate),
                        substitutesComponentId: ad.substitutesComponentId,
                        substitutesComponentName: ad.substitutesComponentName,
                        quantity: qty,
                    });
                    found = true;
                }
            }

            if (!found) {
                const validContorno = menuItem.contornos.find(
                    (c) => c.id === ad.id && c.isAvailable,
                );
                if (validContorno) {
                    const qty = ad.quantity ?? 1;
                    optionPriceUsdCents += validContorno.priceUsdCents * qty;
                    selectedAdicionales.push({
                        id: validContorno.id,
                        name: validContorno.name,
                        priceUsdCents: validContorno.priceUsdCents,
                        priceBsCents: usdCentsToBsCents(validContorno.priceUsdCents, rate),
                        substitutesComponentId: ad.substitutesComponentId,
                        substitutesComponentName: ad.substitutesComponentName,
                        quantity: qty,
                    });
                    found = true;
                }
            }

            if (!found) {
                const globalContorno = globalContornoMap.get(ad.id);
                if (globalContorno && globalContorno.isAvailable) {
                    const qty = ad.quantity ?? 1;
                    optionPriceUsdCents += globalContorno.priceUsdCents * qty;
                    selectedAdicionales.push({
                        id: globalContorno.id,
                        name: globalContorno.name,
                        priceUsdCents: globalContorno.priceUsdCents,
                        priceBsCents: usdCentsToBsCents(globalContorno.priceUsdCents, rate),
                        substitutesComponentId: ad.substitutesComponentId,
                        substitutesComponentName: ad.substitutesComponentName,
                        quantity: qty,
                    });
                    found = true;
                }
            }

            if (!found) {
                for (const group of menuItem.optionGroups) {
                    for (const opt of group.options) {
                        if (opt.id === ad.id && opt.isAvailable) {
                            const qty = ad.quantity ?? 1;
                            optionPriceUsdCents += opt.priceUsdCents * qty;
                            selectedAdicionales.push({
                                id: opt.id,
                                name: opt.name,
                                priceUsdCents: opt.priceUsdCents,
                                priceBsCents: usdCentsToBsCents(opt.priceUsdCents, rate),
                                substitutesComponentId: ad.substitutesComponentId,
                                substitutesComponentName: ad.substitutesComponentName,
                                quantity: qty,
                            });
                            found = true;
                            break;
                        }
                    }
                    if (found) break;
                }
            }

            if (!found) {
                throw new Error(`Adicional no encontrado o no disponible: ${ad.name}`);
            }
        }

        // Validate bebidas
        if (clientItem.selectedBebidas) {
            for (const beb of clientItem.selectedBebidas) {
                let found = false;

                const dailyBebida = dailyBebidaMap.get(beb.id);
                if (dailyBebida && dailyBebida.isAvailable) {
                    const qty = beb.quantity ?? 1;
                    optionPriceUsdCents += dailyBebida.priceUsdCents * qty;
                    selectedBebidas.push({
                        id: dailyBebida.id,
                        name: dailyBebida.name,
                        priceUsdCents: dailyBebida.priceUsdCents,
                        priceBsCents: usdCentsToBsCents(dailyBebida.priceUsdCents, rate),
                        quantity: qty,
                    });
                    found = true;
                }

                if (!found) {
                    const validBebida = menuItem.bebidas?.find(
                        (b) => b.id === beb.id && b.isAvailable,
                    );
                    if (validBebida) {
                        const qty = beb.quantity ?? 1;
                        optionPriceUsdCents += validBebida.priceUsdCents * qty;
                        selectedBebidas.push({
                            id: validBebida.id,
                            name: validBebida.name,
                            priceUsdCents: validBebida.priceUsdCents,
                            priceBsCents: usdCentsToBsCents(validBebida.priceUsdCents, rate),
                            quantity: qty,
                        });
                        found = true;
                    }
                }

                if (!found) {
                    throw new Error(`Bebida no encontrada o no disponible: ${beb.name}`);
                }
            }
        }

        const itemUsdCents =
            (menuItem.priceUsdCents + optionPriceUsdCents + removalAdjustmentUsdCents) *
            clientItem.quantity;
        subtotalUsdCents += itemUsdCents;

        const itemBaseBsCents = usdCentsToBsCents(menuItem.priceUsdCents, rate);
        const itemTotalBsCents =
            usdCentsToBsCents(
                menuItem.priceUsdCents + optionPriceUsdCents + removalAdjustmentUsdCents,
                rate,
            ) * clientItem.quantity;

        snapshotItems.push({
            id: menuItem.id,
            name: menuItem.name,
            priceUsdCents: menuItem.priceUsdCents,
            priceBsCents: itemBaseBsCents,
            costUsdCents: menuItem.costUsdCents,
            fixedContornos,
            selectedAdicionales,
            selectedBebidas,
            removedComponents: validatedRemovals,
            quantity: clientItem.quantity,
            itemTotalBsCents,
        });
    }

    const subtotalBsCents = usdCentsToBsCents(subtotalUsdCents, rate);

    return {
        snapshotItems,
        subtotalUsdCents,
        subtotalBsCents
    };
}

export interface ProcessCheckoutParams {
    items: CheckoutItem[];
    input: CheckoutInput;
}

export async function processCheckout(params: ProcessCheckoutParams) {
    const { items, input } = params;

    // 0. Validate that cart doesn't contain ONLY restricted items
    const allRestricted = items.every((item) => !item.categoryAllowAlone);
    if (allRestricted && items.length > 0) {
        throw new Error("No puedes pedir solo bebidas o adicionales. Agrega un plato principal.");
    }

    const settings = await getSettings();
    if (!settings) throw new Error("Configuración no encontrada");

    const rateResult = await getActiveRate();
    if (!rateResult) throw new Error("Tasa de cambio no disponible");
    const rate = rateResult.rate;

    const today = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Caracas",
    }).format(new Date());

    // 1. Calculate totals (re-validating everything)
    const { snapshotItems, subtotalUsdCents, subtotalBsCents } = await calculateOrderTotals(items, rate, today);

    // 2. Create order with atomic capacity check
    const expiresAt = new Date(Date.now() + settings.orderExpirationMinutes * 60 * 1000);
    const provider = getActiveProvider(settings);

    const { order, reason } = await createOrderWithCapacityCheck({
        customerPhone: input.phone,
        itemsSnapshot: snapshotItems,
        subtotalUsdCents,
        subtotalBsCents,
        status: provider.id === "whatsapp_manual" ? "whatsapp" : "pending",
        paymentMethod: input.paymentMethod,
        paymentProvider: provider.id,
        orderMode: input.orderMode ?? null,
        deliveryAddress: input.deliveryAddress ?? null,
        exchangeRateId: settings.currentRateId!,
        rateSnapshotBsPerUsd: rate.toString(),
        expiresAt,
    }, settings.maxPendingOrders);

    if (reason === "capacity_exceeded") {
        throw new Error("No podemos recibir más pedidos ahora. Intenta en unos minutos.");
    }

    if (!order) throw new Error("Error al crear la orden");

    // 3. Initiate payment
    let initResult = await provider.initiatePayment(order, settings);

    // Override for transfer
    if (input.paymentMethod === "transfer") {
        initResult = {
            screen: "enter_reference",
            totalBsCents: subtotalBsCents,
            bankDetails: {
                bankName: settings.bankName,
                bankCode: settings.bankCode,
                accountPhone: settings.accountPhone,
                accountRif: settings.accountRif,
                transferBankName: settings.transferBankName,
                transferAccountName: settings.transferAccountName,
                transferAccountNumber: settings.transferAccountNumber,
                transferAccountRif: settings.transferAccountRif,
            },
        };
    }

    return { order, initResult, subtotalBsCents, snapshotItems, settings };
}
