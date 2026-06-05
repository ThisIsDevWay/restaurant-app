"use client";

import { X, ArrowLeft } from "lucide-react";
import Image from "next/image";
import { useRef, useState, useMemo, useId } from "react";
import { cn } from "@/lib/utils";
import { formatBs, formatRef } from "@/lib/money";
import { useItemDetailController } from "@/hooks/useItemDetailController";
import { useMenuMode } from "@/components/public/menu/MenuModeContext";
import { useScrollSpy } from "@/hooks/useScrollSpy";
import { ContornoSelector } from "./ContornoSelector";
import { AdicionalesList } from "./AdicionalesList";
import { BebidasList } from "./BebidasList";
import { OptionGroupSection } from "./OptionGroupSection";
import { ModalFooter } from "./ModalFooter";
import { ItemShowcaseBody } from "./ItemShowcaseBody";
import type { ItemDetailModalProps } from "./ItemDetailModal.types";

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
                : "text-[#251a07]/75 hover:bg-[#251a07]/5"
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
  dailyContornos = [],
  maxQuantityPerItem = 10,
  initialData = null,
  editingIndex = null,
}: ItemDetailModalProps) {
  const uid = useId();
  const [imageLoaded, setImageLoaded] = useState(false);
  const { isReadOnly } = useMenuMode();

  const {
    modal,
    cart,
    showContornos,
    showOpciones,
    showAdicionales,
    showBebidas,
    itemBaseBsCents,
    handleSave,
  } = useItemDetailController({
    item, isOpen, onClose, currentRateBsPerUsd, allContornos,
    adicionalesEnabled, bebidasEnabled, dailyAdicionales, dailyBebidas,
    dailyContornos, maxQuantityPerItem, initialData, editingIndex,
  });

  const scrollRef = useRef<HTMLDivElement>(null);

  const sectionIds = useMemo(() => {
    const ids: string[] = [`${uid}-detalle`];
    if (showContornos) ids.push(`${uid}-contornos`);
    if (showOpciones) ids.push(`${uid}-opciones`);
    if (showAdicionales) ids.push(`${uid}-adicionales`);
    if (showBebidas) ids.push(`${uid}-bebidas`);
    return ids;
  }, [uid, showContornos, showOpciones, showAdicionales, showBebidas]);

  const activeSection = useScrollSpy(sectionIds, scrollRef);

  /* Tab definitions */
  const tabs: TabDef[] = useMemo(() => {
    const t: TabDef[] = [{ id: `${uid}-detalle`, label: "Detalle" }];
    if (showContornos) t.push({ id: `${uid}-contornos`, label: "Contornos" });
    if (showOpciones) t.push({ id: `${uid}-opciones`, label: "Opciones" });
    if (showAdicionales) t.push({ id: `${uid}-adicionales`, label: "Extras", count: Object.values(modal.adicionalQuantities).reduce((s, v) => s + v, 0) });
    if (showBebidas) t.push({ id: `${uid}-bebidas`, label: "Bebidas", count: Object.values(modal.bebidaQuantities).reduce((s, v) => s + v, 0) });
    return t;
  }, [uid, showContornos, showOpciones, showAdicionales, showBebidas, modal.adicionalQuantities, modal.bebidaQuantities]);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el && scrollRef.current) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  if (!isOpen && !modal.closing) return null;

  const optionGroupsToRender = cart.optionGroupsToRender;
  const hasImage = !!item.imageUrl;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className={`absolute inset-0 bg-text-main/50 backdrop-blur-[2px] transition-opacity duration-200 ${modal.closing ? "opacity-0" : "opacity-100"
          }`}
        onClick={modal.handleClose}
      />

      <div
        ref={modal.dialogRef}
        className={cn(
          "absolute bottom-0 left-0 right-0 flex max-h-[95svh] md:max-h-[88vh] flex-col",
          "transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
          "bg-transparent md:bg-bg-app md:shadow-[0_-8px_40px_rgba(37,26,7,0.14),_0_0_0_0.5px_rgba(37,26,7,0.06)] md:rounded-[28px] md:overflow-hidden",
          hasImage
            ? "md:bottom-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[740px] md:flex-row md:max-h-[88vh] lg:w-[880px]"
            : "md:bottom-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[520px] md:max-h-[88vh] lg:w-[580px]",
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
                <p className="mt-3 text-[16px] leading-relaxed text-white/95 line-clamp-3 font-semibold">
                  {item.description}
                </p>
              )}
              <div className="mt-6 flex items-end gap-3">
                <p className="text-[32px] font-black leading-none text-white tracking-tight">
                  {formatBs(itemBaseBsCents, { rounded: true })}
                </p>
                <span className="mb-1 text-[14px] font-bold text-white/70">
                  {formatRef(item.priceUsdCents)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ── RIGHT PANEL ──────────────────────────────────────────────── */}
        <div className="flex flex-1 min-h-0 flex-col md:bg-bg-app md:rounded-l-none md:rounded-r-[28px]">

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
                <p className="mt-2 text-[15px] leading-relaxed text-text-main/90 font-medium">{item.description}</p>
              )}
              <div className="mt-3 flex items-end gap-3">
                <p className="text-xl font-extrabold leading-none text-text-main">
                  {formatBs(itemBaseBsCents, { rounded: true })}
                </p>
                <p className="mb-0.5 text-[13px] font-medium leading-none text-text-muted">
                  {formatRef(item.priceUsdCents)}
                </p>
              </div>
            </div>
          )}

          {/* Desktop options heading */}
          {hasImage && (
            <div className="hidden md:block mb-3 px-6 pt-5">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#251a07]/75">
                Realiza tu pedido
              </p>
              <div className="mt-2 h-px w-full bg-border/60" />
            </div>
          )}

          {/* ── SCROLLABLE CONTENT ── */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto animate-in fade-in duration-300"
            style={{ overscrollBehavior: "contain" }}
          >
            {/* Mobile-only spacer to allow suspended image to float */}
            {hasImage && <div className="h-32 md:hidden w-full shrink-0" />}

            {/* Mobile-only card wrapper / Desktop-only pass-through */}
            <div className="relative flex flex-col bg-bg-app rounded-t-[28px] shadow-[0_-8px_40px_rgba(37,26,7,0.12)] md:p-0 md:bg-transparent md:shadow-none md:rounded-none">

              {/* Drag handle (mobile only) */}
              <div className="md:hidden absolute top-2.5 left-1/2 -translate-x-1/2 z-40" style={{
                width: 36, height: 4,
                borderRadius: 99,
                background: "rgba(37,26,7,0.12)",
              }} />

              {/* Mobile suspended close button */}
              <button
                onClick={modal.handleClose}
                className="md:hidden absolute left-4 top-4 z-50 flex h-9 w-9 items-center justify-center rounded-full border border-[#251a07]/10 bg-[#fff2e2]/90 text-[#251a07] shadow-sm backdrop-blur-md transition-all active:scale-95"
                aria-label="Volver"
              >
                <ArrowLeft className="h-5 w-5 stroke-[2.5]" />
              </button>

              {/* Suspended image for mobile (Responsive clamp + Contain to prevent cutting) */}
              {hasImage && (
                <div
                  className={cn(
                    "md:hidden absolute -top-[clamp(115px,30vw,145px)] left-1/2 z-20 -translate-x-1/2 pointer-events-none transition-all duration-700 ease-out",
                    imageLoaded ? "opacity-100 scale-100" : "opacity-0 scale-90"
                  )}
                  style={{
                    width: "clamp(230px, 62vw, 275px)",
                    height: "clamp(230px, 62vw, 275px)"
                  }}
                >
                  <Image
                    src={item.imageUrl!}
                    alt={item.name}
                    fill
                    className="object-cover rounded-3xl drop-shadow-[0_15px_25px_rgba(0,0,0,0.15)] transition-all duration-500"
                    sizes="(max-width: 500px) 240px, 280px"
                    quality={90}
                    priority
                    onLoad={() => setImageLoaded(true)}
                  />
                </div>
              )}

              {/* ── DETALLE SECTION (mobile) — description + INCLUYE ── */}
              <div
                id={`${uid}-detalle`}
                className={cn(
                  "md:hidden px-5 pb-5 scroll-mt-12 animate-in fade-in bg-transparent",
                  hasImage ? "pt-[110px]" : "pt-14"
                )}
              >
                {/* Name + price */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {hasImage && (
                      <p className="text-[10px] font-black uppercase tracking-[0.15em] text-text-main/70 mb-1 font-display">
                        {item.categoryName}
                      </p>
                    )}
                    <h2 className="font-display text-[20px] font-black leading-tight text-text-main tracking-tight">
                      {item.name}
                    </h2>
                    {item.description && (
                      <p className="mt-2 text-[14.5px] leading-relaxed text-text-main/90 font-medium">
                        {item.description}
                      </p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <p className="font-display text-[18px] font-black leading-tight text-text-main tracking-tight">
                      {formatBs(itemBaseBsCents, { rounded: true })}
                    </p>
                    <p className="text-[11px] text-text-main/70 font-medium mt-0.5">
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

                {/* INCLUYE badges — included contornos (§3.5d). In showcase mode the
                    chips are rendered by ItemShowcaseBody instead, to avoid duplication. */}
                {!isReadOnly && item.contornos && item.contornos.length > 0 && (
                  <div className="mt-3 flex flex-col gap-1.5">
                    <span className="text-[10px] font-black uppercase tracking-[0.12em] text-[#251a07]/75 font-display">
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

              {isReadOnly ? (
                <ItemShowcaseBody
                  item={item}
                  adicionalesEnabled={adicionalesEnabled}
                  bebidasEnabled={bebidasEnabled}
                  dailyAdicionales={dailyAdicionales}
                  dailyBebidas={dailyBebidas}
                  dailyContornos={dailyContornos}
                />
              ) : (
                <>
                  {/* ── SCROLL SPY TAB BAR (mobile only) — sticky right after hero ── */}
                  <StickyTabBar
                    tabs={tabs}
                    activeId={activeSection}
                    onTabClick={scrollToSection}
                  />

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
                </>
              )}

              {/* Bottom spacer */}
              <div className="h-28 md:h-2" />
            </div> {/* end of card wrapper */}
          </div> {/* end of scroll view */}

          {/* ── STICKY CTA FOOTER ── */}
          {!isReadOnly && (
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
          )}
        </div>
      </div>
    </div>
  );
}
