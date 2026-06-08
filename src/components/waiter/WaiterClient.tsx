"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { UtensilsCrossed, ArrowLeft, Table2, ShoppingCart, ChevronUp, X, Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { formatBs } from "@/lib/money";
import { usePOSOrder, getEmoji, needsModal } from "@/hooks/usePOSOrder";
import { createWaiterOrderAction, updateWaiterOrderAction } from "@/actions/waiter-order";
import { CartLineItem } from "./CartLineItem";
import { OrderForm, SubmitButton } from "./OrderForm";
import { ActiveOrdersSheet } from "./ActiveOrdersSheet";
import { TableSelectorModal } from "./TableSelectorModal";
import { MenuItemGrid } from "./MenuItemGrid";
import { POSItemDetailModal } from "@/components/pos/POSItemDetailModal";
import { QuickAvailabilityPanel } from "@/components/admin/availability/QuickAvailabilityPanel";
import { CELL_SIZE } from "@/lib/salon-constants";
import type { MenuItemWithComponents, SimpleComponent } from "@/types/menu.types";
import type { SimpleItem } from "@/components/customer/ItemDetailModal.types";
import type { RestaurantTable } from "@/db/schema/restaurant-tables";
import type { FloorFixture } from "@/db/schema/floor-fixtures";

interface WaiterClientProps {
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

function EmptyCart() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 py-10 text-[var(--color-text-muted)]">
      <UtensilsCrossed size={36} strokeWidth={1.5} />
      <p className="text-sm">El pedido está vacío</p>
      <p className="text-xs">Agrega platos del menú</p>
    </div>
  );
}

export function WaiterClient({
  items, categories, dailyAdicionales, dailyBebidas, allContornos, rate, settings,
  prefilledTable, tables = [], fixtures = [], activeOrders = [],
}: WaiterClientProps) {
  const pos = usePOSOrder({ items, categories, dailyAdicionales, dailyBebidas, allContornos, rate, settings, activeOrders });

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isOrdersSheetOpen, setIsOrdersSheetOpen] = useState(false);
  const [isTableSelectorOpen, setIsTableSelectorOpen] = useState(false);
  const [layoutZoom, setLayoutZoom] = useState(1);

  useEffect(() => {
    if (prefilledTable) pos.setTableNumber(prefilledTable);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefilledTable]);

  useEffect(() => {
    if (isTableSelectorOpen && typeof window !== "undefined" && window.innerWidth < 768) {
      const gridWidth = ((pos.settings?.tablesGridCols as number) ?? 20) * CELL_SIZE;
      setLayoutZoom(Math.max(0.4, Math.min(1, (window.innerWidth - 64) / gridWidth * 1.2)));
    } else {
      setLayoutZoom(1);
    }
  }, [isTableSelectorOpen, pos.settings?.tablesGridCols]);

  const grandTotalUsdCents = pos.totalUsdCents; // waiter no cobra → sin IGTF
  const grandTotalBsCents = Math.round(grandTotalUsdCents * rate);

  const submitLabel = pos.editingOrderId ? "Actualizar Pedido" : "Enviar a Cocina";
  const canSubmit = pos.count > 0
    && !pos.isSubmitting
    && (pos.orderMode !== "on_site" || pos.tableNumber.trim().length > 0)
    && (pos.orderMode === "on_site" || pos.customerName.trim().length > 0)
    && (pos.orderMode !== "delivery" || (
      pos.tableNumber.trim().length > 0 && pos.customerPhone.trim().length > 0 && pos.deliveryZone.trim().length > 0
    ));

  async function handleSubmit() {
    if (!canSubmit) return;
    pos.setIsSubmitting(true);
    const baseFields = pos.buildBaseFields();
    try {
      if (pos.editingOrderId) {
        const result = await updateWaiterOrderAction({ id: pos.editingOrderId, ...baseFields });
        if (result?.data?.success) {
          toast.success(`Pedido #${pos.editingOrderNumber} actualizado`);
          pos.resetForm(); setIsSheetOpen(false); pos.refetchOrders();
        } else toast.error(result?.serverError ?? "Error al procesar el pedido");
      } else {
        const result = await createWaiterOrderAction({ ...baseFields });
        if (result?.data?.success) {
          toast.success(`Pedido #${result.data.orderNumber} enviado`);
          pos.resetForm(); setIsSheetOpen(false); pos.refetchOrders();
        } else toast.error(result?.serverError ?? "Error al procesar el pedido");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      pos.setIsSubmitting(false);
    }
  }

  function handleCancelEdit() {
    pos.resetForm();
    setIsSheetOpen(false);
    toast.success("Edición cancelada");
  }

  const orderForm = (showSubmitButton: boolean) => (
    <OrderForm
      tableNumber={pos.tableNumber} setTableNumber={pos.setTableNumber}
      customerName={pos.customerName} setCustomerName={pos.setCustomerName}
      customerPhone={pos.customerPhone} setCustomerPhone={pos.setCustomerPhone}
      deliveryZones={pos.deliveryZones} deliveryZone={pos.deliveryZone} setDeliveryZone={pos.setDeliveryZone}
      variant="waiter" paymentReference={pos.paymentReference} setPaymentReference={pos.setPaymentReference}
      paymentMethod={pos.paymentMethod} setPaymentMethod={pos.setPaymentMethod}
      onSubmit={handleSubmit} canSubmit={canSubmit} isSubmitting={pos.isSubmitting}
      totalUsd={grandTotalUsdCents} totalBs={grandTotalBsCents} rate={rate} igtfUsd={0}
      packagingUsd={pos.surcharges.packagingUsdCents} deliveryUsd={pos.surcharges.deliveryUsdCents}
      orderMode={pos.orderMode} setOrderMode={pos.setOrderMode}
      prefilledTable={prefilledTable} onOpenTableSelector={() => setIsTableSelectorOpen(true)}
      isEditing={!!pos.editingOrderId} onCancelEdit={handleCancelEdit} onEditItem={pos.handleEditCartItem}
      showSubmitButton={showSubmitButton} submitLabel={submitLabel}
    />
  );

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden" style={{ background: "var(--color-bg-app)", fontFamily: "var(--font-sans)" }}>
      <header className="flex shrink-0 items-center justify-between px-3 sm:px-4 py-3 z-30 shadow-md border-b border-white/5" style={{ background: "var(--color-text-main)" }}>
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Link href="/admin" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/5 text-white/50 hover:bg-white/10 hover:text-white transition-all active:scale-95">
            <ArrowLeft size={20} />
          </Link>
          <div className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary)]">
            <UtensilsCrossed size={18} className="text-white" />
          </div>
          <div className="flex flex-col min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 leading-none mb-0.5 flex items-center gap-1.5 truncate">
              Modulo Pedidos
              {pos.connectionStatus === "ok"
                ? <Wifi size={11} className="text-emerald-400 shrink-0" />
                : pos.connectionStatus === "error"
                  ? <WifiOff size={11} className="text-red-400 shrink-0" />
                  : <Wifi size={11} className="text-white/20 animate-pulse shrink-0" />}
            </p>
            <p className="text-xs sm:text-sm font-bold text-white leading-tight truncate">
              {pos.editingOrderNumber ? (
                <span className="flex items-center gap-1.5 text-amber-400 truncate">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
                  Editando #{pos.editingOrderNumber}
                </span>
              ) : ((pos.settings?.restaurantName as string) ?? "Tomar Pedido")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            onClick={() => setIsOrdersSheetOpen(true)}
            className="flex h-10 items-center gap-2 rounded-xl bg-white/5 px-2.5 sm:px-4 text-xs font-black uppercase tracking-widest text-white/80 hover:bg-white/10 hover:text-white transition-all border border-white/5 active:scale-95 shrink-0"
          >
            <Table2 size={16} className="text-amber-400 shrink-0" />
            <span className="hidden md:inline">Órdenes Activas</span>
          </button>
          <button
            onClick={() => setIsSheetOpen(true)}
            className="relative flex h-10 items-center gap-1.5 sm:gap-3 rounded-xl bg-[var(--color-primary)] pl-2.5 sm:pl-4 pr-2 sm:pr-3 lg:hidden active:scale-95 transition-all shrink-0"
          >
            <ShoppingCart size={18} className="text-white shrink-0" />
            {pos.count > 0 && (
              <div className="flex items-center gap-1.5 sm:gap-2 text-xs font-black text-white shrink-0">
                <span className="h-4 w-px bg-white/20" />
                <span className="tabular-nums">{pos.count} · {formatBs(grandTotalBsCents)}</span>
              </div>
            )}
            <ChevronUp size={16} className="text-white/50 shrink-0" />
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <div className="relative flex flex-1 flex-col min-w-0 overflow-hidden">
          <MenuItemGrid
            items={pos.localItems} categories={pos.localCategories}
            activeCategory={pos.activeCategory} setActiveCategory={pos.setActiveCategory}
            search={pos.search} setSearch={pos.setSearch} rate={rate}
            dailyAdicionales={pos.localAdicionales} dailyBebidas={pos.localBebidas}
            settings={pos.settings as Record<string, any>} cartItems={pos.cartItems}
            onItemPress={pos.handleItemPress} getEmoji={getEmoji} needsModal={needsModal}
          />
          <QuickAvailabilityPanel className="absolute bottom-6 right-6" />
        </div>

        <aside className="hidden lg:flex lg:w-[22rem] xl:w-[26rem] flex-col border-l border-[var(--color-border)] bg-white">
          <div className="flex shrink-0 items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
            <div className="flex items-center gap-2">
              <ShoppingCart size={16} className="text-[var(--color-primary)]" />
              <span className="font-display font-bold text-[var(--color-text-main)]">Pedido</span>
              {pos.count > 0 && <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-[var(--color-primary)] px-1 text-[0.65rem] font-black text-white">{pos.count}</span>}
            </div>
            {pos.cartItems.length > 0 && <button onClick={pos.clearCart} className="text-xs font-bold text-slate-400 hover:text-red-500 transition-colors">Limpiar</button>}
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className="px-4 pt-3 pb-2">
              {pos.cartItems.length === 0 ? <EmptyCart /> : pos.cartItems.map((item, i) => (
                <CartLineItem key={`d-${item.id}-${i}`} item={item} index={i} onEdit={() => pos.handleEditCartItem(i)} onUpdateQuantity={pos.updateQuantity} onRemove={pos.removeItem} />
              ))}
            </div>
            {pos.cartItems.length > 0 && <div className="mx-4 border-t border-dashed border-slate-100 my-2" />}
            <div className="px-4 pb-4 pt-2">{orderForm(false)}</div>
          </div>
          <div className="shrink-0 border-t border-[var(--color-border)] bg-white px-4 py-4">
            <SubmitButton canSubmit={canSubmit} isSubmitting={pos.isSubmitting} isEditing={!!pos.editingOrderId} onSubmit={handleSubmit} onCancelEdit={handleCancelEdit} submitLabel={submitLabel} />
          </div>
        </aside>
      </div>

      {isSheetOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setIsSheetOpen(false)} style={{ backdropFilter: "blur(2px)" }} />
          <div className="fixed bottom-0 left-0 right-0 z-50 flex flex-col rounded-t-3xl bg-white lg:hidden" style={{ maxHeight: "88dvh", boxShadow: "0 -8px 32px rgba(37,26,7,0.18)" }}>
            <div className="shrink-0 px-4 pb-0 pt-3">
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[var(--color-border)]" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingCart size={16} className="text-[var(--color-primary)]" />
                  <span className="font-display font-bold text-[var(--color-text-main)]">Pedido</span>
                  {pos.count > 0 && <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-[var(--color-primary)] px-1 text-[0.65rem] font-black text-white">{pos.count}</span>}
                </div>
                <div className="flex items-center gap-3">
                  {pos.cartItems.length > 0 && <button onClick={pos.clearCart} className="text-xs text-[var(--color-text-muted)]">Limpiar</button>}
                  <button onClick={() => setIsSheetOpen(false)} className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-surface-section)]"><X size={14} /></button>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-4 pt-3">
              {pos.cartItems.length === 0 ? <EmptyCart /> : pos.cartItems.map((item, i) => <CartLineItem key={`m-${item.id}-${i}`} item={item} index={i} onEdit={() => pos.handleEditCartItem(i)} onUpdateQuantity={pos.updateQuantity} onRemove={pos.removeItem} />)}
              {pos.cartItems.length > 0 && <div className="border-t border-dashed border-slate-100 my-3" />}
              <div className="pb-6">{orderForm(true)}</div>
            </div>
          </div>
        </>
      )}

      {pos.modalItem && (
        <POSItemDetailModal
          item={pos.modalItem} isOpen={!!pos.modalItem} onClose={pos.handleCloseModal} rate={rate}
          allContornos={pos.localAllContornos} dailyAdicionales={pos.localAdicionales} dailyBebidas={pos.localBebidas}
          adicionalesEnabled={pos.settings?.adicionalesEnabled !== false}
          bebidasEnabled={pos.settings?.bebidasEnabled !== false}
          initialData={pos.editingCartItemData} editingIndex={pos.editingCartItemIndex}
        />
      )}

      <ActiveOrdersSheet
        isOpen={isOrdersSheetOpen} onClose={() => setIsOrdersSheetOpen(false)} orders={pos.liveOrders.filter((o: any) => !o.paidAt && !o.checkoutToken)}
        onSelect={(order) => { pos.handleEditOrder(order); setIsOrdersSheetOpen(false); setIsSheetOpen(true); }}
        title="Órdenes Activas" emptyText="No hay órdenes activas"
        isWaiter={true}
      />

      <TableSelectorModal
        isOpen={isTableSelectorOpen} onClose={() => setIsTableSelectorOpen(false)} tables={tables} fixtures={fixtures}
        gridCols={(pos.settings?.tablesGridCols as number) ?? 20} gridRows={(pos.settings?.tablesGridRows as number) ?? 14}
        layoutZoom={layoutZoom} onSelectTable={(label) => { pos.setTableNumber(label); setIsTableSelectorOpen(false); }}
      />
    </div>
  );
}
