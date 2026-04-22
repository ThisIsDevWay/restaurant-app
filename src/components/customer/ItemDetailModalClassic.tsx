"use client";

import { X } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
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

export function ItemDetailModalClassic({
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
            selectedAdicionales: [...cart.cartAdicionales, ...cart.cartRadioOptions],
            selectedBebidas: cart.cartBebidas,
            removedComponents: [],
            categoryAllowAlone: item.categoryAllowAlone,
            categoryIsSimple: item.categoryIsSimple,
            categoryName: item.categoryName,
            includedNote: item.includedNote ?? null,
        };

        for (let i = 0; i < modal.quantity; i++) {
            addItem(payload);
        }

        toast.success(`${item.name} añadido al carrito`);

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
                className={`absolute inset-0 bg-text-main/60 backdrop-blur-sm transition-opacity duration-200 ${modal.closing ? "opacity-0" : "opacity-100"
                    }`}
                onClick={modal.handleClose}
            />

            <div
                ref={modal.dialogRef}
                className={`absolute bottom-0 left-0 right-0 flex max-h-[90vh] flex-col rounded-t-[24px] bg-bg-card shadow-modal overflow-hidden transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${modal.closing ? "translate-y-full" : "translate-y-0"
                    }`}
            >
                <div className="flex-1 overflow-y-auto pb-4">
                    {/* Close button - absolute floating over image */}
                    <button
                        onClick={modal.handleClose}
                        className="absolute right-4 top-4 z-50 flex h-9 w-9 items-center justify-center rounded-full bg-bg-card/90 text-text-main shadow-md backdrop-blur-md transition-colors active:bg-surface-section"
                        aria-label="Cerrar"
                    >
                        <X className="h-5 w-5" />
                    </button>

                    {/* Top Image Banner (Responsive height + Contain to prevent cutting) */}
                    {item.imageUrl ? (
                        <div 
                            className="relative w-full bg-bg-image flex items-center justify-center border-b border-border/50"
                            style={{ height: "clamp(200px, 35vh, 280px)" }}
                        >
                            <Image
                                src={item.imageUrl}
                                alt={item.name}
                                fill
                                className="object-cover transition-transform duration-500 hover:scale-[1.02]"
                                sizes="100vw"
                                quality={85}
                                priority
                            />
                        </div>
                    ) : (
                        <div className="relative w-full aspect-[4/3] sm:aspect-video bg-bg-image flex items-center justify-center border-b border-border">
                            <span className="text-6xl opacity-40">🍽️</span>
                        </div>
                    )}

                    {/* Dish Information */}
                    <div className="px-5 pt-5 pb-2">
                        <h2
                            className="font-display font-black leading-tight text-text-main"
                            style={{ fontSize: "clamp(1.4rem, 6vw, 1.7rem)" }}
                        >
                            {item.name}
                        </h2>

                        <div className="mt-2.5 flex items-end gap-3">
                            <p
                                className="font-extrabold leading-tight tracking-tight text-text-main"
                                style={{ fontSize: "clamp(1.3rem, 5.5vw, 1.6rem)" }}
                            >
                                {formatBs(itemBaseBsCents)}
                            </p>
                            <span className="mb-0.5 rounded-lg bg-bg-app px-2 py-0.5 text-xs font-bold text-text-muted border border-border/50">
                                {formatRef(item.priceUsdCents)}
                            </span>
                        </div>

                        {item.description && (
                            <p
                                className="mt-3.5 leading-snug text-text-muted text-justify"
                                style={{ fontSize: "clamp(0.9rem, 3.5vw, 0.95rem)" }}
                            >
                                {item.description}
                            </p>
                        )}
                    </div>

                    <div className="mx-5 my-2 border-t border-border" />

                    {/* Incluye (fixed inclusions) */}
                    {item.includedNote && (
                        <div className="mx-5 mb-3 flex flex-col items-center text-center gap-1 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2.5">
                            <div className="flex items-center gap-1.5">
                                <span className="text-emerald-600 text-[13px] font-bold shrink-0">✓</span>
                                <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Incluye</p>
                            </div>
                            <p className="text-[13px] text-emerald-800 font-medium leading-snug">{item.includedNote}</p>
                        </div>
                    )}

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

                    {/* Adicionales del día (Ocultar si es categoría Rápida o si el plato ya es un adicional) */}
                    {adicionalesEnabled && !item.hideAdicionales && !item.categoryIsSimple && !item.categoryName.toLowerCase().includes("adicional") && !item.categoryName.toLowerCase().includes("contorno") && (
                        <AdicionalesList
                            dailyAdicionales={dailyAdicionales}
                            quantities={modal.adicionalQuantities}
                            onUpdateQty={modal.updateAdicionalQty}
                            activeSubstituteIds={modal.activeSubstituteIds}
                            currentRateBsPerUsd={currentRateBsPerUsd}
                            maxQuantityPerItem={maxQuantityPerItem ?? 10}
                        />
                    )}

                    {/* Bebidas del día (Ocultar si es categoría Rápida o si el plato ya es una bebida) */}
                    {bebidasEnabled && !item.hideBebidas && !item.categoryIsSimple && !item.categoryName.toLowerCase().includes("bebida") && (
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
    );
}
