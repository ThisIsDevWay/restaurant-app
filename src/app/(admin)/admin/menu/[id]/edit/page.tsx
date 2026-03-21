import { notFound } from "next/navigation";
import { getMenuItemById, getCategories } from "@/db/queries/menu";
import { getAllAdicionales, getAdicionalesByMenuItemId } from "@/db/queries/adicionales";
import { getAllContornos, getContornosByMenuItemId } from "@/db/queries/contornos";
import { getActiveRate } from "@/db/queries/settings";
import { MenuItemForm } from "@/components/admin/menu/MenuItemForm";

export default async function EditMenuItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [item, categories, rateResult, allAdicionales, allContornos] = await Promise.all([
    getMenuItemById(id),
    getCategories(),
    getActiveRate(),
    getAllAdicionales(),
    getAllContornos(),
  ]);

  if (!item) {
    notFound();
  }

  const itemAdicionales = await getAdicionalesByMenuItemId(id);
  const itemContornos = await getContornosByMenuItemId(id);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-text-main">Editar item</h1>
      <MenuItemForm
        categories={categories}
        initialData={item}
        exchangeRate={rateResult?.rate ?? 0}
        allAdicionales={allAdicionales}
        initialSelectedAdicionalIds={itemAdicionales.map((a) => a.id)}
        allContornos={allContornos}
        initialSelectedContornos={itemContornos.map((c) => ({
          id: c.id,
          name: c.name,
          removable: c.removable,
          substituteContornoIds: c.substituteContornoIds,
        }))}
      />
    </div>
  );
}
