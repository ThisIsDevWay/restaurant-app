import type { RestaurantTable } from "@/db/schema/restaurant-tables";

/**
 * Salon Shared Types & Domain Interfaces
 */

export type TableShape = "cuadrada" | "rectangular" | "circular";
export type TableRotation = 0 | 45 | 90 | 135 | 180 | 225 | 270 | 315;

/**
 * Interface for table creation/editing in the admin panel
 */
export type EditingTable = Partial<RestaurantTable> & { 
  shape?: TableShape; 
  rotation?: TableRotation; 
};

/**
 * Drag and Drop state for Pointer events system
 */
export interface DragState {
  id: string;
  el: HTMLElement;       // the DOM node being dragged
  startX: number;        // pointer clientX at drag start
  startY: number;        // pointer clientY at drag start
  origCol: number;
  origRow: number;
  currentCol: number;    // live column during drag (no re-render)
  currentRow: number;    // live row during drag
  didMove: boolean;
}
