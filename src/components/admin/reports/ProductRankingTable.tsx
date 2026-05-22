import { formatBs } from "@/lib/money";
import type { ProductRankingRow } from "@/db/queries/reports";

/**
 * Tabla estática de ranking de productos (máx. 20 filas, sin paginación).
 * Los ingresos vienen en céntimos enteros → se muestran con formatBs.
 */
export function ProductRankingTable({ data }: { data: ProductRankingRow[] }) {
  const rows = data.slice(0, 20);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-ink">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-muted">
            <th className="py-2 pr-2 font-medium">#</th>
            <th className="py-2 pr-2 font-medium">Producto</th>
            <th className="py-2 pr-2 text-right font-medium">Órdenes</th>
            <th className="py-2 pr-2 text-right font-medium">Unidades</th>
            <th className="py-2 pr-2 text-right font-medium">Ingresos</th>
            <th className="py-2 text-right font-medium">%</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6} className="py-8 text-center text-text-muted">
                Sin datos en el rango seleccionado
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={row.itemId} className="hover:bg-bg-app/50">
                <td className="py-2 pr-2 tabular-nums text-text-muted">{i + 1}</td>
                <td className="py-2 pr-2 font-medium">{row.name}</td>
                <td className="py-2 pr-2 text-right tabular-nums">{row.inOrderCount}</td>
                <td className="py-2 pr-2 text-right tabular-nums">{row.units}</td>
                <td className="py-2 pr-2 text-right tabular-nums">{formatBs(row.revenueBsCents)}</td>
                <td className="py-2 text-right tabular-nums">{row.pctOfRevenue.toFixed(2)}%</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
