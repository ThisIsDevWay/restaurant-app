"use client";

import { X } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
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
  const [imageLoaded, setImageLoaded] = useState(false);
  const addItem = useCartStore((s) => s.addItem);

  const modal = useItemDetailModal({
    item, isOpen, onClose, allContornos, dailyAdicionales, dailyBebidas, maxQuantityPerItem,
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

  function handleAdd() {
    if (!cart.allRequiredSatisfied) return;
    const CATEGORY_EMOJI: Record<string, string> = {
      pollos: "🍗", carnes: "🥩", pastas: "🍝", mariscos: "🍤",
      ensaladas: "🥗", bebidas: "🥤", adicionales: "🍟",
    };
    const categoryKey = item.categoryName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const emoji = CATEGORY_EMOJI[categoryKey] || "🍽️";
    const payload = {
      id: item.id, name: item.name,
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
    for (let i = 0; i < modal.quantity; i++) addItem(payload);
    toast.success(`${item.name} añadido al carrito`);
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(30);
    modal.handleClose();
  }

  if (!isOpen && !modal.closing) return null;

  const itemBaseBsCents = Math.round(item.priceUsdCents * currentRateBsPerUsd);
  const optionGroupsToRender = cart.optionGroupsToRender;
  const hasImage = !!item.imageUrl;

  /*
    Layout strategy
    ───────────────
    Mobile  (<md):  Bottom sheet — floating image over the hero, single column.
    Tablet + Desktop (≥md):  Two-column centered dialog.
      LEFT  — full-bleed image + cinematic overlay + item identity
      RIGHT — scrollable options + sticky footer
      Tablet: 740px  |  Desktop lg: 880px
    No image → single wider column (520px / 580px).
  */

  return (
    <div className="fixed inset-0 z-50">
      <div
        className={`absolute inset-0 bg-text-main/50 backdrop-blur-[2px] transition-opacity duration-200 ${
          modal.closing ? "opacity-0" : "opacity-100"
        }`}
        onClick={modal.handleClose}
      />

      <div
        ref={modal.dialogRef}
        className={cn(
          "absolute bottom-0 left-0 right-0 flex max-h-[90vh] flex-col",
          "transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
          hasImage
            ? "md:bottom-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[740px] md:flex-row md:max-h-[88vh] md:rounded-[28px] md:overflow-hidden lg:w-[880px]"
            : "md:bottom-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[520px] md:max-h-[88vh] md:rounded-[28px] md:overflow-hidden lg:w-[580px]",
          modal.closing
            ? "translate-y-full md:opacity-0 md:-translate-y-[45%]"
            : "translate-y-0 md:opacity-100 md:-translate-y-1/2",
        )}
      >
        {/* ── LEFT PANEL (md+) ─────────────────────────────────────────── */}
        {hasImage && (
          <div className="hidden md:flex md:w-[300px] lg:w-[360px] md:shrink-0 md:flex-col md:relative md:rounded-l-[28px] md:overflow-hidden">
            <Image
              src={item.imageUrl!}
              alt={item.name}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 300px, 360px"
              quality={90}
              priority
            />
            <div
              className="absolute inset-0"
              style={{
                background: [
                  "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.15) 40%, rgba(0,0,0,0.75) 75%, rgba(0,0,0,0.95) 100%)",
                  "radial-gradient(ellipse at 50% 100%, rgba(187,0,5,0.18) 0%, transparent 70%)",
                ].join(", "),
              }}
            />
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: "linear-gradient(135deg, rgba(255,190,80,0.04) 0%, transparent 50%, rgba(90,0,20,0.08) 100%)",
                mixBlendMode: "overlay",
              }}
            />
            <div className="relative mt-auto p-8 pb-10 z-10">
              <span className="inline-flex items-center rounded-full bg-white/12 border border-white/20 backdrop-blur-md px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-white/90 mb-4">
                {item.categoryName}
              </span>
              <h2 className="font-display text-[28px] font-bold leading-tight text-white drop-shadow-sm">
                {item.name}
              </h2>
              {item.description && (
                <p className="mt-3 text-[14px] leading-relaxed text-white/75 line-clamp-3 font-medium">
                  {item.description}
                </p>
              )}
              <div className="mt-6 flex items-end gap-3">
                <p className="text-[32px] font-black leading-none text-white tracking-tight">
                  {formatBs(itemBaseBsCents)}
                </p>
                <span className="mb-1 text-[14px] font-bold text-white/40">
                  {formatRef(item.priceUsdCents)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ── RIGHT PANEL ──────────────────────────────────────────────── */}
        {/*
          Mobile: outer panel transparent — bg-bg-card lives on inner div so
                  the h-36 spacer is see-through (hero shows behind).
          md+:    bg-bg-card on outer panel fills the whole right column.
        */}
        <div className="flex flex-1 min-h-0 flex-col md:bg-bg-card md:rounded-l-none md:rounded-r-[28px]">


          <div className="flex-1 overflow-y-auto">
            {/* Mobile only: transparent spacer */}
            <div className="h-36 w-full shrink-0 md:hidden" />

            {/*
              Mobile:  bg-bg-card + rounded-t-[32px] here.
              md+:     transparent (outer panel has the bg).
            */}
            <div className="relative flex min-h-[calc(100%-7rem)] md:min-h-0 w-full flex-col bg-bg-card rounded-t-[32px] md:bg-transparent md:rounded-none px-4 pb-4 pt-4 md:px-6 md:pt-6">
              {/* Close Button: Absolute to the card on mobile, fixed to the panel on desktop */}
              <button
                onClick={modal.handleClose}
                className="absolute right-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-bg-card/95 text-text-main shadow-md transition-all active:scale-95 active:bg-surface-section md:fixed md:right-5 md:top-5 md:h-9 md:w-9 md:border-none md:bg-surface-section/80 md:shadow-none md:backdrop-blur-md"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5 stroke-[2.5]" />
              </button>

              {/* Mobile only: floating circular image */}
              {hasImage && (
                <div
                  className={cn(
                    "md:hidden absolute -top-[clamp(115px,30vw,145px)] left-1/2 z-20 -translate-x-1/2 pointer-events-none transition-all duration-700 ease-out",
                    imageLoaded ? "opacity-100 scale-100" : "opacity-0 scale-90",
                  )}
                  style={{ width: "clamp(230px, 62vw, 275px)", height: "clamp(230px, 62vw, 275px)" }}
                >
                  <Image
                    src={item.imageUrl!}
                    alt={item.name}
                    fill
                    className="object-cover rounded-3xl drop-shadow-[0_15px_25px_rgba(0,0,0,0.15)]"
                    sizes="(max-width: 500px) 240px, 280px"
                    quality={90}
                    priority
                    onLoad={() => setImageLoaded(true)}
                  />
                </div>
              )}

              {/* Mobile only: no-image fallback */}
              {!hasImage && (
                <div className="md:hidden absolute -top-16 left-1/2 z-20 flex h-32 w-32 -translate-x-1/2 items-center justify-center rounded-[24px] border border-border bg-bg-image shadow-md">
                  <span className="text-4xl">🍽️</span>
                </div>
              )}

              {/* Mobile only: title block */}
              <div className={cn(
                "md:hidden flex flex-col items-center text-center",
                hasImage ? "mt-[95px]" : "mt-8",
              )}>
                <h2 className="mt-3 font-display text-[22px] font-bold leading-tight text-text-main">
                  {item.name}
                </h2>
                {item.description && (
                  <p className="mt-1.5 max-w-[92%] text-center text-[13px] leading-snug text-text-muted">
                    {item.description}
                  </p>
                )}
                <div className="mt-3">
                  <p className="text-xl font-extrabold leading-none text-text-main">
                    {formatBs(itemBaseBsCents)}
                  </p>
                  <p className="mt-1 text-[13px] font-medium leading-none text-text-muted/80">
                    {formatRef(item.priceUsdCents)}
                  </p>
                </div>
              </div>

              {/* md+ only: title when no left panel (no image) */}
              {!hasImage && (
                <div className="hidden md:flex md:flex-col md:items-start md:text-left md:mb-4">
                  <h2 className="font-display text-[24px] font-bold leading-tight text-text-main">
                    {item.name}
                  </h2>
                  {item.description && (
                    <p className="mt-1.5 text-[13px] leading-snug text-text-muted">{item.description}</p>
                  )}
                  <div className="mt-3 flex items-end gap-3">
                    <p className="text-xl font-extrabold leading-none text-text-main">
                      {formatBs(itemBaseBsCents)}
                    </p>
                    <p className="mb-0.5 text-[13px] font-medium leading-none text-text-muted/80">
                      {formatRef(item.priceUsdCents)}
                    </p>
                  </div>
                </div>
              )}

              {/* Desktop-only heading above options */}
              {hasImage && (
                <div className="hidden md:block mb-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#251a07]/50">
                    Realiza tu pedido
                  </p>
                  <div className="mt-2 h-px w-full bg-border/60" />
                </div>
              )}



              {/* includedNote — Re-styled for premium feel */}
              {item.includedNote && (
                <div className="mb-6 flex flex-col items-start gap-1.5 rounded-xl bg-[#fcfaf5] border border-[#e5e0d3] border-l-4 border-l-emerald-600 px-5 py-4">
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.15em] text-emerald-800/80">Incluye</p>
                  </div>
                  <p className="text-[14px] text-emerald-900 font-medium leading-relaxed italic">
                    "{item.includedNote}"
                  </p>
                </div>
              )}

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

              <OptionGroupSection
                groups={optionGroupsToRender}
                selectedRadio={modal.selectedRadio}
                onSelectRadio={(groupId, optionId) =>
                  modal.setSelectedRadio((prev) => ({ ...prev, [groupId]: optionId }))
                }
                currentRateBsPerUsd={currentRateBsPerUsd}
              />

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

              <div className="hidden md:block h-2" />
            </div>
          </div>

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