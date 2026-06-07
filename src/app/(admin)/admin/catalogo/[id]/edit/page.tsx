import { notFound } from "next/navigation";
import { getMenuItemById, getCategories } from "@/db/queries/menu";
import { getMenuItemContornos, getSimpleMenuItems } from "@/db/queries/menu-components";
import { getActiveRate } from "@/db/queries/settings";
import { MenuItemForm } from "@/components/admin/menu/MenuItemForm";

export default async function EditMenuItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Wave 1: critical base data
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

  // Wave 2: supplementary data in parallel
  const [rateResult, currentContornos, availableContornos] = await Promise.all([
    getActiveRate().catch((err) => {
      console.error("[EditMenuItemPage] rate query failed:", err);
      return null;
    }),
    getMenuItemContornos(id).catch((err) => {
      console.error("[EditMenuItemPage] contornos query failed:", err);
      return [] as Awaited<ReturnType<typeof getMenuItemContornos>>;
    }),
    getSimpleMenuItems().catch((err) => {
      console.error("[EditMenuItemPage] simpleItems query failed:", err);
      return [] as Awaited<ReturnType<typeof getSimpleMenuItems>>;
    }),
  ]);

  return (
    <div className="-mt-2">
      <MenuItemForm
        categories={categories}
        availableContornos={availableContornos}
        initialData={{
          ...item,
          portionNote: item.portionNote ?? null,
          contornos: currentContornos,
        }}
        exchangeRate={rateResult?.rate ?? 0}
      />
    </div>
  );
}
