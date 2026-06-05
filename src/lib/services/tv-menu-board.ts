import { db } from "@/db";
import {
  menuItems,
  categories,
  dailyMenuItems,
  settings,
  exchangeRates,
  menuItemContornos,
} from "@/db/schema";
import { and, asc, eq, inArray } from "drizzle-orm";
import type { TvMenuBoardConfig } from "@/db/schema/tv";

const RESTAURANT_TZ = "America/Caracas";

/** What the TV actually receives for one page of a menu_board slide. */
export type MenuBoardData = {
  title: string;
  subtitle?: string;
  layout: "list" | "grid" | "grid2" | "grid3";
  showPrices: boolean;
  showDescriptions: boolean;
  showImages: boolean;
  currency: "usd" | "ves" | "both";
  /** Resolved rate, in Bs per USD. null if unavailable. */
  rateBsPerUsd: number | null;
  /** Restaurant name (for header branding). */
  restaurantName: string;
  /** 0-based page index for this slide. */
  pageIndex: number;
  /** Total pages generated for this board. */
  totalPages: number;
  /** Resolved item list for this page, already sorted. */
  items: Array<{
    id: string;
    name: string;
    description: string | null;
    portionNote: string | null;
    /** Free-text "includes" note (e.g. "Papas fritas y bebida"). Null = not set. */
    includedNote: string | null;
    contornos: string[];
    imageUrl: string | null;
    priceUsdCents: number;
    categoryId: string;
    categoryName: string;
  }>;
};

function formatLocalDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: RESTAURANT_TZ }).format(
    date,
  );
}

/**
 * Resolves live menu data for a menu_board slide and splits it into pages.
 * Returns one MenuBoardData per page so tv-content.ts can emit one
 * ResolvedItem per page — the carousel then auto-advances through them.
 *
 * Items per page defaults: 6 for grid, 8 for list (configurable via itemsPerPage).
 */
export async function resolveMenuBoard(
  config: TvMenuBoardConfig,
  orientationHint?: "portrait" | "landscape",
): Promise<MenuBoardData[]> {
  // ── Settings + exchange rate ─────────────────────────────────────────
  const [settingsRow] = await db.select().from(settings).limit(1);

  let rateBsPerUsd: number | null = null;
  if (settingsRow?.rateOverrideBsPerUsd) {
    const n = Number(settingsRow.rateOverrideBsPerUsd);
    if (Number.isFinite(n) && n > 0) rateBsPerUsd = n;
  }
  if (rateBsPerUsd === null && settingsRow?.currentRateId) {
    const [rateRow] = await db
      .select({ rate: exchangeRates.rateBsPerUsd })
      .from(exchangeRates)
      .where(eq(exchangeRates.id, settingsRow.currentRateId))
      .limit(1);
    if (rateRow?.rate) {
      const n = Number(rateRow.rate);
      if (Number.isFinite(n) && n > 0) rateBsPerUsd = n;
    }
  }

  const restaurantName = settingsRow?.restaurantName ?? "Restaurante G y M";

  // ── Menu items by source ─────────────────────────────────────────────
  type RawRow = Omit<MenuBoardData["items"][number], "contornos">;
  let rows: RawRow[] = [];

  if (config.source.type === "category") {
    const categoryId = config.source.categoryId;
    rows = await db
      .select({
        id: menuItems.id,
        name: menuItems.name,
        description: menuItems.description,
        portionNote: menuItems.portionNote,
        includedNote: menuItems.includedNote,
        imageUrl: menuItems.imageUrl,
        priceUsdCents: menuItems.priceUsdCents,
        categoryId: menuItems.categoryId,
        categoryName: categories.name,
        sortOrder: menuItems.sortOrder,
      })
      .from(menuItems)
      .innerJoin(categories, eq(categories.id, menuItems.categoryId))
      .where(
        and(
          eq(menuItems.categoryId, categoryId),
          eq(menuItems.isAvailable, true),
          eq(categories.isAvailable, true),
        ),
      )
      .orderBy(asc(menuItems.sortOrder), asc(menuItems.name));
  } else if (config.source.type === "all_available") {
    rows = await db
      .select({
        id: menuItems.id,
        name: menuItems.name,
        description: menuItems.description,
        portionNote: menuItems.portionNote,
        includedNote: menuItems.includedNote,
        imageUrl: menuItems.imageUrl,
        priceUsdCents: menuItems.priceUsdCents,
        categoryId: menuItems.categoryId,
        categoryName: categories.name,
        sortOrder: menuItems.sortOrder,
      })
      .from(menuItems)
      .innerJoin(categories, eq(categories.id, menuItems.categoryId))
      .where(
        and(
          eq(menuItems.isAvailable, true),
          eq(categories.isAvailable, true),
        ),
      )
      .orderBy(asc(categories.sortOrder), asc(menuItems.sortOrder));
  } else {
    // daily
    const today = formatLocalDate(new Date());
    rows = await db
      .select({
        id: menuItems.id,
        name: menuItems.name,
        description: menuItems.description,
        portionNote: menuItems.portionNote,
        includedNote: menuItems.includedNote,
        imageUrl: menuItems.imageUrl,
        priceUsdCents: menuItems.priceUsdCents,
        categoryId: menuItems.categoryId,
        categoryName: categories.name,
        sortOrder: dailyMenuItems.sortOrder,
      })
      .from(dailyMenuItems)
      .innerJoin(menuItems, eq(menuItems.id, dailyMenuItems.menuItemId))
      .innerJoin(categories, eq(categories.id, menuItems.categoryId))
      .where(
        and(
          eq(dailyMenuItems.date, today),
          eq(dailyMenuItems.isAvailable, true),
          eq(menuItems.isAvailable, true),
          eq(categories.isAvailable, true),
        ),
      )
      .orderBy(asc(categories.sortOrder), asc(dailyMenuItems.sortOrder));
  }

  // ── Batch-resolve contornos for all items ────────────────────────────
  const allIds = rows.map((r) => r.id);
  const contornoNamesByItem = new Map<string, string[]>();
  if (allIds.length > 0) {
    const contornoRows = await db
      .select({
        menuItemId: menuItemContornos.menuItemId,
        contornoName: menuItems.name,
      })
      .from(menuItemContornos)
      .innerJoin(menuItems, eq(menuItemContornos.contornoItemId, menuItems.id))
      .where(inArray(menuItemContornos.menuItemId, allIds))
      .orderBy(asc(menuItems.sortOrder));

    for (const row of contornoRows) {
      const list = contornoNamesByItem.get(row.menuItemId) ?? [];
      list.push(row.contornoName);
      contornoNamesByItem.set(row.menuItemId, list);
    }
  }

  // Apply total item cap (default 120 — large enough not to truncate typical menus).
  const totalCap = config.maxItems && config.maxItems > 0 ? config.maxItems : 120;
  const allItems: MenuBoardData["items"] = rows
    .slice(0, totalCap)
    .map((r) => ({ ...r, contornos: contornoNamesByItem.get(r.id) ?? [] }));

  // Items per page: admin-configured, or sensible default by layout.
  const perPage =
    config.itemsPerPage && config.itemsPerPage > 0
      ? config.itemsPerPage
      : config.layout === "list"
        ? 8
        : config.layout === "grid2"
          ? 2
          : 3;

  // Split into pages.
  const pages: Array<MenuBoardData["items"]> = [];
  for (let i = 0; i < allItems.length; i += perPage) {
    pages.push(allItems.slice(i, i + perPage));
  }
  // Always produce at least one page (even if empty, so the slide renders).
  if (pages.length === 0) pages.push([]);

  const shared = {
    title: config.title,
    subtitle: config.subtitle,
    layout: config.layout,
    showPrices: config.showPrices,
    showDescriptions: config.showDescriptions,
    showImages: config.showImages,
    currency: config.currency,
    rateBsPerUsd,
    restaurantName,
    totalPages: pages.length,
  };

  return pages.map((items, pageIndex) => ({ ...shared, pageIndex, items }));
}
