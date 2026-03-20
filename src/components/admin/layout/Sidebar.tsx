"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import {
  ChefHat,
  LayoutDashboard,
  UtensilsCrossed,
  Tags,
  Settings,
  LogOut,
  X,
  ShoppingBag,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Órdenes", icon: ShoppingBag },
  { href: "/admin/menu", label: "Menú", icon: UtensilsCrossed },
  { href: "/admin/categories", label: "Categorías", icon: Tags },
  { href: "/admin/settings", label: "Configuración", icon: Settings },
  { href: "/kitchen", label: "Cocina", icon: ChefHat },
];

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 space-y-1 px-3 py-4">
      {navItems.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== "/admin" && pathname.startsWith(item.href));

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
              isActive
                ? "bg-primary/10 text-primary shadow-sm"
                : "text-text-muted hover:bg-white/60 hover:text-text-main",
            )}
          >
            {isActive && (
              <div className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />
            )}
            <item.icon
              className={cn(
                "h-[18px] w-[18px] transition-colors",
                isActive ? "text-primary" : "text-text-muted group-hover:text-text-main",
              )}
            />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-[260px] lg:shrink-0 lg:flex-col border-r border-border bg-white/80 backdrop-blur-md">
        <div className="border-b border-border px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white">
              <ChefHat className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display text-lg font-bold text-text-main leading-tight">
                G&M
              </h1>
              <p className="text-[11px] text-text-muted leading-tight">
                Panel de administración
              </p>
            </div>
          </div>
        </div>

        <SidebarNav />

        <div className="border-t border-border px-3 py-3">
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-text-muted transition-all hover:bg-error/5 hover:text-error"
            >
              <LogOut className="h-[18px] w-[18px]" />
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>

      {/* Mobile Hamburger Button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-40 flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-md border border-border lg:hidden"
        aria-label="Abrir menú"
      >
        <svg
          className="h-5 w-5 text-text-main"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
          onClick={closeMobile}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col bg-white shadow-elevated transition-transform duration-300 lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white">
              <ChefHat className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display text-lg font-bold text-text-main leading-tight">
                G&M
              </h1>
              <p className="text-[11px] text-text-muted leading-tight">
                Panel de administración
              </p>
            </div>
          </div>
          <button
            onClick={closeMobile}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-bg-app hover:text-text-main transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <SidebarNav onNavigate={closeMobile} />

        <div className="border-t border-border px-3 py-3">
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-text-muted transition-all hover:bg-error/5 hover:text-error"
            >
              <LogOut className="h-[18px] w-[18px]" />
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
