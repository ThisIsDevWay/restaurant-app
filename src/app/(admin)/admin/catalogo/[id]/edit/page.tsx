import { notFound } from "next/navigation";
import { getMenuItemById, getCategories } from "@/db/queries/menu";
import { getActiveRate } from "@/db/queries/settings";
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

  // Ola 2: data complementaria
  const [rateResult] = await Promise.all([
    getActiveRate().catch((err) => {
      console.error("[EditMenuItemPage] rate query failed:", err);
      return null;
    }),
  ]);

  return (
    <div className="-mt-2">
      <MenuItemForm
        categories={categories}
        initialData={item}
        exchangeRate={rateResult?.rate ?? 0}
      />
    </div>
  );
}
