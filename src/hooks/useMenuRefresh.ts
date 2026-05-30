"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-client";
import type { MenuItemWithComponents } from "@/types/menu.types";

// ─── Tipos ────────────────────────────────────────────────────────────────────

/** Campos mutables que puede cambiar un admin sin alterar la estructura del menú diario */
export type MenuItemUpdatePayload = Pick<
  MenuItemWithComponents,
  | "id"
  | "name"
  | "description"
  | "priceUsdCents"
  | "isAvailable"
  | "imageUrl"
  | "includedNote"
  | "hideAdicionales"
  | "hideBebidas"
  | "isPrepackaged"
>;

/** Forma raw (snake_case) que llega en el payload de postgres_changes */
interface RawMenuItemRow {
  id: string;
  name: string;
  description: string | null;
  included_note: string | null;
  hide_adicionales: boolean;
  hide_bebidas: boolean;
  price_usd_cents: number;
  is_available: boolean;
  is_prepackaged: boolean;
  image_url: string | null;
  [key: string]: unknown;
}

function mapRawToPartial(raw: RawMenuItemRow): MenuItemUpdatePayload {
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description,
    priceUsdCents: raw.price_usd_cents,
    isAvailable: raw.is_available,
    imageUrl: raw.image_url,
    includedNote: raw.included_note,
    hideAdicionales: raw.hide_adicionales,
    hideBebidas: raw.hide_bebidas,
    isPrepackaged: raw.is_prepackaged,
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Escucha cambios estructurales en el menú público.
 *
 * Estrategia híbrida:
 *  - UPDATE en menu_items (precio/nombre/descripción) → llama `onItemUpdate`
 *    con los campos mutados para actualizar estado local. Cero round-trips a DB.
 *  - Todo lo demás (INSERT/DELETE en daily_*, UPDATE en settings) → router.refresh()
 *    para que el RSC vuelva a ejecutar la query completa.
 *
 * Separación intencional con useMenuAvailability:
 *  - useMenuAvailability maneja UPDATE en daily_* (isAvailable column)
 *  - Este hook maneja cambios estructurales que useMenuAvailability NO cubre
 */
export function useMenuRefresh(
  onItemUpdate?: (updated: MenuItemUpdatePayload) => void,
) {
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;

  // Ref para evitar que el callback cause re-suscripciones
  const onItemUpdateRef = useRef(onItemUpdate);
  onItemUpdateRef.current = onItemUpdate;

  useEffect(() => {
    let debounce: ReturnType<typeof setTimeout> | null = null;
    const scheduleRefresh = () => {
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(() => routerRef.current.refresh(), 600);
    };

    const channel = supabaseBrowser
      .channel("menu-structural-refresh")
      // Plato añadido / removido del menú diario → refresh estructural
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "daily_menu_items" },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "daily_menu_items" },
        scheduleRefresh,
      )
      // Adicionales añadidos / removidos del día
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "daily_adicionales" },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "daily_adicionales" },
        scheduleRefresh,
      )
      // Bebidas añadidas / removidas del día
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "daily_bebidas" },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "daily_bebidas" },
        scheduleRefresh,
      )
      // Contornos añadidos / removidos del día
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "daily_contornos" },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "daily_contornos" },
        scheduleRefresh,
      )
      // Relación plato <-> contorno modificada (acompañamientos de un plato)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "menu_item_contornos" },
        scheduleRefresh,
      )
      // Cambio de precio / nombre / descripción en catálogo
      // → merge en estado local; NO dispara router.refresh()
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "menu_items" },
        (payload) => {
          const cb = onItemUpdateRef.current;
          if (cb && payload.new && typeof payload.new.id === "string") {
            cb(mapRawToPartial(payload.new as RawMenuItemRow));
          } else {
            // Sin callback registrado, fallback al refresh completo
            scheduleRefresh();
          }
        },
      )
      // Toggles de settings admin (adicionalesEnabled, menuLayout…)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "settings" },
        scheduleRefresh,
      )
      .subscribe();

    return () => {
      if (debounce) clearTimeout(debounce);
      supabaseBrowser.removeChannel(channel);
    };
  }, []);
}
