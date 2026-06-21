"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  syncDailyMenuAction,
  syncDailyAdicionalesAction,
  syncDailyBebidasAction,
  syncDailyContornosAction,
  copyDailyMenuFromAction,
} from "@/actions/daily-menu";
import { saveMenuItemContornosAction } from "@/actions/contornos";
import { shiftDate, type ContornoSelection } from "@/app/(admin)/admin/menu-del-dia/DailyMenu.types";

export interface UseDailyMenuSyncParams {
  selectedDate: string;
  setSelectedDate: React.Dispatch<React.SetStateAction<string>>;
  dailyItemIds: string[];
  setDailyItemIds: React.Dispatch<React.SetStateAction<string[]>>;
  dailyAdicionalIds: string[];
  setDailyAdicionalIds: React.Dispatch<React.SetStateAction<string[]>>;
  dailyBebidaIds: string[];
  setDailyBebidaIds: React.Dispatch<React.SetStateAction<string[]>>;
  dailyContornoIds: string[];
  setDailyContornoIds: React.Dispatch<React.SetStateAction<string[]>>;
  platoDelDiaItemId: string | null;
  setPlatoDelDiaItemId: React.Dispatch<React.SetStateAction<string | null>>;
  isDirty: boolean;
  setIsDirty: React.Dispatch<React.SetStateAction<boolean>>;
  copyDate: string;
  setCopyDate: React.Dispatch<React.SetStateAction<string>>;
  copying: boolean;
  setCopying: React.Dispatch<React.SetStateAction<boolean>>;
  itemContornoSelections: Record<string, ContornoSelection[]>;
  modifiedItemIds: string[];
  clearModifiedItems: () => void;
}

export interface UseDailyMenuSyncReturn {
  isPending: boolean;
  copying: boolean;
  handleSave: () => void;
  handleCopyFrom: () => Promise<void>;
  handleShiftDay: (days: number) => void;
}

export function useDailyMenuSync({
  selectedDate,
  setSelectedDate,
  dailyItemIds,
  setDailyItemIds,
  dailyAdicionalIds,
  setDailyAdicionalIds,
  dailyBebidaIds,
  setDailyBebidaIds,
  dailyContornoIds,
  setDailyContornoIds,
  platoDelDiaItemId,
  setPlatoDelDiaItemId,
  isDirty,
  setIsDirty,
  copyDate,
  setCopyDate,
  copying,
  setCopying,
  itemContornoSelections,
  modifiedItemIds,
  clearModifiedItems,
}: UseDailyMenuSyncParams): UseDailyMenuSyncReturn {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!isDirty || saving) return;
    setSaving(true);

    try {
      // Generate save promises ONLY for items whose contornos were actually modified
      const contornoPromises = modifiedItemIds.map((itemId) => {
        const selections = itemContornoSelections[itemId] || [];
        return saveMenuItemContornosAction({
          menuItemId: itemId,
          items: selections.map((c) => ({
            contornoId: c.id,
            removable: c.removable,
            substituteContornoIds: c.substituteContornoIds || [],
          })),
        }).then((r) => {
          if (r?.serverError || r?.validationErrors) {
            throw new Error(r.serverError || `Error al guardar contornos del ítem ${itemId}`);
          }
          return r;
        });
      });

      await Promise.all([
        syncDailyMenuAction({ date: selectedDate, menuItemIds: dailyItemIds, platoDelDiaId: platoDelDiaItemId })
          .then(r => { if (r?.serverError || r?.validationErrors) throw new Error(r.serverError || "Error de validación menú"); return r; }),
        syncDailyAdicionalesAction({ date: selectedDate, adicionalIds: dailyAdicionalIds })
          .then(r => { if (r?.serverError || r?.validationErrors) throw new Error(r.serverError || "Error de validación adicionales"); return r; }),
        syncDailyBebidasAction({ date: selectedDate, bebidaIds: dailyBebidaIds })
          .then(r => { if (r?.serverError || r?.validationErrors) throw new Error(r.serverError || "Error de validación bebidas"); return r; }),
        syncDailyContornosAction({ date: selectedDate, contornoIds: dailyContornoIds })
          .then(r => { if (r?.serverError || r?.validationErrors) throw new Error(r.serverError || "Error de validación contornos"); return r; }),
        ...contornoPromises,
      ]);

      clearModifiedItems();
      setIsDirty(false);
      router.refresh();
    } catch (error) {
      console.error("Error saving daily menu:", error);
      alert(error instanceof Error ? error.message : "Error al guardar el menú");
    } finally {
      setSaving(false);
    }
  }

  async function handleCopyFrom() {
    if (!copyDate) return;
    setCopying(true);
    try {
      const result = await copyDailyMenuFromAction({ fromDate: copyDate, toDate: selectedDate });
      if (result?.serverError || result?.validationErrors) {
        console.error(result.serverError || "Error de validación al copiar");
        alert(result.serverError || "Error al copiar el menú");
        return;
      }
      if (result?.data?.success && result.data.data) {
        const d = result.data.data;
        setDailyItemIds(d.menuItemIds);
        setDailyAdicionalIds(d.adicionalIds);
        setDailyBebidaIds(d.bebidaIds);
        setDailyContornoIds(d.contornoIds);
        setPlatoDelDiaItemId(d.platoDelDiaId);
        setIsDirty(false);
        setCopyDate("");
        router.refresh();
      }
    } catch (error) {
      console.error("Error copying daily menu:", error);
    } finally {
      setCopying(false);
    }
  }

  function handleShiftDay(days: number) {
    if (isDirty) {
      handleSave();
    }
    const next = shiftDate(selectedDate, days);
    setSelectedDate(next);
    router.push(`/admin/menu-del-dia?date=${next}`);
  }

  return {
    isPending: saving,
    copying,
    handleSave,
    handleCopyFrom,
    handleShiftDay,
  };
}
