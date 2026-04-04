"use client";

import { X, Minus, Plus } from "lucide-react";
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

export function ItemDetailModalModern({
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
    maxQuantityPerItem,
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

    const payload = {
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
    };

    for (let i = 0; i < modal.quantity; i++) {
      addItem(payload);
    }

    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(30);
    }
    modal.handleClose();
  }

  if (!isOpen && !modal.closing) return null;

  const itemBaseBsCents = Math.round(item.priceUsdCents * currentRateBsPerUsd);
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
        className={`absolute bottom-0 left-0 right-0 flex max-h-[90vh] flex-col transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${modal.closing ? "translate-y-full" : "translate-y-0"
          }`}
      >
        <div className="flex-1 overflow-y-auto w-full">
          {/* Spacer to push white card down. Allows image overlay. */}
          <div className="h-29 w-full shrink-0" />

          <div className="relative flex min-h-[calc(100%-7rem)] w-full flex-col rounded-t-[32px] bg-white px-4 pb-4 pt-4 shadow-modal">
            {/* Close button */}
            <button
              onClick={modal.handleClose}
              className="absolute right-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white/95 text-text-main shadow-md transition-all active:scale-95 active:bg-gray-100"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5 stroke-[2.5]" />
            </button>

            {/* Suspended image */}
            {item.imageUrl ? (
              <div className="absolute -top-[120px] left-1/2 z-20 h-[240px] w-[240px] -translate-x-1/2 pointer-events-none">
                <Image
                  src={item.imageUrl}
                  alt={item.name}
                  fill
                  className="object-cover rounded-3xl drop-shadow-[0_15px_25px_rgba(0,0,0,0.15)]"
                  sizes="(max-width: 500px) 240px, 240px"
                  quality={90}
                  priority
                />
              </div>
            ) : (
              <div className="absolute -top-16 left-1/2 z-20 flex h-32 w-32 -translate-x-1/2 items-center justify-center rounded-[24px] border border-gray-100 bg-gray-50 shadow-md">
                <span className="text-4xl">🍽️</span>
              </div>
            )}

            {/* Title & Description & Price centered layout */}
            <div className="mt-[95px] flex flex-col items-center text-center">
              {/* Title */}
              <h2 className="mt-3 text-[22px] font-bold leading-tight text-text-main">
                {item.name}
              </h2>

              {/* Description */}
              {item.description && (
                <p className="mt-1.5 max-w-[92%] text-center text-[13px] leading-snug text-text-muted">
                  {item.description}
                </p>
              )}

              {/* Price */}
              <div className="mt-3">
                <p className="text-xl font-extrabold leading-none text-price-green">
                  {formatBs(itemBaseBsCents)}
                </p>
                <p className="mt-1 text-[13px] font-medium leading-none text-text-muted">
                  {formatRef(item.priceUsdCents)}
                </p>
              </div>
            </div>

            {/* Divider */}
            <div className="mx-2 mb-2 mt-5 border-t border-border" />

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
                quantities={modal.adicionalQuantities}
                onUpdateQty={modal.updateAdicionalQty}
                activeSubstituteIds={modal.activeSubstituteIds}
                currentRateBsPerUsd={currentRateBsPerUsd}
                maxQuantityPerItem={maxQuantityPerItem ?? 10}
              />
            )}

            {/* Bebidas del día */}
            {bebidasEnabled && (
              <BebidasList
                dailyBebidas={dailyBebidas}
                quantities={modal.bebidaQuantities}
                onUpdateQty={modal.updateBebidaQty}
                currentRateBsPerUsd={currentRateBsPerUsd}
                maxQuantityPerItem={maxQuantityPerItem ?? 10}
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
    </div>
  );
}
