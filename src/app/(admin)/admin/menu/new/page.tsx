import { getCategories } from "@/db/queries/menu";
import { MenuItemForm } from "@/components/admin/menu/MenuItemForm";

export default async function NewMenuItemPage() {
  const categories = await getCategories();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-text-main">Nuevo item</h1>
      <MenuItemForm categories={categories} />
    </div>
  );
}
