import { updateOrderStatus as updateOrderStatusDb, createOrder as createOrderDb } from "@/db/queries/orders";
import { orders } from "@/db/schema";

type OrderStatus = NonNullable<typeof orders.$inferSelect["status"]>;
import { CheckoutItem } from "@/actions/checkout";
import { getMenuItemWithOptionsAndComponents } from "@/db/queries/menu";
import { usdCentsToBsCents } from "@/lib/money";
import { generateDailyMenuSnapshot } from "@/services/menu.service";

export async function createOrder(data: any, userId?: string) {
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

        // Process removed components (discounts)
        let removalAdjustmentUsdCents = 0;
        for (const removal of clientItem.removedComponents) {
            removalAdjustmentUsdCents -= removal.priceUsdCents;
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
                optionPriceUsdCents += dailyAdicional.priceUsdCents;
                selectedAdicionales.push({
                    id: dailyAdicional.id,
                    name: dailyAdicional.name,
                    priceUsdCents: dailyAdicional.priceUsdCents,
                    priceBsCents: usdCentsToBsCents(dailyAdicional.priceUsdCents, rate),
                    substitutesComponentId: ad.substitutesComponentId,
                    substitutesComponentName: ad.substitutesComponentName,
                });
                found = true;
            }

            if (!found) {
                const validAdicional = menuItem.adicionales.find(
                    (a) => a.id === ad.id && a.isAvailable,
                );
                if (validAdicional) {
                    optionPriceUsdCents += validAdicional.priceUsdCents;
                    selectedAdicionales.push({
                        id: validAdicional.id,
                        name: validAdicional.name,
                        priceUsdCents: validAdicional.priceUsdCents,
                        priceBsCents: usdCentsToBsCents(validAdicional.priceUsdCents, rate),
                        substitutesComponentId: ad.substitutesComponentId,
                        substitutesComponentName: ad.substitutesComponentName,
                    });
                    found = true;
                }
            }

            if (!found) {
                const validContorno = menuItem.contornos.find(
                    (c) => c.id === ad.id && c.isAvailable,
                );
                if (validContorno) {
                    optionPriceUsdCents += validContorno.priceUsdCents;
                    selectedAdicionales.push({
                        id: validContorno.id,
                        name: validContorno.name,
                        priceUsdCents: validContorno.priceUsdCents,
                        priceBsCents: usdCentsToBsCents(validContorno.priceUsdCents, rate),
                        substitutesComponentId: ad.substitutesComponentId,
                        substitutesComponentName: ad.substitutesComponentName,
                    });
                    found = true;
                }
            }

            if (!found) {
                const globalContorno = globalContornoMap.get(ad.id);
                if (globalContorno && globalContorno.isAvailable) {
                    optionPriceUsdCents += globalContorno.priceUsdCents;
                    selectedAdicionales.push({
                        id: globalContorno.id,
                        name: globalContorno.name,
                        priceUsdCents: globalContorno.priceUsdCents,
                        priceBsCents: usdCentsToBsCents(globalContorno.priceUsdCents, rate),
                        substitutesComponentId: ad.substitutesComponentId,
                        substitutesComponentName: ad.substitutesComponentName,
                    });
                    found = true;
                }
            }

            if (!found) {
                for (const group of menuItem.optionGroups) {
                    for (const opt of group.options) {
                        if (opt.id === ad.id && opt.isAvailable) {
                            optionPriceUsdCents += opt.priceUsdCents;
                            selectedAdicionales.push({
                                id: opt.id,
                                name: opt.name,
                                priceUsdCents: opt.priceUsdCents,
                                priceBsCents: usdCentsToBsCents(opt.priceUsdCents, rate),
                                substitutesComponentId: ad.substitutesComponentId,
                                substitutesComponentName: ad.substitutesComponentName,
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
                    optionPriceUsdCents += dailyBebida.priceUsdCents;
                    selectedBebidas.push({
                        id: dailyBebida.id,
                        name: dailyBebida.name,
                        priceUsdCents: dailyBebida.priceUsdCents,
                        priceBsCents: usdCentsToBsCents(dailyBebida.priceUsdCents, rate),
                    });
                    found = true;
                }

                if (!found) {
                    const validBebida = menuItem.bebidas?.find(
                        (b) => b.id === beb.id && b.isAvailable,
                    );
                    if (validBebida) {
                        optionPriceUsdCents += validBebida.priceUsdCents;
                        selectedBebidas.push({
                            id: validBebida.id,
                            name: validBebida.name,
                            priceUsdCents: validBebida.priceUsdCents,
                            priceBsCents: usdCentsToBsCents(validBebida.priceUsdCents, rate),
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
            removedComponents: clientItem.removedComponents,
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
