"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import {
  ChefHat,
  LayoutDashboard,
  Tags,
  Settings,
  LogOut,
  X,
  ShoppingBag,
  PlusCircle,
  User,
  Menu,
  BookOpen,
  CalendarDays,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Órdenes", icon: ShoppingBag },
  { href: "/admin/menu-del-dia", label: "Menú del Día", icon: CalendarDays },
  { href: "/admin/catalogo", label: "Catálogo", icon: BookOpen },

  { href: "/admin/categories", label: "Categorías", icon: Tags },
  { href: "/admin/settings", label: "Configuración", icon: Settings },
  { href: "/kitchen", label: "Cocina", icon: ChefHat },
];

/* ── Desktop: icon-only 64px sidebar ────────────────────────── */
function DesktopSidebar() {
  const pathname = usePathname();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  return (
    <TooltipProvider>
      <aside className="fixed left-0 top-0 z-50 flex h-screen w-16 flex-col items-center border-r border-border bg-white py-4">
        {/* Logo */}
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Link
              href="/admin"
              className="mb-6 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-lg shadow-primary/25 transition-transform hover:scale-105"
            >
              <ChefHat className="h-5 w-5" />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">G&M Restaurante</TooltipContent>
        </Tooltip>

        {/* Main Nav */}
        <nav className="flex flex-1 flex-col items-center gap-1 overflow-y-auto w-full px-2 scrollbar-hide">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/admin" && pathname.startsWith(item.href + "/"));

            return (
              <Tooltip key={item.href} delayDuration={0}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-200",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-text-muted hover:bg-bg-app hover:text-text-main",
                    )}
                  >
                    {isActive && (
                      <span className="absolute -left-2 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />
                    )}
                    <item.icon className="h-[18px] w-[18px]" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            );
          })}
        </nav>

        {/* Bottom: User + Logout */}
        <div className="flex flex-col items-center gap-1 pb-2 w-full px-2">
          {/* Logout */}
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <form action="/api/auth/signout" method="POST">
                <button
                  type="submit"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-text-muted transition-all duration-200 hover:bg-error/10 hover:text-error"
                >
                  <LogOut className="h-[18px] w-[18px]" />
                </button>
              </form>
            </TooltipTrigger>
            <TooltipContent side="right">Cerrar sesión</TooltipContent>
          </Tooltip>

          {/* User avatar */}
          <div className="relative mt-1">
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setUserMenuOpen((o) => !o)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary transition-all duration-200 hover:bg-primary/20 hover:scale-105 outline-none"
                >
                  <User className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Mi perfil</TooltipContent>
            </Tooltip>

            {userMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setUserMenuOpen(false)}
                />
                <div className="absolute bottom-full left-full ml-2 mb-1 z-50 w-48 rounded-xl bg-white p-1.5 shadow-elevated ring-1 ring-border animate-in fade-in-0 zoom-in-95">
                  <Link
                    href="/admin/settings"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-text-main hover:bg-bg-app transition-colors"
                  >
                    <Settings className="h-4 w-4 text-text-muted" />
                    Configuración
                  </Link>
                  <div className="my-1 h-px bg-border" />
                  <form action="/api/auth/signout" method="POST">
                    <button
                      type="submit"
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-error hover:bg-error/5 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      Cerrar sesión
                    </button>
                  </form>
                </div>
              </>
            )}
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
}

/* ── Mobile: slide-in drawer ─────────────────────────────────── */
function MobileSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  return (
    <>
      {/* Hamburger */}
      <button
        onClick={() => setOpen(true)}
        className="fixed left-4 top-4 z-40 flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-md border border-border lg:hidden"
        aria-label="Abrir menú"
      >
        <Menu className="h-5 w-5 text-text-main" />
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
          onClick={close}
        />
      )}

      {/* Drawer */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col bg-white shadow-elevated transition-transform duration-300 lg:hidden",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white shadow-sm shadow-primary/20">
              <ChefHat className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-bold text-base text-text-main leading-tight">G&M</h1>
              <p className="text-[11px] text-text-muted leading-tight">Panel de administración</p>
            </div>
          </div>
          <button
            onClick={close}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-bg-app hover:text-text-main transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/admin" && pathname.startsWith(item.href + "/"));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={close}
                className={cn(
                  "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-text-muted hover:bg-bg-app hover:text-text-main",
                )}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />
                )}
                <item.icon
                  className={cn(
                    "h-[18px] w-[18px] shrink-0 transition-colors",
                    isActive ? "text-primary" : "text-text-muted group-hover:text-text-main",
                  )}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
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

/* ── Combined export ─────────────────────────────────────────── */
export function Sidebar() {
  return (
    <>
      <div className="hidden lg:block">
        <DesktopSidebar />
      </div>
      <MobileSidebar />
    </>
  );
}
