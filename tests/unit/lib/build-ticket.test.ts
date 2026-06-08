import { describe, it, expect } from "vitest";
import { buildTicket } from "@/lib/print/build-ticket";
import type { PrinterTarget } from "@/lib/print/printer-target";
import type { orders } from "@/db/schema";

type OrderRow = typeof orders.$inferSelect;

const mockProfile: PrinterTarget = {
  name: "test-printer",
  station: "cashier",
  items: { mode: "all", categoryIds: [] },
  sections: {
    header: true,
    orderMeta: true,
    location: true,
    contactData: true,
    totals: true,
    surcharges: true,
  },
  copies: 1,
  reprintCopies: 1,
  enabled: true,
};

const baseOrder: Partial<OrderRow> = {
  id: "order-123",
  orderNumber: 5,
  createdAt: new Date("2026-06-07T13:00:00-04:00"), // 1:00 PM (Caracas time)
  rateSnapshotBsPerUsd: "36.5",
  paymentMethod: "pago_movil",
  paymentReference: "98765432",
  tableNumber: "5",
  customerName: "John Doe",
  customerPhone: "+584121234567",
  orderMode: "on_site",
  itemsSnapshot: [
    {
      id: "item-1",
      name: "Burger",
      quantity: 1,
      priceUsdCents: 1000,
      priceBsCents: 36500,
      itemTotalBsCents: 36500,
      fixedContornos: [],
      selectedAdicionales: [],
      selectedBebidas: [],
      removedComponents: [],
    },
  ],
  subtotalBsCents: 36500,
  subtotalUsdCents: 1000,
  packagingUsdCents: 0,
  deliveryUsdCents: 0,
  igtfBsCents: 0,
  igtfUsdCents: 0,
  grandTotalBsCents: 36500,
  grandTotalUsdCents: 1000,
};

describe("buildTicket Date and Time formatting", () => {
  it("should format PM times in 12-hour format with clean PM suffix", () => {
    const order = {
      ...baseOrder,
      createdAt: new Date("2026-06-07T13:00:00-04:00"), // 1:00 PM (Caracas time)
    } as OrderRow;

    const ticketText = buildTicket(order, mockProfile);
    
    // The time line should show "01:00 PM" instead of "13:00" or "01:00 P M"
    expect(ticketText).toContain("01:00 PM");
    expect(ticketText).not.toContain("13:00");
    expect(ticketText).not.toContain("P M"); // No non-breaking or weird space
  });

  it("should format midnight times in 12-hour format as 12:XX AM", () => {
    const order = {
      ...baseOrder,
      createdAt: new Date("2026-06-07T00:30:00-04:00"), // 12:30 AM (Caracas time)
    } as OrderRow;

    const ticketText = buildTicket(order, mockProfile);
    
    expect(ticketText).toContain("12:30 AM");
    expect(ticketText).not.toContain("00:30");
    expect(ticketText).not.toContain("A M"); // No non-breaking or weird space
  });

  it("should format AM times in 12-hour format with clean AM suffix", () => {
    const order = {
      ...baseOrder,
      createdAt: new Date("2026-06-07T05:15:00-04:00"), // 5:15 AM (Caracas time)
    } as OrderRow;

    const ticketText = buildTicket(order, mockProfile);
    
    expect(ticketText).toContain("05:15 AM");
    expect(ticketText).not.toContain("05:15 A M");
  });
});

describe("buildTicket station filtering and item routing", () => {
  const orderWithDrinks: OrderRow = {
    ...baseOrder,
    itemsSnapshot: [
      {
        id: "food-1",
        name: "Sopa de Pollo",
        quantity: 1,
        priceUsdCents: 1000,
        priceBsCents: 36500,
        itemTotalBsCents: 36500,
        fixedContornos: [],
        selectedAdicionales: [],
        selectedBebidas: [
          {
            id: "drink-sub-1",
            name: "Refresco 1 Lts",
            priceUsdCents: 200,
            priceBsCents: 7300,
            quantity: 1,
          },
        ],
        removedComponents: [],
        categoryId: "cat-food",
        categoryName: "Sopas",
      },
      {
        id: "drink-standalone-1",
        name: "Papelon con Limon",
        quantity: 2,
        priceUsdCents: 150,
        priceBsCents: 5475,
        itemTotalBsCents: 10950,
        fixedContornos: [],
        selectedAdicionales: [],
        selectedBebidas: [],
        removedComponents: [],
        categoryId: "cat-drink",
        categoryName: "Bebidas",
      },
    ],
  } as unknown as OrderRow;

  it("should render everything on Cashier ticket", () => {
    const cashierProfile: PrinterTarget = {
      ...mockProfile,
      station: "cashier",
      items: { mode: "all", categoryIds: [] },
    };

    const ticketText = buildTicket(orderWithDrinks, cashierProfile);
    expect(ticketText).toContain("RECIBO");
    expect(ticketText).toContain("SOPA DE POLLO");
    expect(ticketText).toContain("Refresco 1 Lts");
    expect(ticketText).toContain("PAPELON CON LIMON");
  });

  it("should render only food (excluding drinks) on Kitchen ticket", () => {
    const kitchenProfile: PrinterTarget = {
      ...mockProfile,
      station: "kitchen",
      items: { mode: "all", categoryIds: [] },
      sections: {
        ...mockProfile.sections,
        totals: false,
        surcharges: false,
      },
    };

    const ticketText = buildTicket(orderWithDrinks, kitchenProfile);
    expect(ticketText).toContain("COMANDA");
    expect(ticketText).toContain("SOPA DE POLLO");
    expect(ticketText).not.toContain("Refresco 1 Lts");
    expect(ticketText).not.toContain("PAPELON CON LIMON");
  });

  it("should render food and drinks on Kitchen ticket if includeDrinks is enabled", () => {
    const kitchenWithDrinksProfile: PrinterTarget = {
      ...mockProfile,
      station: "kitchen",
      items: { mode: "all", categoryIds: [], includeDrinks: true },
      sections: {
        ...mockProfile.sections,
        totals: false,
        surcharges: false,
      },
    };

    const ticketText = buildTicket(orderWithDrinks, kitchenWithDrinksProfile);
    expect(ticketText).toContain("COMANDA");
    expect(ticketText).toContain("SOPA DE POLLO");
    expect(ticketText).toContain("Refresco 1 Lts");
    expect(ticketText).toContain("PAPELON CON LIMON");
  });

  it("should render only drinks (standalone and sub-items) on Bar ticket", () => {
    const barProfile: PrinterTarget = {
      ...mockProfile,
      station: "bar",
      items: { mode: "drinks", categoryIds: [] },
      sections: {
        ...mockProfile.sections,
        totals: false,
        surcharges: false,
      },
    };

    const ticketText = buildTicket(orderWithDrinks, barProfile);
    expect(ticketText).toContain("BARRA");
    expect(ticketText).toContain("SOPA DE POLLO"); // Parent header for the sub-item drink
    expect(ticketText).toContain("Refresco 1 Lts");
    expect(ticketText).toContain("PAPELON CON LIMON"); // Standalone drink
  });
});

