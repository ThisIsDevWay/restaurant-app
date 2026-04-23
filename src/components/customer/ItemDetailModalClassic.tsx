"use client";

import { X } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
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
        if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(30);
        modal.handleClose();
    }

    if (!isOpen && !modal.closing) return null;

    const itemBaseBsCents = Math.round(item.priceUsdCents * currentRateBsPerUsd);
    const optionGroupsToRender = cart.optionGroupsToRender;
    const hasImage = !!item.imageUrl;

    /*
      ── Layout strategy ────────────────────────────────────────────────────────

      Classic modal differs from Modern in that the image is a top banner (not
      a floating circle). On desktop we take advantage of this by promoting the
      banner into a full-height left panel, giving the content panel more room.

      Mobile / Tablet (<lg):
        Bottom sheet — image as top banner, content below   [unchanged]

      Desktop (≥lg):
        Centered dialog 840px, flex-row:
          LEFT  (380px) — full-bleed image + gradient + item identity at bottom
          RIGHT (flex-1) — scrollable info + sticky ModalFooter

      No image → wider single-column modal at lg.
    */

    return (
        <div className="fixed inset-0 z-50">
            {/* Backdrop */}
            <div
                className={`absolute inset-0 bg-text-main/60 backdrop-blur-sm transition-opacity duration-200 ${
                    modal.closing ? "opacity-0" : "opacity-100"
                }`}
                onClick={modal.handleClose}
            />

            {/* ── Dialog container ──────────────────────────────────────────── */}
            <div
                ref={modal.dialogRef}
                className={cn(
                    // Mobile: bottom sheet
                    "absolute bottom-0 left-0 right-0 flex max-h-[90vh] flex-col",
                    "transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
                    // Tablet & Desktop (md+): centered two-column wide modal
                    hasImage
                        ? "md:bottom-auto md:right-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[740px] lg:w-[880px] md:flex-row md:max-h-[88vh] md:rounded-[24px] md:overflow-hidden"
                        : "md:bottom-auto md:right-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[540px] md:max-h-[88vh] md:rounded-[24px] md:overflow-hidden",
                    // Closing states
                    modal.closing
                        ? "translate-y-full md:opacity-0 md:-translate-y-[45%]"
                        : "translate-y-0 md:opacity-100 md:-translate-y-1/2",
                )}
            >
                {/* ══════════════════════════════════════════════════════════════
                    LEFT PANEL — md+ only
                ══════════════════════════════════════════════════════════════ */}
                {hasImage && (
                    <div className="hidden md:flex md:w-[320px] lg:w-[380px] md:shrink-0 md:flex-col md:relative md:rounded-l-[24px] md:overflow-hidden">
                        {/* Full-bleed image */}
                        <Image
                            src={item.imageUrl!}
                            alt={item.name}
                            fill
                            className="object-cover transition-transform duration-700 hover:scale-[1.03]"
                            sizes="380px"
                            quality={88}
                            priority
                        />

                        {/* Bottom-to-top gradient overlay */}
                        <div
                            className="absolute inset-0"
                            style={{
                                background: [
                                    "linear-gradient(180deg, rgba(0,0,0,0.12) 0%, rgba(0,0,0,0.06) 25%, rgba(0,0,0,0.60) 62%, rgba(0,0,0,0.94) 100%)",
                                    "radial-gradient(ellipse at 50% 110%, rgba(187,0,5,0.14) 0%, transparent 65%)",
                                ].join(", "),
                            }}
                        />

                        {/* Side vignette for edge softening */}
                        <div
                            className="absolute inset-0 pointer-events-none"
                            style={{
                                background: "linear-gradient(90deg, transparent 70%, rgba(0,0,0,0.18) 100%)",
                            }}
                        />

                        {/* Item identity at bottom */}
                        <div className="relative mt-auto p-7 z-10">
                            {/* Category pill */}
                            <span className="inline-flex items-center rounded-full bg-white/12 border border-white/18 backdrop-blur-sm px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white/65 mb-3">
                                {item.categoryName}
                            </span>

                            <h2 className="font-display font-black leading-tight text-white drop-shadow-sm"
                                style={{ fontSize: "clamp(1.4rem, 2.2vw, 1.75rem)" }}>
                                {item.name}
                            </h2>

                            {item.description && (
                                <p className="mt-2 text-[13px] leading-relaxed text-white/60 line-clamp-3">
                                    {item.description}
                                </p>
                            )}

                            {/* Price block */}
                            <div className="mt-4 flex items-end gap-3">
                                <p className="font-extrabold leading-tight tracking-tight text-white"
                                    style={{ fontSize: "clamp(1.5rem, 2.4vw, 1.9rem)" }}>
                                    {formatBs(itemBaseBsCents)}
                                </p>
                                <span className="mb-1 rounded-lg bg-white/12 border border-white/15 px-2 py-0.5 text-[11px] font-bold text-white/55">
                                    {formatRef(item.priceUsdCents)}
                                </span>
                            </div>


                        </div>
                    </div>
                )}

                {/* ══════════════════════════════════════════════════════════════
                    RIGHT PANEL — All screens mobile/tablet; right column desktop
                ══════════════════════════════════════════════════════════════ */}
                <div className={cn(
                    "flex flex-1 min-h-0 flex-col bg-bg-card shadow-modal overflow-hidden",
                    "rounded-t-[24px]",
                    "md:rounded-[24px]",
                    "md:rounded-l-none md:rounded-r-[24px]",
                )}>
                    {/* Close button */}
                    <button
                        onClick={modal.handleClose}
                        className="absolute right-4 top-4 z-50 flex h-9 w-9 items-center justify-center rounded-full bg-bg-card/90 text-text-main shadow-md backdrop-blur-md transition-colors active:bg-surface-section"
                        aria-label="Cerrar"
                    >
                        <X className="h-5 w-5" />
                    </button>

                    {/* ── Scrollable body ──────────────────────────────────────── */}
                    <div className="flex-1 overflow-y-auto pb-4">

                        {/* MOBILE/TABLET: Top image banner */}
                        {hasImage ? (
                            <div
                                className="relative w-full bg-bg-image flex items-center justify-center border-b border-border/50 md:hidden"
                                style={{ height: "clamp(200px, 35vh, 280px)" }}
                            >
                                <Image
                                    src={item.imageUrl!}
                                    alt={item.name}
                                    fill
                                    className="object-cover transition-transform duration-500 hover:scale-[1.02]"
                                    sizes="100vw"
                                    quality={85}
                                    priority
                                />
                            </div>
                        ) : (
                            <div className="relative w-full aspect-[4/3] sm:aspect-video bg-bg-image flex items-center justify-center border-b border-border md:hidden">
                                <span className="text-6xl opacity-40">🍽️</span>
                            </div>
                        )}

                        {/* MOBILE/TABLET: Dish info block */}
                        <div className="md:hidden px-5 pt-5 pb-2">
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

                        {/* DESKTOP ONLY: No-image title block */}
                        {!hasImage && (
                            <div className="hidden md:block px-6 pt-6 pb-2">
                                <h2 className="font-display font-black leading-tight text-text-main"
                                    style={{ fontSize: "clamp(1.4rem, 2vw, 1.7rem)" }}>
                                    {item.name}
                                </h2>
                                <div className="mt-2.5 flex items-end gap-3">
                                    <p className="font-extrabold leading-tight tracking-tight text-text-main"
                                        style={{ fontSize: "clamp(1.3rem, 2vw, 1.6rem)" }}>
                                        {formatBs(itemBaseBsCents)}
                                    </p>
                                    <span className="mb-0.5 rounded-lg bg-bg-app px-2 py-0.5 text-xs font-bold text-text-muted border border-border/50">
                                        {formatRef(item.priceUsdCents)}
                                    </span>
                                </div>
                                {item.description && (
                                    <p className="mt-3 leading-snug text-text-muted"
                                        style={{ fontSize: "0.9rem" }}>
                                        {item.description}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Desktop section label */}
                        {hasImage && (
                            <p className="hidden md:block px-6 pt-5 pb-0 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted/55">
                                Realiza tu pedido
                            </p>
                        )}

                        <div className="mx-5 my-2 border-t border-border md:mx-6" />

                        {/* includedNote — Visible on all screens in right panel */}
                        {item.includedNote && (
                            <div className="mx-5 mb-4 flex flex-col items-start gap-1 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 md:mx-6">
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

                        {/* Option groups */}
                        <OptionGroupSection
                            groups={optionGroupsToRender}
                            selectedRadio={modal.selectedRadio}
                            onSelectRadio={(groupId, optionId) =>
                                modal.setSelectedRadio((prev) => ({ ...prev, [groupId]: optionId }))
                            }
                            currentRateBsPerUsd={currentRateBsPerUsd}
                        />

                        {/* Adicionales */}
                        {adicionalesEnabled &&
                            !item.hideAdicionales &&
                            !item.categoryIsSimple &&
                            !item.categoryName.toLowerCase().includes("adicional") &&
                            !item.categoryName.toLowerCase().includes("contorno") && (
                                <AdicionalesList
                                    dailyAdicionales={dailyAdicionales}
                                    quantities={modal.adicionalQuantities}
                                    onUpdateQty={modal.updateAdicionalQty}
                                    activeSubstituteIds={modal.activeSubstituteIds}
                                    currentRateBsPerUsd={currentRateBsPerUsd}
                                    maxQuantityPerItem={maxQuantityPerItem ?? 10}
                                />
                            )}

                        {/* Bebidas */}
                        {bebidasEnabled &&
                            !item.hideBebidas &&
                            !item.categoryIsSimple &&
                            !item.categoryName.toLowerCase().includes("bebida") && (
                                <BebidasList
                                    dailyBebidas={dailyBebidas}
                                    quantities={modal.bebidaQuantities}
                                    onUpdateQty={modal.updateBebidaQty}
                                    currentRateBsPerUsd={currentRateBsPerUsd}
                                    maxQuantityPerItem={maxQuantityPerItem ?? 10}
                                />
                            )}

                        {/* Desktop bottom breathing room */}
                        <div className="hidden lg:block h-2" />
                    </div>

                    {/* ── Footer ───────────────────────────────────────────────── */}
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