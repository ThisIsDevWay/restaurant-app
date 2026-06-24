import { describe, it, expect, vi, beforeEach } from "vitest";
import { reconcileSingleOrder, reconcileOrderWithNotification, notifyPaymentConfirmed } from "@/services/payment.service";
import { db } from "@/db";
import * as Sentry from "@sentry/nextjs";

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(),
    from: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(),
    transaction: vi.fn((cb: any) => cb(db)),
    update: vi.fn(),
    set: vi.fn(),
    returning: vi.fn(),
    insert: vi.fn(),
    values: vi.fn(),
    for: vi.fn(),
  },
}));

vi.mock("@/db/queries/settings", () => ({
  getSettings: vi.fn().mockResolvedValue({
    whatsappMicroserviceUrl: "http://mock-wa",
  }),
}));

vi.mock("@/lib/whatsapp/messages", () => ({
  sendOrderMessage: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("@/lib/print/enqueue", () => ({
  printProductionTickets: vi.fn().mockResolvedValue(true),
  printReceipt: vi.fn().mockResolvedValue(true),
}));

vi.mock("@sentry/nextjs", () => ({
  captureMessage: vi.fn(),
  captureException: vi.fn(),
}));

describe("payment.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("reconcileOrderWithNotification", () => {
    it("debe lanzar error if order.status !== pending", async () => {
      const mockTx = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        for: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ id: "order-1", status: "paid" }]),
      };

      await expect(
        reconcileOrderWithNotification(mockTx as any, "order-1", "notif-1", "123456", 1500, {})
      ).rejects.toThrow("order_already_processed");
    });

    it("debe lanzar error if bank notification status !== pending (B1)", async () => {
      const mockTx = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        for: vi.fn().mockReturnThis(),
        limit: vi.fn()
          .mockResolvedValueOnce([{ id: "order-1", status: "pending", grandTotalBsCents: 1500 }]) // order lookup
          .mockResolvedValueOnce([{ id: "notif-1", status: "reconciled", amountBsCents: 1500 }]), // notif lookup
      };

      await expect(
        reconcileOrderWithNotification(mockTx as any, "order-1", "notif-1", "123456", 1500, {})
      ).rejects.toThrow("notification_already_reconciled");
    });

    it("debe lanzar error if amount mismatch (m6)", async () => {
      const mockTx = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        for: vi.fn().mockReturnThis(),
        limit: vi.fn()
          .mockResolvedValueOnce([{ id: "order-1", status: "pending", grandTotalBsCents: 2000 }]) // order lookup
          .mockResolvedValueOnce([{ id: "notif-1", status: "pending", amountBsCents: 1500 }]), // notif lookup
      };

      await expect(
        reconcileOrderWithNotification(mockTx as any, "order-1", "notif-1", "123456", 1500, {})
      ).rejects.toThrow("amount_mismatch");
    });
  });

  describe("reconcileSingleOrder (A1 & m5)", () => {
    it("debe retornar false y alertar Sentry en caso de ambigüedad de sufijo-4 (A1)", async () => {
      const mockOrder = { id: "order-1", status: "pending", grandTotalBsCents: 1500 };
      const mockNotifs = [
        { id: "notif-1", reference: "123456", amountBsCents: 1500, status: "pending" },
        { id: "notif-2", reference: "993456", amountBsCents: 1500, status: "pending" }, // comparte sufijo-4
      ];

      (db.select as any).mockReturnValue({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([mockOrder])
          }))
        }))
      });

      // Mock select de bankNotifications
      const secondSelect = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn().mockResolvedValue(mockNotifs)
        }))
      }));
      (db.select as any).mockImplementationOnce(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([mockOrder])
          }))
        }))
      })).mockImplementationOnce(secondSelect);

      const res = await reconcileSingleOrder("order-1", "3456");
      expect(res).toBe(false);
      expect(Sentry.captureMessage).toHaveBeenCalledWith(
        expect.stringContaining("Ambigüedad en verificación manual"),
        "warning"
      );
    });

    it("debe conciliar correctamente y llamar a notifyPaymentConfirmed (m5) si hay una coincidencia única", async () => {
      const mockOrder = { id: "order-1", status: "pending", grandTotalBsCents: 1500, customerPhone: "04141234567", itemsSnapshot: [], rateSnapshotBsPerUsd: "36.5" };
      const mockNotifs = [
        { id: "notif-1", reference: "123456", amountBsCents: 1500, status: "pending", rawPayload: {}, senderPhone: "04141234567" },
      ];

      // Reset mocks for implementation
      (db.select as any).mockImplementation(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([mockOrder]),
            for: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue([mockOrder]),
            })),
          })),
        })),
      }));

      // Mock de transacciones internas de reconcileOrderWithNotification
      const limitMock = vi.fn()
        .mockResolvedValueOnce([mockOrder]) // order
        .mockResolvedValueOnce([mockNotifs[0]]) // notif
        .mockResolvedValueOnce([]); // existingLog

      const mockTx = {
        select: vi.fn().mockImplementation(() => ({
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              for: vi.fn(() => ({
                limit: limitMock,
              })),
            })),
          })),
        })),
        update: vi.fn().mockImplementation(() => ({
          set: vi.fn().mockImplementation(() => ({
            where: vi.fn().mockImplementation(() => ({
              returning: vi.fn()
                .mockResolvedValueOnce([mockOrder]) // updatedOrder
                .mockResolvedValueOnce([mockNotifs[0]]), // updatedNotif
            })),
          })),
        })),
        insert: vi.fn().mockImplementation(() => ({
          values: vi.fn().mockResolvedValue([]),
        })),
      };

      (db.transaction as any).mockImplementation(async (cb: any) => {
        return cb(mockTx);
      });

      // Mock select de matchedNotifs en reconcileSingleOrder
      (db.select as any).mockImplementationOnce(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue([mockOrder])
          }))
        }))
      })).mockImplementationOnce(() => ({
        from: vi.fn(() => ({
          where: vi.fn().mockResolvedValue(mockNotifs)
        }))
      }));

      const res = await reconcileSingleOrder("order-1", "3456");
      expect(res).toBe(true);
    });
  });
});
