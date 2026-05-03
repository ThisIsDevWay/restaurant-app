import { useState, useRef, useCallback, useEffect } from "react";
import { updateTablesZoomAction } from "@/actions/settings";

/**
 * Hook to manage zoom state with debounced persistence to server settings.
 */
export function useZoomPersist(initialZoom: number = 0.9) {
  const [zoom, setZoom] = useState(initialZoom);
  const saveZoomTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const saveZoom = useCallback((newZoom: number) => {
    if (saveZoomTimeoutRef.current) {
      clearTimeout(saveZoomTimeoutRef.current);
    }

    saveZoomTimeoutRef.current = setTimeout(async () => {
      const zoomPct = Math.round(newZoom * 100);
      await updateTablesZoomAction({ zoom: zoomPct });
    }, 1000); // 1 second debounce
  }, []);

  const handleZoomChange = useCallback((newZoom: number) => {
    setZoom(newZoom);
    saveZoom(newZoom);
  }, [saveZoom]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveZoomTimeoutRef.current) {
        clearTimeout(saveZoomTimeoutRef.current);
      }
    };
  }, []);

  return { 
    zoom, 
    setZoom, 
    handleZoomChange 
  };
}
