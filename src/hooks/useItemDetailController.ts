"use client";

import { toast } from "sonner";
import { useCartStore } from "@/store/cartStore";
import { useItemDetailModal, type UseItemDetailModalReturn } from "@/hooks/useItemDetailModal";
import { useCartCalculation, type UseCartCalculationReturn } from "@/hooks/useCartCalculation";
import { getCategoryEmoji } from "@/lib/categoryIcons";
import { getAllowedSubstitutes } from "@/lib/menu/substitutes";
import type { ItemDetailModalProps } from "@/components/customer/ItemDetailModal.types";
import type { SimpleItem } from "@/components/customer/ItemDetailModal.types";

/**
 * Shared "brain" for the ordering item-detail modal. The Classic and Modern
 * shells differ only in chrome/layout — this hook owns everything that used to
 * be duplicated between them: the cart hooks wiring, the allowed-substitutes
 * computation, the section visibility flags, and the add/update `handleSave`.
 *
 * The shells consume the returned `modal`/`cart` objects to render the shared
 * section components (ContornoSelector, OptionGroupSection, Adicionales/Bebidas
 * lists) and the ModalFooter.
 */
export type UseItemDetailControllerParams = Omit<ItemDetailModalProps, "isReadOnly">;

export interface UseItemDetailControllerReturn {
  modal: UseItemDetailModalReturn;
  cart: UseCartCalculationReturn;
  allowedSubstitutes: SimpleItem[];
  showContornos: boolean;
  showOpciones: boolean;
  showAdicionales: boolean;
  showBebidas: boolean;
  itemBaseBsCents: number;
  handleSave: () => void;
}

export function useItemDetailController({
  item,
  isOpen,
  onClose,
  currentRateBsPerUsd,
  allContornos,
  adicionalesEnabled = true,
  bebidasEnabled = true,
  dailyAdicionales,
  dailyBebidas,
  dailyContornos = [],
  maxQuantityPerItem = 10,
  initialData = null,
  editingIndex = null,
}: UseItemDetailControllerParams): UseItemDetailControllerReturn {
  const addItem = useCartStore((s) => s.addItem);
  const updateItem = useCartStore((s) => s.updateItem);

  const modal = useItemDetailModal({
    item, isOpen, onClose, allContornos, dailyAdicionales, dailyBebidas,
    dailyContornos, maxQuantityPerItem, initialData,
  });

  const cart = useCartCalculation({
    item,
    availableContornos: modal.availableContornos,
    fixedContornos: modal.fixedContornos,
    removableContornos: modal.removableContornos,
    substitutionMap: modal.substitutionMap,
    selectedAdicionalQtys: modal.adicionalQuantities,
    selectedBebidaQtys: modal.bebidaQuantities,
    selectedRadio: modal.selectedRadio,
    dailyAdicionales, dailyBebidas, allContornos,
    quantity: modal.quantity,
    currentRateBsPerUsd,
  });

  const allowedSubstitutes = getAllowedSubstitutes(item, dailyContornos);

  const categoryLower = item.categoryName.toLowerCase();
  const showContornos = modal.availableContornos.length > 0;
  const showOpciones = (cart.optionGroupsToRender?.length ?? 0) > 0;
  const showAdicionales =
    adicionalesEnabled &&
    !item.hideAdicionales &&
    !item.categoryIsSimple &&
    !categoryLower.includes("adicional") &&
    !categoryLower.includes("contorno") &&
    (dailyAdicionales?.filter((a) => a.isAvailable).length ?? 0) > 0;
  const showBebidas =
    bebidasEnabled &&
    !item.hideBebidas &&
    !item.categoryIsSimple &&
    !categoryLower.includes("bebida") &&
    (dailyBebidas?.filter((b) => b.isAvailable).length ?? 0) > 0;

  const itemBaseBsCents = Math.round(item.priceUsdCents * currentRateBsPerUsd);

  function handleSave() {
    if (!cart.allRequiredSatisfied) return;

    const payload = {
      id: item.id,
      name: item.name,
      baseUsdCents: item.priceUsdCents,
      baseBsCents: itemBaseBsCents,
      isPrepackaged: item.isPrepackaged,
      emoji: getCategoryEmoji(item.categoryName),
      imageUrl: item.imageUrl ?? null,
      fixedContornos: cart.cartFixedContornos,
      contornoSubstitutions: cart.cartContornoSubstitutions,
      selectedAdicionales: [...cart.cartAdicionales, ...cart.cartRadioOptions],
      selectedBebidas: cart.cartBebidas,
      removedComponents: [],
      categoryAllowAlone: item.categoryAllowAlone,
      categoryIsSimple: item.categoryIsSimple,
      categoryName: item.categoryName,
      includedNote: item.includedNote ?? null,
    };

    if (editingIndex !== null && editingIndex !== undefined) {
      updateItem(editingIndex, { ...payload, quantity: modal.quantity });
      toast.success(`${item.name} actualizado`);
    } else {
      for (let i = 0; i < modal.quantity; i++) addItem(payload);
      toast.success(`${item.name} añadido al carrito`);
    }

    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(30);
    modal.handleClose();
  }

  return {
    modal,
    cart,
    allowedSubstitutes,
    showContornos,
    showOpciones,
    showAdicionales,
    showBebidas,
    itemBaseBsCents,
    handleSave,
  };
}
