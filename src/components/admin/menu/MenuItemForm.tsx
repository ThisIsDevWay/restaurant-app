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
import { createMenuItem, updateMenuItem, generateUploadUrl, getPublicUrl, saveDishComponents } from "@/actions/menu";
import { Image as ImageIcon, Upload } from "lucide-react";
import { DishComponentsEditor, type DishComponent } from "@/components/admin/menu/DishComponentsEditor";

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

interface MenuItemFormProps {
  categories: Category[];
  initialData?: MenuItemData;
  initialComponents?: DishComponent[];
  exchangeRate?: number;
}

export function MenuItemForm({ categories, initialData, initialComponents = [], exchangeRate = 0 }: MenuItemFormProps) {
  const isEdit = !!initialData;
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    initialData?.imageUrl ?? null,
  );
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dishComponents, setDishComponents] = useState<DishComponent[]>(initialComponents);

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
        if (itemId && dishComponents.length > 0) {
          await saveDishComponents(
            itemId,
            dishComponents.map((c) => ({
              name: c.name,
              type: c.type,
              removable: c.removable,
              priceIfRemovedCents: c.priceIfRemovedCents,
              allowPaidSubstitution: c.allowPaidSubstitution,
              sortOrder: c.sortOrder,
            })),
          );
        } else if (itemId && dishComponents.length === 0 && isEdit) {
          await saveDishComponents(itemId, []);
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
              </div>
            </CardContent>
          </Card>

          {/* Dish Components */}
          <DishComponentsEditor
            menuItemId={initialData?.id ?? ""}
            initialComponents={dishComponents}
            exchangeRate={exchangeRate}
            onChange={setDishComponents}
          />
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
