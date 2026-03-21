"use client";

import { useState, useRef, useEffect } from "react";
import { Plus, Trash2, Pencil, GripVertical, Tags } from "lucide-react";
import {
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryUsageCount,
  reorderCategories,
  toggleCategoryAvailability,
} from "@/actions/categories";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

interface Category {
  id: string;
  name: string;
  sortOrder: number;
  allowAlone: boolean;
  isAvailable: boolean;
}

interface CategoryFormData {
  name: string;
  allowAlone: boolean;
}

function CategorySheet({
  open,
  onClose,
  onSubmit,
  initialData,
  title,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CategoryFormData) => Promise<void>;
  initialData?: Category;
  title: string;
}) {
  const [name, setName] = useState(initialData?.name ?? "");
  const [allowAlone, setAllowAlone] = useState(initialData?.allowAlone ?? true);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ name?: string }>({});

  useEffect(() => {
    if (open) {
      setName(initialData?.name ?? "");
      setAllowAlone(initialData?.allowAlone ?? true);
      setErrors({});
    }
  }, [open, initialData?.id]);

  function validate(): boolean {
    const newErrors: { name?: string } = {};
    if (!name.trim()) {
      newErrors.name = "Nombre requerido";
    } else if (name.trim().length > 100) {
      newErrors.name = "Máximo 100 caracteres";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    await onSubmit({ name: name.trim(), allowAlone });
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-white p-6 shadow-elevated ring-1 ring-border sm:mx-4 animate-in">
        <h2 className="text-lg font-semibold text-text-main mb-5">{title}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-main">
              Nombre *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
              }}
              placeholder="Ej: Hamburguesas"
              autoFocus
              className={`w-full rounded-xl border bg-white px-4 py-2.5 text-sm text-text-main placeholder:text-text-muted outline-none transition-all ${
                errors.name
                  ? "border-error focus:border-error focus:ring-2 focus:ring-error/20"
                  : "border-border focus:border-primary focus:ring-2 focus:ring-primary/20"
              }`}
            />
            {errors.name && (
              <p className="mt-1 text-xs text-error">{errors.name}</p>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex-1"
            >
              {loading ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function CategoriesClient({
  categories,
}: {
  categories: Category[];
}) {
  const [items, setItems] = useState(categories);
  const [modalState, setModalState] = useState<{
    type: "create" | "edit" | null;
    category?: Category;
  }>({ type: null });
  const [deleteDialog, setDeleteDialog] = useState<{
    id: string;
    name: string;
    itemCount: number;
  } | null>(null);
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const handleCreate = async (data: CategoryFormData) => {
    const result = await createCategory(data.name, data.allowAlone);
    if (result.success) {
      setItems((prev) => [...prev, result.category!].sort((a, b) => a.sortOrder - b.sortOrder));
    }
  };

  const handleUpdate = async (data: CategoryFormData) => {
    if (!modalState.category) return;
    const result = await updateCategory(modalState.category.id, data.name, data.allowAlone);
    if (result.success) {
      setItems((prev) =>
        prev.map((c) =>
          c.id === modalState.category!.id
            ? { ...c, name: data.name, allowAlone: data.allowAlone }
            : c,
        ),
      );
    }
  };

  const handleDeleteClick = async (id: string, name: string) => {
    const itemCount = await getCategoryUsageCount(id);
    setDeleteDialog({ id, name, itemCount });
  };

  const handleConfirmDelete = async () => {
    if (!deleteDialog || deleteDialog.itemCount > 0) return;
    await deleteCategory(deleteDialog.id);
    setItems((prev) => prev.filter((c) => c.id !== deleteDialog.id));
    setDeleteDialog(null);
  };

  const handleToggle = async (id: string, isAvailable: boolean) => {
    setItems((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isAvailable } : c)),
    );
    await toggleCategoryAvailability(id, isAvailable);
  };

  // Drag and drop
  const handleDragStart = (idx: number) => {
    dragItem.current = idx;
  };

  const handleDragEnter = (idx: number) => {
    dragOverItem.current = idx;
  };

  const handleDragEnd = async () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    if (dragItem.current === dragOverItem.current) return;

    const newItems = [...items];
    const draggedItem = newItems.splice(dragItem.current, 1)[0];
    newItems.splice(dragOverItem.current, 0, draggedItem);
    const reordered = newItems.map((item, i) => ({ ...item, sortOrder: i }));

    setItems(reordered);
    dragItem.current = null;
    dragOverItem.current = null;

    await reorderCategories(reordered.map((i) => i.id));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-main">Categorías</h1>
          <p className="text-sm text-text-muted">
            {items.length} categorías registradas
          </p>
        </div>
        <Button
          onClick={() => setModalState({ type: "create" })}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Nueva categoría
        </Button>
      </div>

      <Card className="ring-1 ring-border">
        <CardContent className="p-0">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/5">
                <Tags className="h-7 w-7 text-primary/40" />
              </div>
              <p className="text-sm font-medium text-text-main">Sin categorías</p>
              <p className="text-xs text-text-muted mt-1 max-w-[280px]">
                Crea tu primera categoría para organizar los items del menú
              </p>
              <Button
                onClick={() => setModalState({ type: "create" })}
                className="mt-4 gap-2"
                size="sm"
              >
                <Plus className="h-3.5 w-3.5" />
                Crear categoría
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {items.map((cat, idx) => (
                <div
                  key={cat.id}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragEnter={() => handleDragEnter(idx)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => e.preventDefault()}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-bg-app/50 transition-colors"
                >
                  <GripVertical className="h-4 w-4 text-text-muted shrink-0 cursor-grab" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-main truncate">
                      {cat.name}
                    </p>
                  </div>
                  <Switch
                    checked={cat.isAvailable}
                    onCheckedChange={(val) => handleToggle(cat.id, val)}
                  />
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setModalState({ type: "edit", category: cat })}
                    className="text-text-muted hover:text-primary"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleDeleteClick(cat.id, cat.name)}
                    className="text-text-muted hover:text-error"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Sheet */}
      <CategorySheet
        open={modalState.type === "create"}
        onClose={() => setModalState({ type: null })}
        onSubmit={handleCreate}
        title="Nueva categoría"
      />

      <CategorySheet
        open={modalState.type === "edit"}
        onClose={() => setModalState({ type: null })}
        onSubmit={handleUpdate}
        initialData={modalState.category}
        title="Editar categoría"
      />

      {/* Delete confirmation dialog */}
      {deleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setDeleteDialog(null)}
          />
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-elevated ring-1 ring-border mx-4">
            <h3 className="text-lg font-semibold text-text-main mb-2">
              {deleteDialog.itemCount > 0
                ? "Categoría con platos"
                : "Eliminar categoría"}
            </h3>
            <p className="text-sm text-text-muted mb-5">
              {deleteDialog.itemCount > 0 ? (
                <>
                  &quot;{deleteDialog.name}&quot; tiene{" "}
                  <strong>{deleteDialog.itemCount}</strong> plato
                  {deleteDialog.itemCount !== 1 ? "s" : ""} asignado
                  {deleteDialog.itemCount !== 1 ? "s" : ""}. Debes reasignarlos
                  antes de eliminar.
                </>
              ) : (
                <>
                  ¿Eliminar &quot;{deleteDialog.name}&quot;? Esta acción no se
                  puede deshacer.
                </>
              )}
            </p>
            <div className="flex gap-3">
              {deleteDialog.itemCount > 0 ? (
                <Button
                  onClick={() => setDeleteDialog(null)}
                  className="flex-1"
                >
                  Entendido
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setDeleteDialog(null)}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleConfirmDelete}
                    className="flex-1"
                  >
                    Eliminar
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
