import { describe, it, expect, vi, beforeEach } from "vitest";
import { MercantilC2PProvider } from "@/lib/payment-providers/mercantil-c2p";
import { db } from "@/db";

vi.mock("@/db", () => {
    return {
        db: {
            select: vi.fn(),
            insert: vi.fn(),
            update: vi.fn(),
            transaction: vi.fn(async (cb) => {
                const txObj = {
                    update: vi.fn().mockReturnThis(),
                    set: vi.fn().mockReturnThis(),
                    where: vi.fn().mockReturnThis(),
                    insert: vi.fn().mockReturnThis(),
                    values: vi.fn().mockReturnThis(),
                };
                await cb(txObj);
                return txObj;
            }),
        },
    };
});

const mockSettings = {
    id: 1,
    bankName: "Mercantil",
    bankCode: "0105",
    accountPhone: "04141234567",
    accountRif: "J-12345678-9",
    mercantilClientId: "clientId",
    mercantilSecretKey: "secret",
    mercantilMerchantId: "merchantId",
    mercantilIntegratorId: "integratorId",
    mercantilTerminalId: "terminalId",
} as any;

describe("MercantilC2PProvider", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("initiatePayment returns enter_reference screen", async () => {
        const provider = new MercantilC2PProvider(mockSettings);
        const result = await provider.initiatePayment({ subtotalBsCents: 1500 } as any, mockSettings);

        expect(result.screen).toBe("enter_reference");
        if (result.screen === "enter_reference") {
            expect(result.totalBsCents).toBe(1500);
            expect(result.bankDetails.bankName).toBe("Mercantil");
        }
    });

    it("confirmPayment fails if reference < 4 chars", async () => {
        const provider = new MercantilC2PProvider(mockSettings);
        const result = await provider.confirmPayment({ type: "reference", reference: "123", orderId: "ord-1" });

        expect(result.success).toBe(false);
        expect((result as any).reason).toBe("invalid_reference");
    });

    it("confirmPayment handles mock mode success", async () => {
        process.env.MERCANTIL_API_MOCK = "true";

        // Mock DB responses
        const selectChain = {
            from: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValueOnce([{ id: "ord-1", status: "pending", subtotalBsCents: 1500, expiresAt: new Date(Date.now() + 100000) }]) // Order exists
                .mockResolvedValueOnce([]) // No payment log
        };
        (db.select as any).mockReturnValue(selectChain);

        const provider = new MercantilC2PProvider(mockSettings);
        const result = await provider.confirmPayment({ type: "reference", reference: "54321", orderId: "ord-1" });

        expect(result.success).toBe(true);
        expect((result as any).reference).toBe("54321");
        expect(db.transaction).toHaveBeenCalled();
    });
});
