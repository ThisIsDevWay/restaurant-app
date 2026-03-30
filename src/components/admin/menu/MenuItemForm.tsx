"use client";

import { useForm } from "react-hook-form";
import * as v from "valibot";
import { valibotResolver } from "@hookform/resolvers/valibot";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { createMenuItem, updateMenuItem, deleteMenuItem, generateUploadUrl, getPublicUrl } from "@/actions/menu";
import { saveMenuItemAdicionales } from "@/actions/adicionales";
import { saveMenuItemContornos } from "@/actions/contornos";
import { saveMenuItemBebidas } from "@/actions/bebidas";
import {
  Image as ImageIcon,
  Upload,
  ExternalLink,
  ChevronLeft,
  Save,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Tag,
  ListChecks,
  Plus,
  Eye,
  EyeOff,
  Layers,
  Coffee,
} from "lucide-react";
import { formatBs, formatRef } from "@/lib/money";

const formSchema = v.object({
  name: v.pipe(v.string(), v.minLength(1, "Nombre requerido"), v.maxLength(100, "Máximo 100 caracteres")),
  description: v.optional(
    v.pipe(v.string(), v.maxLength(300, "Máximo 300 caracteres")),
  ),
  categoryId: v.pipe(v.string(), v.uuid("Selecciona una categoría")),
  priceUsdDollars: v.pipe(
    v.string(),
    v.minLength(1, "Precio requerido"),
    v.check((val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0;
    }, "Precio inválido"),
  ),
  costUsdDollars: v.optional(v.pipe(
    v.string(),
    v.check((val) => {
      if (!val || val === "") return true;
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0;
    }, "Costo inválido"),
  )),
  imageUrl: v.optional(v.string()),
  isAvailable: v.boolean(),
});

type FormValues = v.InferOutput<typeof formSchema>;

interface ContornoSelection {
  id: string;
  name: string;
  removable: boolean;
  substituteContornoIds: string[];
}

interface MenuItemFormProps {
  categories: { id: string; name: string; isSimple?: boolean }[];
  initialData?: {
    id: string;
    name: string;
    description?: string | null;
    categoryId: string;
    priceUsdCents: number;
    costUsdCents?: number | null;
    costUpdatedAt?: string | Date | null;
    sortOrder?: number | null;
    imageUrl?: string | null;
    isAvailable: boolean;
  };
  exchangeRate: number;
  allAdicionales: { id: string; name: string; priceUsdCents: number; isAvailable: boolean }[];
  initialSelectedAdicionalIds?: string[];
  allContornos: { id: string; name: string; priceUsdCents: number; isAvailable: boolean }[];
  initialSelectedContornos?: ContornoSelection[];
  allBebidas?: { id: string; name: string; priceUsdCents: number; isAvailable: boolean }[];
  initialSelectedBebidaIds?: string[];
  adicionalesEnabled?: boolean;
  bebidasEnabled?: boolean;
}

export function MenuItemForm({
  categories,
  initialData,
  exchangeRate,
  allAdicionales,
  initialSelectedAdicionalIds = [],
  allContornos,
  initialSelectedContornos = [],
  allBebidas = [],
  initialSelectedBebidaIds = [],
  adicionalesEnabled = true,
  bebidasEnabled = true,
}: MenuItemFormProps) {
  const router = useRouter();
  const isEdit = !!initialData;

  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialData?.imageUrl ?? null);
  const [selectedAdicionalIds, setSelectedAdicionalIds] = useState<string[]>(initialSelectedAdicionalIds);
  const [selectedContornos, setSelectedContornos] = useState<ContornoSelection[]>(initialSelectedContornos);
  const [selectedBebidaIds, setSelectedBebidaIds] = useState<string[]>(initialSelectedBebidaIds);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: valibotResolver(formSchema),
    defaultValues: {
      name: initialData?.name ?? "",
      description: initialData?.description ?? "",
      categoryId: initialData?.categoryId ?? "",
      priceUsdDollars: initialData ? String((initialData.priceUsdCents / 100).toFixed(2)) : "",
      costUsdDollars: initialData?.costUsdCents ? String((initialData.costUsdCents / 100).toFixed(2)) : "",
      imageUrl: initialData?.imageUrl ?? "",
      isAvailable: initialData?.isAvailable ?? true,
    },
  });

  const watchedName = watch("name");
  const watchedDesc = watch("description") ?? "";
  const currentPriceStr = watch("priceUsdDollars");
  const currentPriceBs = parseFloat(currentPriceStr) * exchangeRate * 100 || 0;
  const currentCostStr = watch("costUsdDollars") ?? "";
  const currentCostCents = currentCostStr ? Math.round(parseFloat(currentCostStr) * 100) : 0;
  const currentPriceCents = Math.round(parseFloat(currentPriceStr || "0") * 100);
  const marginPct = currentCostCents > 0 && currentPriceCents > 0
    ? Math.round(((currentPriceCents - currentCostCents) / currentPriceCents) * 100)
    : null;
  const isAvailable = watch("isAvailable");
  const watchedCategoryId = watch("categoryId");
  const selectedCategory = categories.find((c) => c.id === watchedCategoryId);
  const isSimpleCategory = selectedCategory?.isSimple ?? false;

  function toggleContorno(contorno: { id: string; name: string }) {
    setSelectedContornos((prev) => {
      const exists = prev.find((c) => c.id === contorno.id);
      if (exists) return prev.filter((c) => c.id !== contorno.id);
      return [...prev, { id: contorno.id, name: contorno.name, removable: false, substituteContornoIds: [] }];
    });
  }

  function toggleContornoRemovable(id: string) {
    setSelectedContornos((prev) =>
      prev.map((c) => (c.id === id ? { ...c, removable: !c.removable, substituteContornoIds: [] } : c)),
    );
  }

  function toggleSubstituteContorno(contornoId: string, subId: string) {
    setSelectedContornos((prev) =>
      prev.map((c) => {
        if (c.id !== contornoId) return c;
        const already = c.substituteContornoIds.includes(subId);
        return {
          ...c,
          substituteContornoIds: already
            ? c.substituteContornoIds.filter((id) => id !== subId)
            : [...c.substituteContornoIds, subId],
        };
      }),
    );
  }

  async function onDelete() {
    if (!initialData) return;
    setSubmitting(true);
    try {
      const result = await deleteMenuItem(initialData.id);
      if (!result.success) throw new Error(result.error);
      router.push("/admin/catalogo");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar");
      setSubmitting(false);
      setShowDeleteConfirm(false);
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const result = await generateUploadUrl(file.name);
      if (!result.success) throw new Error(result.error);
      await fetch(result.url, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      const publicUrl = await getPublicUrl(result.path);
      setPreviewUrl(publicUrl);
      setValue("imageUrl", publicUrl);
    } catch {
      setError("Error al subir la imagen");
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(data: FormValues) {
    setSubmitting(true);
    setError(null);
    try {
      const priceUsdCents = Math.round(parseFloat(data.priceUsdDollars) * 100);
      const costUsdCents = data.costUsdDollars && data.costUsdDollars !== ""
        ? Math.round(parseFloat(data.costUsdDollars) * 100)
        : undefined;
      let itemId: string;
      if (isEdit) {
        await updateMenuItem(initialData.id, { ...data, priceUsdCents, costUsdCents, imageUrl: data.imageUrl ?? "" });
        itemId = initialData.id;
      } else {
        const result = await createMenuItem({ ...data, priceUsdCents, costUsdCents, imageUrl: data.imageUrl ?? "" });
        if (!result.success || !result.item) throw new Error(result.error ?? "Error al crear");
        itemId = result.item.id;
      }
      await saveMenuItemAdicionales(itemId, selectedAdicionalIds);
      await saveMenuItemBebidas(itemId, selectedBebidaIds);
      await saveMenuItemContornos(
        itemId,
        selectedContornos.map((c) => ({
          contornoId: c.id,
          removable: c.removable,
          substituteContornoIds: c.substituteContornoIds,
        })),
      );
      router.push("/admin/catalogo");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-4xl mx-auto py-8 px-4">
      {/* ── Minimalistic Header ── */}
      <div className="flex items-center justify-between mb-12">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.push("/admin/catalogo")}
            className="p-2 hover:bg-gray-50 rounded-full transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-gray-500" />
          </button>
          <div>
            <h1 className="text-2xl font-medium text-gray-900 tracking-tight">
              {isEdit ? (watchedName || initialData.name) : "Nuevo producto"}
            </h1>
            <div className="flex items-center gap-3 mt-1">
              {selectedCategory && (
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Tag className="h-3 w-3" />
                  {selectedCategory.name}
                </span>
              )}
              <span className={`text-xs font-medium ${isAvailable ? "text-green-600" : "text-gray-500"}`}>
                {isAvailable ? "● Disponible" : "○ Oculto"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isEdit && (
            <div className="flex items-center gap-2 mr-2 pr-2 border-r border-gray-200">
              {showDeleteConfirm ? (
                <>
                  <span className="text-xs text-red-600 font-medium">¿Confirmar?</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="text-gray-500 h-8"
                  >
                    No
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={onDelete}
                    disabled={submitting}
                    className="h-8 bg-red-600 hover:bg-red-700"
                  >
                    Sí, borrar
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8 gap-1.5"
                >
                  <Trash2 className="h-4 w-4" />
                  Borrar
                </Button>
              )}
            </div>
          )}
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push("/admin/catalogo")}
            className="text-gray-500 hover:text-gray-900"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={submitting || uploading}
            className="bg-primary text-white hover:bg-primary-hover px-6 font-medium"
          >
            {submitting ? "Guardando..." : isEdit ? "Guardar" : "Crear"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-8 p-4 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100 animate-in fade-in duration-300">
          <p className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {error}
          </p>
        </div>
      )}

      {/* ── Simplified Sections ── */}
      <div className="space-y-16">
        {/* Row 1: Basic Info & Image */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Identidad */}
          <section className="space-y-6">
            <header>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Información básica</h2>
            </header>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Nombre</label>
                <Input
                  {...register("name")}
                  placeholder="Ej: Pollo Guisado"
                  className="border-gray-200 focus:border-primary transition-colors h-10"
                />
                {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Descripción</label>
                <textarea
                  {...register("description")}
                  placeholder="Descripción del plato..."
                  rows={4}
                  className="w-full p-3 text-sm border border-gray-200 rounded-md focus:border-primary focus:outline-none transition-colors resize-none"
                />
                {errors.description && <p className="text-xs text-red-500">{errors.description.message}</p>}
              </div>
            </div>
          </section>

          {/* Imagen */}
          <section className="space-y-6">
            <header>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Imagen</h2>
            </header>

            <div className="aspect-square relative rounded-lg border border-gray-200 bg-gray-50 overflow-hidden group">
              {previewUrl ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-white/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-50"
                    >
                      <Upload className="h-4 w-4 text-gray-700" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewUrl(null);
                        setValue("imageUrl", "");
                      }}
                      className="p-2 bg-white rounded-full shadow-sm hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </button>
                  </div>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 flex flex-col items-center justify-center gap-2 hover:bg-gray-100 transition-colors"
                >
                  <ImageIcon className="h-8 w-8 text-gray-300" />
                  <span className="text-xs text-gray-500">Añadir imagen</span>
                </button>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </div>
            {uploading && <p className="text-xs text-gray-500 text-center animate-pulse">Subiendo...</p>}
          </section>
        </div>

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
                      checked={parseFloat(currentPriceStr || "0") === 0}
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
                    disabled={parseFloat(currentPriceStr || "0") === 0}
                    className="bg-transparent text-2xl font-medium w-full focus:outline-none disabled:text-green-600 disabled:opacity-100"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-gray-400">Referencia Bs.</label>
                <p className={`text-2xl font-light mt-1 ${currentPriceCents === 0 ? "text-green-600 font-medium" : "text-gray-500"}`}>
                  {currentPriceCents === 0 ? "ITEM SIN COSTO" : (currentPriceBs > 0 ? formatBs(currentPriceBs).replace("Bs.", "").trim() : "0.00")}
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

              {isEdit && initialData?.costUpdatedAt && (
                <p className="text-[10px] text-gray-400">
                  Última actualización: {new Date(initialData.costUpdatedAt).toLocaleDateString("es-VE", { day: "numeric", month: "short", year: "numeric" })}
                </p>
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

        {/* Row 3+: Contornos (full width) */}
        {!isSimpleCategory && allContornos.length > 0 && (
          <section className="pt-16 border-t border-gray-200 space-y-8">
            <header className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Contornos</h2>
                <p className="text-xs text-gray-500 mt-1">Configura los acompañamientos y sus opciones de sustitución.</p>
              </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allContornos.map((contorno) => {
                const selected = selectedContornos.find((c) => c.id === contorno.id);
                const isSelected = !!selected;
                return (
                  <div
                    key={contorno.id}
                    className={`p-4 rounded-lg border-2 transition-all duration-200 ${isSelected
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                      }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => toggleContorno(contorno)}
                        className="flex-1 text-left flex items-start gap-3"
                      >
                        <div className={`mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? "border-primary bg-primary" : "border-gray-300 bg-white"
                          }`}>
                          {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                        </div>
                        <div className="min-w-0">
                          <p className={`text-sm font-semibold ${isSelected ? "text-primary" : "text-gray-700"}`}>
                            {contorno.name}
                          </p>
                          <p className="text-[10px] text-gray-500 mt-0.5">{formatRef(contorno.priceUsdCents)}</p>
                        </div>
                      </button>
                      <div className={`h-1.5 w-1.5 rounded-full mt-1.5 shadow-sm ${contorno.isAvailable ? "bg-green-500" : "bg-red-400"}`} />
                    </div>

                    {isSelected && (
                      <div className="mt-4 pt-4 border-t border-gray-200 space-y-4 animate-in fade-in duration-200">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase text-gray-400">Intercambiable</span>
                          <Switch
                            checked={selected.removable}
                            onCheckedChange={() => toggleContornoRemovable(contorno.id)}
                          />
                        </div>

                        {selected.removable && (
                          <div className="space-y-2">
                            <p className="text-[10px] uppercase text-gray-400 font-bold">Sustitutos</p>
                            <div className="flex flex-wrap gap-1.5">
                              {allContornos
                                .filter((c) => c.id !== contorno.id)
                                .map((sub) => {
                                  const isSubValue = selected.substituteContornoIds.includes(sub.id);
                                  return (
                                    <button
                                      key={sub.id}
                                      type="button"
                                      onClick={() => toggleSubstituteContorno(contorno.id, sub.id)}
                                      className={`px-2 py-1 text-[10px] rounded border transition-colors ${isSubValue
                                        ? "bg-primary border-primary text-white"
                                        : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
                                        }`}
                                    >
                                      {sub.name}
                                    </button>
                                  );
                                })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Row 4+: Adicionales (full width) */}
        {!isSimpleCategory && allAdicionales.length > 0 && (
          <section className="pt-16 border-t border-gray-200 space-y-8">
            <header className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Adicionales</h2>
                {!adicionalesEnabled && (
                  <span className="text-[10px] text-red-400 font-bold ml-2">(DESHABILITADOS GLOBALMENTE)</span>
                )}
              </div>
            </header>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {allAdicionales.map((adicional) => {
                const isChecked = selectedAdicionalIds.includes(adicional.id);
                return (
                  <button
                    key={adicional.id}
                    type="button"
                    onClick={() => {
                      setSelectedAdicionalIds((prev) =>
                        prev.includes(adicional.id)
                          ? prev.filter((id) => id !== adicional.id)
                          : [...prev, adicional.id],
                      );
                    }}
                    className={`p-3 text-left rounded-lg border-2 transition-all flex items-center gap-3 ${isChecked
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                      }`}
                  >
                    <div className={`h-3.5 w-3.5 shrink-0 rounded border-2 flex items-center justify-center transition-colors ${isChecked ? "border-primary bg-primary" : "border-gray-300 bg-white"
                      }`}>
                      {isChecked && <CheckCircle2 className="h-2.5 w-2.5 text-white" strokeWidth={4} />}
                    </div>
                    <div>
                      <p className={`text-xs font-bold truncate ${isChecked ? "text-gray-900" : "text-gray-700"}`}>
                        {adicional.name}
                      </p>
                      <p className="text-[10px] text-gray-500 mt-0.5">{formatRef(adicional.priceUsdCents)}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Row 5+: Bebidas (full width) */}
        {!isSimpleCategory && allBebidas.length > 0 && (
          <section className="pt-16 border-t border-gray-200 space-y-8">
            <header className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Bebidas sugeridas</h2>
                {!bebidasEnabled && (
                  <span className="text-[10px] text-red-400 font-bold ml-2">(DESHABILITADAS GLOBALMENTE)</span>
                )}
              </div>
            </header>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {allBebidas.map((bebida) => {
                const isChecked = selectedBebidaIds.includes(bebida.id);
                return (
                  <button
                    key={bebida.id}
                    type="button"
                    onClick={() => {
                      setSelectedBebidaIds((prev) =>
                        prev.includes(bebida.id)
                          ? prev.filter((id) => id !== bebida.id)
                          : [...prev, bebida.id],
                      );
                    }}
                    className={`p-3 text-left rounded-lg border-2 transition-all flex items-center gap-3 ${isChecked
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                      }`}
                  >
                    <div className={`h-3.5 w-3.5 shrink-0 rounded border-2 flex items-center justify-center transition-colors ${isChecked ? "border-gray-900 bg-gray-900" : "border-gray-300 bg-white"
                      }`}>
                      {isChecked && <CheckCircle2 className="h-2.5 w-2.5 text-white" strokeWidth={4} />}
                    </div>
                    <div>
                      <p className={`text-xs font-bold truncate ${isChecked ? "text-gray-900" : "text-gray-700"}`}>
                        {bebida.name}
                      </p>
                      <p className="text-[10px] text-gray-500 mt-0.5">{formatRef(bebida.priceUsdCents)}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </form>
  );
}

