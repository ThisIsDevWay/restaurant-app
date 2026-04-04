import { ItemDetailModalModern } from "./ItemDetailModalModern";
import { ItemDetailModalClassic } from "./ItemDetailModalClassic";
import type { ItemDetailModalProps } from "./ItemDetailModal.types";

interface WrapperProps extends ItemDetailModalProps {
  menuLayout?: "modern" | "classic";
}

export function ItemDetailModal({ menuLayout = "modern", ...props }: WrapperProps) {
  if (menuLayout === "classic") {
    return <ItemDetailModalClassic {...props} />;
  }
  return <ItemDetailModalModern {...props} />;
}
