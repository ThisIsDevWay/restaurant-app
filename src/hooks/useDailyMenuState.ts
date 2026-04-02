"use client";

import { useState, useEffect } from "react";
import type { CatalogItem, SimpleItem } from "@/app/(admin)/admin/menu-del-dia/DailyMenu.types";

export interface UseDailyMenuStateParams {
  allItems: CatalogItem[];
  initialDailyItemIds: string[];
  initialDailyAdicionalIds: string[];
  initialDailyBebidaIds: string[];
  initialDailyContornoIds: string[];
  initialDate: string;
}

export interface UseDailyMenuStateReturn {
  dailyItemIds: string[];
  setDailyItemIds: React.Dispatch<React.SetStateAction<string[]>>;
  dailyAdicionalIds: string[];
  setDailyAdicionalIds: React.Dispatch<React.SetStateAction<string[]>>;
  dailyBebidaIds: string[];
  setDailyBebidaIds: React.Dispatch<React.SetStateAction<string[]>>;
  dailyContornoIds: string[];
  setDailyContornoIds: React.Dispatch<React.SetStateAction<string[]>>;
  selectedDate: string;
  setSelectedDate: React.Dispatch<React.SetStateAction<string>>;
  search: string;
  setSearch: React.Dispatch<React.SetStateAction<string>>;
  activePill: string;
  setActivePill: React.Dispatch<React.SetStateAction<string>>;
  copyDate: string;
  setCopyDate: React.Dispatch<React.SetStateAction<string>>;
  activeTab: "platos" | "adicionales" | "bebidas" | "contornos";
  setActiveTab: React.Dispatch<React.SetStateAction<"platos" | "adicionales" | "bebidas" | "contornos">>;
  expandedItemId: string | null;
  setExpandedItemId: React.Dispatch<React.SetStateAction<string | null>>;
  isDirty: boolean;
  setIsDirty: React.Dispatch<React.SetStateAction<boolean>>;
  copying: boolean;
  setCopying: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useDailyMenuState({
  allItems,
  initialDailyItemIds,
  initialDailyAdicionalIds,
  initialDailyBebidaIds,
  initialDailyContornoIds,
  initialDate,
}: UseDailyMenuStateParams): UseDailyMenuStateReturn {
  const [dailyItemIds, setDailyItemIds] = useState<string[]>(initialDailyItemIds);
  const [dailyAdicionalIds, setDailyAdicionalIds] = useState<string[]>(initialDailyAdicionalIds);
  const [dailyBebidaIds, setDailyBebidaIds] = useState<string[]>(initialDailyBebidaIds);
  const [dailyContornoIds, setDailyContornoIds] = useState<string[]>(initialDailyContornoIds);
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [search, setSearch] = useState("");
  const [activePill, setActivePill] = useState<string>("Todos");
  const [copyDate, setCopyDate] = useState("");
  const [activeTab, setActiveTab] = useState<"platos" | "adicionales" | "bebidas" | "contornos">("platos");
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [copying, setCopying] = useState(false);

  // Sync local state from props when not dirty (e.g. after date change + router.refresh)
  useEffect(() => {
    if (!isDirty) {
      setDailyItemIds(initialDailyItemIds);
      setDailyAdicionalIds(initialDailyAdicionalIds);
      setDailyBebidaIds(initialDailyBebidaIds);
      setDailyContornoIds(initialDailyContornoIds);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDailyItemIds, initialDailyAdicionalIds, initialDailyBebidaIds, initialDailyContornoIds]);

  return {
    dailyItemIds, setDailyItemIds,
    dailyAdicionalIds, setDailyAdicionalIds,
    dailyBebidaIds, setDailyBebidaIds,
    dailyContornoIds, setDailyContornoIds,
    selectedDate, setSelectedDate,
    search, setSearch,
    activePill, setActivePill,
    copyDate, setCopyDate,
    activeTab, setActiveTab,
    expandedItemId, setExpandedItemId,
    isDirty, setIsDirty,
    copying, setCopying,
  };
}
