"use client";

import { usePathname, useRouter } from "next/navigation";
import { Utensils, Search, ShoppingBag, Receipt } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const openDrawer = useCartStore((s) => s.openDrawer);
  const isDrawerOpen = useCartStore((s) => s.isDrawerOpen);
  const itemCount = useCartStore((s) => s.items.reduce((acc, item) => acc + item.quantity, 0));

  const handleTabClick = (tab: "menu" | "buscar" | "pedido" | "historial") => {
    if (tab === "menu") {
      if (pathname === "/") {
        window.dispatchEvent(new Event("menu:goToTop"));
      } else {
        router.push("/");
      }
    } else if (tab === "buscar") {
      if (pathname !== "/") {
        router.push("/");
        setTimeout(() => {
          const input = document.getElementById("menu-search-input");
          input?.focus();
        }, 300);
      } else {
        const input = document.getElementById("menu-search-input");
        input?.focus();
        input?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    } else if (tab === "pedido") {
      openDrawer();
    } else if (tab === "historial") {
      router.push("/mis-pedidos");
    }
  };

  const isMenuTabActive = pathname === "/" && !isDrawerOpen;
  const isPedidoTabActive = isDrawerOpen;
  const isHistorialTabActive = pathname === "/mis-pedidos" && !isDrawerOpen;

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-[#251a07]/10 pb-safe shadow-[0_-4px_20px_rgba(37,26,7,0.06)]">
      <div className="flex h-16 w-full items-center justify-around px-2 relative">
        {/* Menu Tab */}
        <button
          onClick={() => handleTabClick("menu")}
          className={cn(
            "flex flex-col items-center justify-center gap-1 w-16 h-full transition-all duration-300 relative text-[#251a07]/45 hover:text-[#251a07]/70 active:scale-95",
            isMenuTabActive && "text-[#bb0005]"
          )}
        >
          <Utensils className={cn("h-[21px] w-[21px] transition-transform duration-300", isMenuTabActive && "scale-110")} strokeWidth={isMenuTabActive ? 2.8 : 2.0} />
          <span className={cn("text-[10px] font-bold tracking-wide uppercase font-sans transition-all", isMenuTabActive && "font-extrabold tracking-wider scale-105")}>Menú</span>
          {isMenuTabActive && (
            <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 h-[3px] w-[3px] rounded-full bg-[#bb0005] animate-in zoom-in duration-300" />
          )}
        </button>

        {/* Buscar Tab */}
        <button
          onClick={() => handleTabClick("buscar")}
          className="flex flex-col items-center justify-center gap-1 w-16 h-full transition-all duration-300 relative text-[#251a07]/45 hover:text-[#251a07]/70 active:scale-95"
        >
          <Search className="h-[21px] w-[21px]" strokeWidth={2.0} />
          <span className="text-[10px] font-bold tracking-wide uppercase font-sans">Buscar</span>
        </button>

        {/* Pedido Tab */}
        <button
          onClick={() => handleTabClick("pedido")}
          className={cn(
            "relative flex flex-col items-center justify-center gap-1 w-16 h-full transition-all duration-300 text-[#251a07]/45 hover:text-[#251a07]/70 active:scale-95",
            isPedidoTabActive && "text-[#bb0005]"
          )}
        >
          <ShoppingBag className={cn("h-[21px] w-[21px] transition-transform duration-300", isPedidoTabActive && "scale-110")} strokeWidth={isPedidoTabActive ? 2.8 : 2.0} />
          {itemCount > 0 && (
            <span className="absolute top-2 right-2 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-[#bb0005] px-1 text-[9px] font-black text-white leading-none border border-white shadow-sm animate-pulse-subtle">
              {itemCount}
            </span>
          )}
          <span className={cn("text-[10px] font-bold tracking-wide uppercase font-sans transition-all", isPedidoTabActive && "font-extrabold tracking-wider scale-105")}>Pedido</span>
          {isPedidoTabActive && (
            <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 h-[3px] w-[3px] rounded-full bg-[#bb0005] animate-in zoom-in duration-300" />
          )}
        </button>

        {/* Historial Tab */}
        <button
          onClick={() => handleTabClick("historial")}
          className={cn(
            "flex flex-col items-center justify-center gap-1 w-16 h-full transition-all duration-300 relative text-[#251a07]/45 hover:text-[#251a07]/70 active:scale-95",
            isHistorialTabActive && "text-[#bb0005]"
          )}
        >
          <Receipt className={cn("h-[21px] w-[21px] transition-transform duration-300", isHistorialTabActive && "scale-110")} strokeWidth={isHistorialTabActive ? 2.8 : 2.0} />
          <span className={cn("text-[10px] font-bold tracking-wide uppercase font-sans transition-all", isHistorialTabActive && "font-extrabold tracking-wider scale-105")}>Historial</span>
          {isHistorialTabActive && (
            <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 h-[3px] w-[3px] rounded-full bg-[#bb0005] animate-in zoom-in duration-300" />
          )}
        </button>
      </div>
    </div>
  );
}
