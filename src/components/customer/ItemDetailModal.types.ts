import type {
  MenuItemWithComponents,
  SimpleComponent,
  OptionItem,
  OptionGroupWithOptions,
  ContornoComponent,
} from "@/types/menu.types";

// Re-exports con nombres legacy para compatibilidad con componentes existentes
export type {
  OptionItem as Option,
  OptionGroupWithOptions as OptionGroup,
  SimpleComponent as Adicional,
  SimpleComponent as Bebida,
  ContornoComponent as Contorno,
  SimpleComponent as GlobalContorno,
  MenuItemWithComponents as MenuItem,
};

export interface SimpleItem {
  id: string;
  name: string;
  priceUsdCents: number;
  isAvailable: boolean;
  sortOrder: number;
}

export interface ItemDetailModalProps {
  item: MenuItemWithComponents;
  isOpen: boolean;
  onClose: () => void;
  currentRateBsPerUsd: number;
  allContornos: SimpleComponent[];
  adicionalesEnabled?: boolean;
  bebidasEnabled?: boolean;
  dailyAdicionales: SimpleItem[];
  dailyBebidas: SimpleItem[];
  maxQuantityPerItem?: number;
}
