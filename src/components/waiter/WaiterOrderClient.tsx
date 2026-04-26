"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  UtensilsCrossed, ShoppingCart, Plus, Minus, Trash2,
  X, ChevronUp, Banknote, CreditCard, Send,
  CheckCircle2, Table2, Search, ChevronRight, User,
  Smartphone, Landmark, DollarSign, Coins, ArrowLeft, Map,
  DoorOpen, AppWindow, GlassWater, ChefHat, CircleIcon, ArrowUpDown,
  Toilet, UserRound, Leaf, Type, Users,
} from "lucide-react";
import { toast } from "sonner";
import { useCartStore, type CartItem } from "@/store/cartStore";
import { ItemDetailModalModern } from "@/components/customer/ItemDetailModalModern";
import { createWaiterOrderAction } from "@/actions/waiter-order";
import { formatBs, formatRef } from "@/lib/money";
import type { MenuItemWithComponents, SimpleComponent } from "@/types/menu.types";
import type { SimpleItem } from "@/components/customer/ItemDetailModal.types";
import type { CheckoutItem } from "@/lib/types/checkout";
import type { RestaurantTable } from "@/db/schema/restaurant-tables";
import type { FloorFixture, FixtureType } from "@/db/schema/floor-fixtures";
import { FIXTURE_CATALOG, CATALOG_BY_TYPE } from "@/lib/fixture-catalog";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Category {
  id: string;
  name: string;
  isAvailable: boolean;
}

interface WaiterOrderClientProps {
  items: MenuItemWithComponents[];
  categories: Category[];
  dailyAdicionales: SimpleItem[];
  dailyBebidas: SimpleItem[];
  allContornos: SimpleComponent[];
  rate: number;
  settings: Record<string, unknown> | null;
  prefilledTable?: string;
  tables?: RestaurantTable[];
  fixtures?: FloorFixture[];
}

// ─── Constants ───────────────────────────────────────────────────────────────

const CELL_SIZE = 44;

const CATEGORY_EMOJI: Record<string, string> = {
  pollos: "🍗", carnes: "🥩", pastas: "🍝", mariscos: "🍤",
  ensaladas: "🥗", bebidas: "🥤", adicionales: "🍟",
  postres: "🍮", sopas: "🍲", sándwiches: "🥪", sandwiches: "🥪",
};

function getEmoji(categoryName: string): string {
  const key = categoryName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return CATEGORY_EMOJI[key] ?? "🍽️";
}

function needsModal(item: MenuItemWithComponents, dailyAdicionales: SimpleItem[], dailyBebidas: SimpleItem[]): boolean {
  if (item.categoryIsSimple) return false;
  return (
    item.contornos.some(c => c.isAvailable) ||
    item.optionGroups.length > 0 ||
    (!item.hideAdicionales && dailyAdicionales.length > 0) ||
    (!item.hideBebidas && dailyBebidas.length > 0)
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function PriceTag({ usdCents, rate, size = "sm" }: { usdCents: number; rate: number; size?: "sm" | "md" | "lg" }) {
  const bsCents = Math.round(usdCents * rate);
  const sizeMap = {
    sm: { bs: "text-[0.7rem]", ref: "text-[0.6rem]" },
    md: { bs: "text-sm", ref: "text-xs" },
    lg: { bs: "text-base font-semibold", ref: "text-xs" },
  };
  const s = sizeMap[size];
  return (
    <span className="flex flex-col items-end leading-tight">
      <span className={`font-bold text-[var(--color-primary)] ${s.bs}`}>{formatBs(bsCents)}</span>
      <span className={`text-[var(--color-text-muted)] ${s.ref}`}>{formatRef(usdCents)}</span>
    </span>
  );
}

function FixtureIcon({ type, size, color }: { type: FixtureType; size: number; color: string }) {
  const props = { size, color, strokeWidth: 1.8 };
  switch (type) {
    case "wall_h": case "wall_v": case "divider": return <Minus {...props} />;
    case "door": case "door_double": return <DoorOpen {...props} />;
    case "window":      return <AppWindow {...props} />;
    case "bar_counter": return <GlassWater {...props} />;
    case "kitchen_pass": return <ChefHat {...props} />;
    case "cashier":     return <CreditCard {...props} />;
    case "column":      return <CircleIcon {...props} />;
    case "stairs":      return <ArrowUpDown {...props} />;
    case "bathroom":    return <Toilet {...props} />;
    case "bathroom_m":  return <User {...props} />;
    case "bathroom_f":  return <UserRound {...props} />;
    case "plant":       return <Leaf {...props} />;
    case "text_label":  return <Type {...props} />;
    default:            return null;
  }
}

const SECTION_PALETTE: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  Principal: { bg: "#fff2e2", border: "#e9a87c", text: "#5a2a00", dot: "#e9a87c" },
  Terraza: { bg: "#f0fdf4", border: "#6cc08a", text: "#14532d", dot: "#6cc08a" },
  VIP: { bg: "#faf5ff", border: "#c084fc", text: "#581c87", dot: "#c084fc" },
  Barra: { bg: "#fff1f2", border: "#e2231a", text: "#881337", dot: "#e2231a" },
  Exterior: { bg: "#f0f9ff", border: "#38bdf8", text: "#0c4a6e", dot: "#38bdf8" },
};

function paletteFor(section: string | null | undefined) {
  return SECTION_PALETTE[section ?? "Principal"] ?? SECTION_PALETTE.Principal;
}

function QtyControl({
  value, onDecrement, onIncrement, min = 1,
}: { value: number; onDecrement: () => void; onIncrement: () => void; min?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      <button
        onClick={onDecrement}
        className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--color-border)] bg-white text-[var(--color-primary)] transition-colors active:bg-[var(--color-bg-app)] disabled:opacity-40"
        disabled={value <= min}
        aria-label="Reducir cantidad"
      >
        <Minus size={12} strokeWidth={2.5} />
      </button>
      <span className="min-w-[1.5rem] text-center text-sm font-bold tabular-nums text-[var(--color-text-main)]">
        {value}
      </span>
      <button
        onClick={onIncrement}
        className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-primary)] text-white transition-colors active:bg-[var(--color-primary-hover)]"
        aria-label="Aumentar cantidad"
      >
        <Plus size={12} strokeWidth={2.5} />
      </button>
    </div>
  );
}

function CartLineItem({ item, index }: { item: CartItem; index: number }) {
  const updateQuantity = useCartStore(s => s.updateQuantity);
  const removeItem = useCartStore(s => s.removeItem);
  const contornosLabel = [
    ...item.fixedContornos.map(c => c.name),
    ...item.contornoSubstitutions.map(s => s.substituteName),
  ].join(", ");
  const adicionalesLabel = item.selectedAdicionales
    .map(a => `+${a.name}${a.quantity > 1 ? ` ×${a.quantity}` : ""}`)
    .join(", ");
  const bebidasLabel = (item.selectedBebidas ?? [])
    .map(b => `+${b.name}${b.quantity > 1 ? ` ×${b.quantity}` : ""}`)
    .join(", ");

  return (
    <div className="flex gap-2 border-b border-[var(--color-border-ghost)] py-2.5 last:border-0">
      <span className="mt-0.5 text-lg leading-none">{item.emoji}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[var(--color-text-main)]">{item.name}</p>
        {contornosLabel && (
          <p className="truncate text-[0.67rem] text-[var(--color-text-muted)]">{contornosLabel}</p>
        )}
        {adicionalesLabel && (
          <p className="truncate text-[0.67rem] text-[var(--color-text-muted)]">{adicionalesLabel}</p>
        )}
        {bebidasLabel && (
          <p className="truncate text-[0.67rem] text-[var(--color-text-muted)]">{bebidasLabel}</p>
        )}
      </div>
      <div className="flex flex-col items-end gap-1.5">
        <PriceTag usdCents={item.baseUsdCents * item.quantity} rate={1} size="sm" />
        <div className="flex items-center gap-1">
          <QtyControl
            value={item.quantity}
            onDecrement={() => updateQuantity(index, item.quantity - 1)}
            onIncrement={() => updateQuantity(index, item.quantity + 1)}
          />
          <button
            onClick={() => removeItem(index)}
            className="ml-0.5 flex h-7 w-7 items-center justify-center rounded-full text-[var(--color-error)] transition-colors hover:bg-red-50"
            aria-label="Eliminar"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
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

function OrderForm({
  tableNumber, setTableNumber,
  customerName, setCustomerName,
  paymentMethod, setPaymentMethod,
  onSubmit, canSubmit, isSubmitting,
  totalUsd, totalBs, rate,
  prefilledTable, onOpenTableSelector,
}: {
  tableNumber: string;
  setTableNumber: (v: string) => void;
  customerName: string;
  setCustomerName: (v: string) => void;
  paymentMethod:
    | "cash"
    | "cash_usd"
    | "cash_bs"
    | "pos"
    | "pago_movil"
    | "zelle"
    | "transfer"
    | "binance";
  setPaymentMethod: (v: any) => void;
  onSubmit: () => void;
  canSubmit: boolean;
  isSubmitting: boolean;
  totalUsd: number;
  totalBs: number;
  rate: number;
  prefilledTable?: string;
  onOpenTableSelector: () => void;
}) {
  const methods = [
    { id: "cash_usd", label: "Efectivo $", icon: <DollarSign size={16} /> },
    { id: "cash_bs", label: "Efectivo Bs", icon: <Coins size={16} /> },
    { id: "pago_movil", label: "Pago Móvil", icon: <Smartphone size={16} /> },
    { id: "pos", label: "Punto / PdV", icon: <CreditCard size={16} /> },
    { id: "zelle", label: "Zelle", icon: <Banknote size={16} /> },
    { id: "transfer", label: "Transferencia", icon: <Landmark size={16} /> },
    { id: "binance", label: "Binance", icon: <Coins size={16} /> },
  ];

  return (
    <div className="flex flex-col gap-3 border-t border-[var(--color-border)] pt-3">
      {/* Totals */}
      <div className="rounded-xl bg-[var(--color-text-main)] px-4 py-3">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">Total</span>
        </div>
        <div className="flex items-end justify-between">
          <span className="text-2xl font-black leading-none text-white"
            style={{ fontSize: "clamp(1.25rem, 4vw, 1.75rem)" }}>
            {formatBs(totalBs)}
          </span>
          <span className="text-sm text-[var(--color-text-muted)] opacity-80">{formatRef(totalUsd)}</span>
        </div>
      </div>

      {/* Mesa y Cliente */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-[var(--color-text-main)] opacity-70">
            Mesa {prefilledTable && tableNumber === prefilledTable && (
              <span className="ml-1 text-[10px] text-green-700 bg-green-50 px-1.5 py-0.5 rounded-full lowercase font-normal">
                identificada por QR
              </span>
            )}
          </label>
          <div className="relative">
            <Table2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              type="text"
              value={tableNumber}
              onChange={e => setTableNumber(e.target.value)}
              placeholder="Ej: 5"
              className="w-full rounded-xl border-2 border-[var(--color-border)] bg-white py-2.5 pl-9 pr-10 text-sm text-[var(--color-text-main)] outline-none placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] transition-colors"
            />
            <button
              onClick={onOpenTableSelector}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--color-bg-app)] text-[var(--color-text-main)] hover:bg-[var(--color-primary)] hover:text-white transition-colors"
              title="Seleccionar en plano"
            >
              <Map size={14} />
            </button>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-[var(--color-text-main)] opacity-70">
            Cliente
          </label>
          <div className="relative">
            <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              type="text"
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              placeholder="Opcional"
              className="w-full rounded-xl border-2 border-[var(--color-border)] bg-white py-2.5 pl-9 pr-3 text-sm text-[var(--color-text-main)] outline-none placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Pago */}
      <div>
        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[var(--color-text-main)] opacity-70">
          Método de Pago
        </label>
        <div className="grid grid-cols-2 gap-2">
          {methods.map(method => {
            const active = paymentMethod === method.id;
            return (
              <button
                key={method.id}
                onClick={() => setPaymentMethod(method.id)}
                className={`flex items-center justify-center gap-2 rounded-xl border-2 py-2.5 text-xs font-semibold transition-all ${
                  active
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                    : "border-[var(--color-border)] bg-white text-[var(--color-text-main)] hover:border-[var(--color-primary)]"
                }`}
              >
                {method.icon}
                {method.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Submit */}
      <button
        onClick={onSubmit}
        disabled={!canSubmit}
        className="flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold transition-all disabled:opacity-40"
        style={{
          background: canSubmit ? "var(--color-success)" : "var(--color-text-muted)",
          color: "white",
          fontSize: "clamp(0.875rem, 2vw, 1rem)",
        }}
      >
        {isSubmitting ? (
          <>
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            Enviando...
          </>
        ) : (
          <>
            <Send size={16} />
            Enviar a Cocina
          </>
        )}
      </button>
    </div>
  );
}



// ─── Main Component ──────────────────────────────────────────────────────────

export function WaiterOrderClient({
  items, categories, dailyAdicionales, dailyBebidas,
  allContornos, rate, settings, prefilledTable,
  tables = [], fixtures = [],
}: WaiterOrderClientProps) {
  // ── Cart store ──
  const mounted = useCartStore(s => s.mounted);
  const setMounted = useCartStore(s => s.setMounted);
  const cartItems = useCartStore(s => s.items);
  const addItem = useCartStore(s => s.addItem);
  const updateQuantity = useCartStore(s => s.updateQuantity);
  const removeItem = useCartStore(s => s.removeItem);
  const clearCart = useCartStore(s => s.clearCart);

  useEffect(() => { setMounted(); }, [setMounted]);

  // ── Local state ──
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [modalItem, setModalItem] = useState<MenuItemWithComponents | null>(null);
  const [tableNumber, setTableNumber] = useState(prefilledTable ?? "");
  const [customerName, setCustomerName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<
    | "cash"
    | "cash_usd"
    | "cash_bs"
    | "pos"
    | "pago_movil"
    | "zelle"
    | "transfer"
    | "binance"
  >("cash_usd");
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isTableSelectorOpen, setIsTableSelectorOpen] = useState(false);
  const [layoutZoom, setLayoutZoom] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const categoryTabsRef = useRef<HTMLDivElement>(null);

  // Auto-zoom for mobile
  useEffect(() => {
    if (isTableSelectorOpen && typeof window !== "undefined") {
      const isMobile = window.innerWidth < 768;
      if (isMobile) {
        const gridWidth = (settings?.tablesGridCols as number ?? 20) * CELL_SIZE;
        const availableWidth = window.innerWidth - 64; // Modal padding
        setLayoutZoom(Math.max(0.4, Math.min(1, availableWidth / gridWidth * 1.2)));
      } else {
        setLayoutZoom(1);
      }
    }
  }, [isTableSelectorOpen, settings?.tablesGridCols]);

  // ── Derived ──
  const count = cartItems.reduce((s, i) => s + i.quantity, 0);
  const totalUsdCents = cartItems.reduce((s, item) => {
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
  const totalBsCents = Math.round(totalUsdCents * rate);
  const canSubmit = count > 0 && tableNumber.trim().length > 0 && !isSubmitting;

  const filteredItems = items.filter(item => {
    const matchesCategory = activeCategory === "all" || item.categoryId === activeCategory;
    const matchesSearch = !search || item.name.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // ── Handlers ──
  function handleItemPress(item: MenuItemWithComponents) {
    if (needsModal(item, dailyAdicionales, dailyBebidas)) {
      setModalItem(item);
    } else {
      // Quick add
      const emoji = getEmoji(item.categoryName);
      addItem({
        id: item.id,
        name: item.name,
        emoji,
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
      });
      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(25);
    }
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    setIsSubmitting(true);
    const checkoutItems: CheckoutItem[] = cartItems.map(item => {
      // Build adicionales array, converting contornoSubstitutions back
      // to the format the backend/service expects
      const adicionales = item.selectedAdicionales.map(a => ({
        id: a.id,
        name: a.name,
        priceUsdCents: a.priceUsdCents,
        priceBsCents: a.priceBsCents,
        quantity: a.quantity ?? 1,
      }));

      // If there are contorno substitutions, add them as adicionales with substitutesComponentId
      (item.contornoSubstitutions ?? []).forEach(s => {
        adicionales.unshift({
          id: s.substituteId,
          name: s.substituteName,
          priceUsdCents: s.priceUsdCents,
          priceBsCents: s.priceBsCents,
          quantity: 1,
          substitutesComponentId: s.originalId,
          substitutesComponentName: s.originalName,
        } as any);
      });

      return {
        id: item.id,
        quantity: item.quantity,
        fixedContornos: item.fixedContornos,
        selectedAdicionales: adicionales,
        selectedBebidas: item.selectedBebidas ?? [],
        removedComponents: item.removedComponents,
        categoryAllowAlone: item.categoryAllowAlone,
        categoryIsSimple: item.categoryIsSimple,
        categoryName: item.categoryName,
      };
    });
    try {
      const result = await createWaiterOrderAction({
        tableNumber: tableNumber.trim(),
        customerName: customerName.trim() || undefined,
        paymentMethod,
        items: checkoutItems as any,
      });
      if (result?.data?.success) {
        toast.success(`Pedido #${result.data.orderNumber} enviado a cocina`);
        clearCart();
        setTableNumber("");
        setCustomerName("");
        setPaymentMethod("cash_usd");
        setIsSheetOpen(false);
      } else {
        toast.error(result?.serverError ?? "Error al crear el pedido");
      }
    } catch {
      toast.error("Error de conexión. Intenta de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  }





  return (
    <div
      className="flex h-[100dvh] flex-col overflow-hidden"
      style={{ background: "var(--color-bg-app)", fontFamily: "var(--font-sans)" }}
    >
      {/* ── Header ── */}
      <header
        className="flex shrink-0 items-center justify-between px-4 py-3"
        style={{ background: "var(--color-text-main)" }}
      >
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            title="Regresar al panel"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary)]">
            <UtensilsCrossed size={16} className="text-white" />
          </div>
          <div>
            <p className="text-xs text-[var(--color-text-muted)] leading-none">Mesero</p>
            <p className="text-sm font-bold text-white leading-tight">
              {(settings?.restaurantName as string) ?? "Tomar Pedido"}
            </p>
          </div>
        </div>
        {/* Mobile cart button */}
        <button
          onClick={() => setIsSheetOpen(true)}
          className="relative flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-3 py-2 lg:hidden"
        >
          <ShoppingCart size={16} className="text-white" />
          {mounted && count > 0 && (
            <span className="text-sm font-bold text-white">
              {count} · {formatBs(totalBsCents)}
            </span>
          )}
          {mounted && count === 0 && (
            <span className="text-xs text-white/70">Ver pedido</span>
          )}
          {count > 0 && (
            <ChevronUp size={14} className="text-white/70" />
          )}
        </button>
      </header>

      {/* ── Body ── */}
      <div className="flex min-h-0 flex-1">

        {/* ── Left: Menu ── */}
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden">

          {/* Category tabs + search */}
          <div
            className="shrink-0 border-b border-[var(--color-border)]"
            style={{ background: "var(--color-bg-app)" }}
          >
            {/* Search bar */}
            <div className="px-3 pb-2 pt-3">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                <input
                  type="search"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar plato..."
                  className="w-full rounded-xl border border-[var(--color-border)] bg-white py-2 pl-9 pr-3 text-sm text-[var(--color-text-main)] outline-none placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)]"
                  style={{ fontSize: "clamp(0.8rem, 2vw, 0.875rem)" }}
                />
              </div>
            </div>

            {/* Category tabs */}
            <div
              ref={categoryTabsRef}
              className="flex gap-2 overflow-x-auto px-3 pb-3 scrollbar-none"
              style={{ scrollbarWidth: "none" }}
            >
              <button
                onClick={() => setActiveCategory("all")}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                  activeCategory === "all"
                    ? "bg-[var(--color-primary)] text-white"
                    : "border border-[var(--color-border)] bg-white text-[var(--color-text-main)]"
                }`}
              >
                Todos
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                    activeCategory === cat.id
                      ? "bg-[var(--color-primary)] text-white"
                      : "border border-[var(--color-border)] bg-white text-[var(--color-text-main)]"
                  }`}
                >
                  {getEmoji(cat.name)} {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Items grid */}
          <div
            className="flex-1 overflow-y-auto p-3"
            style={{ gap: "clamp(0.5rem, 2vw, 0.75rem)" }}
          >
            {filteredItems.length === 0 ? (
              <div className="flex flex-col items-center gap-2 pt-16 text-center text-[var(--color-text-muted)]">
                <UtensilsCrossed size={36} strokeWidth={1.5} />
                <p className="text-sm">Sin resultados</p>
              </div>
            ) : (
              <div
                className="grid"
                style={{
                  gridTemplateColumns: "repeat(auto-fill, minmax(clamp(8rem, 28vw, 11rem), 1fr))",
                  gap: "clamp(0.5rem, 2vw, 0.75rem)",
                }}
              >
                {filteredItems.map(item => {
                  const quickAdd = !needsModal(item, dailyAdicionales, dailyBebidas);
                  const inCartQty = cartItems
                    .filter(ci => ci.id === item.id)
                    .reduce((s, ci) => s + ci.quantity, 0);
                  return (
                      <button
                        key={item.id}
                        onClick={() => handleItemPress(item)}
                        className="group relative flex flex-col overflow-hidden rounded-2xl border-2 bg-white text-left transition-all active:scale-[0.97]"
                        style={{
                          borderColor: inCartQty > 0 ? "var(--color-primary)" : "var(--color-border-ghost)",
                          boxShadow: inCartQty > 0
                            ? "0 0 0 3px rgba(187,0,5,0.08)"
                            : "0 1px 4px rgba(37,26,7,0.06)",
                        }}
                      >
                        {/* Image or emoji area */}
                        <div
                          className="flex items-center justify-center"
                          style={{
                            height: "clamp(4rem, 14vw, 6rem)",
                            background: "linear-gradient(135deg, var(--color-bg-app) 0%, var(--color-surface-section) 100%)",
                          }}
                        >
                          {item.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span style={{ fontSize: "clamp(1.5rem, 5vw, 2.5rem)" }}>
                              {getEmoji(item.categoryName)}
                            </span>
                          )}
                        </div>

                      {/* Info */}
                      <div
                        className="flex flex-1 flex-col justify-between"
                        style={{ padding: "clamp(0.4rem, 1.5vw, 0.625rem)" }}
                      >
                        <p
                          className="font-display font-bold leading-snug text-[var(--color-text-main)] line-clamp-2"
                          style={{ fontSize: "clamp(0.7rem, 1.8vw, 0.8rem)" }}
                        >
                          {item.name}
                        </p>
                        <div className="mt-1.5 flex items-end justify-between">
                          <PriceTag usdCents={item.priceUsdCents} rate={rate} size="sm" />
                          <div
                            className="flex h-7 w-7 items-center justify-center rounded-full text-white transition-transform group-active:scale-90"
                            style={{ background: "var(--color-primary)" }}
                          >
                            {quickAdd ? (
                              <Plus size={14} strokeWidth={2.5} />
                            ) : (
                              <ChevronRight size={14} strokeWidth={2.5} />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* In-cart badge */}
                      {inCartQty > 0 && (
                        <div
                          className="absolute right-1.5 top-1.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1 text-[0.6rem] font-black text-white"
                          style={{ background: "var(--color-primary)" }}
                        >
                          {inCartQty}
                        </div>
                      )}

                      {/* Needs modal indicator */}
                      {!quickAdd && (
                        <div
                          className="absolute left-1.5 top-1.5 rounded-full px-1.5 py-0.5 text-[0.55rem] font-bold uppercase tracking-wide text-white"
                          style={{ background: "rgba(37,26,7,0.55)" }}
                        >
                          personalizar
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </main>

        {/* ── Right: Order panel (desktop/tablet only) ── */}
        <aside
          className="hidden lg:flex lg:w-[22rem] xl:w-[26rem] flex-col border-l border-[var(--color-border)] bg-white"
          style={{ minWidth: "clamp(18rem, 28vw, 26rem)" }}
        >
          <div
            className="flex shrink-0 items-center justify-between px-4 py-3 border-b border-[var(--color-border)]"
          >
            <div className="flex items-center gap-2">
              <ShoppingCart size={16} className="text-[var(--color-primary)]" />
              <span className="font-display font-bold text-[var(--color-text-main)]" style={{ fontSize: "clamp(0.875rem, 1.5vw, 1rem)" }}>
                Pedido
              </span>
              {mounted && count > 0 && (
                <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-[var(--color-primary)] px-1 text-[0.65rem] font-black text-white">
                  {count}
                </span>
              )}
            </div>
            {mounted && cartItems.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-error)]"
              >
                Limpiar
              </button>
            )}
          </div>
            <div className="flex flex-1 flex-col overflow-hidden">
              {/* Cart items */}
              <div className="flex-1 overflow-y-auto px-4 pb-2 pt-1">
                {!mounted || cartItems.length === 0 ? (
                  <EmptyCart />
                ) : (
                  cartItems.map((item, i) => (
                    <CartLineItem key={`desktop-${item.id}-${i}`} item={item} index={i} />
                  ))
                )}
              </div>
              {/* Form */}
              <div className="shrink-0 px-4 pb-4">
                <OrderForm
                  tableNumber={tableNumber}
                  setTableNumber={setTableNumber}
                  customerName={customerName}
                  setCustomerName={setCustomerName}
                  paymentMethod={paymentMethod}
                  setPaymentMethod={setPaymentMethod}
                  onSubmit={handleSubmit}
                  canSubmit={canSubmit}
                  isSubmitting={isSubmitting}
                  totalUsd={totalUsdCents}
                  totalBs={totalBsCents}
                  rate={rate}
                  prefilledTable={prefilledTable}
                  onOpenTableSelector={() => setIsTableSelectorOpen(true)}
                />
              </div>
            </div>
        </aside>
      </div>

      {/* ── Mobile: Bottom sheet ── */}
      {isSheetOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setIsSheetOpen(false)}
            style={{ backdropFilter: "blur(2px)" }}
          />
          {/* Sheet */}
          <div
            className="fixed bottom-0 left-0 right-0 z-50 flex flex-col rounded-t-3xl bg-white lg:hidden"
            style={{
              maxHeight: "88dvh",
              boxShadow: "0 -8px 32px rgba(37,26,7,0.18)",
              animation: "slideUp 0.28s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            {/* Sheet handle + header */}
            <div className="shrink-0 px-4 pb-0 pt-3">
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[var(--color-border)]" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingCart size={16} className="text-[var(--color-primary)]" />
                  <span className="font-display font-bold text-[var(--color-text-main)]">
                    Pedido
                  </span>
                  {count > 0 && (
                    <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-[var(--color-primary)] px-1 text-[0.65rem] font-black text-white">
                      {count}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {cartItems.length > 0 && (
                    <button
                      onClick={clearCart}
                      className="text-xs text-[var(--color-text-muted)]"
                    >
                      Limpiar
                    </button>
                  )}
                  <button
                    onClick={() => setIsSheetOpen(false)}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-surface-section)]"
                  >
                    <X size={14} className="text-[var(--color-text-main)]" />
                  </button>
                </div>
              </div>
            </div>
            {/* Reuse same content */}
            <div className="flex flex-1 flex-col overflow-hidden">
              {/* Cart items */}
              <div className="flex-1 overflow-y-auto px-4 pb-2 pt-1">
                {!mounted || cartItems.length === 0 ? (
                  <EmptyCart />
                ) : (
                  cartItems.map((item, i) => (
                    <CartLineItem key={`mobile-${item.id}-${i}`} item={item} index={i} />
                  ))
                )}
              </div>
              {/* Form */}
              <div className="shrink-0 px-4 pb-4">
                <OrderForm
                  tableNumber={tableNumber}
                  setTableNumber={setTableNumber}
                  customerName={customerName}
                  setCustomerName={setCustomerName}
                  paymentMethod={paymentMethod}
                  setPaymentMethod={setPaymentMethod}
                  onSubmit={handleSubmit}
                  canSubmit={canSubmit}
                  isSubmitting={isSubmitting}
                  totalUsd={totalUsdCents}
                  totalBs={totalBsCents}
                  rate={rate}
                  prefilledTable={prefilledTable}
                  onOpenTableSelector={() => setIsTableSelectorOpen(true)}
                />
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Item detail modal ── */}
      {modalItem && (
        <ItemDetailModalModern
          item={modalItem}
          isOpen={!!modalItem}
          onClose={() => setModalItem(null)}
          currentRateBsPerUsd={rate}
          allContornos={allContornos}
          dailyAdicionales={dailyAdicionales}
          dailyBebidas={dailyBebidas}
          adicionalesEnabled={!modalItem.hideAdicionales}
          bebidasEnabled={!modalItem.hideBebidas}
        />
      )}

      {/* ── Table Selector Modal ── */}
      {isTableSelectorOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="flex h-full max-h-[90dvh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <h2 className="text-xl font-bold text-[var(--color-text-main)] font-display">Seleccionar Mesa</h2>
              <button
                onClick={() => setIsTableSelectorOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-auto bg-[#f5ede4] relative">
              {typeof window !== "undefined" && window.innerWidth < 768 ? (
                /* Mobile: Simple Grid of Tables */
                <div className="p-4 grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {tables
                    .filter(t => t.isActive)
                    .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }))
                    .map(table => {
                      const pal = paletteFor(table.section);
                      return (
                        <button
                          key={table.id}
                          onClick={() => {
                            const onlyNumber = table.label.replace(/mesa\s*/i, "").trim();
                            setTableNumber(onlyNumber);
                            setIsTableSelectorOpen(false);
                          }}
                          className="aspect-square flex flex-col items-center justify-center rounded-2xl shadow-sm border-2 transition-transform active:scale-95"
                          style={{
                            backgroundColor: pal.bg,
                            borderColor: pal.border,
                            color: pal.text,
                          }}
                        >
                          <span className="text-lg font-black">{table.label}</span>
                          <div className="flex items-center gap-1 opacity-60 text-[10px]">
                            <Users size={10} />
                            <span>{table.capacity}</span>
                          </div>
                        </button>
                      );
                    })}
                </div>
              ) : (
                /* Tablet/Desktop: Full Layout */
                <div className="flex min-h-full min-w-full p-12 md:p-24 overflow-visible">
                  <div 
                    className="m-auto relative shadow-2xl transition-all duration-300 flex-shrink-0"
                    style={{
                      width: (settings?.tablesGridCols as number ?? 20) * CELL_SIZE * layoutZoom,
                      height: (settings?.tablesGridRows as number ?? 14) * CELL_SIZE * layoutZoom,
                      background: "#fffaf6",
                      borderRadius: 16 * layoutZoom,
                      backgroundImage: "radial-gradient(circle, #d4bfa8 1px, transparent 1px)",
                      backgroundSize: `${CELL_SIZE * layoutZoom}px ${CELL_SIZE * layoutZoom}px`,
                    }}
                  >
                {/* Fixtures */}
                {fixtures.map(fixture => {
                  const entry = CATALOG_BY_TYPE[fixture.type];
                  if (!entry) return null;
                  return (
                    <div
                      key={fixture.id}
                      className="absolute flex items-center justify-center select-none opacity-60 pointer-events-none"
                      style={{
                        left: (fixture.gridCol - 1) * CELL_SIZE * layoutZoom,
                        top: (fixture.gridRow - 1) * CELL_SIZE * layoutZoom,
                        width: (fixture.rotation === 90 || fixture.rotation === 270 ? fixture.rowSpan : fixture.colSpan) * CELL_SIZE * layoutZoom,
                        height: (fixture.rotation === 90 || fixture.rotation === 270 ? fixture.colSpan : fixture.rowSpan) * CELL_SIZE * layoutZoom,
                      }}
                    >
                      <div
                        className="flex flex-col items-center justify-center w-full h-full overflow-hidden"
                        style={{
                          background: entry.isTransparent ? "transparent" : entry.bg,
                          border: entry.isTransparent ? "none" : `1.5px solid ${entry.border}`,
                          borderRadius: entry.isWall ? 0 : 8 * layoutZoom,
                        }}
                      >
                        <div className="flex flex-col items-center gap-1">
                          {!entry.isWall && <FixtureIcon type={fixture.type} size={16 * layoutZoom} color={entry.textColor} />}
                          {fixture.label && (
                            <span className="px-1 text-center font-bold break-words w-full" style={{ color: entry.textColor, fontSize: 10 * layoutZoom }}>
                              {fixture.label}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {/* Tables */}
                {tables.filter(t => t.isActive).map(table => {
                  const pal = paletteFor(table.section);
                  const rotation = table.rotation ?? 0;
                  return (
                    <button
                      key={table.id}
                      onClick={() => {
                        const onlyNumber = table.label.replace(/mesa\s*/i, "").trim();
                        setTableNumber(onlyNumber);
                        setIsTableSelectorOpen(false);
                      }}
                      className="absolute flex items-center justify-center select-none group transition-transform active:scale-95 cursor-pointer hover:z-20"
                      style={{
                        left: (table.gridCol - 1) * CELL_SIZE * layoutZoom + (3 * layoutZoom),
                        top: (table.gridRow - 1) * CELL_SIZE * layoutZoom + (3 * layoutZoom),
                        width: table.colSpan * CELL_SIZE * layoutZoom - (6 * layoutZoom),
                        height: table.rowSpan * CELL_SIZE * layoutZoom - (6 * layoutZoom),
                        zIndex: 10,
                      }}
                    >
                      <div
                        className="flex flex-col items-center justify-center w-full h-full overflow-hidden group-hover:brightness-95 transition-all shadow-md"
                        style={{
                          background: pal.bg,
                          border: `2px solid ${pal.border}`,
                          borderRadius: table.shape === "circular" ? "50%" : table.shape === "cuadrada" ? 4 * layoutZoom : 8 * layoutZoom,
                          transform: `rotate(${rotation}deg)`,
                        }}
                      >
                        <div
                          className="flex flex-col items-center justify-center overflow-hidden"
                          style={{
                            transform: `rotate(${-rotation}deg)`,
                            maxWidth: (rotation % 90 !== 0) ? "70%" : "90%",
                            maxHeight: (rotation % 90 !== 0) ? "70%" : "90%",
                          }}
                        >
                          <span
                            className="font-black leading-tight text-center w-full break-words"
                            style={{
                              fontSize: Math.max(8 * layoutZoom, Math.min(table.colSpan * 4.5 * layoutZoom, 14 * layoutZoom)),
                              color: pal.text,
                              fontFamily: "var(--font-epilogue, serif)",
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                            }}
                          >
                            {table.label}
                          </span>
                          <div className="flex items-center gap-0.5 mt-0.5" style={{ opacity: 0.6, fontSize: Math.max(7 * layoutZoom, table.colSpan * 3.5 * layoutZoom), color: pal.text }}>
                            <Users size={Math.max(7 * layoutZoom, table.colSpan * 3.5 * layoutZoom)} />
                            <span>{table.capacity}</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
                  </div>
                </div>
              )}
            </div>
            {/* Zoom hint */}
            <div className="bg-white border-t px-4 py-3 flex items-center justify-center text-xs text-slate-500 font-semibold uppercase tracking-widest gap-2 shrink-0">
              <Map size={14} /> Selecciona una mesa para tomar su pedido
            </div>
          </div>
        </div>
      )}

      {/* ── keyframes (injected once) ── */}
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        .scrollbar-none::-webkit-scrollbar { display: none; }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}