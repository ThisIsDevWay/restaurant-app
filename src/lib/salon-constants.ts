/**
 * Salon Shared Constants
 * Part of Heritage Editorial Design System
 */

export const CELL_SIZE = 44;
export const DRAG_THRESHOLD_PX = 4;

export const SECTIONS = ["Principal", "Terraza", "VIP", "Barra", "Exterior"] as const;
export type Section = (typeof SECTIONS)[number];

/**
 * Heritage Editorial palette per section
 */
export const SECTION_PALETTE: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  Principal: { bg: "#fff2e2", border: "#e9a87c", text: "#5a2a00", dot: "#e9a87c" },
  Terraza: { bg: "#f0fdf4", border: "#6cc08a", text: "#14532d", dot: "#6cc08a" },
  VIP: { bg: "#faf5ff", border: "#c084fc", text: "#581c87", dot: "#c084fc" },
  Barra: { bg: "#fff1f2", border: "#e2231a", text: "#881337", dot: "#e2231a" },
  Exterior: { bg: "#f0f9ff", border: "#38bdf8", text: "#0c4a6e", dot: "#38bdf8" },
};

/**
 * Returns the palette configuration for a given section name.
 * Defaults to "Principal" if not found.
 */
export function paletteFor(section: string | null | undefined) {
  return SECTION_PALETTE[section ?? "Principal"] ?? SECTION_PALETTE.Principal;
}
