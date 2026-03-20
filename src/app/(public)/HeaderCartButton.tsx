"use client";

import { useCartStore } from "@/store/cartStore";
import { ShoppingCart } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function HeaderCartButton() {
  const itemCount = useCartStore((s) => s.itemCount());
  const openDrawer = useCartStore((s) => s.openDrawer);
  const [ready, setReady] = useState(false);
  const [bounce, setBounce] = useState(false);
  const prevCount = useRef(itemCount);

  // Render only after hydration — avoids SSR/client mismatch
  useEffect(() => {
    setReady(true);
  }, []);

  useEffect(() => {
    if (itemCount > prevCount.current) {
      setBounce(true);
      const t = setTimeout(() => setBounce(false), 300);
      prevCount.current = itemCount;
      return () => clearTimeout(t);
    }
    prevCount.current = itemCount;
  }, [itemCount]);

  if (!ready || itemCount === 0) return null;

  return (
    <button
      className="relative p-2"
      onClick={openDrawer}
      aria-label="Ver carrito"
    >
      <ShoppingCart className="h-6 w-6 text-text-main" />
      <span className={`absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white ${bounce ? "animate-bounce-once" : ""}`}>
        {itemCount > 9 ? "9+" : itemCount}
      </span>
    </button>
  );
}
