"use client";

import { X, ArrowLeft, ChevronRight, UtensilsCrossed } from "lucide-react";
import Image from "next/image";
import { useRef, useState, useMemo, useId } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatBs, formatRef } from "@/lib/money";
import { useCartStore } from "@/store/cartStore";
import { useItemDetailModal } from "@/hooks/useItemDetailModal";
import { useCartCalculation } from "@/hooks/useCartCalculation";
import { useScrollSpy } from "@/hooks/useScrollSpy";
import { ContornoSelector } from "./ContornoSelector";
import { AdicionalesList } from "./AdicionalesList";
import { BebidasList } from "./BebidasList";
import { OptionGroupSection } from "./OptionGroupSection";
import { ModalFooter } from "./ModalFooter";
import type { ItemDetailModalProps } from "./ItemDetailModal.types";

/* ─────────────────────────────────────────────────────────────────────────────
   DESIGN TOKENS
   ───────────────────────────────────────────────────────────────────────────── */
const INK  = "#251a07";
const RED  = "#bb0005";
const CREAM_LOW = "#fff2e2";

/* ─────────────────────────────────────────────────────────────────────────────
   CATEGORY → EMOJI MAP
   ───────────────────────────────────────────────────────────────────────────── */
const CATEGORY_EMOJI: Record<string, string> = {
  pollos: "🍗", carnes: "🥩", pastas: "🍝", mariscos: "🍤",
  ensaladas: "🥗", bebidas: "🥤", adicionales: "🍟",
};
function getEmoji(categoryName: string): string {
  const key = categoryName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return CATEGORY_EMOJI[key] ?? "🍽️";
}

/* ─────────────────────────────────────────────────────────────────────────────
   STICKY TAB BAR (mobile only)
   ───────────────────────────────────────────────────────────────────────────── */
interface TabDef { id: string; label: string; count?: number }

function StickyTabBar({
  tabs,
  activeId,
  onTabClick,
}: {
  tabs: TabDef[];
  activeId: string;
  onTabClick: (id: string) => void;
}) {
  if (tabs.length < 2) return null;
  return (
    <nav
      className="md:hidden sticky top-0 z-10 shrink-0 flex overflow-x-auto border-b border-[#251a07]/10 gap-1.5 px-4 py-2.5 bg-[#f5ece0]"
      style={{
        scrollbarWidth: "none",
      }}
    >
      {tabs.map((tab) => {
        const active = tab.id === activeId;
        return (
          <button
            key={tab.id}
            onClick={() => onTabClick(tab.id)}
            className={cn(
              "flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase transition-all flex items-center gap-1.5",
              active
                ? "bg-[#251a07] text-[#f5ece0] shadow-sm"
                : "text-[#251a07]/60 hover:bg-[#251a07]/5"
            )}
            style={{
              fontFamily: "'Epilogue', sans-serif",
            }}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-[#bb0005] text-white text-[9px] font-black font-display leading-none">
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MOBILE IMAGE HERO (no image → UtensilsCrossed fallback)
   ───────────────────────────────────────────────────────────────────────────── */
function MobileHero({
  item, imageLoaded, onImageLoad, onClose, categoryName,
}: {
  item: { name: string; imageUrl?: string | null; categoryName: string; description?: string | null; priceUsdCents: number };
  imageLoaded: boolean;
  onImageLoad: () => void;
  onClose: () => void;
  categoryName: string;
}) {
  const hasImage = !!item.imageUrl;

  return (
    <div
      className="md:hidden relative shrink-0"
      style={{
        height: "clamp(160px, 42vw, 220px)",
        overflow: "visible",
      }}
    >
      {hasImage ? (
        <>
          <Image
            src={item.imageUrl!}
            alt={item.name}
            fill
            className="object-cover"
            sizes="100vw"
            quality={85}
            priority
            onLoad={onImageLoad}
            style={{
              borderRadius: "24px 24px 0 0",
              opacity: imageLoaded ? 1 : 0,
              transition: "opacity 0.4s ease",
            }}
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "linear-gradient(180deg, rgba(0,0,0,0) 50%, rgba(0,0,0,0.6) 100%)",
              borderRadius: "24px 24px 0 0",
            }}
          />
        </>
      ) : (
        <div
          className="absolute inset-0 flex items-center justify-center bg-[#f5ece0]"
          style={{
            borderRadius: "24px 24px 0 0",
          }}
        >
          <UtensilsCrossed className="h-10 w-10 text-[#251a07]/30" strokeWidth={1.5} />
        </div>
      )}

      {/* Category badge */}
      <div className="absolute bottom-3 left-4">
        <span style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "3px 10px",
          borderRadius: 99,
          background: hasImage ? "rgba(255,255,255,0.18)" : "rgba(37,26,7,0.06)",
          border: hasImage ? "1px solid rgba(255,255,255,0.28)" : "1px solid rgba(37,26,7,0.12)",
          backdropFilter: hasImage ? "blur(8px)" : "none",
          WebkitBackdropFilter: hasImage ? "blur(8px)" : "none",
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: hasImage ? "rgba(255,255,255,0.92)" : "#251a07",
          fontFamily: "'Epilogue', sans-serif",
        }}>
          {categoryName}
        </span>
      </div>

      {/* Back/Close button — top-left */}
      <button
        onClick={onClose}
        aria-label="Volver"
        className="absolute top-3 left-3 z-30 flex items-center justify-center"
        style={{
          width: 36, height: 36,
          borderRadius: 12,
          border: "none",
          background: hasImage
            ? "rgba(37,26,7,0.45)"
            : CREAM_LOW,
          color: hasImage ? "#fff" : INK,
          backdropFilter: hasImage ? "blur(8px)" : "none",
          WebkitBackdropFilter: hasImage ? "blur(8px)" : "none",
          cursor: "pointer",
          boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
        }}
      >
        <ArrowLeft style={{ width: 17, height: 17 }} />
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN COMPONENT
   ───────────────────────────────────────────────────────────────────────────── */
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
  initialData = null,
  editingIndex = null,
}: ItemDetailModalProps) {
  const uid = useId();
  const [imageLoaded, setImageLoaded] = useState(false);
  const addItem = useCartStore((s) => s.addItem);
  const updateItem = useCartStore((s) => s.updateItem);

  const modal = useItemDetailModal({
    item, isOpen, onClose, allContornos, dailyAdicionales, dailyBebidas, maxQuantityPerItem, initialData,
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

  const scrollRef = useRef<HTMLDivElement>(null);

  const showContornos  = modal.availableContornos.length > 0;
  const showOpciones   = (cart.optionGroupsToRender?.length ?? 0) > 0;
  const showAdicionales =
    adicionalesEnabled &&
    !item.hideAdicionales &&
    !item.categoryIsSimple &&
    !item.categoryName.toLowerCase().includes("adicional") &&
    !item.categoryName.toLowerCase().includes("contorno") &&
    (dailyAdicionales?.filter(a => a.isAvailable).length ?? 0) > 0;
  const showBebidas =
    bebidasEnabled &&
    !item.hideBebidas &&
    !item.categoryIsSimple &&
    !item.categoryName.toLowerCase().includes("bebida") &&
    (dailyBebidas?.filter(b => b.isAvailable).length ?? 0) > 0;

  const sectionIds = useMemo(() => {
    const ids: string[] = [`${uid}-detalle`];
    if (showContornos)   ids.push(`${uid}-contornos`);
    if (showOpciones)    ids.push(`${uid}-opciones`);
    if (showAdicionales) ids.push(`${uid}-adicionales`);
    if (showBebidas)     ids.push(`${uid}-bebidas`);
    return ids;
  }, [uid, showContornos, showOpciones, showAdicionales, showBebidas]);

  const activeSection = useScrollSpy(sectionIds, scrollRef);

  /* Tab definitions */
  const tabs: TabDef[] = useMemo(() => {
    const t: TabDef[] = [{ id: `${uid}-detalle`, label: "Detalle" }];
    if (showContornos)   t.push({ id: `${uid}-contornos`,   label: "Contornos" });
    if (showOpciones)    t.push({ id: `${uid}-opciones`,    label: "Opciones" });
    if (showAdicionales) t.push({ id: `${uid}-adicionales`, label: "Extras",   count: Object.values(modal.adicionalQuantities).reduce((s, v) => s + v, 0) });
    if (showBebidas)     t.push({ id: `${uid}-bebidas`,     label: "Bebidas",  count: Object.values(modal.bebidaQuantities).reduce((s, v) => s + v, 0) });
    return t;
  }, [uid, showContornos, showOpciones, showAdicionales, showBebidas, modal.adicionalQuantities, modal.bebidaQuantities]);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el && scrollRef.current) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  function handleSave() {
    if (!cart.allRequiredSatisfied) return;
    const emoji = getEmoji(item.categoryName);
    const payload = {
      id: item.id, name: item.name,
      baseUsdCents: item.priceUsdCents,
      baseBsCents: Math.round(item.priceUsdCents * currentRateBsPerUsd),
      isPrepackaged: item.isPrepackaged,
      emoji,
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
      // Editing existing item - include updated quantity from modal
      updateItem(editingIndex, { ...payload, quantity: modal.quantity });
      toast.success(`${item.name} actualizado`);
    } else {
      // Adding new item
      for (let i = 0; i < modal.quantity; i++) addItem(payload);
      toast.success(`${item.name} añadido al pedido`);
    }

    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(30);
    modal.handleClose();
  }

  if (!isOpen && !modal.closing) return null;

  const itemBaseBsCents = Math.round(item.priceUsdCents * currentRateBsPerUsd);
  const optionGroupsToRender = cart.optionGroupsToRender;
  const hasImage = !!item.imageUrl;

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
          "absolute bottom-0 left-0 right-0 flex max-h-[95svh] md:max-h-[88vh] flex-col overflow-hiddenRoundedRounded rounded-t-[24px] overflow-hidden md:rounded-none",
          "transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
          hasImage
            ? "md:bottom-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[740px] md:flex-row md:max-h-[88vh] md:rounded-[28px] md:overflow-hidden lg:w-[880px]"
            : "md:bottom-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[520px] md:max-h-[88vh] md:rounded-[28px] md:overflow-hidden lg:w-[580px]",
          modal.closing
            ? "translate-y-full md:opacity-0 md:-translate-y-[45%]"
            : "translate-y-0 md:opacity-100 md:-translate-y-1/2",
        )}
        style={{
          /* Override Tailwind bg-bg-card on outer — set explicitly */
          background: "var(--bg-card, #fff)",
          boxShadow: "0 -8px 40px rgba(37,26,7,0.14), 0 0 0 0.5px rgba(37,26,7,0.06)",
        }}
      >
        {/* Drag handle (mobile only, absolute at top of sheet) */}
        <div className="md:hidden absolute top-2 left-1/2 -translate-x-1/2 z-40" style={{
          width: 36, height: 4,
          borderRadius: 99,
          background: hasImage ? "rgba(255,255,255,0.4)" : "rgba(37,26,7,0.12)",
        }} />

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
        <div className="flex flex-1 min-h-0 flex-col md:bg-bg-card md:rounded-l-none md:rounded-r-[28px]">

          {/* Desktop close button */}
          <button
            onClick={modal.handleClose}
            className="hidden md:flex fixed right-5 top-5 h-9 w-9 items-center justify-center rounded-full bg-surface-section/80 backdrop-blur-md z-50 transition-all active:scale-95 hover:bg-surface-section"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5 stroke-[2.5]" />
          </button>

          {/* Desktop includedNote */}
          {item.includedNote && (
            <div className="hidden md:flex flex-col items-start gap-1.5 rounded-xl bg-[#fcfaf5] border border-[#e5e0d3] border-l-4 border-l-emerald-600 px-5 py-4 mx-6 mt-5">
              <div className="flex items-center gap-2">
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-emerald-800/80">Incluye</p>
              </div>
              <p className="text-[14px] text-emerald-900 font-medium leading-relaxed italic">
                &quot;{item.includedNote}&quot;
              </p>
            </div>
          )}

          {/* Desktop title when no left panel */}
          {!hasImage && (
            <div className="hidden md:flex md:flex-col md:items-start md:text-left md:mb-4 px-6 pt-6">
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

          {/* Desktop options heading */}
          {hasImage && (
            <div className="hidden md:block mb-3 px-6 pt-5">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#251a07]/50">
                Realiza tu pedido
              </p>
              <div className="mt-2 h-px w-full bg-border/60" />
            </div>
          )}

          {/* ── SCROLLABLE CONTENT ── */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto"
            style={{ overscrollBehavior: "contain" }}
          >
            {/* Mobile Hero (mobile only) */}
            <MobileHero
              item={item}
              imageLoaded={imageLoaded}
              onImageLoad={() => setImageLoaded(true)}
              onClose={modal.handleClose}
              categoryName={item.categoryName}
            />

            {/* ── SCROLL SPY TAB BAR (mobile only) — sticky right after hero ── */}
            <StickyTabBar
              tabs={tabs}
              activeId={activeSection}
              onTabClick={scrollToSection}
            />

            {/* ── DETALLE SECTION (mobile) — description + INCLUYE ── */}
            <div
              id={`${uid}-detalle`}
              className="md:hidden px-5 pt-4 pb-5 scroll-mt-12 animate-in fade-in"
              style={{ background: "var(--bg-card, #fff)" }}
            >
              {/* Name + price */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {hasImage && (
                    <p className="text-[10px] font-black uppercase tracking-[0.15em] text-text-muted mb-1 font-display">
                      {item.categoryName}
                    </p>
                  )}
                  <h2 className="font-display text-[20px] font-black leading-tight text-text-main tracking-tight">
                    {item.name}
                  </h2>
                  {item.description && (
                    <p className="mt-1 text-[12px] leading-snug text-text-muted">
                      {item.description}
                    </p>
                  )}
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  <p className="font-display text-[18px] font-black leading-tight text-text-main tracking-tight">
                    {formatBs(itemBaseBsCents)}
                  </p>
                  <p className="text-[11px] text-text-muted font-medium mt-0.5">
                    {formatRef(item.priceUsdCents)}
                  </p>
                </div>
              </div>

              {/* INCLUYE badge — if item.includedNote */}
              {item.includedNote && (
                <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl"
                  style={{ background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.18)" }}>
                  <span style={{
                    width: 18, height: 18,
                    borderRadius: "50%",
                    background: "#16a34a",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    fontSize: 10,
                    color: "#fff",
                    fontWeight: 900,
                  }}>✓</span>
                  <p className="text-[12px] font-semibold text-emerald-900 leading-snug">
                    <span className="font-black text-emerald-700 uppercase tracking-wide text-[10px] mr-1.5 font-display">Incluye:</span>
                    {item.includedNote}
                  </p>
                </div>
              )}

              {/* INCLUYE badges — included contornos (§3.5d) */}
              {item.contornos && item.contornos.length > 0 && (
                <div className="mt-3 flex flex-col gap-1.5">
                  <span className="text-[10px] font-black uppercase tracking-[0.12em] text-[#251a07]/50 font-display">
                    Incluido en el plato:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {item.contornos.map((c) => (
                      <div
                        key={c.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-[#f5ece0] bg-[#f5ece0]/30 text-xs font-semibold text-[#251a07]"
                      >
                        <span className="text-[#16a34a] text-[10px]">✓</span>
                        <span>{c.name.replace(/\s*\([^)]*\)\s*$/, "").trim()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Spacer after hero on md+ when no image */}
            <div className="hidden md:block h-0" />

            {/* Contornos section */}
            {showContornos && (
              <div id={`${uid}-contornos`} className="scroll-mt-12">
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
              </div>
            )}

            {/* Options section */}
            {showOpciones && (
              <div id={`${uid}-opciones`} className="scroll-mt-12">
                <OptionGroupSection
                  groups={optionGroupsToRender}
                  selectedRadio={modal.selectedRadio}
                  onSelectRadio={(groupId, optionId) =>
                    modal.setSelectedRadio((prev) => ({ ...prev, [groupId]: optionId }))
                  }
                  currentRateBsPerUsd={currentRateBsPerUsd}
                />
              </div>
            )}

            {/* Adicionales section */}
            {showAdicionales && (
              <div id={`${uid}-adicionales`} className="scroll-mt-12">
                <AdicionalesList
                  dailyAdicionales={dailyAdicionales}
                  quantities={modal.adicionalQuantities}
                  onUpdateQty={modal.updateAdicionalQty}
                  activeSubstituteIds={modal.activeSubstituteIds}
                  currentRateBsPerUsd={currentRateBsPerUsd}
                  maxQuantityPerItem={maxQuantityPerItem ?? 10}
                />
              </div>
            )}

            {/* Bebidas section */}
            {showBebidas && (
              <div id={`${uid}-bebidas`} className="scroll-mt-12">
                <BebidasList
                  dailyBebidas={dailyBebidas}
                  quantities={modal.bebidaQuantities}
                  onUpdateQty={modal.updateBebidaQty}
                  currentRateBsPerUsd={currentRateBsPerUsd}
                  maxQuantityPerItem={maxQuantityPerItem ?? 10}
                />
              </div>
            )}

            {/* Bottom spacer */}
            <div className="h-28 md:h-2" />
          </div>

          {/* ── STICKY CTA FOOTER ── */}
          <ModalFooter
            quantity={modal.quantity}
            maxQuantityPerItem={maxQuantityPerItem}
            onQuantityChange={modal.setQuantity}
            onAdd={handleSave}
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