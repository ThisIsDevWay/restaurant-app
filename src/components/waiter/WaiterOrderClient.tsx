"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  UtensilsCrossed, ArrowLeft, Table2, ShoppingCart, ChevronUp, X, Store, Package,
} from "lucide-react";
import { toast } from "sonner";
import { useCartStore } from "@/store/cartStore";
import { ItemDetailModalModern } from "@/components/customer/ItemDetailModalModern";
import { useMenuAvailability } from "@/hooks/useMenuAvailability";
import { createWaiterOrderAction, updateWaiterOrderAction } from "@/actions/waiter-order";
import { formatBs } from "@/lib/money";
import type { MenuItemWithComponents, SimpleComponent } from "@/types/menu.types";
import type { SimpleItem } from "@/components/customer/ItemDetailModal.types";
import type { CheckoutItem } from "@/lib/types/checkout";
import type { RestaurantTable } from "@/db/schema/restaurant-tables";
import type { FloorFixture } from "@/db/schema/floor-fixtures";
import { CELL_SIZE } from "@/lib/salon-constants";
import { calculateSurcharges, type SurchargeSettings } from "@/lib/utils/calculate-surcharges";

// Extracted Components
import { CartLineItem } from "./CartLineItem";
import { OrderForm, SubmitButton, type WaiterPaymentMethod } from "./OrderForm";
import { ActiveOrdersSheet } from "./ActiveOrdersSheet";
import { TableSelectorModal } from "./TableSelectorModal";
import { MenuItemGrid } from "./MenuItemGrid";
import { QuickAvailabilityPanel } from "@/components/admin/availability/QuickAvailabilityPanel";

interface WaiterOrderClientProps {
  items: MenuItemWithComponents[];
  categories: { id: string; name: string }[];
  dailyAdicionales: SimpleItem[];
  dailyBebidas: SimpleItem[];
  allContornos: SimpleComponent[];
  rate: number;
  settings: Record<string, unknown> | null;
  prefilledTable?: string;
  tables?: RestaurantTable[];
  fixtures?: FloorFixture[];
  activeOrders?: any[];
}

const CATEGORY_EMOJI: Record<string, string> = {
  pollos: "🍗", carnes: "🥩", pastas: "🍝", mariscos: "🍤",
  ensaladas: "🥗", bebidas: "🥤", adicionales: "🍟",
  postres: "🍮", sopas: "🍲", sándwiches: "🥪", sandwiches: "🥪",
};

function getEmoji(categoryName: string): string {
  const key = categoryName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return CATEGORY_EMOJI[key] ?? "🍽️";
}

function needsModal(
  item: MenuItemWithComponents,
  dailyAdicionales: SimpleItem[],
  dailyBebidas: SimpleItem[],
  settings: Record<string, any> | null
): boolean {
  if (item.categoryIsSimple) return false;
  const globalAdicionales = settings?.adicionalesEnabled !== false;
  const globalBebidas = settings?.bebidasEnabled !== false;

  return (
    item.contornos.some(c => c.isAvailable) ||
    item.optionGroups.length > 0 ||
    (globalAdicionales && !item.hideAdicionales && dailyAdicionales.length > 0) ||
    (globalBebidas && !item.hideBebidas && dailyBebidas.length > 0)
  );
}

function EmptyCart() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 py-10 text-[var(--color-text-muted)]">
      <UtensilsCrossed size={36} strokeWidth={1.5} />
      <p className="text-sm">El pedido está vacío</p>
      <p className="text-xs">Agrega platos del menú</p>
    </div>
  );
}

export function WaiterOrderClient({
  items, categories, dailyAdicionales, dailyBebidas,
  allContornos, rate, settings, prefilledTable,
  tables = [], fixtures = [], activeOrders = [],
}: WaiterOrderClientProps) {
  const mounted = useCartStore(s => s.mounted);
  const setMounted = useCartStore(s => s.setMounted);
  const cartItems = useCartStore(s => s.items);
  const addItem = useCartStore(s => s.addItem);
  const removeItem = useCartStore(s => s.removeItem);
  const clearCart = useCartStore(s => s.clearCart);
  const setItems = useCartStore(s => s.setItems);

  // Local state for dynamic availability sync
  const [localItems, setLocalItems] = useState(items);
  const [localAdicionales, setLocalAdicionales] = useState(dailyAdicionales);
  const [localBebidas, setLocalBebidas] = useState(dailyBebidas);
  const [localAllContornos, setLocalAllContornos] = useState(allContornos);

  useEffect(() => {
    setLocalItems(items);
    setLocalAdicionales(dailyAdicionales);
    setLocalBebidas(dailyBebidas);
    setLocalAllContornos(allContornos);
  }, [items, dailyAdicionales, dailyBebidas, allContornos]);

  const handleAvailabilityChange = useCallback((map: Map<string, boolean>) => {
    // 1. Update Items & nested contornos
    setLocalItems(prev => prev.map(item => ({
      ...item,
      isAvailable: map.has(item.id) ? map.get(item.id)! : item.isAvailable,
      contornos: item.contornos.map(c => ({
        ...c,
        isAvailable: map.has(c.id) ? map.get(c.id)! : c.isAvailable
      }))
    })));

    // 2. Update Adicionales, Bebidas, and allContornos
    setLocalAdicionales(prev => prev.map(a => ({
      ...a,
      isAvailable: map.has(a.id) ? map.get(a.id)! : a.isAvailable
    })));
    setLocalBebidas(prev => prev.map(b => ({
      ...b,
      isAvailable: map.has(b.id) ? map.get(b.id)! : b.isAvailable
    })));
    setLocalAllContornos(prev => prev.map(c => ({
      ...c,
      isAvailable: map.has(c.id) ? map.get(c.id)! : c.isAvailable
    })));

    // 3. Cart Enforcement: notify and remove if an item in the current order was 86ed
    cartItems.forEach((cartItem, index) => {
      if (map.has(cartItem.id) && map.get(cartItem.id) === false) {
        removeItem(index);
        toast.error(`"${cartItem.name}" se agotó y fue removido.`, {
          id: `sold-out-${cartItem.id}`,
        });
      }
    });
  }, [cartItems, removeItem]);

  useMenuAvailability(handleAvailabilityChange);

  useEffect(() => { setMounted(); }, [setMounted]);

  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [modalItem, setModalItem] = useState<MenuItemWithComponents | null>(null);
  const [tableNumber, setTableNumber] = useState(prefilledTable ?? "");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<WaiterPaymentMethod>("Punto / PdV");
  const [orderMode, setOrderMode] = useState<"on_site" | "take_away" | "delivery">("on_site");
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isTableSelectorOpen, setIsTableSelectorOpen] = useState(false);
  const [isOrdersSheetOpen, setIsOrdersSheetOpen] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [editingOrderNumber, setEditingOrderNumber] = useState<number | null>(null);
  const [layoutZoom, setLayoutZoom] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCartItemIndex, setEditingCartItemIndex] = useState<number | null>(null);
  const [editingCartItemData, setEditingCartItemData] = useState<any | null>(null);

  useEffect(() => {
    if (isTableSelectorOpen && typeof window !== "undefined") {
      const isMobile = window.innerWidth < 768;
      if (isMobile) {
        const gridWidth = (settings?.tablesGridCols as number ?? 20) * CELL_SIZE;
        const availableWidth = window.innerWidth - 64;
        setLayoutZoom(Math.max(0.4, Math.min(1, availableWidth / gridWidth * 1.2)));
      } else {
        setLayoutZoom(1);
      }
    }
  }, [isTableSelectorOpen, settings?.tablesGridCols]);

  const count = cartItems.reduce((s, i) => s + i.quantity, 0);
  
  // Calculate items total
  const itemsTotalUsdCents = cartItems.reduce((s, item) => {
    const base = item.baseUsdCents * item.quantity;
    const extras = [
      ...(item.fixedContornos ?? []).map(c => c.priceUsdCents * item.quantity),
      ...(item.contornoSubstitutions ?? []).map(c => c.priceUsdCents * item.quantity),
      ...(item.selectedAdicionales ?? []).map(a => a.priceUsdCents * (a.quantity ?? 1)),
      ...(item.selectedBebidas ?? []).map(b => b.priceUsdCents * (b.quantity ?? 1)),
      ...(item.removedComponents ?? []).map(r => -r.priceUsdCents * item.quantity),
    ];
    return s + base + extras.reduce((a, b) => a + b, 0);
  }, 0);

  // Calculate surcharges (Packaging / Delivery)
  const surchargeSettings: SurchargeSettings = {
    packagingFeePerPlateUsdCents: Number(settings?.packagingFeePerPlateUsdCents) || 0,
    packagingFeePerAdicionalUsdCents: Number(settings?.packagingFeePerAdicionalUsdCents) || 0,
    packagingFeePerBebidaUsdCents: Number(settings?.packagingFeePerBebidaUsdCents) || 0,
    deliveryFeeUsdCents: Number(settings?.deliveryFeeUsdCents) || 0,
  };

  const surcharges = calculateSurcharges(cartItems, orderMode, surchargeSettings);
  const totalUsdCents = itemsTotalUsdCents + surcharges.totalSurchargeUsdCents;

  const applyIgtf = Boolean(settings?.applyIgtf);
  const igtfPercentage = Number(settings?.igtfPercentage) || 3;
  const isForeignCurrency = paymentMethod === "Efectivo $" || paymentMethod === "Zelle" || paymentMethod === "Binance";
  const igtfUsdCents = (applyIgtf && isForeignCurrency) ? Math.round(totalUsdCents * (igtfPercentage / 100)) : 0;
  const grandTotalUsdCents = totalUsdCents + igtfUsdCents;
  const grandTotalBsCents = Math.round(grandTotalUsdCents * rate);
  const canSubmit = count > 0
    && tableNumber.trim().length > 0
    && (orderMode === "on_site" || customerName.trim().length > 0)
    && (orderMode === "on_site" || customerPhone.trim().length > 0)
    && !isSubmitting;

  function handleItemPress(item: MenuItemWithComponents) {
    if (needsModal(item, localAdicionales, localBebidas, settings)) {
      setModalItem(item);
    } else {
      addItem({
        id: item.id,
        name: item.name,
        emoji: getEmoji(item.categoryName),
        baseUsdCents: item.priceUsdCents,
        baseBsCents: Math.round(item.priceUsdCents * rate),
        fixedContornos: item.contornos
          .filter(c => c.isAvailable && !c.removable)
          .map(c => ({
            id: c.id, name: c.name,
            priceUsdCents: c.priceUsdCents,
            priceBsCents: Math.round(c.priceUsdCents * rate),
          })),
        contornoSubstitutions: [],
        selectedAdicionales: [],
        selectedBebidas: [],
        removedComponents: [],
        categoryAllowAlone: item.categoryAllowAlone,
        categoryIsSimple: item.categoryIsSimple,
        categoryName: item.categoryName,
        includedNote: item.includedNote ?? null,
        isPrepackaged: item.isPrepackaged,
      });
      toast.success(`${item.name} añadido`);
    }
  }

  const handleEditCartItem = (index: number) => {
    const item = cartItems[index];
    const menuItem = localItems.find(i => i.id === item.id);
    if (!menuItem) return;
    setEditingCartItemIndex(index);
    setEditingCartItemData(item);
    setModalItem(menuItem);
  };

  const handleCloseModal = () => {
    setModalItem(null);
    setEditingCartItemIndex(null);
    setEditingCartItemData(null);
  };

  const handleEditOrder = useCallback((order: any) => {
    clearCart();
    setTableNumber(order.tableNumber || "");
    setCustomerName(order.customerName || "");
    // Restore phone — but skip synthetic identifiers
    const phone: string = order.customerPhone ?? "";
    setCustomerPhone(
      phone.startsWith("mesa-") || phone.startsWith("mesero-") ? "" : phone
    );
    setPaymentReference(order.paymentReference || "");
    const oldToNew: Record<string, string> = {
      cash_usd: "Efectivo $", cash_bs: "Efectivo Bs", pago_movil: "Pago Móvil",
      pos: "Punto / PdV", zelle: "Zelle", transfer: "Transf.", binance: "Binance",
    };
    setPaymentMethod((oldToNew[order.paymentMethod] || order.paymentMethod) as WaiterPaymentMethod);
    // Restore exact mode including delivery
    const mode = order.orderMode as "on_site" | "take_away" | "delivery";
    setOrderMode(["on_site", "take_away", "delivery"].includes(mode) ? mode : "on_site");
    setEditingOrderId(order.id);
    setEditingOrderNumber(order.orderNumber);

    // Map SnapshotItem fields (priceUsdCents / priceBsCents) → CartItem fields
    // (baseUsdCents / baseBsCents) so prices render correctly in the form.
    const newItems = (order.itemsSnapshot as any[]).map((snapItem) => {
      const menuItem = localItems.find((i) => i.id === snapItem.id);
      return {
        // Spread snapshot first to keep all extra fields
        ...snapItem,
        // CartItem expects these field names:
        baseUsdCents: snapItem.baseUsdCents ?? snapItem.priceUsdCents ?? 0,
        baseBsCents:  snapItem.baseBsCents  ?? snapItem.priceBsCents  ?? 0,
        // Recalculate per-unit Bs price with current rate in case tasa changed
        // (display only — server will recalculate on submit)
        itemTotalBsCents: snapItem.itemTotalBsCents ?? 0,
        // Enrich with menu metadata
        emoji:              menuItem ? getEmoji(menuItem.categoryName) : "🍽️",
        categoryAllowAlone: menuItem?.categoryAllowAlone ?? true,
        categoryIsSimple:   menuItem?.categoryIsSimple   ?? false,
        categoryName:       menuItem?.categoryName       ?? "Varios",
        // Ensure arrays exist
        fixedContornos:       snapItem.fixedContornos       ?? [],
        selectedAdicionales:  snapItem.selectedAdicionales  ?? [],
        selectedBebidas:      snapItem.selectedBebidas       ?? [],
        removedComponents:    snapItem.removedComponents     ?? [],
      };
    });
    setItems(newItems);
    toast.info(`Editando Pedido #${order.orderNumber}`);
    setIsSheetOpen(true);
  }, [clearCart, setItems, localItems]);


  const handleCancelEdit = () => {
    clearCart();
    setEditingOrderId(null);
    setEditingOrderNumber(null);
    setTableNumber("");
    setCustomerName("");
    setCustomerPhone("");
    setPaymentReference("");
    setOrderMode("on_site");
    toast.success("Edición cancelada");
  };

  async function handleSubmit() {
    if (!canSubmit) return;
    setIsSubmitting(true);
    const checkoutItems: CheckoutItem[] = cartItems.map(item => {
      const adicionales = item.selectedAdicionales.map(a => ({
        id: a.id, name: a.name, priceUsdCents: a.priceUsdCents,
        priceBsCents: a.priceBsCents, quantity: a.quantity ?? 1,
      }));
      (item.contornoSubstitutions ?? []).forEach(s => {
        adicionales.unshift({
          id: s.substituteId, name: s.substituteName, priceUsdCents: s.priceUsdCents,
          priceBsCents: s.priceBsCents, quantity: 1,
          substitutesComponentId: s.originalId, substitutesComponentName: s.originalName,
        } as any);
      });
      return {
        id: item.id, quantity: item.quantity, fixedContornos: item.fixedContornos,
        selectedAdicionales: adicionales, selectedBebidas: item.selectedBebidas ?? [],
        removedComponents: item.removedComponents, categoryAllowAlone: item.categoryAllowAlone,
        categoryIsSimple: item.categoryIsSimple, categoryName: item.categoryName,
      };
    });
    try {
      if (editingOrderId) {
        const result = await updateWaiterOrderAction({
          id: editingOrderId,
          tableNumber: tableNumber.trim(),
          customerName: customerName.trim() || undefined,
          customerPhone: customerPhone.trim() || undefined,
          paymentReference: paymentReference.trim() || undefined,
          paymentMethod,
          orderMode,
          items: checkoutItems as any,
        });
        if (result?.data?.success) {
          toast.success(`Pedido #${editingOrderNumber} actualizado`);
          clearCart();
          setTableNumber("");
          setCustomerName("");
          setCustomerPhone("");
          setPaymentReference("");
          setPaymentMethod("Punto / PdV");
          setOrderMode("on_site");
          setEditingOrderId(null);
          setEditingOrderNumber(null);
          setIsSheetOpen(false);
        } else {
          toast.error(result?.serverError ?? "Error al procesar el pedido");
        }
      } else {
        const result = await createWaiterOrderAction({
          tableNumber: tableNumber.trim(),
          customerName: customerName.trim() || undefined,
          customerPhone: customerPhone.trim() || undefined,
          paymentReference: paymentReference.trim() || undefined,
          paymentMethod,
          orderMode,
          items: checkoutItems as any,
        });
        if (result?.data?.success) {
          toast.success(`Pedido #${result.data.orderNumber} enviado`);
          clearCart();
          setTableNumber("");
          setCustomerName("");
          setCustomerPhone("");
          setPaymentReference("");
          setPaymentMethod("Punto / PdV");
          setOrderMode("on_site");
          setIsSheetOpen(false);
        } else {
          toast.error(result?.serverError ?? "Error al procesar el pedido");
        }
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden" style={{ background: "var(--color-bg-app)", fontFamily: "var(--font-sans)" }}>
      <header className="flex shrink-0 items-center justify-between px-4 py-3 z-30 shadow-md border-b border-white/5" style={{ background: "var(--color-text-main)" }}>
        <div className="flex items-center gap-3">
          <Link href="/admin" className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-white/50 hover:bg-white/10 hover:text-white transition-all active:scale-95 shadow-inner">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary)] shadow-[0_0_15px_rgba(var(--color-primary-rgb),0.3)]">
            <UtensilsCrossed size={18} className="text-white" />
          </div>
          <div className="flex flex-col">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 leading-none mb-0.5">Modulo Pedidos</p>
            <p className="text-sm font-bold text-white leading-tight">
              {editingOrderNumber ? (
                <span className="flex items-center gap-1.5 text-amber-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                  Editando #{editingOrderNumber}
                </span>
              ) : ((settings?.restaurantName as string) ?? "Tomar Pedido")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsOrdersSheetOpen(true)} 
            className="flex h-10 items-center gap-2 rounded-xl bg-white/5 px-4 text-xs font-black uppercase tracking-widest text-white/80 hover:bg-white/10 hover:text-white transition-all border border-white/5 active:scale-95"
          >
            <Table2 size={16} className="text-amber-400" />
            <span className="hidden md:inline">Órdenes</span>
          </button>
          
          <button 
            onClick={() => setIsSheetOpen(true)} 
            className="relative flex h-10 items-center gap-3 rounded-xl bg-[var(--color-primary)] pl-4 pr-3 lg:hidden shadow-[0_4px_15px_rgba(var(--color-primary-rgb),0.4)] active:scale-95 transition-all group overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/10 opacity-0 group-active:opacity-100 transition-opacity" />
            <ShoppingCart size={18} className="text-white" />
            {mounted && count > 0 && (
              <div className="flex items-center gap-2">
                <span className="h-4 w-px bg-white/20" />
                <span className="text-xs font-black text-white">{count} · {formatBs(grandTotalBsCents)}</span>
              </div>
            )}
            <ChevronUp size={16} className="text-white/50" />
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <div className="relative flex flex-1 flex-col min-w-0 overflow-hidden">
          <MenuItemGrid
            items={localItems}
            categories={categories}
            activeCategory={activeCategory}
            setActiveCategory={setActiveCategory}
            search={search}
            setSearch={setSearch}
            rate={rate}
            dailyAdicionales={localAdicionales}
            dailyBebidas={localBebidas}
            settings={settings}
            cartItems={cartItems}
            onItemPress={handleItemPress}
            getEmoji={getEmoji}
            needsModal={needsModal}
          />
          <QuickAvailabilityPanel className="absolute bottom-6 right-6" />
        </div>

        {/* ─── Desktop Sidebar ─────────────────────────────────────────────── */}
        <aside className="hidden lg:flex lg:w-[22rem] xl:w-[26rem] flex-col border-l border-[var(--color-border)] bg-white">
          {/* Fixed header */}
          <div className="flex shrink-0 items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
            <div className="flex items-center gap-2">
              <ShoppingCart size={16} className="text-[var(--color-primary)]" />
              <span className="font-display font-bold text-[var(--color-text-main)]">Pedido</span>
              {mounted && count > 0 && <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-[var(--color-primary)] px-1 text-[0.65rem] font-black text-white">{count}</span>}
            </div>
            {mounted && cartItems.length > 0 && <button onClick={clearCart} className="text-xs font-bold text-slate-400 hover:text-red-500 transition-colors">Limpiar</button>}
          </div>

          {/*
           * KEY FIX: The entire content (items + form) lives in ONE scrollable
           * container. The submit button is anchored as a sticky footer.
           * This ensures cart items are ALWAYS visible regardless of form height.
           */}
          <div className="flex-1 overflow-y-auto">
            {/* Cart items */}
            <div className="px-4 pt-3 pb-2">
              {!mounted || cartItems.length === 0
                ? <EmptyCart />
                : cartItems.map((item, i) => (
                    <CartLineItem
                      key={`desktop-${item.id}-${i}`}
                      item={item}
                      index={i}
                      onEdit={() => handleEditCartItem(i)}
                    />
                  ))
              }
            </div>

            {/* Divider between items and form */}
            {mounted && cartItems.length > 0 && (
              <div className="mx-4 border-t border-dashed border-slate-100 my-2" />
            )}

            {/* Order form (totals + fields) — no inline submit button */}
            <div className="px-4 pb-4 pt-2">
              <OrderForm
                tableNumber={tableNumber} setTableNumber={setTableNumber}
                customerName={customerName} setCustomerName={setCustomerName}
                customerPhone={customerPhone} setCustomerPhone={setCustomerPhone}
                paymentReference={paymentReference} setPaymentReference={setPaymentReference}
                paymentMethod={paymentMethod} setPaymentMethod={setPaymentMethod}
                onSubmit={handleSubmit} canSubmit={canSubmit} isSubmitting={isSubmitting}
                totalUsd={grandTotalUsdCents} totalBs={grandTotalBsCents} rate={rate} igtfUsd={igtfUsdCents}
                packagingUsd={surcharges.packagingUsdCents}
                deliveryUsd={surcharges.deliveryUsdCents}
                orderMode={orderMode} setOrderMode={setOrderMode}
                prefilledTable={prefilledTable} onOpenTableSelector={() => setIsTableSelectorOpen(true)}
                isEditing={!!editingOrderId} onCancelEdit={handleCancelEdit} onEditItem={handleEditCartItem}
                showSubmitButton={false}
              />
            </div>
          </div>

          {/* Sticky submit footer — always visible, never scrolls away */}
          <div className="shrink-0 border-t border-[var(--color-border)] bg-white px-4 py-4 shadow-[0_-4px_16px_rgba(0,0,0,0.04)]">
            <SubmitButton
              canSubmit={canSubmit}
              isSubmitting={isSubmitting}
              isEditing={!!editingOrderId}
              onSubmit={handleSubmit}
              onCancelEdit={handleCancelEdit}
            />
          </div>
        </aside>
      </div>

      {isSheetOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setIsSheetOpen(false)} style={{ backdropFilter: "blur(2px)" }} />
          <div className="fixed bottom-0 left-0 right-0 z-50 flex flex-col rounded-t-3xl bg-white lg:hidden" style={{ maxHeight: "88dvh", boxShadow: "0 -8px 32px rgba(37,26,7,0.18)", animation: "slideUp 0.28s cubic-bezier(0.16, 1, 0.3, 1)" }}>
            <div className="shrink-0 px-4 pb-0 pt-3">
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[var(--color-border)]" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingCart size={16} className="text-[var(--color-primary)]" />
                  <span className="font-display font-bold text-[var(--color-text-main)]">Pedido</span>
                  {count > 0 && <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-[var(--color-primary)] px-1 text-[0.65rem] font-black text-white">{count}</span>}
                </div>
                <div className="flex items-center gap-3">
                  {cartItems.length > 0 && <button onClick={clearCart} className="text-xs text-[var(--color-text-muted)]">Limpiar</button>}
                  <button onClick={() => setIsSheetOpen(false)} className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-surface-section)]"><X size={14} /></button>
                </div>
              </div>
            </div>
            <div className="flex flex-1 flex-col overflow-hidden">
              {/* Mobile: items + form in one scrollable area */}
              <div className="flex-1 overflow-y-auto px-4 pt-3">
                {!mounted || cartItems.length === 0 ? <EmptyCart /> : cartItems.map((item, i) => <CartLineItem key={`mobile-${item.id}-${i}`} item={item} index={i} onEdit={() => handleEditCartItem(i)} />)}
                {mounted && cartItems.length > 0 && <div className="border-t border-dashed border-slate-100 my-3" />}
                <div className="pb-6">
                  <OrderForm
                    tableNumber={tableNumber} setTableNumber={setTableNumber}
                    customerName={customerName} setCustomerName={setCustomerName}
                    customerPhone={customerPhone} setCustomerPhone={setCustomerPhone}
                    paymentReference={paymentReference} setPaymentReference={setPaymentReference}
                    paymentMethod={paymentMethod} setPaymentMethod={setPaymentMethod}
                    onSubmit={handleSubmit} canSubmit={canSubmit} isSubmitting={isSubmitting}
                    totalUsd={grandTotalUsdCents} totalBs={grandTotalBsCents} rate={rate} igtfUsd={igtfUsdCents}
                    packagingUsd={surcharges.packagingUsdCents}
                    deliveryUsd={surcharges.deliveryUsdCents}
                    orderMode={orderMode} setOrderMode={setOrderMode}
                    prefilledTable={prefilledTable} onOpenTableSelector={() => setIsTableSelectorOpen(true)}
                    isEditing={!!editingOrderId} onCancelEdit={handleCancelEdit} onEditItem={handleEditCartItem}
                    showSubmitButton={true}
                  />
                </div>
              </div>
            </div>

          </div>
        </>
      )}

      {modalItem && (
        <ItemDetailModalModern
          item={modalItem} isOpen={!!modalItem} onClose={handleCloseModal}
          currentRateBsPerUsd={rate} allContornos={localAllContornos}
          dailyAdicionales={localAdicionales} dailyBebidas={localBebidas}
          adicionalesEnabled={settings?.adicionalesEnabled !== false}
          bebidasEnabled={settings?.bebidasEnabled !== false}
          maxQuantityPerItem={999}
          initialData={editingCartItemData} editingIndex={editingCartItemIndex}
        />
      )}

      <ActiveOrdersSheet isOpen={isOrdersSheetOpen} onClose={() => setIsOrdersSheetOpen(false)} orders={activeOrders} onSelect={handleEditOrder} />

      <TableSelectorModal
        isOpen={isTableSelectorOpen}
        onClose={() => setIsTableSelectorOpen(false)}
        tables={tables}
        fixtures={fixtures}
        gridCols={settings?.tablesGridCols as number ?? 20}
        gridRows={settings?.tablesGridRows as number ?? 14}
        layoutZoom={layoutZoom}
        onSelectTable={(label) => {
          setTableNumber(label);
          setIsTableSelectorOpen(false);
        }}
      />

      <style>{`
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .scrollbar-none::-webkit-scrollbar { display: none; }
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      `}</style>
    </div>
  );
}