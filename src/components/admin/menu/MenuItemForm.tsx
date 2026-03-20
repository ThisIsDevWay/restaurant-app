"use client";

import { useForm } from "react-hook-form";
import * as v from "valibot";
import { valibotResolver } from "@hookform/resolvers/valibot";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createMenuItem, updateMenuItem, generateUploadUrl, getPublicUrl } from "@/actions/menu";

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
}

export function MenuItemForm({ categories, initialData }: MenuItemFormProps) {
  const isEdit = !!initialData;
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    initialData?.imageUrl ?? null,
  );
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-lg">
      {error && (
        <div className="rounded-input border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm font-semibold text-text-main">
          Nombre *
        </label>
        <Input {...register("name")} placeholder="Ej: Pollo Guisado" />
        {errors.name && (
          <p className="mt-1 text-xs text-error">{errors.name.message}</p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold text-text-main">
          Descripción
        </label>
        <textarea
          {...register("description")}
          placeholder="Descripción del plato..."
          rows={3}
          className="w-full rounded-input border border-border bg-white px-3 py-2 text-sm text-text-main placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          maxLength={300}
        />
        {errors.description && (
          <p className="mt-1 text-xs text-error">{errors.description.message}</p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold text-text-main">
          Categoría *
        </label>
        <select
          {...register("categoryId")}
          className="w-full rounded-input border border-border bg-white px-3 py-2 text-sm text-text-main focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">Seleccionar categoría</option>
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
        <label className="mb-1 block text-sm font-semibold text-text-main">
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

      <div>
        <label className="mb-1 block text-sm font-semibold text-text-main">
          Imagen
        </label>
        {previewUrl && (
          <div className="mb-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Preview"
              className="h-32 w-32 rounded-card object-cover border border-border"
            />
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg"
          onChange={handleImageUpload}
          disabled={uploading}
          className="block w-full text-sm text-text-muted file:mr-4 file:rounded-input file:border-0 file:bg-bg-image file:px-4 file:py-2 file:text-sm file:font-semibold file:text-text-main hover:file:bg-border"
        />
        {uploading && (
          <p className="mt-1 text-xs text-text-muted">Subiendo imagen...</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          {...register("isAvailable")}
          id="isAvailable"
          className="h-4 w-4 rounded border-border accent-primary"
        />
        <label htmlFor="isAvailable" className="text-sm font-medium text-text-main">
          Disponible para venta
        </label>
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold text-text-main">
          Orden de aparición
        </label>
        <Input
          {...register("sortOrder", { valueAsNumber: true })}
          type="number"
          min={0}
          placeholder="0"
        />
      </div>

      <Button type="submit" disabled={submitting || uploading} className="w-full">
        {submitting ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear item"}
      </Button>
    </form>
  );
}
