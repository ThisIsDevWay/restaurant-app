"use client";

import { useState } from "react";
import { MenuGrid } from "@/components/public/menu/MenuGrid";
import { CategoryFilter } from "@/components/public/menu/CategoryFilter";

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  priceUsdCents: number;
  categoryId: string;
  categoryName: string;
  categoryAllowAlone: boolean;
  isAvailable: boolean;
  imageUrl: string | null;
  sortOrder: number;
  optionGroups: Array<{
    id: string;
    name: string;
    type: "radio" | "checkbox";
    required: boolean;
    sortOrder: number;
    options: Array<{
      id: string;
      name: string;
      priceUsdCents: number;
      isAvailable: boolean;
      sortOrder: number;
    }>;
  }>;
  adicionales: Array<{
    id: string;
    name: string;
    priceUsdCents: number;
    isAvailable: boolean;
    sortOrder: number;
  }>;
  contornos: Array<{
    id: string;
    name: string;
    priceUsdCents: number;
    isAvailable: boolean;
    removable: boolean;
    substituteContornoIds: string[];
    sortOrder: number;
  }>;
}

interface Category {
  id: string;
  name: string;
  allowAlone: boolean;
}

interface ContornoOption {
  id: string;
  name: string;
  priceUsdCents: number;
  isAvailable: boolean;
  sortOrder: number;
}

interface MenuClientProps {
  items: MenuItem[];
  categories: Category[];
  rate: number | null;
  allContornos: ContornoOption[];
}

export function MenuClient({ items, categories, rate, allContornos }: MenuClientProps) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filteredItems = activeCategory
    ? items.filter((i) => i.categoryId === activeCategory)
    : items;

  return (
    <>
      <div className="sticky top-[52px] z-20 bg-bg-app shadow-card">
        <CategoryFilter
          categories={categories}
          activeCategory={activeCategory}
          onSelect={setActiveCategory}
        />
      </div>
      <MenuGrid items={filteredItems} rate={rate} allContornos={allContornos} />
    </>
  );
}
