import { getCategories } from "@/db/queries/menu";
import { getAllAdicionales } from "@/db/queries/adicionales";
import { getAllContornos } from "@/db/queries/contornos";
import { getAllBebidas } from "@/db/queries/bebidas";
import { getActiveRate, getSettings } from "@/db/queries/settings";
import { MenuItemForm } from "@/components/admin/menu/MenuItemForm";

export default async function NewMenuItemPage() {
  // Ola 1: data base crítica
  const categories = await getCategories().catch((err) => {
    console.error("[NewMenuItemPage] categories query failed:", err);
    return [] as Awaited<ReturnType<typeof getCategories>>;
  });

  // Ola 2: data complementaria con fallback individual
  const [rateResult, allAdicionales, allContornos, allBebidas, settingsResult] = await Promise.all([
    getActiveRate().catch((err) => {
      console.error("[NewMenuItemPage] rate query failed:", err);
      return null;
    }),
    getAllAdicionales().catch((err) => {
      console.error("[NewMenuItemPage] adicionales query failed:", err);
      return [] as Awaited<ReturnType<typeof getAllAdicionales>>;
    }),
    getAllContornos().catch((err) => {
      console.error("[NewMenuItemPage] contornos query failed:", err);
      return [] as Awaited<ReturnType<typeof getAllContornos>>;
    }),
    getAllBebidas().catch((err) => {
      console.error("[NewMenuItemPage] bebidas query failed:", err);
      return [] as Awaited<ReturnType<typeof getAllBebidas>>;
    }),
    getSettings().catch((err) => {
      console.error("[NewMenuItemPage] settings query failed:", err);
      return null;
    }),
  ]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-text-main">Nuevo item</h1>
      <MenuItemForm
        categories={categories}
        exchangeRate={rateResult?.rate ?? 0}
        allAdicionales={allAdicionales}
        allContornos={allContornos}
        allBebidas={allBebidas}
        adicionalesEnabled={settingsResult?.adicionalesEnabled ?? true}
        bebidasEnabled={settingsResult?.bebidasEnabled ?? true}
      />
    </div>
  );
}
