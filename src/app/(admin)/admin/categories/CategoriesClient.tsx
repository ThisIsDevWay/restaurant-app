"use client";

import { useState, useRef, useEffect } from "react";
import {
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  GripVertical,
  Tags,
  Info,
} from "lucide-react";
import {
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryUsageCount,
  reorderCategories,
  toggleCategoryAvailability,
  toggleCategorySimple,
  toggleCategoryAlone,
} from "@/actions/categories";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

interface Category {
  id: string;
  name: string;
  sortOrder: number;
  allowAlone: boolean;
  isSimple: boolean;
  isAvailable: boolean;
}

interface CategoriesClientProps {
  categories: Category[];
  itemCounts: Record<string, number>;
}

function Tooltip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex">
      <Info className="h-3.5 w-3.5 text-text-muted cursor-help" />
      <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-56 -translate-x-1/2 rounded-lg bg-gray-900 px-3 py-2 text-[11px] leading-relaxed text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
        {text}
        <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
      </span>
    </span>
  );
}

function InlineEditRow({
  category,
  itemCount,
  onSave,
  onCancel,
}: {
  category: Category;
  itemCount: number;
  onSave: (data: { name: string; allowAlone: boolean; isSimple: boolean }) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(category.name);
  const [allowAlone, setAllowAlone] = useState(category.allowAlone);
  const [isSimple, setIsSimple] = useState(category.isSimple);
  const [saving, setSaving] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await onSave({ name: name.trim(), allowAlone, isSimple });
    setSaving(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") onCancel();
  };

  return (
    <div
      className="flex flex-col gap-4 p-4 bg-primary/5 rounded-lg mb-2"
      onKeyDown={handleKeyDown}
    >
      <div className="flex items-center gap-3">
        <div className="h-4 w-4 shrink-0" />
        <input
          ref={nameRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 rounded-lg border border-border bg-white px-3 py-1.5 text-sm font-medium text-text-main outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
          placeholder="Nombre de la categoría"
        />
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="h-8 w-8 p-0 text-success hover:bg-success/10 bg-transparent shadow-none border-none"
          >
            <Check className="h-5 w-5" />
          </Button>
          <Button
            size="sm"
            onClick={onCancel}
            className="h-8 w-8 p-0 text-text-muted hover:bg-error/10 hover:text-error bg-transparent shadow-none border-none"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-6 pl-7">
        <label className="flex items-center gap-3 cursor-pointer">
          <Switch checked={isSimple} onCheckedChange={setIsSimple} />
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-text-main leading-tight">Pedido rápido</span>
            <span className="text-[10px] text-text-muted">Sin guarniciones</span>
          </div>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <Switch checked={allowAlone} onCheckedChange={setAllowAlone} />
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-text-main leading-tight">Independiente</span>
            <span className="text-[10px] text-text-muted">Se puede pedir solo</span>
          </div>
        </label>
      </div>
    </div>
  );
}

export function CategoriesClient({
  categories,
  itemCounts,
}: CategoriesClientProps) {
  const [items, setItems] = useState(categories);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteWarning, setDeleteWarning] = useState<{
    id: string;
    name: string;
    count: number;
  } | null>(null);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);

  const handleCreate = async (data: {
    name: string;
    allowAlone: boolean;
    isSimple: boolean;
  }) => {
    const result = await createCategory(
      data.name,
      data.allowAlone,
      data.isSimple,
    );
    if (result.success) {
      setItems((prev) =>
        [...prev, result.category!].sort(
          (a, b) => a.sortOrder - b.sortOrder,
        ),
      );
      setCreating(false);
    }
  };

  const handleSave = async (
    id: string,
    data: { name: string; allowAlone: boolean; isSimple: boolean },
  ) => {
    const result = await updateCategory(
      id,
      data.name,
      data.allowAlone,
      data.isSimple,
    );
    if (result.success) {
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, ...data } : i)),
      );
      setEditingId(null);
    }
  };

  const handleToggle = async (id: string, isAvailable: boolean) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, isAvailable } : i)),
    );
    await toggleCategoryAvailability(id, isAvailable);
  };

  const handleToggleSimple = async (id: string, isSimple: boolean) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, isSimple } : i)),
    );
    await toggleCategorySimple(id, isSimple);
  };

  const handleToggleAlone = async (id: string, allowAlone: boolean) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, allowAlone } : i)),
    );
    await toggleCategoryAlone(id, allowAlone);
  };

  const handleDeleteClick = async (id: string, name: string) => {
    const count = itemCounts[id] ?? 0;
    if (count > 0) {
      setDeleteWarning({ id, name, count });
    } else if (confirm(`¿Eliminar "${name}"?`)) {
      await deleteCategory(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteWarning) return;
    await deleteCategory(deleteWarning.id);
    setItems((prev) => prev.filter((i) => i.id !== deleteWarning.id));
    setDeleteWarning(null);
  };

  const handleDragStart = (idx: number) => {
    setDraggingIdx(idx);
  };

  const handleDragEnter = (idx: number) => {
    if (draggingIdx === null || draggingIdx === idx) return;

    // Live reorder
    const newItems = [...items];
    const draggedItem = newItems.splice(draggingIdx, 1)[0];
    newItems.splice(idx, 0, draggedItem);

    setItems(newItems);
    setDraggingIdx(idx);
  };

  const handleDragEnd = async () => {
    if (draggingIdx === null) return;

    // Finalize order
    const reordered = items.map((item, i) => ({ ...item, sortOrder: i }));
    setItems(reordered);
    setDraggingIdx(null);

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
        <Button onClick={() => setCreating(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nueva categoría
        </Button>
      </div>

      <Card className="ring-1 ring-border">
        <CardContent className="p-0">
          {items.length === 0 && !creating ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/5">
                <Tags className="h-7 w-7 text-primary/40" />
              </div>
              <p className="text-sm font-medium text-text-main">
                Sin categorías
              </p>
              <p className="mt-1 max-w-[280px] text-xs text-text-muted">
                Crea tu primera categoría para organizar los items del menú
              </p>
              <Button
                onClick={() => setCreating(true)}
                className="mt-4 gap-2"
                size="sm"
              >
                <Plus className="h-3.5 w-3.5" />
                Crear categoría
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {/* Create row */}
              {creating && (
                <InlineEditRow
                  category={{
                    id: "__new__",
                    name: "",
                    sortOrder: items.length,
                    allowAlone: true,
                    isSimple: false,
                    isAvailable: true,
                  }}
                  itemCount={0}
                  onSave={handleCreate}
                  onCancel={() => setCreating(false)}
                />
              )}

              {items.map((cat, idx) => {
                if (editingId === cat.id) {
                  return (
                    <InlineEditRow
                      key={cat.id}
                      category={cat}
                      itemCount={itemCounts[cat.id] ?? 0}
                      onSave={(data) => handleSave(cat.id, data)}
                      onCancel={() => setEditingId(null)}
                    />
                  );
                }

                const count = itemCounts[cat.id] ?? 0;
                return (
                  <div
                    key={cat.id}
                    draggable
                    onDragStart={() => handleDragStart(idx)}
                    onDragEnter={() => handleDragEnter(idx)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => e.preventDefault()}
                    className={`flex flex-col md:flex-row md:items-center gap-4 p-4 transition-all duration-200 group/row ${draggingIdx === idx
                        ? "opacity-50 bg-primary/10 border-2 border-dashed border-primary/30 z-50 scale-[1.02] shadow-lg"
                        : "hover:bg-bg-app/50"
                      }`}
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <GripVertical className={`h-4 w-4 text-text-muted shrink-0 transition-opacity ${draggingIdx === idx ? "cursor-grabbing opacity-100" : "cursor-grab opacity-0 group-hover/row:opacity-100"
                        }`} />
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-text-main truncate uppercase tracking-tight">
                          {cat.name}
                        </p>
                        <p className="text-[11px] text-text-muted mt-0.5">
                          {count} item{count !== 1 ? "s" : ""} registrados
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-8 gap-y-3 px-8 md:px-0">
                      {/* Disponible */}
                      <div className="flex items-center gap-3 min-w-[100px]">
                        <Switch
                          checked={cat.isAvailable}
                          onCheckedChange={(val) => handleToggle(cat.id, val)}
                        />
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-text-main uppercase leading-none">Visible</span>
                          <span className="text-[9px] text-text-muted mt-1 leading-none">{cat.isAvailable ? 'En menú' : 'Oculto'}</span>
                        </div>
                      </div>

                      {/* Simple Mode */}
                      <div className="flex items-center gap-3 min-w-[110px]">
                        <Switch
                          checked={cat.isSimple}
                          onCheckedChange={(val) =>
                            handleToggleSimple(cat.id, val)
                          }
                        />
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] font-bold text-text-main uppercase leading-none">Rápido</span>
                            <Tooltip text="Productos simples: se agregan con un click, ignorando contornos y adicionales." />
                          </div>
                          <span className="text-[9px] text-text-muted mt-1 leading-none">{cat.isSimple ? 'Activado' : 'Estándar'}</span>
                        </div>
                      </div>

                      {/* Allow Alone */}
                      <div className="flex items-center gap-3 min-w-[120px]">
                        <Switch
                          checked={cat.allowAlone}
                          onCheckedChange={(val) =>
                            handleToggleAlone(cat.id, val)
                          }
                        />
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] font-bold text-text-main uppercase leading-none">Indep.</span>
                            <Tooltip text="Si está desactivado, el ítem solo puede pedirse junto a un plato principal." />
                          </div>
                          <span className="text-[9px] text-text-muted mt-1 leading-none">{cat.allowAlone ? 'Libre' : 'Restringido'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-1 shrink-0 pt-2 md:pt-0 border-t border-border/50 md:border-none">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setEditingId(cat.id)}
                        className="h-8 w-8 text-text-muted hover:text-primary hover:bg-primary/5 rounded-full"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDeleteClick(cat.id, cat.name)}
                        className="h-8 w-8 text-text-muted hover:text-error hover:bg-error/5 rounded-full"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete confirmation */}
      {deleteWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setDeleteWarning(null)}
          />
          <div className="relative mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-elevated ring-1 ring-border">
            <h3 className="text-lg font-semibold text-text-main mb-2">
              Categoría con platos
            </h3>
            <p className="mb-5 text-sm text-text-muted">
              &quot;{deleteWarning.name}&quot; tiene{" "}
              <strong>{deleteWarning.count}</strong> plato
              {deleteWarning.count !== 1 ? "s" : ""}. No se puede eliminar.
            </p>
            <Button
              onClick={() => setDeleteWarning(null)}
              className="flex-1"
            >
              Entendido
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
