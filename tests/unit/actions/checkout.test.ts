/**
 * Tests unitarios del Server Action `processCheckout`.
 *
 * Estrategia de mocks:
 * - next/server    → mocked via vitest.config.ts alias
 * - next/cache     → mocked via vitest.config.ts alias
 * - @/lib/auth     → mock de sesión nula (acción pública)
 * - @/db/queries/settings → mock de settings y tasa de cambio
 * - @/db/queries/orders   → mock de conteo de órdenes pendientes
 * - @/services/order.service → mock del cálculo de totales y creación
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import * as v from "valibot";

// ─── Mocks antes de importar el módulo bajo prueba ───────────────────────────

vi.mock("@/db/queries/settings", () => ({
    getSettings: vi.fn().mockResolvedValue({
        minOrderUsdCents: 500,
        maxPendingOrders: 10,
        paymentProvider: "banesco_reference",
        paymentMode: "active",
        banescoAccountHolder: "BurgerTech CA",
        banescoPhone: "04121234567",
    }),
    getActiveRate: vi.fn().mockResolvedValue({
        id: "rate-uuid-1",
        usdRate: "38.50",
    }),
}));

vi.mock("@/db/queries/orders", () => ({
    getPendingOrdersCount: vi.fn().mockResolvedValue(0),
    createOrder: vi.fn().mockResolvedValue({ id: "order-uuid-new", orderNumber: 42 }),
}));

vi.mock("@/services/order.service", () => ({
    calculateOrderTotals: vi.fn().mockResolvedValue({
        snapshotItems: [
            {
                id: "item-uuid-1",
                name: "Pollo a la Plancha",
                priceUsdCents: 500,
                priceBsCents: 19250,
                costUsdCents: 200,
                fixedContornos: [],
                selectedAdicionales: [],
                selectedBebidas: [],
                removedComponents: [],
                quantity: 1,
                itemTotalBsCents: 19250,
            },
        ],
        subtotalUsdCents: 500,
        subtotalBsCents: 19250,
    }),
    createOrder: vi.fn().mockResolvedValue({ id: "order-uuid-new", orderNumber: 42 }),
}));

vi.mock("@/db/queries/customers", () => ({
    upsertCustomer: vi.fn().mockResolvedValue({ id: "customer-uuid-1" }),
}));

vi.mock("@/lib/whatsapp/messages", () => ({
    sendOrderMessage: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/rate-limit", () => ({
    rateLimiters: {
        checkout: {
            check: vi.fn().mockResolvedValue({ allowed: true }),
        },
    },
}));

vi.mock("@/lib/logger", () => ({
    logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    },
}));

vi.mock("@/db", () => ({
    db: {
        select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue([]),
                }),
            }),
        }),
    },
}));

// ─── Import del módulo bajo prueba ───────────────────────────────────────────
import { checkoutSchema } from "@/lib/validations/checkout";

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("checkoutSchema — validación de entrada", () => {
    const validBase = {
        phone: "04121234567",
        paymentMethod: "pago_movil" as const,
        items: [{ id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11", quantity: 1 }],
    };

    it("acepta un payload válido", () => {
        const result = v.safeParse(checkoutSchema, validBase);
        expect(result.success).toBe(true);
    });

    it("rechaza cuando items está vacío", () => {
        const result = v.safeParse(checkoutSchema, { ...validBase, items: [] });
        expect(result.success).toBe(false);
        if (!result.success) {
            const messages = result.issues.map((i) => i.message);
            expect(messages.some((m) => m.includes("item"))).toBe(true);
        }
    });

    it("rechaza cuando quantity es 0", () => {
        const result = v.safeParse(checkoutSchema, {
            ...validBase,
            items: [{ id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11", quantity: 0 }],
        });
        expect(result.success).toBe(false);
    });

    it("rechaza cuando quantity es negativa", () => {
        const result = v.safeParse(checkoutSchema, {
            ...validBase,
            items: [{ id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11", quantity: -1 }],
        });
        expect(result.success).toBe(false);
    });

    it("rechaza un teléfono con formato inválido", () => {
        const result = v.safeParse(checkoutSchema, { ...validBase, phone: "12345678901" });
        expect(result.success).toBe(false);
    });

    it("rechaza un item sin UUID válido", () => {
        const result = v.safeParse(checkoutSchema, {
            ...validBase,
            items: [{ id: "not-a-uuid", quantity: 1 }],
        });
        expect(result.success).toBe(false);
    });

    it("acepta paymentMethod 'transfer'", () => {
        const result = v.safeParse(checkoutSchema, { ...validBase, paymentMethod: "transfer" });
        expect(result.success).toBe(true);
    });

    it("rechaza paymentMethod desconocido", () => {
        const result = v.safeParse(checkoutSchema, { ...validBase, paymentMethod: "bitcoin" });
        expect(result.success).toBe(false);
    });

    it("acepta campos opcionales name y cedula", () => {
        const result = v.safeParse(checkoutSchema, {
            ...validBase,
            name: "Juan Pérez",
            cedula: "V-12345678",
        });
        expect(result.success).toBe(true);
    });

    it("rechaza name con más de 50 caracteres", () => {
        const result = v.safeParse(checkoutSchema, {
            ...validBase,
            name: "A".repeat(51),
        });
        expect(result.success).toBe(false);
    });
});
