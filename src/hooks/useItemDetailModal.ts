"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Contorno, GlobalContorno, SimpleItem, MenuItem } from "@/components/customer/ItemDetailModal.types";

export interface UseItemDetailModalParams {
  item: MenuItem;
  isOpen: boolean;
  onClose: () => void;
  allContornos: GlobalContorno[];
  dailyAdicionales: SimpleItem[];
  dailyBebidas: SimpleItem[];
}

export interface UseItemDetailModalReturn {
  substitutionMap: Record<string, string | null>;
  expandedContornos: Set<string>;
  selectedRadio: Record<string, string>;
  setSelectedRadio: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  selectedAdicionalIds: Set<string>;
  selectedBebidaIds: Set<string>;
  quantity: number;
  setQuantity: React.Dispatch<React.SetStateAction<number>>;
  closing: boolean;
  dialogRef: React.RefObject<HTMLDivElement | null>;
  handleClose: () => void;
  toggleExpandContorno: (contornoId: string) => void;
  selectSubstitute: (contornoId: string, substituteId: string | null) => void;
  toggleAdicional: (adicionalId: string) => void;
  toggleBebida: (bebidaId: string) => void;
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
}: UseItemDetailModalParams): UseItemDetailModalReturn {
  const [substitutionMap, setSubstitutionMap] = useState<Record<string, string | null>>({});
  const [expandedContornos, setExpandedContornos] = useState<Set<string>>(new Set());
  const [selectedRadio, setSelectedRadio] = useState<Record<string, string>>({});
  const [selectedAdicionalIds, setSelectedAdicionalIds] = useState<Set<string>>(new Set());
  const [selectedBebidaIds, setSelectedBebidaIds] = useState<Set<string>>(new Set());
  const [quantity, setQuantity] = useState(1);
  const [closing, setClosing] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  const availableContornos = item.contornos.filter((c) => c.isAvailable);
  const fixedContornos = availableContornos.filter((c) => !c.removable);
  const removableContornos = availableContornos.filter((c) => c.removable);

  const activeSubstituteIds = new Set(
    Object.values(substitutionMap).filter((v): v is string => v !== null && v !== undefined),
  );

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSubstitutionMap({});
      setExpandedContornos(new Set());
      setSelectedRadio({});
      setSelectedAdicionalIds(new Set());
      setSelectedBebidaIds(new Set());
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

  function toggleAdicional(adicionalId: string) {
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

  function toggleBebida(bebidaId: string) {
    setSelectedBebidaIds((prev) => {
      const next = new Set(prev);
      if (next.has(bebidaId)) {
        next.delete(bebidaId);
      } else {
        next.add(bebidaId);
      }
      return next;
    });
  }

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
    selectedAdicionalIds,
    selectedBebidaIds,
    quantity,
    setQuantity,
    closing,
    dialogRef,
    handleClose,
    toggleExpandContorno,
    selectSubstitute,
    toggleAdicional,
    toggleBebida,
    getSubstituteOptions,
    availableContornos,
    fixedContornos,
    removableContornos,
    activeSubstituteIds,
  };
}

