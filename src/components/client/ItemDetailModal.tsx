"use client";

import { useState, useEffect, useRef } from "react";
import { X, Minus, Plus, Check } from "lucide-react";
import Image from "next/image";
import { formatBs, formatRef } from "@/lib/money";
import { useCartStore } from "@/store/cartStore";

interface Option {
  id: string;
  name: string;
  priceUsdCents: number;
  isAvailable: boolean;
  sortOrder: number;
}

interface OptionGroup {
  id: string;
  name: string;
  type: "radio" | "checkbox";
  required: boolean;
  sortOrder: number;
  options: Option[];
}

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  priceUsdCents: number;
  categoryId: string;
  categoryName: string;
  categoryAllowAlone: boolean;
  isAvailable: boolean;
  imageUrl: string | null;
  optionGroups: OptionGroup[];
}

interface ItemDetailModalProps {
  item: MenuItem;
  isOpen: boolean;
  onClose: () => void;
  currentRateBsPerUsd: number;
}

export function ItemDetailModal({
  item,
  isOpen,
  onClose,
  currentRateBsPerUsd,
}: ItemDetailModalProps) {
  const addItem = useCartStore((s) => s.addItem);
  const [selectedRadio, setSelectedRadio] = useState<
    Record<string, string>
  >({});
  const [selectedCheckbox, setSelectedCheckbox] = useState<
    Record<string, string[]>
  >({});
  const [quantity, setQuantity] = useState(1);
  const [closing, setClosing] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setSelectedRadio({});
      setSelectedCheckbox({});
      setQuantity(1);
      setClosing(false);
    }
  }, [isOpen]);

  // Escape key to close
  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  function handleClose() {
    setClosing(true);
    setTimeout(onClose, 300);
  }

  function toggleCheckbox(groupId: string, optionId: string) {
    setSelectedCheckbox((prev) => {
      const current = prev[groupId] ?? [];
      const next = current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : [...current, optionId];
      return { ...prev, [groupId]: next };
    });
  }

  // Check required groups satisfaction
  const requiredGroups = item.optionGroups.filter((g) => g.required);
  const unsatisfiedGroup = requiredGroups.find(
    (g) => selectedRadio[g.id] === undefined,
  );
  const allRequiredSatisfied = unsatisfiedGroup === undefined;

  // Calculate prices
  const baseBsCents = Math.round(item.priceUsdCents * currentRateBsPerUsd);
  let additionalUsdCents = 0;
  let additionalBsCents = 0;

  const selectedContornoOption = (() => {
    const radioGroup = item.optionGroups.find(
      (g) => g.type === "radio" && selectedRadio[g.id],
    );
    if (!radioGroup) return null;
    const opt = radioGroup.options.find(
      (o) => o.id === selectedRadio[radioGroup.id],
    );
    return opt ?? null;
  })();

  const selectedAdicionales: Array<{
    id: string;
    name: string;
    priceUsdCents: number;
    priceBsCents: number;
  }> = [];

  for (const group of item.optionGroups) {
    if (group.type === "checkbox") {
      for (const optId of selectedCheckbox[group.id] ?? []) {
        const opt = group.options.find((o) => o.id === optId);
        if (opt) {
          additionalUsdCents += opt.priceUsdCents;
          additionalBsCents += Math.round(
            opt.priceUsdCents * currentRateBsPerUsd,
          );
          selectedAdicionales.push({
            id: opt.id,
            name: opt.name,
            priceUsdCents: opt.priceUsdCents,
            priceBsCents: Math.round(opt.priceUsdCents * currentRateBsPerUsd),
          });
        }
      }
    }
  }

  const totalUsdCents =
    (item.priceUsdCents + additionalUsdCents) * quantity;
  const totalBsCents = (baseBsCents + additionalBsCents) * quantity;

  // Summary text
  const summaryParts: string[] = [];
  if (selectedContornoOption) summaryParts.push(selectedContornoOption.name);
  selectedAdicionales.forEach((a) => summaryParts.push(a.name));
  const summaryText = summaryParts.join(" + ");

  // Cart emoji fallback
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

  function handleAdd() {
    if (!allRequiredSatisfied) return;

    addItem({
      id: item.id,
      name: item.name,
      baseUsdCents: item.priceUsdCents + additionalUsdCents,
      baseBsCents: baseBsCents + additionalBsCents,
      emoji,
      selectedContorno: selectedContornoOption
        ? { id: selectedContornoOption.id, name: selectedContornoOption.name }
        : null,
      selectedAdicionales,
      categoryAllowAlone: item.categoryAllowAlone,
    });

    // Vibrate and close
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(30);
    }
    handleClose();
  }

  if (!isOpen && !closing) return null;

  // Get item base Bs price
  const itemBaseBsCents = Math.round(
    item.priceUsdCents * currentRateBsPerUsd,
  );

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay */}
      <div
        className={`absolute inset-0 bg-black/50 transition-opacity duration-200 ${
          closing ? "opacity-0" : "opacity-100"
        }`}
        onClick={handleClose}
      />

      {/* Bottom sheet */}
      <div
        ref={dialogRef}
        className={`absolute bottom-0 left-0 right-0 flex max-h-[90vh] flex-col rounded-t-[20px] bg-white shadow-modal transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          closing ? "translate-y-full" : "translate-y-0"
        }`}
      >
        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {/* Image hero */}
          <div className="relative aspect-[16/9] w-full bg-bg-image">
            {item.imageUrl ? (
              <Image
                src={item.imageUrl}
                alt={item.name}
                fill
                className="object-cover"
                sizes="100vw"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-6xl">
                {emoji}
              </div>
            )}
            <button
              onClick={handleClose}
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

          {/* Option groups */}
          {item.optionGroups.map((group) => (
            <div
              key={group.id}
              className="border-b border-border px-4 py-3"
            >
              <div className="mb-2 flex items-center gap-2">
                <h3 className="text-[14px] font-semibold text-text-main">
                  {group.name}
                </h3>
                <span
                  className={`rounded-[4px] px-1.5 py-0.5 text-[10px] font-semibold ${
                    group.required
                      ? "bg-error/10 text-error"
                      : "bg-border text-text-muted"
                  }`}
                >
                  {group.required ? "OBLIGATORIO" : "OPCIONAL"}
                </span>
              </div>

              {group.type === "radio" && (
                <div className="flex flex-col gap-0.5">
                  {group.options
                    .filter((o) => o.isAvailable)
                    .map((option) => (
                      <button
                        key={option.id}
                        onClick={() =>
                          setSelectedRadio((prev) => ({
                            ...prev,
                            [group.id]: option.id,
                          }))
                        }
                        className="flex items-center gap-3 rounded-input px-1 py-2.5 text-left transition-colors active:bg-bg-app"
                      >
                        {/* Radio circle */}
                        <div
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                            selectedRadio[group.id] === option.id
                              ? "border-primary bg-primary"
                              : "border-border"
                          }`}
                        >
                          {selectedRadio[group.id] === option.id && (
                            <div className="h-2 w-2 rounded-full bg-white" />
                          )}
                        </div>
                        <span className="flex-1 text-[14px] text-text-main">
                          {option.name}
                        </span>
                        <span className="text-[12px] text-text-muted">
                          {option.priceUsdCents === 0
                            ? "Incluido"
                            : `+${formatBs(
                                Math.round(
                                  option.priceUsdCents * currentRateBsPerUsd,
                                ),
                              )}`}
                        </span>
                      </button>
                    ))}
                </div>
              )}

              {group.type === "checkbox" && (
                <div className="flex flex-col gap-0.5">
                  {group.options
                    .filter((o) => o.isAvailable)
                    .map((option) => {
                      const isChecked = (
                        selectedCheckbox[group.id] ?? []
                      ).includes(option.id);
                      return (
                        <button
                          key={option.id}
                          onClick={() =>
                            toggleCheckbox(group.id, option.id)
                          }
                          className="flex items-center gap-3 rounded-input px-1 py-2.5 text-left transition-colors active:bg-bg-app"
                        >
                          {/* Checkbox */}
                          <div
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] border-2 transition-colors ${
                              isChecked
                                ? "border-primary bg-primary"
                                : "border-border"
                            }`}
                          >
                            {isChecked && (
                              <Check
                                className="h-3 w-3 text-white"
                                strokeWidth={3}
                              />
                            )}
                          </div>
                          <span className="flex-1 text-[14px] text-text-main">
                            {option.name}
                          </span>
                          <span className="text-[12px] text-text-muted">
                            {option.priceUsdCents === 0
                              ? "Incluido"
                              : `+${formatBs(
                                  Math.round(
                                    option.priceUsdCents *
                                      currentRateBsPerUsd,
                                  ),
                                )}`}
                          </span>
                        </button>
                      );
                    })}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer (fixed, no scroll) */}
        <div className="shrink-0 border-t border-border bg-white px-4 py-3">
          {/* Quantity */}
          <div className="mb-3 flex items-center justify-center gap-4">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-text-main transition-colors active:bg-bg-app"
              aria-label="Reducir cantidad"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-8 text-center text-lg font-bold">
              {quantity}
            </span>
            <button
              onClick={() => setQuantity((q) => q + 1)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white transition-colors active:bg-primary-hover"
              aria-label="Aumentar cantidad"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {/* Add button */}
          <button
            onClick={handleAdd}
            disabled={!allRequiredSatisfied}
            className={`w-full rounded-input py-3 text-[15px] font-semibold transition-colors ${
              allRequiredSatisfied
                ? "bg-primary text-white active:bg-primary-hover"
                : "bg-border text-text-muted"
            }`}
          >
            {allRequiredSatisfied
              ? `Agregar · ${formatBs(totalBsCents)}`
              : unsatisfiedGroup?.name ?? "Selecciona una opción"}
          </button>

          {/* Summary */}
          {summaryText && (
            <p className="mt-1 truncate text-center text-[11px] text-text-muted">
              {summaryText}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
