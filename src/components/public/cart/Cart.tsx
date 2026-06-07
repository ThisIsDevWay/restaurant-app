"use client";

import { useEffect, useState, useRef } from "react";
import { X, Info, ShoppingBag, WifiOff, ChevronDown, ArrowRight } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { CartItem } from "./CartItem";
import { formatBs, formatRef } from "@/lib/money";
import { useRouter } from "next/navigation";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

import { HERITAGE as T } from "@/lib/heritage-tokens";

/* ─────────────────────────────────────────────
   PILL BADGE
───────────────────────────────────────────── */
function ItemBadge({ count }: { count: number }) {
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      minWidth: 20,
      height: 20,
      padding: "0 6px",
      borderRadius: 99,
      background: T.primary,
      color: "#fff",
      fontFamily: T.fontDisplay,
      fontSize: 10,
      fontWeight: 900,
      letterSpacing: "0.03em",
      lineHeight: 1,
    }}>
      {count}
    </span>
  );
}

/* ─────────────────────────────────────────────
   TAX BREAKDOWN ROW
───────────────────────────────────────────── */
function TaxRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "4px 0",
    }}>
      <span style={{ fontSize: 11, color: T.muted, fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: 11, color: T.muted, fontWeight: 600, fontFamily: T.fontDisplay }}>{value}</span>
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
export function Cart({
  maxQuantityPerItem = 10,
  dailyAdicionales = [],
  dailyBebidas = [],
  rate = null,
}: {
  maxQuantityPerItem?: number;
  dailyAdicionales?: any[];
  dailyBebidas?: any[];
  rate?: number | null;
}) {
  const items = useCartStore((s) => s.items);
  const mounted = useCartStore((s) => s.mounted);
  const setMounted = useCartStore((s) => s.setMounted);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const addItem = useCartStore((s) => s.addItem);
  const totalBsCents = useCartStore((s) => s.totalBsCents());
  const totalUsdCents = useCartStore((s) => s.totalUsdCents());
  const isDrawerOpen = useCartStore((s) => s.isDrawerOpen);
  const openDrawer = useCartStore((s) => s.openDrawer);
  const closeDrawer = useCartStore((s) => s.closeDrawer);
  const setEditingIndex = useCartStore((s) => s.setEditingIndex);

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    closeDrawer();
  };

  const router = useRouter();
  const isOnline = useOnlineStatus();
  const [taxOpen, setTaxOpen] = useState(false);
  const [upsellExpanded, setUpsellExpanded] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [barVisible, setBarVisible] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  /* hydration */
  useEffect(() => {
    const unsub = useCartStore.persist.onFinishHydration(() => setHasHydrated(true));
    if (useCartStore.persist.hasHydrated()) setHasHydrated(true);
    setMounted();
    return unsub;
  }, [setMounted]);

  /* slide-in animation for bottom bar */
  useEffect(() => {
    if (hasHydrated && mounted && items.length > 0) {
      const t = setTimeout(() => setBarVisible(true), 60);
      return () => clearTimeout(t);
    } else {
      setBarVisible(false);
    }
  }, [hasHydrated, mounted, items.length]);

  if (!hasHydrated || !mounted) return null;

  const itemCount = items.reduce((s, i) => s + i.quantity, 0);
  const baseImponible = Math.round(totalBsCents / 1.16);
  const ivaBs = totalBsCents - baseImponible;

  return (
    <>
      {/* ────────────────────────────────────────
          BOTTOM BAR
      ──────────────────────────────────────── */}
      {items.length > 0 && (
        <div className={`hidden md:block fixed z-40 transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]
          bottom-0 left-0 right-0 p-[10px_16px_16px] rounded-none
          lg:bottom-6 lg:left-1/2 lg:right-auto lg:-translate-x-1/2 lg:w-[420px] lg:rounded-2xl lg:p-[12px_16px] lg:border lg:border-primary/10
          ${barVisible ? 'translate-y-0 lg:translate-y-0' : 'translate-y-full lg:translate-y-[150%]'}
        `} style={{
            /* Glass + cream warmth */
            background: "rgba(255,248,243,0.92)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderTop: "1px solid rgba(187,0,5,0.08)",
          boxShadow: "0 -4px 24px rgba(37,26,7,0.07), 0 12px 32px rgba(187,0,5,0.08)",
        }}>
        {/* Drag handle visual hint */}
        <div className="lg:hidden" style={{
          width: 36, height: 3, borderRadius: 99,
          background: "rgba(37,26,7,0.12)",
          margin: "0 auto 10px",
        }} />

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Price block */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 7 }}>
              <span style={{
                fontFamily: T.fontDisplay,
                fontSize: 17,
                fontWeight: 900,
                color: T.ink,
                letterSpacing: "-0.02em",
                lineHeight: 1,
              }}>
                {formatBs(totalBsCents)}
              </span>
              <span style={{
                fontSize: 11,
                fontWeight: 600,
                color: T.muted,
                background: T.creamLow,
                padding: "1px 7px",
                borderRadius: 6,
              }}>
                {formatRef(totalUsdCents)}
              </span>
            </div>
            <p style={{
              fontSize: "clamp(10px, 2.8vw, 11px)", color: T.muted, marginTop: 2,
              fontWeight: 500,
            }}>
              {itemCount} {itemCount === 1 ? "ítem" : "ítems"}
            </p>
          </div>

          {/* CTA button */}
          <button
            onClick={() => { if (isOnline) { router.prefetch("/checkout"); openDrawer(); } }}
            disabled={!isOnline}
            aria-label={!isOnline ? "Necesitas conexión para hacer un pedido" : "Ver pedido"}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "0 20px",
              height: 46,
              borderRadius: 13,
              border: "none",
              cursor: isOnline ? "pointer" : "not-allowed",
              opacity: isOnline ? 1 : 0.5,
              background: `linear-gradient(135deg, ${T.primary} 0%, ${T.primaryDeep} 100%)`,
              color: "#fff",
              fontFamily: T.fontDisplay,
              fontSize: 12,
              fontWeight: 900,
              letterSpacing: "0.07em",
              textTransform: "uppercase",
              boxShadow: isOnline ? "0 4px 16px rgba(187,0,5,0.35)" : "none",
              transition: "transform 0.15s, box-shadow 0.15s",
              position: "relative",
              overflow: "hidden",
            }}
            onMouseEnter={(e) => { if (isOnline) (e.currentTarget as HTMLElement).style.transform = "scale(1.04)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
            onMouseDown={(e) => { if (isOnline) (e.currentTarget as HTMLElement).style.transform = "scale(0.97)"; }}
            onMouseUp={(e) => { if (isOnline) (e.currentTarget as HTMLElement).style.transform = "scale(1.04)"; }}
          >
            {!isOnline
              ? <><WifiOff style={{ width: 14, height: 14 }} />Sin conexión</>
              : <><ShoppingBag style={{ width: 14, height: 14 }} />Ver pedido</>
            }
          </button>
        </div>
      </div>
      )}

      {/* ────────────────────────────────────────
          DRAWER SHELL
      ──────────────────────────────────────── */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 50,
          pointerEvents: isDrawerOpen ? "auto" : "none",
        }}
        inert={!isDrawerOpen}
      >
        {/* Overlay */}
        <div
          onClick={closeDrawer}
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(37,26,7,0.5)",
            backdropFilter: "blur(4px)",
            WebkitBackdropFilter: "blur(4px)",
            opacity: isDrawerOpen ? 1 : 0,
            transition: "opacity 0.25s ease",
            pointerEvents: isDrawerOpen ? "auto" : "none",
          }}
        />

        {/* Drawer panel
          * isolation: "isolate" creates a new stacking context, preventing
          * any position:fixed sibling (e.g. user avatar FAB, chat widget)
          * from bleeding visually inside the drawer's painted area.
          * overflow: "hidden" clips shimmer/gradient children correctly.
          */}
        <div
          onClick={(e) => e.stopPropagation()}
          className={`absolute flex flex-col overflow-hidden isolate z-10 bg-white transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] shadow-[0_-12px_48px_rgba(37,26,7,0.14),0_-2px_8px_rgba(37,26,7,0.06)]
            bottom-0 left-0 right-0 max-h-[88dvh] rounded-t-[22px]
            md:top-0 md:bottom-0 md:right-0 md:left-auto md:w-[420px] md:max-h-none md:rounded-l-[22px] md:rounded-tr-none md:border-l md:border-border/40
            ${isDrawerOpen ? 'translate-y-0 md:translate-x-0' : 'translate-y-full md:translate-y-0 md:translate-x-full'}
          `}
        >
          {/* ── DRAWER HEADER ── */}
          <div style={{
            background: T.cream,
            borderBottom: `1px solid ${T.creamLow}`,
            flexShrink: 0,
          }}>
            {/* Drag pill */}
            <div className="md:hidden" style={{
              width: 40, height: 4, borderRadius: 99,
              background: "rgba(37,26,7,0.1)",
              margin: "10px auto 0",
            }} />

            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px 14px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {/* Heritage title */}
                <h2 style={{
                  fontFamily: T.fontDisplay,
                  fontSize: "clamp(16px, 4.5vw, 18px)",
                  fontWeight: 900,
                  color: T.ink,
                  letterSpacing: "-0.02em",
                  lineHeight: 1,
                }}>
                  Mi pedido
                </h2>
                <ItemBadge count={itemCount} />
              </div>

              {/* Close */}
              <button
                onClick={closeDrawer}
                aria-label="Cerrar"
                style={{
                  width: 32, height: 32,
                  borderRadius: 10,
                  border: "none",
                  cursor: "pointer",
                  background: T.creamLow,
                  color: T.muted,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "background .15s, transform .15s",
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#ffe4e4"; (e.currentTarget as HTMLElement).style.color = T.primary; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = T.creamLow; (e.currentTarget as HTMLElement).style.color = T.muted; }}
              >
                <X style={{ width: 15, height: 15 }} />
              </button>
            </div>
          </div>

          {/* ── SCROLLABLE ITEMS ── */}
          <div
            ref={scrollRef}
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "10px 12px",
              display: "flex",
              flexDirection: "column",
              gap: 8,
              /* Custom scrollbar */
              scrollbarWidth: "thin",
              scrollbarColor: `${T.creamLow} transparent`,
            }}
          >
            {items.length === 0 ? (
              <div style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 16,
                padding: "64px 24px",
                textAlign: "center",
                userSelect: "none",
              }}>
                <div style={{
                  width: 64,
                  height: 64,
                  borderRadius: 99,
                  background: "var(--color-secondary)",
                  border: "1px solid rgba(187,0,5,0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--color-text-muted)",
                }}>
                  <ShoppingBag style={{ width: 28, height: 28, opacity: 0.6 }} />
                </div>
                <div>
                  <h3 style={{
                    fontFamily: T.fontDisplay,
                    fontSize: 15,
                    fontWeight: 900,
                    color: T.ink,
                  }}>
                    Tu carrito está vacío
                  </h3>
                  <p style={{
                    fontSize: 12,
                    color: T.muted,
                    marginTop: 6,
                    maxWidth: 240,
                    marginLeft: "auto",
                    marginRight: "auto",
                    lineHeight: 1.5,
                  }}>
                    Agrega algunos deliciosos platos del menú para comenzar tu pedido.
                  </p>
                </div>
                <button
                  onClick={closeDrawer}
                  style={{
                    marginTop: 8,
                    borderRadius: 12,
                    background: T.primary,
                    border: "none",
                    padding: "10px 20px",
                    fontSize: 12,
                    fontWeight: 900,
                    color: "#fff",
                    cursor: "pointer",
                    boxShadow: "0 4px 12px rgba(187,0,5,0.2)",
                    fontFamily: T.fontDisplay,
                    transition: "transform 0.15s",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1.03)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
                >
                  Ver el menú
                </button>
              </div>
            ) : (
              items.map((item, index) => (
                <CartItem
                  key={`${item.id}-${(item.fixedContornos ?? []).map((c) => c.id).join(",")}-${(item.contornoSubstitutions ?? []).map((s) => s.substituteId).join(",")}-${(item.selectedAdicionales ?? []).map((a) => a.id).join(",")}-${(item.selectedBebidas ?? []).map((b) => b.id).join(",")}-${index}`}
                  item={item}
                  index={index}
                  maxQuantityPerItem={maxQuantityPerItem}
                  onUpdateQuantity={updateQuantity}
                  onRemove={removeItem}
                  onEdit={handleEdit}
                />
              ))
            )}

            {/* Upsell list when cart has 1-2 items */}
            {items.length >= 1 && items.length <= 2 && (dailyAdicionales.length > 0 || dailyBebidas.length > 0) && (
              <div style={{
                marginTop: 16,
                padding: "12px",
                background: T.cream,
                borderRadius: 16,
                border: `1.5px dashed ${T.creamLow}`,
                display: "flex",
                flexDirection: "column",
                gap: upsellExpanded ? 10 : 0,
                transition: "gap 0.2s ease",
              }}>
                <button
                  onClick={() => setUpsellExpanded(!upsellExpanded)}
                  style={{
                    width: "100%",
                    background: "transparent",
                    border: "none",
                    padding: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span style={{
                    fontFamily: T.fontDisplay,
                    fontSize: 13,
                    fontWeight: 900,
                    color: T.ink,
                    letterSpacing: "-0.01em",
                  }}>
                    Súmale algo a tu pedido 😋
                  </span>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: T.primary,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}>
                    {upsellExpanded ? "Ocultar" : "Ver opciones"}
                    <ChevronDown style={{
                      width: 14,
                      height: 14,
                      transform: upsellExpanded ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.2s",
                    }} />
                  </span>
                </button>

                {upsellExpanded && (
                  <div
                    className="no-scrollbar"
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      gap: 10,
                      overflowX: "auto",
                      paddingBottom: 4,
                      scrollSnapType: "x mandatory",
                      WebkitOverflowScrolling: "touch",
                      animation: "tax-in 0.2s ease",
                    }}
                  >
                    {[...dailyBebidas.filter(b => b.isAvailable).slice(0, 2), ...dailyAdicionales.filter(a => a.isAvailable).slice(0, 2)].map((opt) => {
                      const isDrink = dailyBebidas.some(b => b.id === opt.id);
                      const optPriceBs = rate ? Math.round(opt.priceUsdCents * rate) : 0;

                      // Check if already in cart
                      const inCart = items.some(i => i.id === opt.id);
                      if (inCart) return null;

                      return (
                        <div
                          key={opt.id}
                          style={{
                            flex: "0 0 150px",
                            scrollSnapAlign: "start",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between",
                            background: T.surface,
                            padding: "10px",
                            borderRadius: 12,
                            boxShadow: "0 2px 6px rgba(37,26,7,0.04)",
                            border: "1px solid rgba(37,26,7,0.04)",
                          }}
                        >
                          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8, minWidth: 0 }}>
                            <span style={{ fontSize: 20, alignSelf: "flex-start", lineHeight: 1 }}>{isDrink ? "🥤" : "🍟"}</span>
                            <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                              <span style={{
                                fontSize: 11,
                                fontWeight: 700,
                                color: T.ink,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                lineHeight: 1.2
                              }} title={opt.name}>
                                {opt.name}
                              </span>
                              <span style={{ fontSize: 9, color: T.muted, fontWeight: 500, marginTop: 2 }}>
                                {formatRef(opt.priceUsdCents)}
                              </span>
                              <span style={{ fontSize: 9, color: T.primary, fontWeight: 700, marginTop: 1 }}>
                                {formatBs(optPriceBs)}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              const payload = {
                                id: opt.id,
                                name: opt.name,
                                baseUsdCents: opt.priceUsdCents,
                                baseBsCents: optPriceBs,
                                isPrepackaged: opt.isPrepackaged,
                                emoji: isDrink ? "🥤" : "🍟",
                                fixedContornos: [],
                                contornoSubstitutions: [],
                                selectedAdicionales: [],
                                selectedBebidas: [],
                                removedComponents: [],
                                categoryAllowAlone: true,
                                categoryIsSimple: true,
                                categoryName: isDrink ? "Bebidas" : "Adicionales",
                              };
                              addItem(payload);
                              if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(30);
                            }}
                            style={{
                              background: "transparent",
                              border: `1.5px solid ${T.primary}`,
                              color: T.primary,
                              borderRadius: 20,
                              padding: "4px 0",
                              width: "100%",
                              textAlign: "center",
                              fontSize: 10,
                              fontWeight: 800,
                              cursor: "pointer",
                              fontFamily: T.fontDisplay,
                              transition: "background 0.15s, color 0.15s",
                            }}
                            onMouseEnter={(e) => {
                              (e.currentTarget as HTMLElement).style.background = T.primary;
                              (e.currentTarget as HTMLElement).style.color = "#fff";
                            }}
                            onMouseLeave={(e) => {
                              (e.currentTarget as HTMLElement).style.background = "transparent";
                              (e.currentTarget as HTMLElement).style.color = T.primary;
                            }}
                          >
                            Agregar
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── STICKY FOOTER ── */}
          {items.length > 0 && (
            <div style={{
              borderTop: `1px solid ${T.creamLow}`,
              background: T.surface,
              padding: "12px 16px 20px",
              flexShrink: 0,
            }}>
              {/* Tax toggle */}
              <button
                onClick={() => setTaxOpen((p) => !p)}
                style={{
                  display: "flex",
                  width: "100%",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "7px 0",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <span style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 11,
                  color: T.muted,
                  fontWeight: 600,
                }}>
                  <Info style={{ width: 13, height: 13, opacity: 0.6 }} />
                  Desglose fiscal (IVA 16%)
                  <ChevronDown style={{
                    width: 12, height: 12, opacity: 0.6,
                    transform: taxOpen ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.2s",
                  }} />
                </span>
                <span style={{ fontSize: 11, color: T.muted, fontWeight: 600, fontFamily: T.fontDisplay }}>
                  {formatBs(ivaBs)}
                </span>
              </button>

              {/* Tax breakdown */}
              {taxOpen && (
                <div style={{
                  borderRadius: 10,
                  background: T.cream,
                  padding: "8px 12px",
                  marginBottom: 12,   /* ↑ more breathing before total row */
                  animation: "tax-in 0.15s ease",
                }}>
                  <TaxRow label="BASE IMP." value={formatBs(baseImponible)} />
                  <TaxRow label="IVA (16%)" value={formatBs(ivaBs)} />
                </div>
              )}

              {/* Total row */}
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingTop: 11,
                marginTop: 3,
                borderTop: `1.5px solid ${T.creamLow}`,
              }}>
                <span style={{
                  fontFamily: T.fontDisplay,
                  fontSize: "clamp(10px, 3vw, 12px)",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: T.muted,
                }}>
                  Total a pagar
                </span>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: T.muted,
                    background: T.creamLow,
                    padding: "2px 8px",
                    borderRadius: 6,
                    fontFamily: T.fontDisplay,
                  }}>
                    {formatRef(totalUsdCents)}
                  </span>
                  <span style={{
                    fontFamily: T.fontDisplay,
                    fontSize: "clamp(22px, 6vw, 30px)",
                    fontWeight: 900,
                    color: T.ink,
                    letterSpacing: "-0.03em",
                    lineHeight: 1,
                  }}>
                    {formatBs(totalBsCents)}
                  </span>
                </div>
              </div>

              {/* Multi-quantity hint */}
              {items.some((item) => item.quantity > 1) && (
                <div style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 6,
                  marginTop: 10,
                  padding: "8px 10px",
                  borderRadius: 10,
                  background: T.cream,
                  border: `1px solid ${T.creamLow}`,
                }}>
                  <Info style={{ width: 12, height: 12, color: T.muted, opacity: 0.7, marginTop: 1, flexShrink: 0 }} />
                  <p style={{ fontSize: 11, color: T.muted, lineHeight: 1.5, fontWeight: 500 }}>
                    Para contornos o extras distintos por plato, agrégalos uno a uno.
                  </p>
                </div>
              )}

              {/* Checkout CTA */}
              <button
                onClick={() => { closeDrawer(); router.push("/checkout"); }}
                style={{
                  marginTop: 14,
                  display: "flex",
                  width: "100%",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  height: 52,
                  borderRadius: 14,
                  border: "none",
                  cursor: "pointer",
                  background: `linear-gradient(150deg, ${T.primary} 0%, ${T.primaryDeep} 100%)`,
                  color: "#fff",
                  fontFamily: T.fontDisplay,
                  fontSize: "clamp(12px, 3.5vw, 14px)",
                  fontWeight: 900,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  boxShadow: "0 6px 20px rgba(187,0,5,0.32)",
                  position: "relative",
                  overflow: "hidden",
                  transition: "transform 0.15s, box-shadow 0.15s",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1.02)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 28px rgba(187,0,5,0.4)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 6px 20px rgba(187,0,5,0.32)"; }}
                onMouseDown={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(0.98)"; }}
                onMouseUp={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1.02)"; }}
              >
                {/* Shimmer */}
                <span aria-hidden style={{
                  position: "absolute",
                  inset: 0,
                  background: "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.12) 50%, transparent 70%)",
                  backgroundSize: "200% 100%",
                  animation: "shimmer-cta 2.5s infinite",
                  borderRadius: "inherit",
                }} />
                <span style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: 10 }}>
                  Confirmar pedido
                  <span style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 24,
                    height: 24,
                    borderRadius: 7,
                    background: "rgba(255,255,255,0.2)",
                  }}>
                    <ArrowRight style={{ width: 13, height: 13 }} />
                  </span>
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Keyframes */}
      <style>{`
        @keyframes shimmer-cta {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
        @keyframes tax-in {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        /* Hide scrollbar for Chrome, Safari and Opera */
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        /* Hide scrollbar for IE, Edge and Firefox */
        .no-scrollbar {
          -ms-overflow-style: none;  /* IE and Edge */
          scrollbar-width: none;  /* Firefox */
        }
      `}</style>
    </>
  );
}