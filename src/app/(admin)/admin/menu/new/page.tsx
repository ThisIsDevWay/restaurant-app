import { getCategories } from "@/db/queries/menu";
import { getActiveRate } from "@/db/queries/settings";
import { MenuItemForm } from "@/components/admin/menu/MenuItemForm";

export default async function NewMenuItemPage() {
  const [categories, rateResult] = await Promise.all([
    getCategories(),
    getActiveRate(),
  ]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-text-main">Nuevo item</h1>
      <MenuItemForm
        categories={categories}
        exchangeRate={rateResult?.rate ?? 0}
      />
    </div>
  );
}
