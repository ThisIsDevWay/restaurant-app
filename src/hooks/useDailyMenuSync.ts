"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  syncDailyMenuAction,
  syncDailyAdicionalesAction,
  syncDailyBebidasAction,
  syncDailyContornosAction,
  copyDailyMenuFromAction,
} from "@/actions/daily-menu";
import { shiftDate } from "@/app/(admin)/admin/menu-del-dia/DailyMenu.types";

export interface UseDailyMenuSyncParams {
  selectedDate: string;
  setSelectedDate: React.Dispatch<React.SetStateAction<string>>;
  dailyItemIds: string[];
  dailyAdicionalIds: string[];
  dailyBebidaIds: string[];
  dailyContornoIds: string[];
  isDirty: boolean;
  setIsDirty: React.Dispatch<React.SetStateAction<boolean>>;
  copyDate: string;
  setCopyDate: React.Dispatch<React.SetStateAction<string>>;
  copying: boolean;
  setCopying: React.Dispatch<React.SetStateAction<boolean>>;
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
  dailyAdicionalIds,
  dailyBebidaIds,
  dailyContornoIds,
  isDirty,
  setIsDirty,
  copyDate,
  setCopyDate,
  copying,
  setCopying,
}: UseDailyMenuSyncParams): UseDailyMenuSyncReturn {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    if (!isDirty || isPending) return;

    startTransition(async () => {
      try {
        await Promise.all([
          syncDailyMenuAction({ date: selectedDate, menuItemIds: dailyItemIds })
            .then(r => { if (r?.serverError || r?.validationErrors) throw new Error(r.serverError || "Error de validación menú"); return r; }),
          syncDailyAdicionalesAction({ date: selectedDate, adicionalIds: dailyAdicionalIds })
            .then(r => { if (r?.serverError || r?.validationErrors) throw new Error(r.serverError || "Error de validación adicionales"); return r; }),
          syncDailyBebidasAction({ date: selectedDate, bebidaIds: dailyBebidaIds })
            .then(r => { if (r?.serverError || r?.validationErrors) throw new Error(r.serverError || "Error de validación bebidas"); return r; }),
          syncDailyContornosAction({ date: selectedDate, contornoIds: dailyContornoIds })
            .then(r => { if (r?.serverError || r?.validationErrors) throw new Error(r.serverError || "Error de validación contornos"); return r; }),
        ]);
        setIsDirty(false);
      } catch (error) {
        console.error("Error saving daily menu:", error);
      }
    });
  }

  async function handleCopyFrom() {
    if (!copyDate) return;
    setCopying(true);
    const result = await copyDailyMenuFromAction({ fromDate: copyDate, toDate: selectedDate });
    setCopying(false);
    if (result?.serverError || result?.validationErrors) {
      console.error(result.serverError || "Error de validación al copiar");
      return;
    }
    if (result?.data?.success) {
      router.refresh();
      setCopyDate("");
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
    isPending,
    copying,
    handleSave,
    handleCopyFrom,
    handleShiftDay,
  };
}
