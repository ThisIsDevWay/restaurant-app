"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

/**
 * Two distinct experiences share the same menu component tree:
 *  - "order":    the public ordering menu (`/`) — cart, checkout, add buttons.
 *  - "showcase": the read-only digital menu (`/menu-digital`) — informational only.
 *
 * This context replaces the `isReadOnly` prop that used to be drilled four levels
 * deep (MenuClient → MenuHeader/MenuGrid → MenuItemCard → ItemDetailModal). Any
 * component under <MenuModeProvider> reads the mode via `useMenuMode()`.
 */
export type MenuMode = "order" | "showcase";

interface MenuModeValue {
  mode: MenuMode;
  /** Convenience derived flag — `mode === "showcase"`. */
  isReadOnly: boolean;
}

const MenuModeContext = createContext<MenuModeValue>({
  mode: "order",
  isReadOnly: false,
});

export function MenuModeProvider({
  mode,
  children,
}: {
  mode: MenuMode;
  children: ReactNode;
}) {
  const value = useMemo<MenuModeValue>(
    () => ({ mode, isReadOnly: mode === "showcase" }),
    [mode],
  );
  return <MenuModeContext.Provider value={value}>{children}</MenuModeContext.Provider>;
}

export function useMenuMode(): MenuModeValue {
  return useContext(MenuModeContext);
}
