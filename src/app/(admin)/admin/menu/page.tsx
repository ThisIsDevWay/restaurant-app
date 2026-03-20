import { getMenuWithOptions } from "@/db/queries/menu";
import Link from "next/link";
import { Plus } from "lucide-react";
import { formatRef } from "@/lib/money";

export default async function MenuAdminPage() {
  const items = await getMenuWithOptions();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-main">Menú</h1>
          <p className="text-sm text-text-muted">{items.length} items</p>
        </div>
        <Link
          href="/admin/menu/new"
          className="flex items-center gap-2 rounded-input bg-primary px-4 py-2.5 text-sm font-semibold text-white"
        >
          <Plus className="h-4 w-4" />
          Nuevo item
        </Link>
      </div>

      <div className="overflow-hidden rounded-card border border-border bg-white shadow-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-bg-app text-left">
              <th className="px-4 py-3 font-semibold text-text-main">Nombre</th>
              <th className="px-4 py-3 font-semibold text-text-main">Categoría</th>
              <th className="px-4 py-3 font-semibold text-text-main">Precio</th>
              <th className="px-4 py-3 font-semibold text-text-main">Disponible</th>
              <th className="px-4 py-3 font-semibold text-text-main">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-border last:border-b-0">
                <td className="px-4 py-3 font-medium text-text-main">{item.name}</td>
                <td className="px-4 py-3 text-text-muted">{item.categoryName}</td>
                <td className="px-4 py-3 font-semibold text-price-green">
                  {formatRef(item.priceUsdCents)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block rounded-pill px-2 py-0.5 text-xs font-semibold ${
                      item.isAvailable
                        ? "bg-success/10 text-success"
                        : "bg-error/10 text-error"
                    }`}
                  >
                    {item.isAvailable ? "Sí" : "No"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/menu/${item.id}/edit`}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    Editar
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
