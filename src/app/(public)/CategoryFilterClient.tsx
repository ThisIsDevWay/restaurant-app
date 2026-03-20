"use client";

import { useState } from "react";
import { CategoryFilter } from "@/components/public/menu/CategoryFilter";

interface Category {
  id: string;
  name: string;
}

interface CategoryFilterClientProps {
  categories: Category[];
}

export function CategoryFilterClient({ categories }: CategoryFilterClientProps) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  return (
    <CategoryFilter
      categories={categories}
      activeCategory={activeCategory}
      onSelect={setActiveCategory}
    />
  );
}
