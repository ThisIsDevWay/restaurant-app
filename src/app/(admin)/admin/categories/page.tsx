import { getCategoriesWithItemCount } from "@/db/queries/menu";
import { CategoriesClient } from "./CategoriesClient";

export default async function CategoriesPage() {
  const categoriesWithCounts = await getCategoriesWithItemCount();

  const categories = categoriesWithCounts.map(({ itemCount, ...cat }) => cat);
  const itemCounts = Object.fromEntries(
    categoriesWithCounts.map(({ id, itemCount }) => [id, itemCount])
  );

  return <CategoriesClient categories={categories} itemCounts={itemCounts} />;
}
