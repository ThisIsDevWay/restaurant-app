/**
 * Canonical ContornoSelection type — single source of truth.
 * Import from here instead of from DailyMenu.types.ts or MenuItemForm.types.ts.
 */
export interface ContornoSelection {
    id: string;
    name: string;
    removable: boolean;
    substituteContornoIds: string[];
}
