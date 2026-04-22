"use client";

import { AlertCircle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { formatBs, formatRef } from "@/lib/money";
import type { UseFormRegister, FieldErrors, UseFormWatch, UseFormSetValue } from "react-hook-form";
import type { FormValues } from "@/hooks/useMenuItemForm";

interface MenuItemPriceSectionProps {
  register: UseFormRegister<FormValues>;
  errors: FieldErrors<FormValues>;
  watch: UseFormWatch<FormValues>;
  setValue: UseFormSetValue<FormValues>;
  categories: { id: string; name: string; isSimple?: boolean }[];
  exchangeRate: number;
}

export function MenuItemPriceSection({
  register,
  errors,
  watch,
  setValue,
  categories,
  exchangeRate,
}: MenuItemPriceSectionProps) {
  const currentPriceStr = watch("priceUsdDollars");
  const isPriceEmpty = !currentPriceStr || currentPriceStr.trim() === "";
  const isFree = !isPriceEmpty && parseFloat(currentPriceStr) === 0;

  const currentPriceBs = parseFloat(currentPriceStr || "0") * exchangeRate * 100 || 0;
  const currentCostStr = watch("costUsdDollars") ?? "";
  const currentCostCents = currentCostStr ? Math.round(parseFloat(currentCostStr) * 100) : 0;
  const currentPriceCents = Math.round(parseFloat(currentPriceStr || "0") * 100);
  const marginPct = currentCostCents > 0 && currentPriceCents > 0
    ? Math.round(((currentPriceCents - currentCostCents) / currentPriceCents) * 100)
    : null;
  const isAvailable = watch("isAvailable");

  return (
    <>
      {/* Row 2: Price & Category */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-8 border-t border-gray-200">
        <section className="space-y-6">
          <header>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Precio y Categoría</h2>
          </header>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Categoría</label>
              <select
                {...register("categoryId")}
                className="w-full h-10 px-3 text-sm border border-gray-200 rounded-md focus:border-primary focus:outline-none transition-colors"
              >
                <option value="">Seleccionar</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              {errors.categoryId && <p className="text-xs text-red-500">{errors.categoryId.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 p-4 bg-gray-50 rounded-lg">
            <div>
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase text-gray-400">Precio USD</label>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white border border-gray-200">
                  <span className="text-[10px] font-medium text-gray-500 uppercase">Item sin costo</span>
                  <Switch
                    size="sm"
                    checked={isFree}
                    onCheckedChange={(checked) => {
                      setValue("priceUsdDollars", checked ? "0" : "1.00");
                    }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-xl font-light text-gray-400">$</span>
                <input
                  {...register("priceUsdDollars")}
                  type="number"
                  step="0.01"
                  className={`bg-transparent text-2xl font-medium w-full focus:outline-none ${isFree ? 'text-green-600' : ''}`}
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-gray-400">Referencia Bs.</label>
              <p className={`text-2xl mt-1 ${isFree ? "text-green-600 font-medium" : "text-gray-500 font-light"}`}>
                {isFree ? "ITEM SIN COSTO" : (currentPriceBs > 0 ? formatBs(currentPriceBs).replace("Bs.", "").trim() : "0.00")}
              </p>
            </div>
          </div>

          {/* Cost + Margin */}
          <div className="p-4 bg-gray-50 rounded-lg space-y-3">
            <div className="grid grid-cols-2 gap-8">
              <div>
                <label className="text-[10px] font-bold uppercase text-gray-400">Costo estimado (USD)</label>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-xl font-light text-gray-400">$</span>
                  <input
                    {...register("costUsdDollars")}
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className="bg-transparent text-2xl font-medium w-full focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-gray-400">Costo Bs.</label>
                <p className="text-2xl font-light text-gray-500 mt-1">
                  {currentCostCents > 0 ? formatBs(Math.round(currentCostCents * exchangeRate)).replace("Bs.", "").trim() : "—"}
                </p>
              </div>
            </div>

            {marginPct !== null && (
              <div className={`flex items-center gap-3 p-3 rounded-lg ${marginPct >= 40 ? "bg-green-50 border border-green-200" :
                marginPct >= 20 ? "bg-yellow-50 border border-yellow-200" :
                  "bg-red-50 border border-red-200"
                }`}>
                <div className={`h-3 w-3 rounded-full ${marginPct >= 40 ? "bg-green-500" :
                  marginPct >= 20 ? "bg-yellow-500" :
                    "bg-red-500"
                  }`} />
                <div>
                  <span className={`text-sm font-bold ${marginPct >= 40 ? "text-green-700" :
                    marginPct >= 20 ? "text-yellow-700" :
                      "text-red-700"
                    }`}>
                    Margen: {marginPct}%
                  </span>
                  <span className="text-xs text-gray-500 ml-2">
                    ({formatRef(currentPriceCents - currentCostCents)} ganancia)
                  </span>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="space-y-6">
          <header>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Disponibilidad</h2>
          </header>

          <div className="flex items-center justify-between p-4 border border-gray-300 rounded-lg bg-white">
            <div>
              <p className="text-sm font-medium text-gray-900">Activo en menú</p>
              <p className="text-xs text-gray-500">Muestra u oculta este plato a los clientes.</p>
            </div>
            <Switch
              checked={isAvailable}
              onCheckedChange={(val) => setValue("isAvailable", val)}
            />
          </div>
        </section>
      </div>
    </>
  );
}
