"use client";

import { X, Minus, Plus, Check } from "lucide-react";
import Image from "next/image";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { formatBs, formatRef } from "@/lib/money";
import { usePOSCartStore, type CartItem } from "@/store/posCartStore";
import { useItemDetailModal } from "@/hooks/useItemDetailModal";
import { useCartCalculation } from "@/hooks/useCartCalculation";
import { POSContornoSelector } from "./POSContornoSelector";
import { getCategoryEmoji } from "@/lib/categoryIcons";
import type { MenuItemWithComponents, SimpleComponent } from "@/types/menu.types";
import type { SimpleItem } from "@/components/customer/ItemDetailModal.types";

interface POSItemDetailModalProps {
  item: MenuItemWithComponents;
  isOpen: boolean;
  onClose: () => void;
  rate: number;
  allContornos: SimpleComponent[];
  dailyAdicionales: SimpleItem[];
  dailyBebidas: SimpleItem[];
  adicionalesEnabled?: boolean;
  bebidasEnabled?: boolean;
  initialData?: CartItem | null;
  editingIndex?: number | null;
}

function QtyStepper({
  value, onDec, onInc,
}: { value: number; onDec: () => void; onInc: () => void }) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={onDec}
        disabled={value <= 0}
        className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-[var(--color-border)] bg-white text-[var(--color-primary)] transition-transform active:scale-95 disabled:opacity-30"
        aria-label="Quitar"
      >
        <Minus size={16} strokeWidth={3} />
      </button>
      <span className="min-w-[2rem] text-center text-base font-black tabular-nums text-[var(--color-text-main)]">
        {value}
      </span>
      <button
        type="button"
        onClick={onInc}
        className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary)] text-white transition-transform active:scale-95"
        aria-label="Agregar"
      >
        <Plus size={16} strokeWidth={3} />
      </button>
    </div>
  );
}

export function POSItemDetailModal({
  item,
  isOpen,
  onClose,
  rate,
  allContornos,
  dailyAdicionales,
  dailyBebidas,
  adicionalesEnabled = true,
  bebidasEnabled = true,
  initialData = null,
  editingIndex = null,
}: POSItemDetailModalProps) {
  const addItem = usePOSCartStore((s) => s.addItem);
  const updateItem = usePOSCartStore((s) => s.updateItem);

  const modal = useItemDetailModal({
    item, isOpen, onClose, allContornos, dailyAdicionales, dailyBebidas,
    maxQuantityPerItem: 999, initialData,
  });

  // POS contorno model: quantity-based selection to support double portions.
  const [contornoQuantities, setContornoQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!isOpen) return;
    const qtys: Record<string, number> = {};
    if (initialData) {
      // Count frequency of fixed contornos and substitutions
      for (const c of initialData.fixedContornos ?? []) {
        qtys[c.id] = (qtys[c.id] ?? 0) + 1;
      }
      for (const s of initialData.contornoSubstitutions ?? []) {
        qtys[s.substituteId] = (qtys[s.substituteId] ?? 0) + 1;
      }
    } else {
      // Default: pre-select the dish's always-included (non-removable) sides with quantity 1
      for (const c of item.contornos.filter((c) => c.isAvailable && !c.removable)) {
        qtys[c.id] = (qtys[c.id] ?? 0) + 1;
      }
    }
    setContornoQuantities(qtys);
  }, [isOpen, initialData, item.contornos]);

  // Drive the calculation hook for adicionales/bebidas/radio + required validation.
  // Contorno args are intentionally empty — POS computes contornos separately.
  const cart = useCartCalculation({
    item,
    availableContornos: [],
    fixedContornos: [],
    removableContornos: [],
    substitutionMap: {},
    selectedAdicionalQtys: modal.adicionalQuantities,
    selectedBebidaQtys: modal.bebidaQuantities,
    selectedRadio: modal.selectedRadio,
    dailyAdicionales, dailyBebidas, allContornos,
    quantity: modal.quantity,
    currentRateBsPerUsd: rate,
  });

  const availableContornos = allContornos.filter((c) => c.isAvailable);
  const showContornos = item.contornos.length > 0;
  const showOpciones = (cart.optionGroupsToRender?.length ?? 0) > 0;
  const showAdicionales =
    adicionalesEnabled &&
    !item.hideAdicionales &&
    !item.categoryIsSimple &&
    !item.categoryName.toLowerCase().includes("adicional") &&
    !item.categoryName.toLowerCase().includes("contorno") &&
    (dailyAdicionales?.filter((a) => a.isAvailable).length ?? 0) > 0;
  const showBebidas =
    bebidasEnabled &&
    !item.hideBebidas &&
    !item.categoryIsSimple &&
    !item.categoryName.toLowerCase().includes("bebida") &&
    (dailyBebidas?.filter((b) => b.isAvailable).length ?? 0) > 0;

  const showTabOpciones = showContornos || showOpciones;
  const showTabAdicionales = showAdicionales;
  const showTabBebidas = showBebidas;

  const tabs = [];
  if (showTabOpciones) tabs.push({ id: "opciones" as const, label: "Opciones" });
  if (showTabAdicionales) tabs.push({ id: "adicionales" as const, label: "Adicionales" });
  if (showTabBebidas) tabs.push({ id: "bebidas" as const, label: "Bebidas" });

  const [activeTab, setActiveTab] = useState<"opciones" | "adicionales" | "bebidas">("opciones");

  useEffect(() => {
    if (isOpen) {
      if (showTabOpciones) {
        setActiveTab("opciones");
      } else if (showTabAdicionales) {
        setActiveTab("adicionales");
      } else if (showTabBebidas) {
        setActiveTab("bebidas");
      }
    }
  }, [isOpen, showTabOpciones, showTabAdicionales, showTabBebidas]);

  if (!isOpen && !modal.closing) return null;

  // Flatten selected contornos based on their quantities
  const selectedContornos = availableContornos.flatMap((c) => {
    const qty = contornoQuantities[c.id] ?? 0;
    return Array.from({ length: qty }, () => c);
  });
  const contornosUsdCents = selectedContornos.reduce((s, c) => s + c.priceUsdCents, 0);
  const totalUsdCents = cart.totalUsdCents + contornosUsdCents * modal.quantity;
  const totalBsCents = Math.round(totalUsdCents * rate);
  const itemBaseBsCents = Math.round(item.priceUsdCents * rate);

  function changeContornoQty(id: string, qty: number) {
    setContornoQuantities((prev) => ({
      ...prev,
      [id]: Math.max(0, qty),
    }));
  }

  function handleSave() {
    if (!cart.allRequiredSatisfied) return;
    const payload: Omit<CartItem, "quantity" | "itemTotalBsCents"> = {
      id: item.id,
      name: item.name,
      emoji: getCategoryEmoji(item.categoryName),
      imageUrl: item.imageUrl ?? null,
      baseUsdCents: item.priceUsdCents,
      baseBsCents: itemBaseBsCents,
      fixedContornos: selectedContornos.map((c) => ({
        id: c.id, name: c.name,
        priceUsdCents: c.priceUsdCents,
        priceBsCents: Math.round(c.priceUsdCents * rate),
      })),
      contornoSubstitutions: [],
      selectedAdicionales: [...cart.cartAdicionales, ...cart.cartRadioOptions].map((a) => ({
        id: a.id, name: a.name, priceUsdCents: a.priceUsdCents, priceBsCents: a.priceBsCents, quantity: a.quantity,
      })),
      selectedBebidas: cart.cartBebidas.map((b) => ({
        id: b.id, name: b.name, priceUsdCents: b.priceUsdCents, priceBsCents: b.priceBsCents, quantity: b.quantity,
      })),
      removedComponents: [],
      categoryAllowAlone: item.categoryAllowAlone,
      categoryIsSimple: item.categoryIsSimple,
      categoryName: item.categoryName,
      includedNote: item.includedNote ?? null,
      isPrepackaged: item.isPrepackaged,
    };

    if (editingIndex !== null && editingIndex !== undefined) {
      updateItem(editingIndex, { ...payload, quantity: modal.quantity });
      toast.success(`${item.name} actualizado`);
    } else {
      for (let i = 0; i < modal.quantity; i++) addItem(payload);
      toast.success(`${item.name} añadido`);
    }
    modal.handleClose();
  }

  return (
    <div className="fixed inset-0 z-50">
      <div
        className={`absolute inset-0 bg-black/50 transition-opacity duration-200 ${modal.closing ? "opacity-0" : "opacity-100"}`}
        onClick={modal.handleClose}
        style={{ backdropFilter: "blur(2px)" }}
      />
      <div
        ref={modal.dialogRef}
        className={`absolute bottom-0 left-0 right-0 flex max-h-[92dvh] flex-col overflow-hidden rounded-t-3xl bg-white transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] md:bottom-auto md:left-1/2 md:top-1/2 md:w-[560px] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-3xl ${
          modal.closing ? "translate-y-full md:opacity-0" : "translate-y-0 md:opacity-100"
        }`}
        style={{ boxShadow: "0 -8px 40px rgba(37,26,7,0.18)" }}
      >
        {/* Header */}
        <div className="flex shrink-0 items-start gap-3 border-b border-[var(--color-border)] px-5 py-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[var(--color-surface-section)]">
            {item.imageUrl ? (
              <Image src={item.imageUrl} alt={item.name} width={56} height={56} className="h-full w-full object-cover" />
            ) : (
              <span className="text-2xl">{getCategoryEmoji(item.categoryName)}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-lg font-black leading-tight text-[var(--color-text-main)]">{item.name}</h2>
            <div className="mt-0.5 flex items-baseline gap-2">
              <span className="text-base font-black text-[var(--color-primary)] tabular-nums">{formatBs(itemBaseBsCents)}</span>
              <span className="text-xs font-bold text-[var(--color-text-muted)]">{formatRef(item.priceUsdCents)}</span>
            </div>
          </div>
          <button
            onClick={modal.handleClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-section)] text-[var(--color-text-muted)] transition-transform active:scale-95"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs Bar */}
        {tabs.length > 1 && (
          <div className="flex shrink-0 border-b border-[var(--color-border)] bg-slate-50 px-5 py-2.5 gap-2">
            {tabs.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 rounded-xl py-2 text-xs font-black uppercase tracking-wider transition-all border ${
                    active
                      ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-sm"
                      : "bg-white text-[var(--color-text-muted)] border-[var(--color-border)] hover:bg-slate-50 hover:text-[var(--color-text-main)]"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Scrollable content */}
        <div className="flex-1 divide-y divide-[var(--color-border)] overflow-y-auto" style={{ overscrollBehavior: "contain" }}>
          {activeTab === "opciones" && (
            <>
              {item.includedNote && (
                <div className="px-5 py-3">
                  <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-900">
                    <span className="mr-1 text-[10px] font-black uppercase tracking-wide text-emerald-700">Incluye:</span>
                    {item.includedNote}
                  </p>
                </div>
              )}

              {showContornos && (
                <POSContornoSelector
                  availableContornos={availableContornos}
                  selectedQuantities={contornoQuantities}
                  onChange={changeContornoQty}
                  rate={rate}
                />
              )}

              {showOpciones && cart.optionGroupsToRender.map((group) => (
                <section key={group.id} className="px-5 py-4">
                  <h3 className="mb-2 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                    {group.name}
                    {group.required && <span className="ml-1 text-[var(--color-primary)]">*</span>}
                  </h3>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {group.options.filter((o) => o.isAvailable).map((opt) => {
                      const selected = modal.selectedRadio[group.id] === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => modal.setSelectedRadio((prev) => ({ ...prev, [group.id]: opt.id }))}
                          className={`flex min-h-[48px] items-center justify-between gap-2 rounded-xl border-2 px-3 py-2 text-left transition-transform duration-75 active:scale-95 ${
                            selected ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5" : "border-[var(--color-border)] bg-white"
                          }`}
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-bold text-[var(--color-text-main)]">{opt.name}</span>
                            {opt.priceUsdCents > 0 && (
                              <span className="block text-[10px] font-bold text-[var(--color-text-muted)]">+{formatBs(Math.round(opt.priceUsdCents * rate))}</span>
                            )}
                          </span>
                          {selected && (
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-white">
                              <Check size={14} strokeWidth={3} />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}

              {!showContornos && !showOpciones && (
                <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
                  <p className="text-sm font-bold">Este plato no requiere personalización.</p>
                  <p className="text-xs mt-1">Puedes agregar adicionales o bebidas desde las otras pestañas.</p>
                </div>
              )}
            </>
          )}

          {activeTab === "adicionales" && showAdicionales && (
            <section className="px-5 py-4">
              <h3 className="mb-2 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-text-muted)]">Extras</h3>
              <div className="flex flex-col gap-2">
                {dailyAdicionales.filter((a) => a.isAvailable).map((a) => (
                  <div key={a.id} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-white px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-[var(--color-text-main)]">{a.name}</p>
                      {a.priceUsdCents > 0 && (
                        <p className="text-[11px] font-bold text-[var(--color-text-muted)]">+{formatBs(Math.round(a.priceUsdCents * rate))}</p>
                      )}
                    </div>
                    <QtyStepper
                      value={modal.adicionalQuantities[a.id] ?? 0}
                      onDec={() => modal.updateAdicionalQty(a.id, -1)}
                      onInc={() => modal.updateAdicionalQty(a.id, 1)}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          {activeTab === "bebidas" && showBebidas && (
            <section className="px-5 py-4">
              <h3 className="mb-2 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--color-text-muted)]">Bebidas</h3>
              <div className="flex flex-col gap-2">
                {dailyBebidas.filter((b) => b.isAvailable).map((b) => (
                  <div key={b.id} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-white px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-[var(--color-text-main)]">{b.name}</p>
                      {b.priceUsdCents > 0 && (
                        <p className="text-[11px] font-bold text-[var(--color-text-muted)]">+{formatBs(Math.round(b.priceUsdCents * rate))}</p>
                      )}
                    </div>
                    <QtyStepper
                      value={modal.bebidaQuantities[b.id] ?? 0}
                      onDec={() => modal.updateBebidaQty(b.id, -1)}
                      onInc={() => modal.updateBebidaQty(b.id, 1)}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center gap-3 border-t border-[var(--color-border)] bg-white px-5 py-4">
          <QtyStepper
            value={modal.quantity}
            onDec={() => modal.setQuantity((q) => Math.max(1, q - 1))}
            onInc={() => modal.setQuantity((q) => q + 1)}
          />
          <button
            type="button"
            onClick={handleSave}
            disabled={!cart.allRequiredSatisfied}
            className="flex h-16 flex-1 items-center justify-center gap-2 rounded-2xl bg-[var(--color-primary)] text-base font-black uppercase tracking-wide text-white transition-transform active:scale-[0.98] disabled:opacity-40"
          >
            {cart.allRequiredSatisfied ? (
              <>
                {editingIndex !== null ? "Actualizar" : "Añadir"}
                <span className="tabular-nums">· {formatBs(totalBsCents)}</span>
              </>
            ) : (
              <span className="text-sm">Elige: {cart.unsatisfiedGroup?.name}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
