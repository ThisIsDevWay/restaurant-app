import { getCategories } from "@/db/queries/menu";
import { getCategoryUsageCount } from "@/actions/categories";
import { CategoriesClient } from "./CategoriesClient";

export default async function CategoriesPage() {
  const categories = await getCategories();

  const itemCounts: Record<string, number> = {};
  for (const cat of categories) {
    itemCounts[cat.id] = await getCategoryUsageCount(cat.id);
  }

  return <CategoriesClient categories={categories} itemCounts={itemCounts} />;
}
