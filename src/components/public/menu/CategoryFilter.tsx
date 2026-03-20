"use client";

import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface CategoryFilterProps {
  categories: Array<{ id: string; name: string }>;
  activeCategory: string | null;
  onSelect: (id: string | null) => void;
}

export function CategoryFilter({
  categories,
  activeCategory,
  onSelect,
}: CategoryFilterProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showFade, setShowFade] = useState(true);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const check = () => {
      setShowFade(el.scrollWidth > el.clientWidth && el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    };

    check();
    el.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return () => {
      el.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, [categories]);

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-3"
      >
        <button
          onClick={() => onSelect(null)}
          className={cn(
            "shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
            activeCategory === null
              ? "bg-primary text-white"
              : "border border-border bg-bg-card text-text-main",
          )}
        >
          Todos
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onSelect(cat.id)}
            className={cn(
              "shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
              activeCategory === cat.id
                ? "bg-primary text-white"
                : "border border-border bg-bg-card text-text-main",
            )}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Fade + chevron indicator */}
      {showFade && (
        <div className="pointer-events-none absolute right-0 top-0 flex h-full items-center">
          <div className="h-full w-12 bg-gradient-to-l from-bg-app to-transparent" />
          <div className="pr-3">
            <ChevronRight className="h-4 w-4 text-text-muted" />
          </div>
        </div>
      )}
    </div>
  );
}
