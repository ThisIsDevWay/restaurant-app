import { formatBs } from "@/lib/money";
import type { ProductRankingRow } from "@/db/queries/reports";

const typeLabels: Record<string, string> = {
  dish: "Plato",
  adicional: "Extra",
  bebida: "Bebida",
  contorno: "Contorno",
};

const typeColors: Record<string, string> = {
  dish: "bg-blue-100 text-blue-800 border-blue-200",
  adicional: "bg-purple-100 text-purple-800 border-purple-200",
  bebida: "bg-teal-100 text-teal-800 border-teal-200",
  contorno: "bg-amber-100 text-amber-800 border-amber-200",
};

export function ProductRankingTable({ data }: { data: ProductRankingRow[] }) {
  const rows = data.slice(0, 20);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-ink">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-muted">
            <th className="py-2 pr-2 font-medium">#</th>
            <th className="py-2 pr-2 font-medium">Producto</th>
            <th className="py-2 pr-2 font-medium text-center">Tipo</th>
            <th className="py-2 pr-2 text-right font-medium">Órdenes</th>
            <th className="py-2 pr-2 text-right font-medium">Unidades</th>
            <th className="py-2 pr-2 text-right font-medium">Ingresos</th>
            <th className="py-2 text-right font-medium">%</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={7} className="py-8 text-center text-text-muted">
                Sin datos en el rango seleccionado
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={row.itemId + "-" + row.type} className="hover:bg-bg-app/50">
                <td className="py-2 pr-2 tabular-nums text-text-muted">{i + 1}</td>
                <td className="py-2 pr-2 font-medium">{row.name}</td>
                <td className="py-2 pr-2 text-center">
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${typeColors[row.type] || "bg-gray-100 text-gray-800 border-gray-200"}`}>
                    {typeLabels[row.type] || row.type}
                  </span>
                </td>
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
