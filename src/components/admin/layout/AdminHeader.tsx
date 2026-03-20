"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { ChevronRight, User, LogOut, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const pathLabels: Record<string, string> = {
  admin: "Dashboard",
  orders: "Órdenes",
  menu: "Menú",
  categories: "Categorías",
  settings: "Configuración",
  new: "Nuevo",
  edit: "Editar",
  kitchen: "Cocina",
};

function useBreadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  return segments.map((segment, index) => ({
    label: pathLabels[segment] ?? `#${segment.slice(0, 8)}`,
    href: "/" + segments.slice(0, index + 1).join("/"),
    isLast: index === segments.length - 1,
  }));
}

export function AdminHeader() {
  const breadcrumbs = useBreadcrumbs();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-white/80 backdrop-blur-md px-4 sm:px-6 lg:px-8 py-3">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1.5 text-sm min-w-0 pl-12 lg:pl-0">
        {breadcrumbs.map((crumb, index) => (
          <div key={crumb.href} className="flex items-center gap-1.5 min-w-0">
            {index > 0 && (
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-text-muted" />
            )}
            {crumb.isLast ? (
              <span className="font-medium text-text-main truncate">
                {crumb.label}
              </span>
            ) : (
              <Link
                href={crumb.href}
                className="text-text-muted hover:text-text-main transition-colors truncate"
              >
                {crumb.label}
              </Link>
            )}
          </div>
        ))}
      </nav>

      {/* Profile Dropdown */}
      <div ref={menuRef} className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors hover:bg-primary/20 outline-none cursor-pointer"
        >
          <User className="h-4 w-4" />
        </button>
        {open && (
          <div className="absolute right-0 top-full mt-2 w-48 rounded-xl bg-white p-1.5 shadow-elevated ring-1 ring-border animate-in fade-in-0 zoom-in-95">
            <Link
              href="/admin/settings"
              onClick={() => setOpen(false)}
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
        )}
      </div>
    </header>
  );
}
