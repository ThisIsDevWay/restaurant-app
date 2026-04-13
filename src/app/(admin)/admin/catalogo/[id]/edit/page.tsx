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

  // Ola 1: data base crítica
  const [item, categories] = await Promise.all([
    getMenuItemById(id).catch((err) => {
      console.error("[EditMenuItemPage] item query failed:", err);
      return null;
    }),
    getCategories().catch((err) => {
      console.error("[EditMenuItemPage] categories query failed:", err);
      return [] as Awaited<ReturnType<typeof getCategories>>;
    }),
  ]);

  if (!item) {
    notFound();
  }

  // Ola 2: data complementaria con fallback individual
  const [rateResult, allAdicionales, allContornos, allBebidas, settingsResult] = await Promise.all([
    getActiveRate().catch((err) => {
      console.error("[EditMenuItemPage] rate query failed:", err);
      return null;
    }),
    getAllAdicionales().catch((err) => {
      console.error("[EditMenuItemPage] adicionales query failed:", err);
      return [] as Awaited<ReturnType<typeof getAllAdicionales>>;
    }),
    getAllContornos().catch((err) => {
      console.error("[EditMenuItemPage] contornos query failed:", err);
      return [] as Awaited<ReturnType<typeof getAllContornos>>;
    }),
    getAllBebidas().catch((err) => {
      console.error("[EditMenuItemPage] bebidas query failed:", err);
      return [] as Awaited<ReturnType<typeof getAllBebidas>>;
    }),
    getSettings().catch((err) => {
      console.error("[EditMenuItemPage] settings query failed:", err);
      return null;
    }),
  ]);

  const [itemAdicionales, itemContornos, itemBebidas] = await Promise.all([
    getAdicionalesByMenuItemId(id).catch((err) => {
      console.error("[EditMenuItemPage] itemAdicionales query failed:", err);
      return [] as Awaited<ReturnType<typeof getAdicionalesByMenuItemId>>;
    }),
    getContornosByMenuItemId(id).catch((err) => {
      console.error("[EditMenuItemPage] itemContornos query failed:", err);
      return [] as Awaited<ReturnType<typeof getContornosByMenuItemId>>;
    }),
    getBebidasByMenuItemId(id).catch((err) => {
      console.error("[EditMenuItemPage] itemBebidas query failed:", err);
      return [] as Awaited<ReturnType<typeof getBebidasByMenuItemId>>;
    }),
  ]);

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
