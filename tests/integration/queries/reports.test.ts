import { describe, it, expect, vi, beforeEach } from "vitest";
import { getReconciliationReport } from "@/db/queries/reports";
import { db } from "@/db";

vi.mock("@/db", () => ({
  db: {
    execute: vi.fn(),
  },
}));

describe("getReconciliationReport Query Mapping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("debe ejecutar la consulta SQL y mapear correctamente los diferentes tipos de conciliación", async () => {
    const mockDbRows = [
      // 1. Caso Reconciled (Conciliado)
      {
        type: "reconciled",
        orderId: "order-uuid-1",
        orderNumber: 100,
        orderTotalBsCents: 1500,
        orderReference: "123456",
        notificationId: "notif-uuid-1",
        notificationReference: "123456",
        notificationAmountBsCents: 1500,
        notificationSource: "pabilo",
        createdAt: "2026-06-25T14:30:00.000Z",
      },
      // 2. Caso Manual sin SMS
      {
        type: "manual_no_sms",
        orderId: "order-uuid-2",
        orderNumber: 101,
        orderTotalBsCents: 2000,
        orderReference: "987654",
        notificationId: null,
        notificationReference: null,
        notificationAmountBsCents: null,
        notificationSource: null,
        createdAt: "2026-06-25T15:00:00.000Z",
      },
      // 3. Caso Notificación Huérfana
      {
        type: "orphan_sms",
        orderId: null,
        orderNumber: null,
        orderTotalBsCents: null,
        orderReference: null,
        notificationId: "notif-uuid-2",
        notificationReference: "888888",
        notificationAmountBsCents: 3500,
        notificationSource: "local_sms",
        createdAt: "2026-06-25T16:00:00.000Z",
      },
      // 4. Caso Colisión de Referencias (Ambigüedad)
      {
        type: "ambiguous_collision",
        orderId: "order-uuid-3",
        orderNumber: 102,
        orderTotalBsCents: 4000,
        orderReference: "112233",
        notificationId: "notif-uuid-3",
        notificationReference: "992233", // misma terminación 2233
        notificationAmountBsCents: 4000,
        notificationSource: "pabilo",
        createdAt: "2026-06-25T17:00:00.000Z",
      },
      // 5. Caso Error de Monto
      {
        type: "amount_mismatch",
        orderId: "order-uuid-4",
        orderNumber: 103,
        orderTotalBsCents: 5000,
        orderReference: "555555",
        notificationId: "notif-uuid-4",
        notificationReference: "555555",
        notificationAmountBsCents: 4500, // monto difiere
        notificationSource: "pabilo",
        createdAt: "2026-06-25T18:00:00.000Z",
      },
    ];

    vi.mocked(db.execute).mockResolvedValue(mockDbRows as any);

    const fromDate = "2026-06-25";
    const toDate = "2026-06-25";
    
    const result = await getReconciliationReport(fromDate, toDate);

    expect(db.execute).toHaveBeenCalledTimes(1);
    
    // Validar longitud del resultado
    expect(result).toHaveLength(5);

    // 1. Validar mapeo del conciliado
    expect(result[0].type).toBe("reconciled");
    expect(result[0].orderId).toBe("order-uuid-1");
    expect(result[0].orderNumber).toBe(100);
    expect(result[0].orderTotalBsCents).toBe(1500);
    expect(result[0].orderReference).toBe("123456");
    expect(result[0].notificationId).toBe("notif-uuid-1");
    expect(result[0].notificationReference).toBe("123456");
    expect(result[0].notificationAmountBsCents).toBe(1500);
    expect(result[0].notificationSource).toBe("pabilo");
    expect(result[0].createdAt).toBeInstanceOf(Date);
    expect(result[0].createdAt.toISOString()).toBe("2026-06-25T14:30:00.000Z");

    // 2. Validar mapeo de manual sin SMS
    expect(result[1].type).toBe("manual_no_sms");
    expect(result[1].orderId).toBe("order-uuid-2");
    expect(result[1].notificationId).toBeNull();
    expect(result[1].notificationReference).toBeNull();
    expect(result[1].notificationAmountBsCents).toBeNull();

    // 3. Validar mapeo de huérfano
    expect(result[2].type).toBe("orphan_sms");
    expect(result[2].orderId).toBeNull();
    expect(result[2].orderNumber).toBeNull();
    expect(result[2].notificationId).toBe("notif-uuid-2");
    expect(result[2].notificationReference).toBe("888888");
    expect(result[2].notificationAmountBsCents).toBe(3500);

    // 4. Validar colisión por ambigüedad
    expect(result[3].type).toBe("ambiguous_collision");
    expect(result[3].orderId).toBe("order-uuid-3");
    expect(result[3].notificationId).toBe("notif-uuid-3");

    // 5. Validar error de monto
    expect(result[4].type).toBe("amount_mismatch");
    expect(result[4].orderId).toBe("order-uuid-4");
    expect(result[4].notificationAmountBsCents).toBe(4500);
  });
});
