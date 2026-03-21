"use client";

import { useForm } from "react-hook-form";
import * as v from "valibot";
import { valibotResolver } from "@hookform/resolvers/valibot";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { createMenuItem, updateMenuItem, generateUploadUrl, getPublicUrl } from "@/actions/menu";
import { saveMenuItemAdicionales } from "@/actions/adicionales";
import { saveMenuItemContornos } from "@/actions/contornos";
import { Image as ImageIcon, Upload, ExternalLink } from "lucide-react";
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
      return !isNaN(num) && num > 0;
    }, "Precio debe ser mayor a 0"),
  ),
  isAvailable: v.boolean(),
  sortOrder: v.pipe(v.number(), v.integer()),
  imageUrl: v.optional(v.string()),
});

type FormValues = v.InferOutput<typeof formSchema>;

interface Category {
  id: string;
  name: string;
}

interface MenuItemData {
  id: string;
  name: string;
  description: string | null;
  priceUsdCents: number;
  categoryId: string;
  isAvailable: boolean;
  imageUrl: string | null;
  sortOrder: number;
}

interface AdicionalOption {
  id: string;
  name: string;
  priceUsdCents: number;
  isAvailable: boolean;
}

interface ContornoOption {
  id: string;
  name: string;
  priceUsdCents: number;
  isAvailable: boolean;
}

interface SelectedContorno {
  id: string;
  name: string;
  removable: boolean;
  substituteContornoIds: string[];
}

interface MenuItemFormProps {
  categories: Category[];
  initialData?: MenuItemData;
  exchangeRate?: number;
  allAdicionales?: AdicionalOption[];
  initialSelectedAdicionalIds?: string[];
  allContornos?: ContornoOption[];
  initialSelectedContornos?: SelectedContorno[];
}

export function MenuItemForm({
  categories,
  initialData,
  exchangeRate = 0,
  allAdicionales = [],
  initialSelectedAdicionalIds = [],
  allContornos = [],
  initialSelectedContornos = [],
}: MenuItemFormProps) {
  const isEdit = !!initialData;
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    initialData?.imageUrl ?? null,
  );
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAdicionalIds, setSelectedAdicionalIds] = useState<string[]>(
    initialSelectedAdicionalIds,
  );
  const [selectedContornos, setSelectedContornos] = useState<SelectedContorno[]>(
    initialSelectedContornos,
  );

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: valibotResolver(formSchema),
    defaultValues: {
      name: initialData?.name ?? "",
      description: initialData?.description ?? "",
      categoryId: initialData?.categoryId ?? "",
      priceUsdDollars: initialData
        ? (initialData.priceUsdCents / 100).toFixed(2)
        : "",
      isAvailable: initialData?.isAvailable ?? true,
      sortOrder: initialData?.sortOrder ?? 0,
      imageUrl: initialData?.imageUrl ?? "",
    },
  });

  const isAvailable = watch("isAvailable");

  function toggleContorno(contorno: ContornoOption) {
    setSelectedContornos((prev) => {
      const existing = prev.find((c) => c.id === contorno.id);
      if (existing) {
        return prev.filter((c) => c.id !== contorno.id);
      }
      return [...prev, { id: contorno.id, name: contorno.name, removable: false, substituteContornoIds: [] }];
    });
  }

  function toggleContornoRemovable(id: string) {
    setSelectedContornos((prev) =>
      prev.map((c) => (c.id === id ? { ...c, removable: !c.removable } : c)),
    );
  }

  function toggleSubstituteContorno(contornoId: string, substituteId: string) {
    setSelectedContornos((prev) =>
      prev.map((c) => {
        if (c.id !== contornoId) return c;
        const current = c.substituteContornoIds;
        const next = current.includes(substituteId)
          ? current.filter((id) => id !== substituteId)
          : [...current, substituteId];
        return { ...c, substituteContornoIds: next };
      }),
    );
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError("La imagen no puede pesar más de 2MB");
      return;
    }

    if (!["image/png", "image/jpeg"].includes(file.type)) {
      setError("Solo se permiten imágenes PNG o JPG");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const urlResult = await generateUploadUrl(file.name);
      if (!urlResult.success) {
        setError(urlResult.error);
        return;
      }

      const uploadRes = await fetch(urlResult.url, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      if (!uploadRes.ok) {
        setError("Error al subir la imagen");
        return;
      }

      const publicUrl = await getPublicUrl(urlResult.path);
      setValue("imageUrl", publicUrl);
      setPreviewUrl(publicUrl);
    } catch {
      setError("Error al subir la imagen");
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(data: FormValues) {
    setSubmitting(true);
    setError(null);

    const priceUsdCents = Math.round(parseFloat(data.priceUsdDollars) * 100);

    const payload = {
      name: data.name,
      description: data.description || undefined,
      categoryId: data.categoryId,
      priceUsdCents,
      isAvailable: data.isAvailable,
      imageUrl: data.imageUrl || undefined,
      sortOrder: data.sortOrder,
    };

    try {
      const result = isEdit
        ? await updateMenuItem(initialData.id, payload)
        : await createMenuItem(payload);

      if (result.success) {
        const itemId = isEdit ? initialData.id : result.item?.id;
        // Save adicionales assignment
        if (itemId) {
          await saveMenuItemAdicionales(itemId, selectedAdicionalIds);
        }
        // Save contornos assignment
        if (itemId) {
          await saveMenuItemContornos(
            itemId,
            selectedContornos.map((c) => ({
              contornoId: c.id,
              removable: c.removable,
              substituteContornoIds: c.substituteContornoIds,
            })),
          );
        }
        router.push("/admin/menu");
      } else {
        setError(result.error ?? "Error desconocido");
      }
    } catch {
      setError("Error inesperado");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {error && (
        <div className="mb-6 rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left Column - Basic Info (3/5) */}
        <div className="lg:col-span-3 space-y-6">
          <Card className="ring-1 ring-border">
            <CardHeader className="border-b border-border">
              <CardTitle>Información básica</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 pt-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-main">
                  Nombre *
                </label>
                <Input {...register("name")} placeholder="Ej: Pollo Guisado" />
                {errors.name && (
                  <p className="mt-1 text-xs text-error">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-main">
                  Descripción
                </label>
                <textarea
                  {...register("description")}
                  placeholder="Descripción del plato..."
                  rows={3}
                  className="w-full rounded-xl border border-border bg-white px-4 py-2.5 text-sm text-text-main placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                  maxLength={300}
                />
                {errors.description && (
                  <p className="mt-1 text-xs text-error">{errors.description.message}</p>
                )}
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-text-main">
                    Categoría *
                  </label>
                  <select
                    {...register("categoryId")}
                    className="w-full rounded-xl border border-border bg-white px-4 py-2.5 text-sm text-text-main focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  >
                    <option value="">Seleccionar</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  {errors.categoryId && (
                    <p className="mt-1 text-xs text-error">{errors.categoryId.message}</p>
                  )}
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-text-main">
                    Precio (USD) *
                  </label>
                  <Input
                    {...register("priceUsdDollars")}
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    inputMode="decimal"
                  />
                  {errors.priceUsdDollars && (
                    <p className="mt-1 text-xs text-error">{errors.priceUsdDollars.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-main">
                  Orden de aparición
                </label>
                <Input
                  {...register("sortOrder", { valueAsNumber: true })}
                  type="number"
                  min={0}
                  placeholder="0"
                  className="w-32"
                />
                {errors.sortOrder && (
                  <p className="mt-1 text-xs text-error">{errors.sortOrder.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Contornos Selection */}
          {allContornos.length > 0 && (
            <Card className="ring-1 ring-border">
              <CardHeader className="border-b border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Contornos</CardTitle>
                    <p className="text-xs text-text-muted mt-0.5">
                      Selecciona cuáles aplican y si el cliente puede quitarlos
                    </p>
                  </div>
                  <a
                    href="/admin/contornos"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    Gestionar contornos
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-2">
                  {allContornos.map((contorno) => {
                    const selected = selectedContornos.find((c) => c.id === contorno.id);
                    const isSelected = !!selected;
                    const priceBs = Math.round(contorno.priceUsdCents * exchangeRate);
                    return (
                      <div
                        key={contorno.id}
                        className="rounded-xl border border-border bg-bg-app/30 p-3"
                      >
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => toggleContorno(contorno)}
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] border-2 transition-colors ${
                              isSelected
                                ? "border-primary bg-primary"
                                : "border-border bg-white"
                            }`}
                          >
                            {isSelected && (
                              <svg
                                className="h-3 w-3 text-white"
                                viewBox="0 0 12 12"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M2 6l3 3 5-5" />
                              </svg>
                            )}
                          </button>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-text-main">
                              {contorno.name}
                            </span>
                            {!contorno.isAvailable && (
                              <span className="ml-2 text-xs text-error">
                                No disponible
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-text-muted">
                            {formatRef(contorno.priceUsdCents)}
                            {contorno.priceUsdCents > 0 && (
                              <span className="ml-1">≈ {formatBs(priceBs)}</span>
                            )}
                          </span>
                        </div>
                        {isSelected && (
                          <div className="mt-2 space-y-2 border-t border-border pt-2">
                            <div className="flex items-center justify-between">
                              <label className="text-xs text-text-main">
                                El cliente puede quitarlo
                              </label>
                              <Switch
                                checked={selected.removable}
                                onCheckedChange={() => toggleContornoRemovable(contorno.id)}
                              />
                            </div>
                            {selected.removable && (
                              <div className="space-y-1">
                                <p className="text-[11px] text-text-muted">
                                  Sustituir por
                                </p>
                                {allContornos
                                  .filter((c) => c.id !== contorno.id)
                                  .map((sub) => {
                                    const isChecked = selected.substituteContornoIds.includes(sub.id);
                                    return (
                                      <button
                                        key={sub.id}
                                        type="button"
                                        onClick={() => toggleSubstituteContorno(contorno.id, sub.id)}
                                        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-bg-app/50"
                                      >
                                        <div
                                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] border-2 transition-colors ${
                                            isChecked
                                              ? "border-primary bg-primary"
                                              : "border-border bg-white"
                                          }`}
                                        >
                                          {isChecked && (
                                            <svg
                                              className="h-2.5 w-2.5 text-white"
                                              viewBox="0 0 12 12"
                                              fill="none"
                                              stroke="currentColor"
                                              strokeWidth="2"
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                            >
                                              <path d="M2 6l3 3 5-5" />
                                            </svg>
                                          )}
                                        </div>
                                        <span className="text-xs text-text-main">
                                          {sub.name}
                                        </span>
                                      </button>
                                    );
                                  })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Adicionales Selection */}
          {allAdicionales.length > 0 && (
            <Card className="ring-1 ring-border">
              <CardHeader className="border-b border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Adicionales disponibles</CardTitle>
                    <p className="text-xs text-text-muted mt-0.5">
                      Selecciona cuáles aplican a este plato
                    </p>
                  </div>
                  <a
                    href="/admin/adicionales"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    Gestionar adicionales
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-1">
                  {allAdicionales.map((adicional) => {
                    const isChecked = selectedAdicionalIds.includes(adicional.id);
                    const priceBs = Math.round(adicional.priceUsdCents * exchangeRate);
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
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-bg-app/50"
                      >
                        <div
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] border-2 transition-colors ${
                            isChecked
                              ? "border-primary bg-primary"
                              : "border-border bg-white"
                          }`}
                        >
                          {isChecked && (
                            <svg
                              className="h-3 w-3 text-white"
                              viewBox="0 0 12 12"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M2 6l3 3 5-5" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm text-text-main">
                            {adicional.name}
                          </span>
                          {!adicional.isAvailable && (
                            <span className="ml-2 text-xs text-error">
                              No disponible
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-text-muted">
                          {formatRef(adicional.priceUsdCents)}
                          {adicional.priceUsdCents > 0 && (
                            <span className="ml-1">
                              ≈ {formatBs(priceBs)}
                            </span>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        {/* Right Column - Media & Status (2/5) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Image Card */}
          <Card className="ring-1 ring-border">
            <CardHeader className="border-b border-border">
              <CardTitle>Imagen</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {previewUrl ? (
                <div className="relative mb-4 group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="h-48 w-full rounded-xl object-cover ring-1 ring-border"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewUrl(null);
                      setValue("imageUrl", "");
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="mb-4 flex h-48 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-bg-app/50 hover:border-primary/40 hover:bg-primary/5 transition-all"
                >
                  <Upload className="mb-2 h-8 w-8 text-text-muted" />
                  <p className="text-sm font-medium text-text-muted">
                    Subir imagen
                  </p>
                  <p className="text-xs text-text-muted mt-0.5">
                    PNG o JPG, máx 2MB
                  </p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg"
                onChange={handleImageUpload}
                disabled={uploading}
                className="hidden"
              />
              {uploading && (
                <p className="text-xs text-text-muted">Subiendo imagen...</p>
              )}
            </CardContent>
          </Card>

          {/* Status Card */}
          <Card className="ring-1 ring-border">
            <CardHeader className="border-b border-border">
              <CardTitle>Estado</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-text-main">
                    Disponible para venta
                  </p>
                  <p className="text-xs text-text-muted">
                    {isAvailable
                      ? "Visible en el menú público"
                      : "Oculto del menú público"}
                  </p>
                </div>
                <Switch
                  checked={isAvailable}
                  onCheckedChange={(val) => setValue("isAvailable", val)}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Submit Button */}
      <div className="mt-6 flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/menu")}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={submitting || uploading} className="min-w-[140px]">
          {submitting ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear item"}
        </Button>
      </div>
    </form>
  );
}
