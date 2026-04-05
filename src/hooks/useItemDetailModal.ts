"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type {
  ContornoComponent as Contorno,
  SimpleComponent as GlobalContorno,
  MenuItemWithComponents as MenuItem,
} from "@/types/menu.types";
import type { SimpleItem } from "@/components/customer/ItemDetailModal.types";

export interface UseItemDetailModalParams {
  item: MenuItem;
  isOpen: boolean;
  onClose: () => void;
  allContornos: GlobalContorno[];
  dailyAdicionales: SimpleItem[];
  dailyBebidas: SimpleItem[];
  maxQuantityPerItem?: number;
}

export interface UseItemDetailModalReturn {
  substitutionMap: Record<string, string | null>;
  expandedContornos: Set<string>;
  selectedRadio: Record<string, string>;
  setSelectedRadio: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  adicionalQuantities: Record<string, number>;
  bebidaQuantities: Record<string, number>;
  quantity: number;
  setQuantity: React.Dispatch<React.SetStateAction<number>>;
  closing: boolean;
  dialogRef: React.RefObject<HTMLDivElement | null>;
  handleClose: () => void;
  toggleExpandContorno: (contornoId: string) => void;
  selectSubstitute: (contornoId: string, substituteId: string | null) => void;
  updateAdicionalQty: (adicionalId: string, delta: number) => void;
  updateBebidaQty: (bebidaId: string, delta: number) => void;
  getSubstituteOptions: (contornoId: string) => GlobalContorno[];
  availableContornos: Contorno[];
  fixedContornos: Contorno[];
  removableContornos: Contorno[];
  activeSubstituteIds: Set<string>;
}

export function useItemDetailModal({
  item,
  isOpen,
  onClose,
  allContornos,
  dailyAdicionales,
  dailyBebidas,
  maxQuantityPerItem = 10,
}: UseItemDetailModalParams): UseItemDetailModalReturn {
  const [substitutionMap, setSubstitutionMap] = useState<Record<string, string | null>>({});
  const [expandedContornos, setExpandedContornos] = useState<Set<string>>(new Set());
  const [selectedRadio, setSelectedRadio] = useState<Record<string, string>>({});
  const [adicionalQuantities, setAdicionalQuantities] = useState<Record<string, number>>({});
  const [bebidaQuantities, setBebidaQuantities] = useState<Record<string, number>>({});
  const [quantity, setQuantity] = useState(1);
  const [closing, setClosing] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  const availableContornos = item.contornos.filter((c) => c.isAvailable);
  const fixedContornos = availableContornos.filter((c) => !c.removable);
  const removableContornos = availableContornos.filter((c) => c.removable);

  const activeSubstituteIds = useMemo(() => new Set(
    Object.values(substitutionMap).filter((v): v is string => v !== null && v !== undefined),
  ), [substitutionMap]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSubstitutionMap({});
      setExpandedContornos(new Set());
      setSelectedRadio({});
      setAdicionalQuantities({});
      setBebidaQuantities({});
      setQuantity(1);
      setClosing(false);
    }
  }, [isOpen]);

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(onClose, 300);
  }, [onClose]);

  // Keyboard escape handler
  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, handleClose]);

  // Body overflow lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

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
    setExpandedContornos((prev) => {
      const next = new Set(prev);
      next.delete(contornoId);
      return next;
    });
  }

  const updateAdicionalQty = useCallback((adicionalId: string, delta: number) => {
    if (activeSubstituteIds.has(adicionalId)) return;
    setAdicionalQuantities((prev) => {
      const current = prev[adicionalId] ?? 0;
      const next = Math.max(0, current + delta);
      const clampedNext = Math.min(next, maxQuantityPerItem);

      const newQtys = { ...prev };
      if (clampedNext === 0) {
        delete newQtys[adicionalId];
      } else {
        newQtys[adicionalId] = clampedNext;
      }
      return newQtys;
    });
  }, [maxQuantityPerItem, activeSubstituteIds]);

  const updateBebidaQty = useCallback((bebidaId: string, delta: number) => {
    setBebidaQuantities((prev) => {
      const current = prev[bebidaId] ?? 0;
      const next = Math.max(0, current + delta);
      const clampedNext = Math.min(next, maxQuantityPerItem);

      const newQtys = { ...prev };
      if (clampedNext === 0) {
        delete newQtys[bebidaId];
      } else {
        newQtys[bebidaId] = clampedNext;
      }
      return newQtys;
    });
  }, [maxQuantityPerItem]);

  function getSubstituteOptions(contornoId: string) {
    const contorno = availableContornos.find((c) => c.id === contornoId);
    if (!contorno || contorno.substituteContornoIds.length === 0) {
      return [];
    }
    return allContornos.filter(
      (c) => contorno.substituteContornoIds.includes(c.id) && c.isAvailable,
    );
  }

  return {
    substitutionMap,
    expandedContornos,
    selectedRadio,
    setSelectedRadio,
    adicionalQuantities,
    bebidaQuantities,
    quantity,
    setQuantity,
    closing,
    dialogRef,
    handleClose,
    toggleExpandContorno,
    selectSubstitute,
    updateAdicionalQty,
    updateBebidaQty,
    getSubstituteOptions,
    availableContornos,
    fixedContornos,
    removableContornos,
    activeSubstituteIds,
  };
}

