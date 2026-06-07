"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { usePOSCartStore } from "@/store/posCartStore";
import { useActiveOrders } from "@/hooks/useActiveOrders";
import { usePOSRealtime } from "@/hooks/usePOSRealtime";
import { useOrdersRealtime } from "@/hooks/useOrdersRealtime";
import { usePOSMenuSync, type POSMenuPayload } from "@/hooks/usePOSMenuSync";
import { calculateSurcharges, type SurchargeSettings } from "@/lib/utils/calculate-surcharges";
import type { MenuItemWithComponents, SimpleComponent } from "@/types/menu.types";
import type { SimpleItem } from "@/components/customer/ItemDetailModal.types";
import type { WaiterPaymentMethod } from "@/components/waiter/OrderForm";
import type { CheckoutItem } from "@/lib/types/checkout";
import { getCategoryEmoji } from "@/lib/categoryIcons";
import { isRealPhone } from "@/lib/utils";

/** @deprecated Use `getCategoryEmoji` from `@/lib/categoryIcons` directly. Kept as a
 *  re-export so existing POS/waiter/caja imports of `getEmoji` keep working. */
export const getEmoji = getCategoryEmoji;

export function needsModal(
  item: MenuItemWithComponents,
  dailyAdicionales: SimpleItem[],
  dailyBebidas: SimpleItem[],
  settings: Record<string, any> | null,
): boolean {
  if (item.categoryIsSimple) return false;
  const globalAdicionales = settings?.adicionalesEnabled !== false;
  const globalBebidas = settings?.bebidasEnabled !== false;
  return (
    item.contornos.some((c) => c.isAvailable) ||
    item.optionGroups.length > 0 ||
    (globalAdicionales && !item.hideAdicionales && dailyAdicionales.length > 0) ||
    (globalBebidas && !item.hideBebidas && dailyBebidas.length > 0)
  );
}

export interface POSOrderInit {
  items: MenuItemWithComponents[];
  categories: { id: string; name: string }[];
  dailyAdicionales: SimpleItem[];
  dailyBebidas: SimpleItem[];
  allContornos: SimpleComponent[];
  rate: number;
  settings: Record<string, unknown> | null;
  activeOrders?: any[];
}

/**
 * Shared logic for the internal POS clients (WaiterClient / CajaClient): live menu
 * + availability via Supabase Realtime, the non-persisted POS cart, order-form
 * fields, totals, and edit/reset helpers. Each client owns its own submit flow.
 */
export function usePOSOrder({
  items, categories, dailyAdicionales, dailyBebidas,
  allContornos, rate, settings: initialSettings, activeOrders = [],
}: POSOrderInit) {
  const { data: liveOrders = [], refetch: refetchOrders } = useActiveOrders(activeOrders, true);
  useOrdersRealtime(refetchOrders);

  const cartItems = usePOSCartStore((s) => s.items);
  const addItem = usePOSCartStore((s) => s.addItem);
  const removeItem = usePOSCartStore((s) => s.removeItem);
  const updateQuantity = usePOSCartStore((s) => s.updateQuantity);
  const clearCart = usePOSCartStore((s) => s.clearCart);
  const setCartItems = usePOSCartStore((s) => s.setItems);

  // Live menu state, seeded from SSR and kept fresh by realtime.
  const [localItems, setLocalItems] = useState(items);
  const [localCategories, setLocalCategories] = useState(categories);
  const [localAdicionales, setLocalAdicionales] = useState(dailyAdicionales);
  const [localBebidas, setLocalBebidas] = useState(dailyBebidas);
  const [localAllContornos, setLocalAllContornos] = useState(allContornos);
  const [settings, setSettings] = useState(initialSettings);

  useEffect(() => {
    setLocalItems(items);
    setLocalCategories(categories);
    setLocalAdicionales(dailyAdicionales);
    setLocalBebidas(dailyBebidas);
    setLocalAllContornos(allContornos);
    setSettings(initialSettings);
  }, [items, categories, dailyAdicionales, dailyBebidas, allContornos, initialSettings]);

  // ── Availability via Realtime (replaces 45s polling) ──
  const applyAvailability = useCallback((map: Map<string, boolean>) => {
    setLocalItems((prev) => prev.map((item) => ({
      ...item,
      isAvailable: map.has(item.id) ? map.get(item.id)! : item.isAvailable,
      contornos: item.contornos.map((c) => ({
        ...c, isAvailable: map.has(c.id) ? map.get(c.id)! : c.isAvailable,
      })),
    })));
    setLocalAdicionales((prev) => prev.map((a) => ({ ...a, isAvailable: map.has(a.id) ? map.get(a.id)! : a.isAvailable })));
    setLocalBebidas((prev) => prev.map((b) => ({ ...b, isAvailable: map.has(b.id) ? map.get(b.id)! : b.isAvailable })));
    setLocalAllContornos((prev) => prev.map((c) => ({ ...c, isAvailable: map.has(c.id) ? map.get(c.id)! : c.isAvailable })));

    // 86 enforcement: drop any cart item that just sold out.
    cartItems.forEach((cartItem, index) => {
      if (map.get(cartItem.id) === false) {
        removeItem(index);
        toast.error(`"${cartItem.name}" se agotó y fue removido.`, { id: `sold-out-${cartItem.id}` });
      }
    });
  }, [cartItems, removeItem]);

  const applyMenuRefetch = useCallback((menu: POSMenuPayload) => {
    setLocalItems(menu.items as MenuItemWithComponents[]);
    setLocalCategories((menu.categories as { id: string; name: string }[]) ?? []);
    setLocalAdicionales(menu.dailyAdicionales as SimpleItem[]);
    setLocalBebidas(menu.dailyBebidas as SimpleItem[]);
    setLocalAllContornos(menu.allContornos as SimpleComponent[]);
    if (menu.settings) setSettings(menu.settings);
  }, []);

  const refetchFullMenu = useCallback(async () => {
    try {
      const res = await fetch("/api/internal/menu", { cache: "no-store" });
      if (res.ok) applyMenuRefetch(await res.json());
    } catch { /* realtime will retry */ }
  }, [applyMenuRefetch]);

  const { connectionStatus } = usePOSRealtime({
    onAvailabilityChange: applyAvailability,
    onResync: refetchFullMenu,
  });
  usePOSMenuSync(applyMenuRefetch);

  // ── Order form fields ──
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [tableNumber, setTableNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryZone, setDeliveryZone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<WaiterPaymentMethod>("Punto / PdV");
  const [paymentReference, setPaymentReference] = useState("");
  const [orderMode, setOrderMode] = useState<"on_site" | "take_away" | "delivery">("on_site");
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [editingOrderNumber, setEditingOrderNumber] = useState<number | null>(null);
  const [editingOrderPaidAt, setEditingOrderPaidAt] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal state
  const [modalItem, setModalItem] = useState<MenuItemWithComponents | null>(null);
  const [editingCartItemIndex, setEditingCartItemIndex] = useState<number | null>(null);
  const [editingCartItemData, setEditingCartItemData] = useState<any | null>(null);

  const deliveryZones = (settings?.deliveryZones as Array<{ label: string; feeUsdCents: number }> | undefined) ?? [];

  function handleItemPress(item: MenuItemWithComponents) {
    if (needsModal(item, localAdicionales, localBebidas, settings as Record<string, any>)) {
      setModalItem(item);
    } else {
      addItem({
        id: item.id, name: item.name, emoji: getEmoji(item.categoryName),
        imageUrl: item.imageUrl ?? null,
        baseUsdCents: item.priceUsdCents, baseBsCents: Math.round(item.priceUsdCents * rate),
        fixedContornos: item.contornos.filter((c) => c.isAvailable && !c.removable).map((c) => ({
          id: c.id, name: c.name, priceUsdCents: c.priceUsdCents, priceBsCents: Math.round(c.priceUsdCents * rate),
        })),
        contornoSubstitutions: [], selectedAdicionales: [], selectedBebidas: [], removedComponents: [],
        categoryAllowAlone: item.categoryAllowAlone, categoryIsSimple: item.categoryIsSimple,
        categoryName: item.categoryName, includedNote: item.includedNote ?? null, isPrepackaged: item.isPrepackaged,
      });
      toast.success(`${item.name} añadido`);
    }
  }

  function handleEditCartItem(index: number) {
    const item = cartItems[index];
    const menuItem = localItems.find((i) => i.id === item.id);
    if (!menuItem) return;
    setEditingCartItemIndex(index);
    setEditingCartItemData(item);
    setModalItem(menuItem);
  }

  function handleCloseModal() {
    setModalItem(null);
    setEditingCartItemIndex(null);
    setEditingCartItemData(null);
  }

  const resetForm = useCallback(() => {
    clearCart();
    setEditingOrderId(null);
    setEditingOrderNumber(null);
    setEditingOrderPaidAt(null);
    setTableNumber("");
    setCustomerName("");
    setCustomerPhone("");
    setDeliveryZone("");
    setPaymentReference("");
    setPaymentMethod("Punto / PdV");
    setOrderMode("on_site");
  }, [clearCart]);

  const handleEditOrder = useCallback((order: any) => {
    clearCart();
    setTableNumber(order.tableNumber || "");
    setCustomerName(order.customerName || "");
    const phone: string = order.customerPhone ?? "";
    setCustomerPhone(isRealPhone(phone) ? phone : "");
    setDeliveryZone((order.surchargesSnapshot?.deliveryZoneLabel as string) || "");
    const oldToNew: Record<string, string> = {
      cash_usd: "Efectivo $", cash_bs: "Efectivo Bs", pago_movil: "Pago Móvil",
      pos: "Punto / PdV", zelle: "Zelle", transfer: "Transf.", binance: "Binance",
    };
    setPaymentMethod((oldToNew[order.paymentMethod] || order.paymentMethod) as WaiterPaymentMethod);
    setPaymentReference(order.paymentReference || "");
    setEditingOrderPaidAt(order.paidAt ?? null);
    const mode = order.orderMode as "on_site" | "take_away" | "delivery";
    setOrderMode(["on_site", "take_away", "delivery"].includes(mode) ? mode : "on_site");
    setEditingOrderId(order.id);
    setEditingOrderNumber(order.orderNumber);

    const newItems = (order.itemsSnapshot as any[]).map((snapItem) => {
      const menuItem = localItems.find((i) => i.id === snapItem.id);
      return {
        ...snapItem,
        baseUsdCents: snapItem.baseUsdCents ?? snapItem.priceUsdCents ?? 0,
        baseBsCents: snapItem.baseBsCents ?? snapItem.priceBsCents ?? 0,
        itemTotalBsCents: snapItem.itemTotalBsCents ?? 0,
        emoji: menuItem ? getEmoji(menuItem.categoryName) : "🍽️",
        categoryAllowAlone: menuItem?.categoryAllowAlone ?? true,
        categoryIsSimple: menuItem?.categoryIsSimple ?? false,
        categoryName: menuItem?.categoryName ?? "Varios",
        fixedContornos: snapItem.fixedContornos ?? [],
        selectedAdicionales: snapItem.selectedAdicionales ?? [],
        selectedBebidas: snapItem.selectedBebidas ?? [],
        removedComponents: snapItem.removedComponents ?? [],
      };
    });
    setCartItems(newItems);
    toast.info(`Editando Pedido #${order.orderNumber}`);
  }, [clearCart, setCartItems, localItems]);

  // ── Totals ──
  const count = cartItems.reduce((s, i) => s + i.quantity, 0);
  const itemsTotalUsdCents = cartItems.reduce((s, item) => {
    const base = item.baseUsdCents * item.quantity;
    const extras = [
      ...(item.fixedContornos ?? []).map((c) => c.priceUsdCents * item.quantity),
      ...(item.contornoSubstitutions ?? []).map((c) => c.priceUsdCents * item.quantity),
      ...(item.selectedAdicionales ?? []).map((a) => a.priceUsdCents * (a.quantity ?? 1)),
      ...(item.selectedBebidas ?? []).map((b) => b.priceUsdCents * (b.quantity ?? 1)),
      ...(item.removedComponents ?? []).map((r) => -r.priceUsdCents * item.quantity),
    ];
    return s + base + extras.reduce((a, b) => a + b, 0);
  }, 0);

  const selectedZone = deliveryZones.find((z) => z.label === deliveryZone);
  const surchargeSettings: SurchargeSettings = {
    packagingFeePerPlateUsdCents: Number(settings?.packagingFeePerPlateUsdCents) || 0,
    packagingFeePerAdicionalUsdCents: Number(settings?.packagingFeePerAdicionalUsdCents) || 0,
    packagingFeePerBebidaUsdCents: Number(settings?.packagingFeePerBebidaUsdCents) || 0,
    deliveryFeeUsdCents: orderMode === "delivery" ? selectedZone?.feeUsdCents ?? 0 : 0,
  };
  const surcharges = calculateSurcharges(cartItems, orderMode, surchargeSettings);
  const totalUsdCents = itemsTotalUsdCents + surcharges.totalSurchargeUsdCents;

  const applyIgtf = Boolean(settings?.applyIgtf);
  const igtfPercentage = Number(settings?.igtfPercentage) || 3;
  const isForeignCurrency = paymentMethod === "Efectivo $" || paymentMethod === "Zelle" || paymentMethod === "Binance";

  function buildCheckoutItems(): CheckoutItem[] {
    return cartItems.map((item) => {
      const adicionales = item.selectedAdicionales.map((a) => ({
        id: a.id, name: a.name, priceUsdCents: a.priceUsdCents, priceBsCents: a.priceBsCents, quantity: a.quantity ?? 1,
      }));
      (item.contornoSubstitutions ?? []).forEach((s) => {
        adicionales.unshift({
          id: s.substituteId, name: s.substituteName, priceUsdCents: s.priceUsdCents, priceBsCents: s.priceBsCents,
          quantity: 1, substitutesComponentId: s.originalId, substitutesComponentName: s.originalName,
        } as any);
      });
      return {
        id: item.id, quantity: item.quantity, fixedContornos: item.fixedContornos,
        selectedAdicionales: adicionales, selectedBebidas: item.selectedBebidas ?? [],
        removedComponents: item.removedComponents, categoryAllowAlone: item.categoryAllowAlone,
        categoryIsSimple: item.categoryIsSimple, categoryName: item.categoryName,
      };
    });
  }

  function buildBaseFields() {
    return {
      tableNumber: orderMode === "take_away" ? undefined : tableNumber.trim(),
      customerName: customerName.trim() || undefined,
      customerPhone: customerPhone.trim() || undefined,
      deliveryZoneLabel: orderMode === "delivery" ? deliveryZone : undefined,
      paymentMethod,
      orderMode,
      items: buildCheckoutItems() as any,
    };
  }

  return {
    // live menu
    localItems, localCategories, localAdicionales, localBebidas, localAllContornos, settings,
    connectionStatus,
    // orders
    liveOrders, refetchOrders,
    // cart
    cartItems, addItem, removeItem, updateQuantity, clearCart, count,
    // grid/search
    activeCategory, setActiveCategory, search, setSearch,
    // form
    tableNumber, setTableNumber, customerName, setCustomerName, customerPhone, setCustomerPhone,
    deliveryZone, setDeliveryZone, deliveryZones, paymentMethod, setPaymentMethod,
    paymentReference, setPaymentReference, orderMode, setOrderMode,
    editingOrderId, editingOrderNumber, editingOrderPaidAt,
    isSubmitting, setIsSubmitting,
    // modal
    modalItem, editingCartItemIndex, editingCartItemData, handleItemPress, handleEditCartItem, handleCloseModal,
    // actions
    resetForm, handleEditOrder, buildBaseFields,
    // totals
    rate, itemsTotalUsdCents, surcharges, totalUsdCents, applyIgtf, igtfPercentage, isForeignCurrency,
  };
}
