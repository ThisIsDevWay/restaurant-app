"use client";

import { useState, useEffect, useCallback } from "react";
import type { ContornoSelection, CatalogItem } from "@/app/(admin)/admin/menu-del-dia/DailyMenu.types";

export interface UseItemContornosParams {
  allItems: CatalogItem[];
  setIsDirty?: React.Dispatch<React.SetStateAction<boolean>>;
}

export interface UseItemContornosReturn {
  itemContornoSelections: Record<string, ContornoSelection[]>;
  handleToggleContorno: (itemId: string, contornoId: string, name: string) => void;
  handleUpdateContornoSettings: (itemId: string, contornoId: string, updates: Partial<ContornoSelection>) => void;
  modifiedItemIds: string[];
  clearModifiedItems: () => void;
}

/**
 * Manages per-item contorno selections with manual save and dirty tracking.
 * Changes are kept in local state, mark the form as dirty, and record which items changed.
 */
export function useItemContornos({ allItems, setIsDirty }: UseItemContornosParams): UseItemContornosReturn {
  const [itemContornoSelections, setItemContornoSelections] = useState<Record<string, ContornoSelection[]>>({});
  const [modifiedItemIds, setModifiedItemIds] = useState<Set<string>>(new Set());

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
    const currentSelections = itemContornoSelections[itemId] || [];
    const isAlreadySelected = currentSelections.some(c => c.id === contornoId);

    const newSelections: ContornoSelection[] = isAlreadySelected
      ? currentSelections.filter(c => c.id !== contornoId)
      : [...currentSelections, { id: contornoId, name, removable: false, substituteContornoIds: [] }];

    setItemContornoSelections(prev => ({ ...prev, [itemId]: newSelections }));
    setModifiedItemIds((prev) => {
      const next = new Set(prev);
      next.add(itemId);
      return next;
    });
    setIsDirty?.(true);
  }, [itemContornoSelections, setIsDirty]);

  const handleUpdateContornoSettings = useCallback((itemId: string, contornoId: string, updates: Partial<ContornoSelection>) => {
    const currentSelections = itemContornoSelections[itemId] || [];
    const newSelections = currentSelections.map(c =>
      c.id === contornoId ? { ...c, ...updates } : c
    );

    setItemContornoSelections(prev => ({ ...prev, [itemId]: newSelections }));
    setModifiedItemIds((prev) => {
      const next = new Set(prev);
      next.add(itemId);
      return next;
    });
    setIsDirty?.(true);
  }, [itemContornoSelections, setIsDirty]);

  const clearModifiedItems = useCallback(() => {
    setModifiedItemIds(new Set());
  }, []);

  return {
    itemContornoSelections,
    handleToggleContorno,
    handleUpdateContornoSettings,
    modifiedItemIds: Array.from(modifiedItemIds),
    clearModifiedItems,
  };
}
