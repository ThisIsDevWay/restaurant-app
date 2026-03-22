"use client";

import { useState, useEffect, useRef } from "react";
import { X, Minus, Plus, Check } from "lucide-react";
import Image from "next/image";
import { formatBs, formatRef } from "@/lib/money";
import { useCartStore, type ContornoSubstitution } from "@/store/cartStore";

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

interface Adicional {
  id: string;
  name: string;
  priceUsdCents: number;
  isAvailable: boolean;
  sortOrder: number;
}

interface Contorno {
  id: string;
  name: string;
  priceUsdCents: number;
  isAvailable: boolean;
  removable: boolean;
  substituteContornoIds: string[];
  sortOrder: number;
}

interface GlobalContorno {
  id: string;
  name: string;
  priceUsdCents: number;
  isAvailable: boolean;
  sortOrder: number;
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
  adicionales: Adicional[];
  contornos: Contorno[];
}

interface ItemDetailModalProps {
  item: MenuItem;
  isOpen: boolean;
  onClose: () => void;
  currentRateBsPerUsd: number;
  allContornos: GlobalContorno[];
}

export function ItemDetailModal({
  item,
  isOpen,
  onClose,
  currentRateBsPerUsd,
  allContornos,
}: ItemDetailModalProps) {
  const addItem = useCartStore((s) => s.addItem);
  // Track substitution per removable contorno: null = keep original, string = substitute ID
  const [substitutionMap, setSubstitutionMap] = useState<Record<string, string | null>>({});
  // Track which removable contornos have the "Cambiar" picker open
  const [expandedContornos, setExpandedContornos] = useState<Set<string>>(new Set());
  const [selectedRadio, setSelectedRadio] = useState<Record<string, string>>({});
  const [selectedAdicionalIds, setSelectedAdicionalIds] = useState<Set<string>>(new Set());
  const [quantity, setQuantity] = useState(1);
  const [closing, setClosing] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  const availableContornos = item.contornos.filter((c) => c.isAvailable);
  const fixedContornos = availableContornos.filter((c) => !c.removable);
  const removableContornos = availableContornos.filter((c) => c.removable);

  // Collect all active substitute IDs for duplicate detection in adicionales
  const activeSubstituteIds = new Set(
    Object.values(substitutionMap).filter((v): v is string => v !== null && v !== undefined),
  );

  useEffect(() => {
    if (isOpen) {
      setSubstitutionMap({});
      setExpandedContornos(new Set());
      setSelectedRadio({});
      setSelectedAdicionalIds(new Set());
      setQuantity(1);
      setClosing(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen]);

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

  function toggleExpandContorno(contornoId: string) {
    setExpandedContornos((prev) => {
      const next = new Set(prev);
      if (next.has(contornoId)) {
        next.delete(contornoId);
      } else {
        next.add(contornoId);
      }
      return next;
    });
  }

  function selectSubstitute(contornoId: string, substituteId: string | null) {
    setSubstitutionMap((prev) => ({ ...prev, [contornoId]: substituteId }));
    // Auto-collapse after selection
    setExpandedContornos((prev) => {
      const next = new Set(prev);
      next.delete(contornoId);
      return next;
    });
  }

  function toggleAdicional(adicionalId: string) {
    // Prevent selecting an adicional that is already an active contorno substitute
    if (activeSubstituteIds.has(adicionalId)) return;
    setSelectedAdicionalIds((prev) => {
      const next = new Set(prev);
      if (next.has(adicionalId)) {
        next.delete(adicionalId);
      } else {
        next.add(adicionalId);
      }
      return next;
    });
  }

  const optionGroupsToRender = item.optionGroups.filter((g) => g.type === "radio");
  const requiredGroups = optionGroupsToRender.filter((g) => g.required);
  const unsatisfiedGroup = requiredGroups.find((g) => selectedRadio[g.id] === undefined);
  const allRequiredSatisfied = unsatisfiedGroup === undefined;

  // Build all fixed contornos (those that were NOT substituted)
  const cartFixedContornos = fixedContornos.map((c) => ({
    id: c.id,
    name: c.name,
    priceUsdCents: c.priceUsdCents,
    priceBsCents: Math.round(c.priceUsdCents * currentRateBsPerUsd),
  }));

  // Add any removable contorno that was NOT substituted to the fixed list for the cart
  removableContornos.forEach((c) => {
    if (!substitutionMap[c.id]) {
      cartFixedContornos.push({
        id: c.id,
        name: c.name,
        priceUsdCents: c.priceUsdCents,
        priceBsCents: Math.round(c.priceUsdCents * currentRateBsPerUsd),
      });
    }
  });

  // Collect ALL substitutions
  const cartContornoSubstitutions: ContornoSubstitution[] = [];
  let substitutionUsdCents = 0;

  for (const [contornoId, substituteId] of Object.entries(substitutionMap)) {
    if (substituteId) {
      const substitute = allContornos.find((c) => c.id === substituteId);
      const original = availableContornos.find((c) => c.id === contornoId);
      if (substitute && original) {
        // Only prefix with "Más " if the substitute is currently present in another slot
        const isAlreadyOnDish = availableContornos.some((c) => {
          if (c.id === contornoId) return false;
          const subValue = substitutionMap[c.id];
          const currentSlotId = subValue === undefined || subValue === null ? c.id : subValue;
          return currentSlotId === substitute.id;
        });
        const cartSubstituteName = isAlreadyOnDish ? `Más ${substitute.name}` : substitute.name;

        substitutionUsdCents += substitute.priceUsdCents;
        cartContornoSubstitutions.push({
          originalId: contornoId,
          originalName: original.name,
          substituteId: substitute.id,
          substituteName: cartSubstituteName,
          priceUsdCents: substitute.priceUsdCents,
          priceBsCents: Math.round(substitute.priceUsdCents * currentRateBsPerUsd),
        });
      }
    }
  }

  // Build cart adicionales (pure extras only, no substitutions)
  const cartAdicionales: Array<{
    id: string;
    name: string;
    priceUsdCents: number;
    priceBsCents: number;
  }> = [];

  let additionalUsdCents = 0;
  for (const adicionalId of selectedAdicionalIds) {
    const adicional = item.adicionales.find((a) => a.id === adicionalId);
    if (adicional && adicional.isAvailable) {
      additionalUsdCents += adicional.priceUsdCents;
      cartAdicionales.push({
        id: adicional.id,
        name: adicional.name,
        priceUsdCents: adicional.priceUsdCents,
        priceBsCents: Math.round(adicional.priceUsdCents * currentRateBsPerUsd),
      });
    }
  }

  const extrasCount = cartAdicionales.length + cartContornoSubstitutions.length;
  const totalUsdCents = (item.priceUsdCents + substitutionUsdCents + additionalUsdCents) * quantity;
  const totalBsCents = Math.round(totalUsdCents * currentRateBsPerUsd);

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
      baseUsdCents: item.priceUsdCents,
      baseBsCents: Math.round(item.priceUsdCents * currentRateBsPerUsd),
      emoji,
      fixedContornos: cartFixedContornos,
      contornoSubstitutions: cartContornoSubstitutions,
      selectedAdicionales: cartAdicionales,
      removedComponents: [],
      categoryAllowAlone: item.categoryAllowAlone,
    });

    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(30);
    }
    handleClose();
  }

  if (!isOpen && !closing) return null;

  const itemBaseBsCents = Math.round(item.priceUsdCents * currentRateBsPerUsd);

  // Get other contornos available for substitution (excluding the one being substituted)
  function getSubstituteOptions(contornoId: string) {
    const contorno = availableContornos.find((c) => c.id === contornoId);
    if (!contorno || contorno.substituteContornoIds.length === 0) {
      // Fallback: show all other contornos from the dish if no substitutes configured
      return availableContornos.filter((c) => c.id !== contornoId);
    }
    // Show configured substitution options from global contornos pool
    return allContornos.filter(
      (c) => contorno.substituteContornoIds.includes(c.id) && c.isAvailable,
    );
  }

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay */}
      <div
        className={`absolute inset-0 bg-black/50 transition-opacity duration-200 ${closing ? "opacity-0" : "opacity-100"
          }`}
        onClick={handleClose}
      />

      {/* Bottom sheet */}
      <div
        ref={dialogRef}
        className={`absolute bottom-0 left-0 right-0 flex max-h-[90vh] flex-col rounded-t-[20px] bg-white shadow-modal transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${closing ? "translate-y-full" : "translate-y-0"
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

          {/* Contornos */}
          {availableContornos.length > 0 && (
            <div className="border-b border-border px-4 py-3">
              <h3 className="mb-2 text-[14px] font-semibold text-text-main">
                Contornos
              </h3>
              <div className="flex flex-col gap-0.5">
                {/* Fixed (non-removable) contornos - show Fijo badge */}
                {fixedContornos.map((contorno) => (
                  <div
                    key={contorno.id}
                    className="flex items-center gap-3 rounded-input px-1 py-2.5"
                  >
                    <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-primary" />
                    <div className="flex-1">
                      <span className="text-[14px] text-text-main">
                        {contorno.name}
                      </span>
                    </div>
                    <span className="rounded-[4px] bg-border/60 px-1.5 py-0.5 text-[10px] font-semibold text-text-muted">
                      Fijo
                    </span>
                  </div>
                ))}

                {/* Removable contornos — inline "Cambiar" selector */}
                {removableContornos.map((contorno) => {
                  const substitution = substitutionMap[contorno.id];
                  const isExpanded = expandedContornos.has(contorno.id);
                  // Resolve the display name: substituted or original
                  const activeSubstitute = substitution
                    ? allContornos.find((c) => c.id === substitution)
                    : null;
                  const isAlreadyOnDish = activeSubstitute && availableContornos.some((c) => {
                    if (c.id === contorno.id) return false;
                    const subValue = substitutionMap[c.id];
                    const currentSlotId = subValue === undefined || subValue === null ? c.id : subValue;
                    return currentSlotId === activeSubstitute.id;
                  });
                  const displayName = activeSubstitute
                    ? (isAlreadyOnDish ? `Más ${activeSubstitute.name}` : activeSubstitute.name)
                    : contorno.name;
                  const isSubstituted = !!activeSubstitute;

                  return (
                    <div key={contorno.id}>
                      <div className="flex w-full items-center gap-3 rounded-input px-1 py-2.5">
                        <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${isSubstituted ? "bg-amber" : "bg-primary"}`} />
                        <div className="flex-1">
                          <span className="text-[14px] text-text-main">
                            {displayName}
                          </span>
                          {isSubstituted && (
                            <p className="text-[11px] text-text-muted/70">
                              en vez de {contorno.name}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => toggleExpandContorno(contorno.id)}
                          className="rounded-[6px] border border-primary/30 px-2 py-0.5 text-[11px] font-semibold text-primary transition-colors active:bg-primary/10"
                        >
                          {isExpanded ? "Cerrar" : "Cambiar"}
                        </button>
                      </div>

                      {/* Expanded inline picker */}
                      {isExpanded && (
                        <div className="ml-6 mt-1 space-y-0.5 rounded-xl border border-border/50 bg-bg-app/50 p-2 animate-in">
                          {/* Original option */}
                          <button
                            onClick={() => selectSubstitute(contorno.id, null)}
                            className="flex w-full items-center gap-3 rounded-input px-2 py-2 text-left active:bg-white"
                          >
                            <div
                              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${!substitution
                                ? "border-primary bg-primary"
                                : "border-border"
                                }`}
                            >
                              {!substitution && (
                                <div className="h-1.5 w-1.5 rounded-full bg-white" />
                              )}
                            </div>
                            <span className="flex-1 text-[13px] text-text-main font-medium">
                              {contorno.name}
                            </span>
                            <span className="text-[11px] text-text-muted">
                              Original
                            </span>
                          </button>
                          {/* Substitute options */}
                          {getSubstituteOptions(contorno.id).map((sub) => {
                            const isAlreadyOnDish = availableContornos.some((c) => {
                              if (c.id === contorno.id) return false;
                              const subValue = substitutionMap[c.id];
                              const currentSlotId = subValue === undefined || subValue === null ? c.id : subValue;
                              return currentSlotId === sub.id;
                            });
                            return (
                              <button
                                key={sub.id}
                                onClick={() => selectSubstitute(contorno.id, sub.id)}
                                className="flex w-full items-center gap-3 rounded-input px-2 py-2 text-left active:bg-white"
                              >
                                <div
                                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${substitution === sub.id
                                    ? "border-primary bg-primary"
                                    : "border-border"
                                    }`}
                                >
                                  {substitution === sub.id && (
                                    <div className="h-1.5 w-1.5 rounded-full bg-white" />
                                  )}
                                </div>
                                <span className="flex-1 text-[13px] text-text-main">
                                  {isAlreadyOnDish ? `Más ${sub.name}` : sub.name}
                                </span>
                                <span className="text-[12px] text-text-muted">
                                  {sub.priceUsdCents === 0
                                    ? "Incluido"
                                    : `+${formatBs(Math.round(sub.priceUsdCents * currentRateBsPerUsd))}`}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Option groups (radio only) */}
          {optionGroupsToRender.map((group) => (
            <div
              key={group.id}
              className="border-b border-border px-4 py-3"
            >
              <div className="mb-2 flex items-center gap-2">
                <h3 className="text-[14px] font-semibold text-text-main">
                  {group.name}
                </h3>
                <span
                  className={`rounded-[4px] px-1.5 py-0.5 text-[10px] font-semibold ${group.required
                    ? "bg-error/10 text-error"
                    : "bg-border text-text-muted"
                    }`}
                >
                  {group.required ? "OBLIGATORIO" : "OPCIONAL"}
                </span>
              </div>

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
                      <div
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${selectedRadio[group.id] === option.id
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
            </div>
          ))}

          {/* Adicionales */}
          {item.adicionales.filter((a) => a.isAvailable).length > 0 && (
            <div className="border-b border-border px-4 py-3">
              <h3 className="mb-2 text-[14px] font-semibold text-text-main">
                Adicionales
              </h3>
              <div className="flex flex-col gap-0.5">
                {item.adicionales
                  .filter((a) => a.isAvailable)
                  .map((adicional) => {
                    const isChecked = selectedAdicionalIds.has(adicional.id);
                    const isAlreadySubstitute = activeSubstituteIds.has(adicional.id);
                    return (
                      <button
                        key={adicional.id}
                        onClick={() => toggleAdicional(adicional.id)}
                        disabled={isAlreadySubstitute}
                        className={`flex items-center gap-3 rounded-input px-1 py-2.5 text-left transition-colors ${isAlreadySubstitute ? "opacity-50 cursor-not-allowed" : "active:bg-bg-app"
                          }`}
                      >
                        <div
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] border-2 transition-colors ${isChecked
                            ? "border-primary bg-primary"
                            : "border-border bg-white"
                            }`}
                        >
                          {isChecked && (
                            <Check
                              className="h-3 w-3 text-white"
                              strokeWidth={3}
                            />
                          )}
                        </div>
                        <div className="flex-1">
                          <span className="text-[14px] text-text-main">
                            {adicional.name}
                          </span>
                          {isAlreadySubstitute && (
                            <p className="text-[11px] text-primary/70">
                              Ya incluido como contorno
                            </p>
                          )}
                        </div>
                        <div className="text-right text-[12px] text-text-muted leading-tight">
                          {adicional.priceUsdCents === 0 ? (
                            <span>Incluido</span>
                          ) : (
                            <>
                              <div>
                                +{formatBs(Math.round(adicional.priceUsdCents * currentRateBsPerUsd))}
                              </div>
                              <div className="text-[10px] opacity-80">
                                / {formatRef(adicional.priceUsdCents)}
                              </div>
                            </>
                          )}
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>
          )}
        </div>

        {/* Footer (fixed) */}
        <div className="shrink-0 border-t border-border bg-white px-4 py-3">
          {/* Quantity */}
          <div className="mb-3 flex flex-col items-center justify-center gap-1.5">
            <div className="flex items-center justify-center gap-4">
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
            {quantity > 1 && (
              <span className="text-center text-[10px] text-text-muted/90 max-w-[280px] leading-tight animate-in fade-in slide-in-from-bottom-1 duration-200">
                Para que cada plato tenga sus propios contornos o adicionales, agrégalos uno por uno.
              </span>
            )}
          </div>

          {/* Add button */}
          <button
            onClick={handleAdd}
            disabled={!allRequiredSatisfied}
            className={`w-full rounded-input py-3 text-[15px] font-semibold transition-colors ${allRequiredSatisfied
              ? "bg-primary text-white active:bg-primary-hover"
              : "bg-border text-text-muted"
              }`}
          >
            {allRequiredSatisfied
              ? `Agregar${extrasCount > 0 ? ` (${extrasCount} extra${extrasCount > 1 ? "s" : ""})` : ""} · ${formatBs(totalBsCents)}`
              : unsatisfiedGroup?.name ?? "Selecciona una opción"}
          </button>
        </div>
      </div>
    </div>
  );
}
