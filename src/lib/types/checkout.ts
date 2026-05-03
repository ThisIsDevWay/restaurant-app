export type CheckoutItem = {
    id: string;
    quantity: number;
    isPrepackaged?: boolean;
    fixedContornos: Array<{ id: string; name: string; priceUsdCents: number; priceBsCents: number }>;
    selectedAdicionales: Array<{
        id: string;
        name: string;
        priceUsdCents: number;
        priceBsCents: number;
        quantity: number;
        isPrepackaged?: boolean;
        substitutesComponentId?: string;
        substitutesComponentName?: string;
    }>;
    selectedBebidas?: Array<{
        id: string;
        name: string;
        priceUsdCents: number;
        priceBsCents: number;
        quantity: number;
        isPrepackaged?: boolean;
    }>;
    removedComponents: Array<{
        isRemoval: true;
        componentId: string;
        name: string;
        priceUsdCents: number;
    }>;
    categoryAllowAlone: boolean;
    categoryIsSimple: boolean;
    categoryName: string;
};
