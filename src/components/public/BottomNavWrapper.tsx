"use client";

import { usePathname } from "next/navigation";
import { BottomNav } from "./BottomNav";

export function BottomNavWrapper() {
  const pathname = usePathname();
  if (pathname === "/checkout") return null;
  return <BottomNav />;
}
