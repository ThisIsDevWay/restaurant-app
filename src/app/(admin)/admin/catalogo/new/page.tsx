import { getCategories } from "@/db/queries/menu";
import { getSimpleMenuItems } from "@/db/queries/menu-components";
import { getActiveRate } from "@/db/queries/settings";
import { MenuItemForm } from "@/components/admin/menu/MenuItemForm";

export default async function NewMenuItemPage() {
  const [categories, availableContornos, rateResult] = await Promise.all([
    getCategories().catch((err) => {
      console.error("[NewMenuItemPage] categories query failed:", err);
      return [] as Awaited<ReturnType<typeof getCategories>>;
    }),
    getSimpleMenuItems().catch((err) => {
      console.error("[NewMenuItemPage] simpleItems query failed:", err);
      return [] as Awaited<ReturnType<typeof getSimpleMenuItems>>;
    }),
    getActiveRate().catch((err) => {
      console.error("[NewMenuItemPage] rate query failed:", err);
      return null;
    }),
  ]);

  return (
    <MenuItemForm
      categories={categories}
      availableContornos={availableContornos}
      exchangeRate={rateResult?.rate ?? 0}
    />
  );
}