import { useEffect, useRef, useCallback } from "react";

type AvailabilityMap = Map<string, boolean>;

interface AvailabilityResponse {
  platos: { id: string; isAvailable: boolean }[];
  adicionales: { id: string; isAvailable: boolean }[];
  bebidas: { id: string; isAvailable: boolean }[];
  contornos: { id: string; isAvailable: boolean }[];
}

export function useMenuAvailability(
  onAvailabilityChange: (map: AvailabilityMap) => void,
  intervalMs = 45_000
) {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchAndNotify = useCallback(async () => {
    try {
      const res = await fetch("/api/menu/availability", { cache: "no-store" });
      if (!res.ok) return;
      const data: AvailabilityResponse = await res.json();

      const map: AvailabilityMap = new Map();
      
      const allItems = [
        ...data.platos,
        ...data.adicionales,
        ...data.bebidas,
        ...data.contornos
      ];

      allItems.forEach((item) => {
        map.set(item.id, item.isAvailable);
      });

      onAvailabilityChange(map);
    } catch (error) {
      // silently fail — don't interrupt UX
    }
  }, [onAvailabilityChange]);

  useEffect(() => {
    // Initial fetch
    fetchAndNotify();
    
    // Set up interval
    timerRef.current = setInterval(fetchAndNotify, intervalMs);

    // Refresh when tab becomes visible
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchAndNotify();
      }
    };
    
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [fetchAndNotify, intervalMs]);
}
