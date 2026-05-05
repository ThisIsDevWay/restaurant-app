import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calculateOrderTotals } from '@/services/order.service';
import { db } from '@/db';
import * as menuQueries from '@/db/queries/menu';
import * as settingsQueries from '@/db/queries/settings';
import * as menuService from '@/services/menu.service';

vi.mock('@/db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([]))
      }))
    }))
  }
}));

vi.mock('@/db/queries/menu', () => ({
  getMenuItemsWithOptionsAndComponents: vi.fn()
}));

vi.mock('@/services/menu.service', () => ({
  generateDailyMenuSnapshot: vi.fn()
}));

describe('calculateOrderTotals', () => {
  const mockItems = [
    {
      id: 'item-1',
      quantity: 2,
      removedComponents: [],
      fixedContornos: [],
      selectedAdicionales: [],
      selectedBebidas: [],
      categoryAllowAlone: true,
      categoryIsSimple: false,
      categoryName: 'Platos',
    }
  ];

  const mockRate = 36.5;
  const mockDate = '2024-05-20';

  it('should calculate totals correctly for a simple item', async () => {
    // Mock menu item
    (menuQueries.getMenuItemsWithOptionsAndComponents as any).mockResolvedValue([
      {
        id: 'item-1',
        name: 'Pabellón',
        priceUsdCents: 1000, // $10.00
        isAvailable: true,
        isPrepackaged: false,
        optionGroups: [],
        adicionales: [],
        contornos: [],
        bebidas: [],
        costUsdCents: 500
      }
    ]);

    // Mock daily menu snapshot
    (menuService.generateDailyMenuSnapshot as any).mockResolvedValue({
      dailyAdicionalMap: new Map(),
      dailyBebidaMap: new Map(),
      globalContornoMap: new Map()
    });

    // Mock daily dish availability
    (db.select as any).mockReturnValue({
      from: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve([{ menuItemId: 'item-1', isAvailable: true }]))
      }))
    });

    const result = await calculateOrderTotals(mockItems as any, mockRate, mockDate);

    expect(result.subtotalUsdCents).toBe(2000); // 1000 * 2
    expect(result.subtotalBsCents).toBe(Math.round(2000 * mockRate));
    expect(result.snapshotItems).toHaveLength(1);
    expect(result.snapshotItems[0].name).toBe('Pabellón');
  });

  it('should throw error if item is not found', async () => {
    (menuQueries.getMenuItemsWithOptionsAndComponents as any).mockResolvedValue([]);
    
    await expect(calculateOrderTotals(mockItems as any, mockRate, mockDate))
      .rejects.toThrow('Item no encontrado: item-1');
  });
});
