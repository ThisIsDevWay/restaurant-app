"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { saveMenuItemContornosAction } from "@/actions/contornos";
import type { ContornoSelection, CatalogItem } from "@/app/(admin)/admin/menu-del-dia/DailyMenu.types";

export interface UseItemContornosParams {
  allItems: CatalogItem[];
}

export interface UseItemContornosReturn {
  itemContornoSelections: Record<string, ContornoSelection[]>;
  handleToggleContorno: (itemId: string, contornoId: string, name: string) => void;
  handleUpdateContornoSettings: (itemId: string, contornoId: string, updates: Partial<ContornoSelection>) => void;
}

/**
 * Manages per-item contorno selections with auto-save.
 *
 * The original code used setTimeout(0) to defer the save because the new selections
 * were captured in a local variable inside the setState updater — making them
 * unavailable synchronously. This hook eliminates that by computing the new selections
 * independently of setState, then passing the computed value to both setState and the
 * save action via startTransition.
 */
export function useItemContornos({ allItems }: UseItemContornosParams): UseItemContornosReturn {
  const [itemContornoSelections, setItemContornoSelections] = useState<Record<string, ContornoSelection[]>>({});
  const [_isPending, startTransition] = useTransition();

  // Initialize item contorno selections from allItems
  useEffect(() => {
    const initialSelections: Record<string, ContornoSelection[]> = {};
    allItems.forEach((item) => {
      initialSelections[item.id] = (item.contornos || []).map((c) => ({
        id: c.id,
        name: c.name,
        removable: c.removable,
        substituteContornoIds: c.substituteContornoIds || [],
      }));
    });
    setItemContornoSelections(initialSelections);
  }, [allItems]);

  const handleToggleContorno = useCallback((itemId: string, contornoId: string, name: string) => {
    // Compute new selections BEFORE setState — eliminates the need for setTimeout(0)
    const currentSelections = itemContornoSelections[itemId] || [];
    const isAlreadySelected = currentSelections.some(c => c.id === contornoId);

    const newSelections: ContornoSelection[] = isAlreadySelected
      ? currentSelections.filter(c => c.id !== contornoId)
      : [...currentSelections, { id: contornoId, name, removable: true, substituteContornoIds: [] }];

    setItemContornoSelections(prev => ({ ...prev, [itemId]: newSelections }));

    // Save immediately — newSelections is captured in closure, no setTimeout needed
    startTransition(async () => {
      const result = await saveMenuItemContornosAction({
        menuItemId: itemId,
        items: newSelections.map(c => ({
          contornoId: c.id,
          removable: c.removable,
          substituteContornoIds: c.substituteContornoIds,
        })),
      });
      if (result?.serverError || result?.validationErrors) {
        console.error(result.serverError || "Error validando contornos");
      }
    });
  }, [itemContornoSelections, startTransition]);

  const handleUpdateContornoSettings = useCallback((itemId: string, contornoId: string, updates: Partial<ContornoSelection>) => {
    // Compute new selections BEFORE setState
    const currentSelections = itemContornoSelections[itemId] || [];
    const newSelections = currentSelections.map(c =>
      c.id === contornoId ? { ...c, ...updates } : c
    );

    setItemContornoSelections(prev => ({ ...prev, [itemId]: newSelections }));

    // Save immediately — newSelections is captured in closure
    startTransition(async () => {
      const result = await saveMenuItemContornosAction({
        menuItemId: itemId,
        items: newSelections.map(c => ({
          contornoId: c.id,
          removable: c.removable,
          substituteContornoIds: c.substituteContornoIds,
        })),
      });
      if (result?.serverError || result?.validationErrors) {
        console.error(result.serverError || "Error validando contornos");
      }
    });
  }, [itemContornoSelections, startTransition]);

  return {
    itemContornoSelections,
    handleToggleContorno,
    handleUpdateContornoSettings,
  };
}
