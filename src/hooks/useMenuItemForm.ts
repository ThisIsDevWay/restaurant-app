"use client";

import { useForm } from "react-hook-form";
import * as v from "valibot";
import { valibotResolver } from "@hookform/resolvers/valibot";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  createMenuItemAction,
  updateMenuItemAction,
  deleteMenuItemAction,
  generateUploadUrlAction,
  getPublicUrlAction,
} from "@/actions/menu";
import type { MenuItemFormProps } from "@/components/admin/menu/MenuItemForm.types";

const menuItemFormSchema = v.object({
  name: v.pipe(v.string(), v.minLength(1, "Nombre requerido"), v.maxLength(100, "Máximo 100 caracteres")),
  description: v.optional(
    v.pipe(v.string(), v.maxLength(300, "Máximo 300 caracteres")),
  ),
  includedNote: v.optional(v.nullable(v.pipe(v.string(), v.maxLength(200, "Máximo 200 caracteres")))),
  hideAdicionales: v.boolean(),
  hideBebidas: v.boolean(),
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

export type FormValues = v.InferOutput<typeof menuItemFormSchema>;

export interface UseMenuItemFormParams {
  categories: MenuItemFormProps["categories"];
  initialData: MenuItemFormProps["initialData"];
  exchangeRate: number;
}

export interface UseMenuItemFormReturn {
  register: ReturnType<typeof useForm<FormValues>>["register"];
  handleSubmit: ReturnType<typeof useForm<FormValues>>["handleSubmit"];
  watch: ReturnType<typeof useForm<FormValues>>["watch"];
  setValue: ReturnType<typeof useForm<FormValues>>["setValue"];
  errors: ReturnType<typeof useForm<FormValues>>["formState"]["errors"];
  isEdit: boolean;
  submitting: boolean;
  uploading: boolean;
  error: string | null;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  previewUrl: string | null;
  handleRemoveImage: () => void;
  showDeleteConfirm: boolean;
  setShowDeleteConfirm: React.Dispatch<React.SetStateAction<boolean>>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onDelete: () => Promise<void>;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement> | File) => Promise<void>;
  onFormSubmit: (data: FormValues) => Promise<void>;
}

export function useMenuItemForm({
  categories,
  initialData,
  exchangeRate,
}: UseMenuItemFormParams): UseMenuItemFormReturn {
  const router = useRouter();
  const isEdit = !!initialData;

  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialData?.imageUrl ?? null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: valibotResolver(menuItemFormSchema),
    defaultValues: {
      name: initialData?.name ?? "",
      description: initialData?.description ?? "",
      includedNote: initialData?.includedNote ?? "",
      hideAdicionales: initialData?.hideAdicionales ?? false,
      hideBebidas: initialData?.hideBebidas ?? false,
      categoryId: initialData?.categoryId ?? "",
      priceUsdDollars: initialData ? String((initialData.priceUsdCents / 100).toFixed(2)) : "",
      costUsdDollars: initialData?.costUsdCents ? String((initialData.costUsdCents / 100).toFixed(2)) : "",
      imageUrl: initialData?.imageUrl ?? "",
      isAvailable: initialData?.isAvailable ?? true,
    },
  });



  async function onDelete() {
    if (!initialData) return;
    setSubmitting(true);
    try {
      const result = await deleteMenuItemAction({ id: initialData.id });
      if (result?.serverError) throw new Error(result.serverError);
      if (result?.validationErrors) throw new Error("Error de validación al eliminar");
      router.push("/admin/catalogo");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar");
      setSubmitting(false);
      setShowDeleteConfirm(false);
    }
  }

  function handleRemoveImage() {
    setValue("imageUrl", "");
    setPreviewUrl(null);
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement> | File) {
    const file = e instanceof File ? e : e.target.files?.[0];
    if (!file) return;

    // Validation: Type (JPG, PNG, WebP)
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setError("Formato no soportado. Usa JPG, PNG o WebP.");
      return;
    }

    // Validation: Size (Max 5MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setError("Imagen demasiado grande. Máximo 5MB.");
      return;
    }

    try {
      setUploading(true);
      setError(null);

      // Optimizar imagen: Max 1000px ancho, formato WebP, calidad 80%
      const { optimizeImage } = await import("@/lib/utils/image-optimization");
      const optimizedFile = await optimizeImage(file, {
        maxWidth: 1000,
        maxHeight: 1000,
        quality: 0.8,
      });

      const result = await generateUploadUrlAction({ fileName: optimizedFile.name });
      if (result?.serverError) throw new Error(result.serverError);
      if (result?.validationErrors) throw new Error("Datos inválidos al generar URL");
      if (!result?.data?.success) throw new Error(result?.data?.error || "Error");

      await fetch(result.data.url, {
        method: "PUT",
        body: optimizedFile,
        headers: { "Content-Type": optimizedFile.type }
      });
      const publicUrlResult = await getPublicUrlAction({ path: result.data.path });
      if (publicUrlResult?.serverError) throw new Error(publicUrlResult.serverError);
      if (!publicUrlResult?.data) throw new Error("Error obteniendo URL pública");

      setPreviewUrl(publicUrlResult.data);
      setValue("imageUrl", publicUrlResult.data);
    } catch {
      setError("Error al subir la imagen");
    } finally {
      setUploading(false);
    }
  }

  async function onFormSubmit(data: FormValues) {
    setSubmitting(true);
    setError(null);
    try {
      const priceUsdCents = Math.round(parseFloat(data.priceUsdDollars) * 100);
      const costUsdCents = data.costUsdDollars && data.costUsdDollars !== ""
        ? Math.round(parseFloat(data.costUsdDollars) * 100)
        : undefined;
      let itemId: string;
      if (isEdit) {
        const updateResult = await updateMenuItemAction({
          id: initialData.id,
          data: { ...data, priceUsdCents, costUsdCents, imageUrl: data.imageUrl ?? "",
            hideAdicionales: data.hideAdicionales ?? false,
            hideBebidas: data.hideBebidas ?? false,
          },
        });
        if (updateResult?.serverError) throw new Error(updateResult.serverError);
        if (updateResult?.validationErrors) throw new Error("Error de validación al actualizar");
        itemId = initialData.id;
      } else {
        const createResult = await createMenuItemAction({
          ...data, priceUsdCents, costUsdCents, imageUrl: data.imageUrl ?? "",
          hideAdicionales: data.hideAdicionales ?? false,
          hideBebidas: data.hideBebidas ?? false,
        });
        if (createResult?.serverError) throw new Error(createResult.serverError);
        if (createResult?.validationErrors) throw new Error("Error de validación al crear");
        if (!createResult?.data?.success || !createResult?.data?.item) throw new Error(createResult?.data?.error ?? "Error al crear");
        itemId = createResult.data.item.id;
      }



      router.push("/admin/catalogo");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSubmitting(false);
    }
  }

  return {
    register,
    handleSubmit,
    watch,
    setValue,
    errors,
    isEdit,
    submitting,
    uploading,
    error,
    setError,
    previewUrl,
    showDeleteConfirm,
    setShowDeleteConfirm,
    fileInputRef,
    onDelete,
    handleImageUpload,
    handleRemoveImage,
    onFormSubmit,
  };
}
