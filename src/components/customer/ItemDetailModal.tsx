"use client";

import { X } from "lucide-react";
import Image from "next/image";
import { formatBs, formatRef } from "@/lib/money";
import { useCartStore } from "@/store/cartStore";
import { useItemDetailModal } from "@/hooks/useItemDetailModal";
import { useCartCalculation } from "@/hooks/useCartCalculation";
import { ContornoSelector } from "./ContornoSelector";
import { AdicionalesList } from "./AdicionalesList";
import { BebidasList } from "./BebidasList";
import { OptionGroupSection } from "./OptionGroupSection";
import { ModalFooter } from "./ModalFooter";
import type { ItemDetailModalProps } from "./ItemDetailModal.types";

export function ItemDetailModal({
  item,
  isOpen,
  onClose,
  currentRateBsPerUsd,
  allContornos,
  adicionalesEnabled = true,
  bebidasEnabled = true,
  dailyAdicionales,
  dailyBebidas,
  maxQuantityPerItem = 10,
}: ItemDetailModalProps) {
  const addItem = useCartStore((s) => s.addItem);

  const modal = useItemDetailModal({
    item,
    isOpen,
    onClose,
    allContornos,
    dailyAdicionales,
    dailyBebidas,
  });

  const cart = useCartCalculation({
    item,
    availableContornos: modal.availableContornos,
    fixedContornos: modal.fixedContornos,
    removableContornos: modal.removableContornos,
    substitutionMap: modal.substitutionMap,
    selectedAdicionalIds: modal.selectedAdicionalIds,
    selectedBebidaIds: modal.selectedBebidaIds,
    selectedRadio: modal.selectedRadio,
    dailyAdicionales,
    dailyBebidas,
    allContornos,
    quantity: modal.quantity,
    currentRateBsPerUsd,
  });

  function handleAdd() {
    if (!cart.allRequiredSatisfied) return;

    const CATEGORY_EMOJI: Record<string, string> = {
      pollos: "🍗",
      carnes: "🥩",
      pastas: "🍝",
      mariscos: "🍤",
      ensaladas: "🥗",
      bebidas: "🥤",
      adicionales: "🍟",
    };
    const categoryKey = item.categoryName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    const emoji = CATEGORY_EMOJI[categoryKey] || "🍽️";

    addItem({
      id: item.id,
      name: item.name,
      baseUsdCents: item.priceUsdCents,
      baseBsCents: Math.round(item.priceUsdCents * currentRateBsPerUsd),
      emoji,
      fixedContornos: cart.cartFixedContornos,
      contornoSubstitutions: cart.cartContornoSubstitutions,
      selectedAdicionales: cart.cartAdicionales,
      selectedBebidas: cart.cartBebidas,
      removedComponents: [],
      categoryAllowAlone: item.categoryAllowAlone,
    });

    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(30);
    }
    modal.handleClose();
  }

  if (!isOpen && !modal.closing) return null;

  const itemBaseBsCents = Math.round(item.priceUsdCents * currentRateBsPerUsd);

  // Filter option groups to radio type for rendering
  const optionGroupsToRender = cart.optionGroupsToRender;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className={`absolute inset-0 bg-black/50 transition-opacity duration-200 ${modal.closing ? "opacity-0" : "opacity-100"
          }`}
        onClick={modal.handleClose}
      />

      <div
        ref={modal.dialogRef}
        className={`absolute bottom-0 left-0 right-0 flex max-h-[90vh] flex-col rounded-t-[20px] bg-white shadow-modal transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${modal.closing ? "translate-y-full" : "translate-y-0"
          }`}
      >
        <div className="flex-1 overflow-y-auto">
          {/* Image hero */}
          <div className="relative aspect-[16/9] w-full bg-bg-image">
            {item.imageUrl ? (
              <Image
                src={item.imageUrl}
                alt={item.name}
                fill
                className="object-cover"
                sizes="(max-width: 500px) 100vw, 500px"
                quality={75}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-6xl">
                🍽️
              </div>
            )}
            <button
              onClick={modal.handleClose}
              className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white shadow-md backdrop-blur-sm"
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Header info */}
          <div className="border-b border-border px-4 pb-4 pt-3">
            <h2 className="text-[18px] font-bold text-text-main">
              {item.name}
            </h2>
            {item.description && (
              <p className="mt-1 text-[12px] text-text-muted">
                {item.description}
              </p>
            )}
            <div className="mt-2">
              <p className="text-[22px] font-extrabold leading-tight text-text-main">
                {formatBs(itemBaseBsCents)}
              </p>
              <p className="mt-0.5 text-[13px] text-text-muted">
                {formatRef(item.priceUsdCents)}
              </p>
            </div>
          </div>

          {/* Contornos */}
          <ContornoSelector
            fixedContornos={modal.fixedContornos}
            removableContornos={modal.removableContornos}
            substitutionMap={modal.substitutionMap}
            expandedContornos={modal.expandedContornos}
            onToggleExpand={modal.toggleExpandContorno}
            onSelectSubstitute={modal.selectSubstitute}
            getSubstituteOptions={modal.getSubstituteOptions}
            availableContornos={modal.availableContornos}
            currentRateBsPerUsd={currentRateBsPerUsd}
          />

          {/* Option groups (radio only) */}
          <OptionGroupSection
            groups={optionGroupsToRender}
            selectedRadio={modal.selectedRadio}
            onSelectRadio={(groupId, optionId) =>
              modal.setSelectedRadio((prev) => ({ ...prev, [groupId]: optionId }))
            }
            currentRateBsPerUsd={currentRateBsPerUsd}
          />

          {/* Adicionales del día */}
          {adicionalesEnabled && (
            <AdicionalesList
              dailyAdicionales={dailyAdicionales}
              selectedAdicionalIds={modal.selectedAdicionalIds}
              onToggle={modal.toggleAdicional}
              activeSubstituteIds={modal.activeSubstituteIds}
              currentRateBsPerUsd={currentRateBsPerUsd}
            />
          )}

          {/* Bebidas del día */}
          {bebidasEnabled && (
            <BebidasList
              dailyBebidas={dailyBebidas}
              selectedBebidaIds={modal.selectedBebidaIds}
              onToggle={modal.toggleBebida}
              currentRateBsPerUsd={currentRateBsPerUsd}
            />
          )}
        </div>

        {/* Footer (fixed) */}
        <ModalFooter
          quantity={modal.quantity}
          maxQuantityPerItem={maxQuantityPerItem}
          onQuantityChange={modal.setQuantity}
          onAdd={handleAdd}
          allRequiredSatisfied={cart.allRequiredSatisfied}
          unsatisfiedGroupName={cart.unsatisfiedGroup?.name}
          extrasCount={cart.extrasCount}
          totalBsCents={cart.totalBsCents}
        />
      </div>
    </div>
  );
}
