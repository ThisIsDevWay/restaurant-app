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
import { saveMenuItemAdicionalesAction } from "@/actions/adicionales";
import { saveMenuItemContornosAction } from "@/actions/contornos";
import { saveMenuItemBebidasAction } from "@/actions/bebidas";
import type { ContornoSelection, MenuItemFormProps } from "@/components/admin/menu/MenuItemForm.types";

const menuItemFormSchema = v.object({
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

export type FormValues = v.InferOutput<typeof menuItemFormSchema>;

export interface UseMenuItemFormParams {
  categories: MenuItemFormProps["categories"];
  initialData: MenuItemFormProps["initialData"];
  exchangeRate: number;
  initialSelectedAdicionalIds: string[];
  initialSelectedContornos: ContornoSelection[];
  initialSelectedBebidaIds: string[];
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
  selectedAdicionalIds: string[];
  setSelectedAdicionalIds: React.Dispatch<React.SetStateAction<string[]>>;
  selectedContornos: ContornoSelection[];
  setSelectedContornos: React.Dispatch<React.SetStateAction<ContornoSelection[]>>;
  selectedBebidaIds: string[];
  setSelectedBebidaIds: React.Dispatch<React.SetStateAction<string[]>>;
  showDeleteConfirm: boolean;
  setShowDeleteConfirm: React.Dispatch<React.SetStateAction<boolean>>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  toggleContorno: (contorno: { id: string; name: string }) => void;
  toggleContornoRemovable: (id: string) => void;
  toggleSubstituteContorno: (contornoId: string, subId: string) => void;
  onDelete: () => Promise<void>;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  onFormSubmit: (data: FormValues) => Promise<void>;
}

export function useMenuItemForm({
  categories,
  initialData,
  exchangeRate,
  initialSelectedAdicionalIds,
  initialSelectedContornos,
  initialSelectedBebidaIds,
}: UseMenuItemFormParams): UseMenuItemFormReturn {
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
    resolver: valibotResolver(menuItemFormSchema),
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

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const result = await generateUploadUrlAction({ fileName: file.name });
      if (result?.serverError) throw new Error(result.serverError);
      if (result?.validationErrors) throw new Error("Datos inválidos al generar URL");
      if (!result?.data?.success) throw new Error(result?.data?.error || "Error");

      await fetch(result.data.url, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
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
          data: { ...data, priceUsdCents, costUsdCents, imageUrl: data.imageUrl ?? "" },
        });
        if (updateResult?.serverError) throw new Error(updateResult.serverError);
        if (updateResult?.validationErrors) throw new Error("Error de validación al actualizar");
        itemId = initialData.id;
      } else {
        const createResult = await createMenuItemAction({
          ...data, priceUsdCents, costUsdCents, imageUrl: data.imageUrl ?? "",
        });
        if (createResult?.serverError) throw new Error(createResult.serverError);
        if (createResult?.validationErrors) throw new Error("Error de validación al crear");
        if (!createResult?.data?.success || !createResult?.data?.item) throw new Error(createResult?.data?.error ?? "Error al crear");
        itemId = createResult.data.item.id;
      }

      const adicResult = await saveMenuItemAdicionalesAction({ menuItemId: itemId, adicionalIds: selectedAdicionalIds });
      if (adicResult?.serverError) throw new Error(adicResult.serverError);

      const bebResult = await saveMenuItemBebidasAction({ menuItemId: itemId, bebidaItemIds: selectedBebidaIds });
      if (bebResult?.serverError) throw new Error(bebResult.serverError);

      const contResult = await saveMenuItemContornosAction({
        menuItemId: itemId,
        items: selectedContornos.map((c) => ({
          contornoId: c.id,
          removable: c.removable,
          substituteContornoIds: c.substituteContornoIds,
        })),
      });
      if (contResult?.serverError) throw new Error(contResult.serverError);

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
    selectedAdicionalIds,
    setSelectedAdicionalIds,
    selectedContornos,
    setSelectedContornos,
    selectedBebidaIds,
    setSelectedBebidaIds,
    showDeleteConfirm,
    setShowDeleteConfirm,
    fileInputRef,
    toggleContorno,
    toggleContornoRemovable,
    toggleSubstituteContorno,
    onDelete,
    handleImageUpload,
    onFormSubmit,
  };
}
