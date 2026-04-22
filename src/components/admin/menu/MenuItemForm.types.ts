import type * as v from "valibot";
import type { ContornoSelection } from "@/types/contorno.types";
export type { ContornoSelection };

export const formSchema = {
  // Re-exported for use in the hook
} as const;


export interface MenuItemFormProps {
  categories: { id: string; name: string; isSimple?: boolean }[];
  initialData?: {
    id: string;
    name: string;
    description?: string | null;
    includedNote?: string | null;
    hideAdicionales?: boolean;
    hideBebidas?: boolean;
    categoryId: string;
    priceUsdCents: number;
    costUsdCents?: number | null;
    costUpdatedAt?: string | Date | null;
    sortOrder?: number | null;
    imageUrl?: string | null;
    isAvailable: boolean;
  };
  exchangeRate: number;
}
