import { notFound } from "next/navigation";
import { getMenuItemById, getCategories } from "@/db/queries/menu";
import { getAllAdicionales, getAdicionalesByMenuItemId } from "@/db/queries/adicionales";
import { getAllContornos, getContornosByMenuItemId } from "@/db/queries/contornos";
import { getAllBebidas, getBebidasByMenuItemId } from "@/db/queries/bebidas";
import { getActiveRate, getSettings } from "@/db/queries/settings";
import { MenuItemForm } from "@/components/admin/menu/MenuItemForm";

export default async function EditMenuItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [item, categories, rateResult, allAdicionales, allContornos, allBebidas, settingsResult] = await Promise.all([
    getMenuItemById(id),
    getCategories(),
    getActiveRate(),
    getAllAdicionales(),
    getAllContornos(),
    getAllBebidas(),
    getSettings(),
  ]);

  if (!item) {
    notFound();
  }

  const itemAdicionales = await getAdicionalesByMenuItemId(id);
  const itemContornos = await getContornosByMenuItemId(id);
  const itemBebidas = await getBebidasByMenuItemId(id);

  return (
    <div className="-mt-2">
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
        allBebidas={allBebidas}
        initialSelectedBebidaIds={itemBebidas.map((b) => b.id)}
        adicionalesEnabled={settingsResult?.adicionalesEnabled ?? true}
        bebidasEnabled={settingsResult?.bebidasEnabled ?? true}
      />
    </div>
  );
}
