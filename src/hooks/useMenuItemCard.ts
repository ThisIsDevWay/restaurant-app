"use client";

import { useCartStore } from "@/store/cartStore";
import { toast } from "sonner";
import { getCategoryEmoji } from "@/lib/categoryIcons";
import { useMenuMode } from "@/components/public/menu/MenuModeContext";

/**
 * Shared "brain" for the menu item cards. The Classic and Modern card variants
 * differ only in layout — this hook owns the byte-identical `handleAdd` logic,
 * the category emoji, and the read-only behaviour that used to be copy-pasted in
 * both files.
 */
export interface UseMenuItemCardParams {
  id: string;
  name: string;
  priceUsdCents: number;
  priceBsCents: number;
  categoryName: string;
  categoryAllowAlone: boolean;
  categoryIsSimple: boolean;
  isPrepackaged: boolean;
  includedNote?: string | null;
  isAvailable: boolean;
  hasRequiredOptions: boolean;
  onOpenDetail: () => void;
  onAddSimpleItem?: (payload: any, categoryName: string) => void;
}

export interface UseMenuItemCardReturn {
  emoji: string;
  isReadOnly: boolean;
  handleAdd: () => void;
}

export function useMenuItemCard({
  id,
  name,
  priceUsdCents,
  priceBsCents,
  categoryName,
  categoryAllowAlone,
  categoryIsSimple,
  isPrepackaged,
  includedNote,
  isAvailable,
  hasRequiredOptions,
  onOpenDetail,
  onAddSimpleItem,
}: UseMenuItemCardParams): UseMenuItemCardReturn {
  const addItem = useCartStore((s) => s.addItem);
  const { isReadOnly } = useMenuMode();
  const emoji = getCategoryEmoji(categoryName);

  const handleAdd = () => {
    if (isReadOnly) {
      onOpenDetail();
      return;
    }
    if (!isAvailable) return;

    if (hasRequiredOptions) {
      onOpenDetail();
      return;
    }

    const payload = {
      id,
      name,
      baseUsdCents: priceUsdCents,
      baseBsCents: priceBsCents,
      emoji,
      fixedContornos: [],
      contornoSubstitutions: [],
      selectedAdicionales: [],
      removedComponents: [],
      categoryAllowAlone,
      categoryIsSimple,
      categoryName,
      isPrepackaged,
      includedNote: includedNote ?? null,
    };

    if (onAddSimpleItem) {
      onAddSimpleItem(payload, categoryName);
    } else {
      addItem(payload);
      toast.success(`${name} añadido al carrito`);
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(30);
      }
    }
  };

  return { emoji, isReadOnly, handleAdd };
}
