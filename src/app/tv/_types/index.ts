export type MenuBoardData = {
  title: string;
  subtitle?: string;
  layout: "list" | "grid";
  showPrices: boolean;
  showDescriptions: boolean;
  showImages: boolean;
  currency: "usd" | "ves" | "both";
  rateBsPerUsd: number | null;
  restaurantName: string;
  pageIndex: number;
  totalPages: number;
  items: Array<{
    id: string;
    name: string;
    description: string | null;
    /** Free-text protein quantity, e.g. "200g" or "3 tenders". Null = not set. */
    portionNote: string | null;
    /** Free-text "includes" note, e.g. "Papas fritas y bebida". Null = not set. */
    includedNote: string | null;
    /** Names of contornos included with the dish (display only). */
    contornos: string[];
    imageUrl: string | null;
    priceUsdCents: number;
    categoryId: string;
    categoryName: string;
  }>;
};
