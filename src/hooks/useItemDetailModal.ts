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
  dailyContornos?: SimpleItem[];
  maxQuantityPerItem?: number;
  initialData?: any | null; // using any to avoid import cycles if needed, but it's CartItem
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
  dailyContornos = [],
  maxQuantityPerItem = 10,
  initialData,
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
      if (initialData) {
        // Pre-fill from initialData
        const subs: Record<string, string | null> = {};
        initialData.contornoSubstitutions?.forEach((s: any) => {
          subs[s.originalId] = s.substituteId;
        });
        setSubstitutionMap(subs);

        const adQtys: Record<string, number> = {};
        const radio: Record<string, string> = {};
        
        // Split selectedAdicionales into real adicionales and radio options
        // Radio options are ones that belong to an optionGroup
        initialData.selectedAdicionales?.forEach((a: any) => {
          // How do we know if it's a radio? 
          // We can check if it matches any option in the item's groups
          let foundInGroup = false;
          item.optionGroups?.forEach(group => {
            if (group.options.some(opt => opt.id === a.id)) {
              radio[group.id] = a.id;
              foundInGroup = true;
            }
          });
          if (!foundInGroup) {
            adQtys[a.id] = a.quantity || 1;
          }
        });
        setAdicionalQuantities(adQtys);
        setSelectedRadio(radio);

        const bebQtys: Record<string, number> = {};
        initialData.selectedBebidas?.forEach((b: any) => {
          bebQtys[b.id] = b.quantity || 1;
        });
        setBebidaQuantities(bebQtys);

        setQuantity(initialData.quantity || 1);
      } else {
        // Standard reset
        setSubstitutionMap({});
        setExpandedContornos(new Set());
        setSelectedRadio({});
        setAdicionalQuantities({});
        setBebidaQuantities({});
        setQuantity(1);
      }
      setClosing(false);
    }
  }, [isOpen, initialData, item.optionGroups]);

  // `onClose` is read through a ref so a new inline callback identity from the
  // parent (e.g. MenuGrid) doesn't re-run the back-button effect below.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  // Tracks whether we pushed a history entry for the currently-open modal, so
  // closing can route through history.back() (consuming that entry) instead of
  // popping a real page entry.
  const pushedRef = useRef(false);

  const doClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => onCloseRef.current(), 300);
  }, []);

  // UI close (X / backdrop / escape / add-to-cart). When we have a pushed entry,
  // go "back" so both the button and the device back gesture share ONE close
  // path (the popstate handler). Otherwise close directly.
  const handleClose = useCallback(() => {
    if (pushedRef.current && typeof window !== "undefined") {
      window.history.back();
    } else {
      doClose();
    }
  }, [doClose]);

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

  // ─── Hardware / browser back button ────────────────────────────────────────
  // On mobile, pressing the device/browser back button (or the back gesture)
  // while the modal is open would otherwise leave the page. We push a throwaway
  // history entry when the modal opens so "back" simply closes the modal via the
  // popstate handler. UI closes route through history.back() (see handleClose),
  // so there is a single close path and no history.back() in cleanup — avoiding
  // the Strict Mode double-invoke race that flashed the modal open then closed.
  useEffect(() => {
    if (!isOpen || typeof window === "undefined") return;

    window.history.pushState({ gmItemModal: true }, "");
    pushedRef.current = true;

    const handlePop = () => {
      pushedRef.current = false;
      doClose();
    };
    window.addEventListener("popstate", handlePop);

    return () => {
      window.removeEventListener("popstate", handlePop);
      pushedRef.current = false;
    };
  }, [isOpen, doClose]);

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
    if (!contorno) return [];

    // Intersect the allowed substitute contorno IDs with today's active menu contornos (dailyContornos)
    if (contorno.substituteContornoIds && contorno.substituteContornoIds.length > 0) {
      return dailyContornos.filter(
        (c) => contorno.substituteContornoIds.includes(c.id) && c.isAvailable,
      );
    }

    // Fallback: if no specific substitutes are mapped in DB, show all active daily contornos
    // minus the ones already included in the dish to prevent self-substitution
    const includedIds = new Set(availableContornos.map((c) => c.id));
    return dailyContornos.filter((c) => !includedIds.has(c.id) && c.isAvailable);
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

