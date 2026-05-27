import type * as v from "valibot";
import type { ContornoSelection } from "@/types/contorno.types";
export type { ContornoSelection };

export const formSchema = {
  // Re-exported for use in the hook
} as const;


export interface MenuItemFormProps {
  categories: { id: string; name: string; isSimple?: boolean }[];
  /** Items from isSimple categories — the pool for the contorno picker. */
  availableContornos: Array<{ id: string; name: string; categoryName: string }>;
  initialData?: {
    id: string;
    name: string;
    description?: string | null;
    portionNote?: string | null;
    includedNote?: string | null;
    hideAdicionales?: boolean;
    hideBebidas?: boolean;
    categoryId: string;
    priceUsdCents: number;
    costUsdCents?: number | null;
    costUpdatedAt?: string | Date | null;
    sortOrder?: number | null;
    imageUrl?: string | null;
    imagekitFileId?: string | null;
    isAvailable: boolean;
    isPrepackaged: boolean;
    /** Contornos already assigned to this item (edit mode only). */
    contornos?: Array<{ id: string; name: string; removable: boolean }>;
  };
  exchangeRate: number;
}
