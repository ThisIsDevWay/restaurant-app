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
    categoryId: string;
    priceUsdCents: number;
    costUsdCents?: number | null;
    costUpdatedAt?: string | Date | null;
    sortOrder?: number | null;
    imageUrl?: string | null;
    isAvailable: boolean;
  };
  exchangeRate: number;
  allAdicionales: { id: string; name: string; priceUsdCents: number; isAvailable: boolean }[];
  initialSelectedAdicionalIds?: string[];
  allContornos: { id: string; name: string; priceUsdCents: number; isAvailable: boolean }[];
  initialSelectedContornos?: ContornoSelection[];
  allBebidas?: { id: string; name: string; priceUsdCents: number; isAvailable: boolean }[];
  initialSelectedBebidaIds?: string[];
  adicionalesEnabled?: boolean;
  bebidasEnabled?: boolean;
}
