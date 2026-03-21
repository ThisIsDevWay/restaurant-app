import { getCategories } from "@/db/queries/menu";
import { getAllAdicionales } from "@/db/queries/adicionales";
import { getAllContornos } from "@/db/queries/contornos";
import { getActiveRate } from "@/db/queries/settings";
import { MenuItemForm } from "@/components/admin/menu/MenuItemForm";

export default async function NewMenuItemPage() {
  const [categories, rateResult, allAdicionales, allContornos] = await Promise.all([
    getCategories(),
    getActiveRate(),
    getAllAdicionales(),
    getAllContornos(),
  ]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-text-main">Nuevo item</h1>
      <MenuItemForm
        categories={categories}
        exchangeRate={rateResult?.rate ?? 0}
        allAdicionales={allAdicionales}
        allContornos={allContornos}
      />
    </div>
  );
}
