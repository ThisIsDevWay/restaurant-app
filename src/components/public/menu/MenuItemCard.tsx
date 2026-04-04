import { MenuItemCardModern } from "./MenuItemCardModern";
import { MenuItemCardClassic, type MenuItemCardClassicProps } from "./MenuItemCardClassic";

interface MenuItemCardWrapperProps extends MenuItemCardClassicProps {
  menuLayout?: "modern" | "classic";
}

export function MenuItemCard({ menuLayout = "modern", ...props }: MenuItemCardWrapperProps) {
  if (menuLayout === "classic") {
    return <MenuItemCardClassic {...props} />;
  }

  return <MenuItemCardModern {...props} />;
}
