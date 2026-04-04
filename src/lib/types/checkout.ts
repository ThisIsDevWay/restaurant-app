export type CheckoutItem = {
    id: string;
    quantity: number;
    fixedContornos: Array<{ id: string; name: string; priceUsdCents: number; priceBsCents: number }>;
    selectedAdicionales: Array<{
        id: string;
        name: string;
        priceUsdCents: number;
        priceBsCents: number;
        quantity: number;
        substitutesComponentId?: string;
        substitutesComponentName?: string;
    }>;
    selectedBebidas?: Array<{
        id: string;
        name: string;
        priceUsdCents: number;
        priceBsCents: number;
        quantity: number;
    }>;
    removedComponents: Array<{
        isRemoval: true;
        componentId: string;
        name: string;
        priceUsdCents: number;
    }>;
    categoryAllowAlone: boolean;
};
