"use client";

import { useMemo } from "react";
import type { ContornoSubstitution } from "@/store/cartStore";
import type { Contorno, GlobalContorno, SimpleItem, MenuItem } from "@/components/customer/ItemDetailModal.types";

interface CartItemResult {
  id: string;
  name: string;
  priceUsdCents: number;
  priceBsCents: number;
  quantity: number;
}

interface UseCartCalculationParams {
  item: MenuItem;
  availableContornos: Contorno[];
  fixedContornos: Contorno[];
  removableContornos: Contorno[];
  substitutionMap: Record<string, string | null>;
  selectedAdicionalQtys: Record<string, number>;
  selectedBebidaQtys: Record<string, number>;
  selectedRadio: Record<string, string>;
  dailyAdicionales: SimpleItem[];
  dailyBebidas: SimpleItem[];
  allContornos: GlobalContorno[];
  quantity: number;
  /** ⚠️ DEPENDENCIA CRÍTICA — debe estar en todos los useMemo que calculan priceBsCents */
  currentRateBsPerUsd: number;
}

interface UseCartCalculationReturn {
  cartFixedContornos: CartItemResult[];
  cartContornoSubstitutions: ContornoSubstitution[];
  cartAdicionales: CartItemResult[];
  cartBebidas: CartItemResult[];
  totalUsdCents: number;
  totalBsCents: number;
  extrasCount: number;
  allRequiredSatisfied: boolean;
  unsatisfiedGroup: { name: string } | undefined;
  optionGroupsToRender: MenuItem["optionGroups"];
}

export function useCartCalculation({
  item,
  availableContornos,
  fixedContornos,
  removableContornos,
  substitutionMap,
  selectedAdicionalQtys,
  selectedBebidaQtys,
  selectedRadio,
  dailyAdicionales,
  dailyBebidas,
  allContornos,
  quantity,
  currentRateBsPerUsd,
}: UseCartCalculationParams): UseCartCalculationReturn {
  const optionGroupsToRender = item.optionGroups.filter((g) => g.type === "radio");

  const requiredGroups = useMemo(
    () => optionGroupsToRender.filter((g) => g.required),
    [optionGroupsToRender],
  );

  const unsatisfiedGroup = useMemo(
    () => requiredGroups.find((g) => selectedRadio[g.id] === undefined),
    [requiredGroups, selectedRadio],
  );

  const allRequiredSatisfied = unsatisfiedGroup === undefined;

  // ⚠️ currentRateBsPerUsd en TODOS los deps que calculan priceBsCents
  const cartFixedContornos = useMemo<CartItemResult[]>(() => {
    const result = fixedContornos.map((c) => ({
      id: c.id,
      name: c.name,
      priceUsdCents: c.priceUsdCents,
      priceBsCents: Math.round(c.priceUsdCents * currentRateBsPerUsd),
      quantity: 1,
    }));
    removableContornos.forEach((c) => {
      if (!substitutionMap[c.id]) {
        result.push({
          id: c.id,
          name: c.name,
          priceUsdCents: c.priceUsdCents,
          priceBsCents: Math.round(c.priceUsdCents * currentRateBsPerUsd),
          quantity: 1,
        });
      }
    });
    return result;
  }, [fixedContornos, removableContornos, substitutionMap, currentRateBsPerUsd]);

  const cartContornoSubstitutions = useMemo<ContornoSubstitution[]>(() => {
    const subs: ContornoSubstitution[] = [];
    for (const [contornoId, substituteId] of Object.entries(substitutionMap)) {
      if (!substituteId) continue;
      const substitute = allContornos.find((c) => c.id === substituteId);
      const original = availableContornos.find((c) => c.id === contornoId);
      if (substitute && original) {
        subs.push({
          originalId: contornoId,
          originalName: original.name,
          substituteId: substitute.id,
          substituteName: substitute.name,
          priceUsdCents: substitute.priceUsdCents,
          priceBsCents: Math.round(substitute.priceUsdCents * currentRateBsPerUsd),
        });
      }
    }
    return subs;
  }, [substitutionMap, allContornos, availableContornos, currentRateBsPerUsd]);

  const cartAdicionales = useMemo<CartItemResult[]>(() => {
    const result: CartItemResult[] = [];
    for (const [adicionalId, qty] of Object.entries(selectedAdicionalQtys)) {
      if (qty <= 0) continue;
      const adicional = dailyAdicionales.find((a) => a.id === adicionalId)
        || item.adicionales.find((a) => a.id === adicionalId);
      if (adicional && adicional.isAvailable) {
        result.push({
          id: adicional.id,
          name: adicional.name,
          priceUsdCents: adicional.priceUsdCents,
          priceBsCents: Math.round(adicional.priceUsdCents * currentRateBsPerUsd),
          quantity: qty,
        });
      }
    }
    return result;
  }, [selectedAdicionalQtys, dailyAdicionales, item.adicionales, currentRateBsPerUsd]);

  const cartBebidas = useMemo<CartItemResult[]>(() => {
    const result: CartItemResult[] = [];
    for (const [bebidaId, qty] of Object.entries(selectedBebidaQtys)) {
      if (qty <= 0) continue;
      const bebida = dailyBebidas.find((b) => b.id === bebidaId)
        || item.bebidas?.find((b) => b.id === bebidaId);
      if (bebida && bebida.isAvailable) {
        result.push({
          id: bebida.id,
          name: bebida.name,
          priceUsdCents: bebida.priceUsdCents,
          priceBsCents: Math.round(bebida.priceUsdCents * currentRateBsPerUsd),
          quantity: qty,
        });
      }
    }
    return result;
  }, [selectedBebidaQtys, dailyBebidas, item.bebidas, currentRateBsPerUsd]);

  const substitutionUsdCents = useMemo(
    () => cartContornoSubstitutions.reduce((sum, s) => sum + s.priceUsdCents, 0),
    [cartContornoSubstitutions],
  );

  const additionalUsdCents = useMemo(
    () => cartAdicionales.reduce((sum, a) => sum + a.priceUsdCents * a.quantity, 0),
    [cartAdicionales],
  );

  const bebidasUsdCents = useMemo(
    () => cartBebidas.reduce((sum, b) => sum + b.priceUsdCents * b.quantity, 0),
    [cartBebidas],
  );

  const extrasCount = cartAdicionales.reduce((sum, a) => sum + a.quantity, 0) + cartContornoSubstitutions.length + cartBebidas.reduce((sum, b) => sum + b.quantity, 0);

  const totalUsdCents = (item.priceUsdCents + substitutionUsdCents + additionalUsdCents + bebidasUsdCents) * quantity;
  const totalBsCents = Math.round(totalUsdCents * currentRateBsPerUsd);

  return {
    cartFixedContornos,
    cartContornoSubstitutions,
    cartAdicionales,
    cartBebidas,
    totalUsdCents,
    totalBsCents,
    extrasCount,
    allRequiredSatisfied,
    unsatisfiedGroup,
    optionGroupsToRender,
  };
}
