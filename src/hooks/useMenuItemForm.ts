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
} from "@/actions/menu";
import { getImagekitAuthAction, deleteImagekitFileAction } from "@/actions/imagekit";
import { toOriginalUrl } from "@/lib/imagekit/utils";
import { IMAGEKIT_FOLDERS } from "@/lib/imagekit/folders";
import type { MenuItemFormProps } from "@/components/admin/menu/MenuItemForm.types";

const menuItemFormSchema = v.object({
  name: v.pipe(v.string(), v.minLength(1, "Nombre requerido"), v.maxLength(100, "Máximo 100 caracteres")),
  description: v.optional(
    v.pipe(v.string(), v.maxLength(300, "Máximo 300 caracteres")),
  ),
  portionNote: v.optional(v.nullable(v.pipe(v.string(), v.maxLength(100, "Máximo 100 caracteres")))),
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
  imagekitFileId: v.optional(v.string()),
  isAvailable: v.boolean(),
  isPrepackaged: v.boolean(),
});

export type FormValues = v.InferOutput<typeof menuItemFormSchema>;

export interface UseMenuItemFormParams {
  categories: MenuItemFormProps["categories"];
  initialData: MenuItemFormProps["initialData"];
  exchangeRate: number;
}

export type ContornoEntry = { id: string; name: string; removable: boolean };

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
  // Contornos state
  contornos: ContornoEntry[];
  addContorno: (item: ContornoEntry) => void;
  removeContorno: (id: string) => void;
  toggleContornoRemovable: (id: string) => void;
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
  // fileId of an image uploaded in this session but not yet persisted to DB
  const pendingFileIdRef = useRef<string | null>(null);

  // Contornos are managed separately (relational, not a column on menu_items)
  const [contornos, setContornos] = useState<ContornoEntry[]>(initialData?.contornos ?? []);

  function addContorno(item: ContornoEntry) {
    setContornos((prev) => prev.some((c) => c.id === item.id) ? prev : [...prev, item]);
  }
  function removeContorno(id: string) {
    setContornos((prev) => prev.filter((c) => c.id !== id));
  }
  function toggleContornoRemovable(id: string) {
    setContornos((prev) => prev.map((c) => c.id === id ? { ...c, removable: !c.removable } : c));
  }

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
      portionNote: initialData?.portionNote ?? null,
      includedNote: initialData?.includedNote ?? "",
      hideAdicionales: initialData?.hideAdicionales ?? false,
      hideBebidas: initialData?.hideBebidas ?? false,
      categoryId: initialData?.categoryId ?? "",
      priceUsdDollars: initialData ? String((initialData.priceUsdCents / 100).toFixed(2)) : "",
      costUsdDollars: initialData?.costUsdCents ? String((initialData.costUsdCents / 100).toFixed(2)) : "",
      imageUrl: initialData?.imageUrl ?? "",
      imagekitFileId: initialData?.imagekitFileId ?? "",
      isAvailable: initialData?.isAvailable ?? true,
      isPrepackaged: initialData?.isPrepackaged ?? false,
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
    // If there's a pending (unsaved) upload, delete it from ImageKit immediately
    if (pendingFileIdRef.current) {
      deleteImagekitFileAction({ fileId: pendingFileIdRef.current }).catch(() => {});
      pendingFileIdRef.current = null;
    }
    setValue("imageUrl", "");
    setValue("imagekitFileId", "");
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

      // If replacing an image uploaded in this session, delete the previous one
      if (pendingFileIdRef.current) {
        deleteImagekitFileAction({ fileId: pendingFileIdRef.current }).catch(() => {});
        pendingFileIdRef.current = null;
      }

      // Helper: attempt one upload with fresh auth params
      async function attemptUpload(): Promise<{ url: string; fileId: string }> {
        const authResult = await getImagekitAuthAction({});
        if (authResult?.serverError) throw new Error(authResult.serverError);
        if (!authResult?.data) throw new Error("Error obteniendo auth de subida");
        const { token, expire, signature, publicKey } = authResult.data;

        const formData = new FormData();
        formData.append("file", optimizedFile);
        formData.append("fileName", optimizedFile.name);
        formData.append("folder", IMAGEKIT_FOLDERS.menu);
        formData.append("useUniqueFileName", "true");
        formData.append("publicKey", publicKey);
        formData.append("signature", signature);
        formData.append("expire", String(expire));
        formData.append("token", token);

        const uploadRes = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
          method: "POST",
          body: formData,
        });
        if (!uploadRes.ok) {
          const detail = await uploadRes.text().catch(() => "");
          throw new Error(`Upload failed (${uploadRes.status}): ${detail}`);
        }
        return (await uploadRes.json()) as { url: string; fileId: string };
      }

      // Try upload; retry once with fresh token on failure
      let uploadData: { url: string; fileId: string };
      try {
        uploadData = await attemptUpload();
      } catch {
        // Retry once — token may have been cached/reused
        uploadData = await attemptUpload();
      }

      pendingFileIdRef.current = uploadData.fileId;
      const finalUrl = toOriginalUrl(uploadData.url);
      setPreviewUrl(finalUrl);
      setValue("imageUrl", finalUrl);
      setValue("imagekitFileId", uploadData.fileId);
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
      const contornoPayload = contornos.map((c) => ({ id: c.id, removable: c.removable }));

      const sharedPayload = {
        priceUsdCents,
        costUsdCents,
        imageUrl: data.imageUrl ?? "",
        imagekitFileId: data.imagekitFileId ?? undefined,
        portionNote: data.portionNote ?? null,
        hideAdicionales: data.hideAdicionales ?? false,
        hideBebidas: data.hideBebidas ?? false,
        isPrepackaged: data.isPrepackaged ?? false,
        contornos: contornoPayload,
      };

      if (isEdit) {
        const updateResult = await updateMenuItemAction({
          id: initialData.id,
          data: { ...data, ...sharedPayload },
        });
        if (updateResult?.serverError) throw new Error(updateResult.serverError);
        if (updateResult?.validationErrors) throw new Error("Error de validación al actualizar");
        itemId = initialData.id;
      } else {
        const createResult = await createMenuItemAction({ ...data, ...sharedPayload });
        if (createResult?.serverError) throw new Error(createResult.serverError);
        if (createResult?.validationErrors) throw new Error("Error de validación al crear");
        if (!createResult?.data?.success || !createResult?.data?.item) throw new Error(createResult?.data?.error ?? "Error al crear");
        itemId = createResult.data.item.id;
      }

      // Image is now persisted in DB — no longer pending
      pendingFileIdRef.current = null;

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
    contornos,
    addContorno,
    removeContorno,
    toggleContornoRemovable,
  };
}
