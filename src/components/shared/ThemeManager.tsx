"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Ensures that the dark theme is ONLY applied to the public menu and digital menu (TV).
 * Forces light mode for admin, kitchen, and login routes.
 */
export function ThemeManager() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    
    const isAppRoute =
      pathname.startsWith("/admin") ||
      pathname.startsWith("/kitchen") ||
      pathname.startsWith("/login");
      
    const saved = localStorage.getItem("theme");

    if (!isAppRoute && saved === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [pathname]);

  return null;
}
