import { getCategories } from "@/db/queries/menu";
import { getActiveRate } from "@/db/queries/settings";
import { MenuItemForm } from "@/components/admin/menu/MenuItemForm";

export default async function NewMenuItemPage() {
  const categories = await getCategories().catch((err) => {
    console.error("[NewMenuItemPage] categories query failed:", err);
    return [] as Awaited<ReturnType<typeof getCategories>>;
  });

  const [rateResult] = await Promise.all([
    getActiveRate().catch((err) => {
      console.error("[NewMenuItemPage] rate query failed:", err);
      return null;
    }),
  ]);

  return (
    <MenuItemForm
      categories={categories}
      exchangeRate={rateResult?.rate ?? 0}
    />
  );
}