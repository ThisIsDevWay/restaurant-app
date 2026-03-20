"use client";

import { cn } from "@/lib/utils";

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
  return (
    <div className="flex flex-wrap gap-2 px-4 py-3">
      <button
        onClick={() => onSelect(null)}
        className={cn(
          "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
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
            "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
            activeCategory === cat.id
              ? "bg-primary text-white"
              : "border border-border bg-bg-card text-text-main",
          )}
        >
          {cat.name}
        </button>
      ))}
    </div>
  );
}
