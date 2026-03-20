import { notFound } from "next/navigation";
import { getMenuItemById, getCategories } from "@/db/queries/menu";
import { MenuItemForm } from "@/components/admin/menu/MenuItemForm";

export default async function EditMenuItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [item, categories] = await Promise.all([
    getMenuItemById(id),
    getCategories(),
  ]);

  if (!item) {
    notFound();
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-text-main">Editar item</h1>
      <MenuItemForm categories={categories} initialData={item} />
    </div>
  );
}
