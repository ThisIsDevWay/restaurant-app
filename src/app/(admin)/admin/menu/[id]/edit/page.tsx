import { notFound } from "next/navigation";
import { getMenuItemById, getCategories, getMenuItemWithOptionsAndComponents } from "@/db/queries/menu";
import { getActiveRate } from "@/db/queries/settings";
import { MenuItemForm } from "@/components/admin/menu/MenuItemForm";

export default async function EditMenuItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [item, categories, rateResult] = await Promise.all([
    getMenuItemById(id),
    getCategories(),
    getActiveRate(),
  ]);

  if (!item) {
    notFound();
  }

  // Fetch components separately for the form
  const itemWithComponents = await getMenuItemWithOptionsAndComponents(id);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-text-main">Editar item</h1>
      <MenuItemForm
        categories={categories}
        initialData={item}
        initialComponents={itemWithComponents?.dishComponents ?? []}
        exchangeRate={rateResult?.rate ?? 0}
      />
    </div>
  );
}
