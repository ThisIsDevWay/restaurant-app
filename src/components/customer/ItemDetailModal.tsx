import { ItemDetailModalModern } from "./ItemDetailModalModern";
import { ItemDetailModalClassic } from "./ItemDetailModalClassic";
import type { ItemDetailModalProps } from "./ItemDetailModal.types";

interface WrapperProps extends ItemDetailModalProps {
  menuLayout?: "modern" | "classic";
}

/**
 * Single entry point for the item-detail experience. Routes by visual layout
 * (classic / modern). Each shell decides — via `useMenuMode()` — whether to
 * render the ordering body (+ footer) or the read-only showcase body, so the
 * top of the modal keeps changing shape per layout in both menu modes.
 */
export function ItemDetailModal({ menuLayout = "modern", ...props }: WrapperProps) {
  if (menuLayout === "classic") {
    return <ItemDetailModalClassic {...props} />;
  }
  return <ItemDetailModalModern {...props} />;
}
