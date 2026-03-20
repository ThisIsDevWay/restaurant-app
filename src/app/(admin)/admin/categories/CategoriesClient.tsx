"use client";

import { useState } from "react";
import { Plus, Trash2, Pencil, MoreHorizontal, Tags } from "lucide-react";
import {
  createCategory,
  updateCategory,
  deleteCategory,
} from "@/actions/categories";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

interface Category {
  id: string;
  name: string;
  sortOrder: number;
  allowAlone: boolean;
}

interface CategoryFormData {
  name: string;
  sortOrder: number;
  allowAlone: boolean;
}

function CategoryFormModal({
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
  const [sortOrder, setSortOrder] = useState(initialData?.sortOrder ?? 0);
  const [allowAlone, setAllowAlone] = useState(initialData?.allowAlone ?? true);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    await onSubmit({ name: name.trim(), sortOrder, allowAlone });
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-elevated ring-1 ring-border mx-4 animate-in fade-in-0 zoom-in-95">
        <h2 className="text-lg font-semibold text-text-main mb-5">{title}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-main">
              Nombre *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Hamburguesas"
              autoFocus
              className="w-full rounded-xl border border-border bg-white px-4 py-2.5 text-sm text-text-main placeholder:text-text-muted outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-main">
              Orden de aparición
            </label>
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
              className="w-full rounded-xl border border-border bg-white px-4 py-2.5 text-sm text-text-main outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
            <div>
              <p className="text-sm font-medium text-text-main">Permite pedir solo</p>
              <p className="text-xs text-text-muted">Si el cliente puede ordenar solo esta categoría</p>
            </div>
            <Switch checked={allowAlone} onCheckedChange={setAllowAlone} />
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
  const [modalState, setModalState] = useState<{
    type: "create" | "edit" | null;
    category?: Category;
  }>({ type: null });

  const handleCreate = async (data: CategoryFormData) => {
    await createCategory(data.name, data.sortOrder, data.allowAlone);
  };

  const handleUpdate = async (data: CategoryFormData) => {
    if (!modalState.category) return;
    await updateCategory(modalState.category.id, data.name, data.sortOrder, data.allowAlone);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta categoría?")) return;
    await deleteCategory(id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-main">Categorías</h1>
          <p className="text-sm text-text-muted">
            {categories.length} categorías registradas
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
          {categories.length === 0 ? (
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
            <Table>
              <TableHeader>
                <TableRow className="bg-bg-app/50">
                  <TableHead className="font-semibold text-text-main pl-5">
                    Nombre
                  </TableHead>
                  <TableHead className="font-semibold text-text-main">
                    Orden
                  </TableHead>
                  <TableHead className="font-semibold text-text-main">
                    Permite solo
                  </TableHead>
                  <TableHead className="font-semibold text-text-main text-right pr-5">
                    Acciones
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((cat) => (
                  <TableRow key={cat.id} className="border-border">
                    <TableCell className="pl-5">
                      <span className="font-medium text-text-main">{cat.name}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs font-mono">
                        {cat.sortOrder}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          cat.allowAlone
                            ? "bg-success/10 text-success border-transparent"
                            : "bg-amber/10 text-amber border-transparent"
                        }
                      >
                        {cat.allowAlone ? "Sí" : "No"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-5">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() =>
                            setModalState({ type: "edit", category: cat })
                          }
                          className="text-text-muted hover:text-primary"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleDelete(cat.id)}
                          className="text-text-muted hover:text-error"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CategoryFormModal
        open={modalState.type === "create"}
        onClose={() => setModalState({ type: null })}
        onSubmit={handleCreate}
        title="Nueva categoría"
      />

      <CategoryFormModal
        open={modalState.type === "edit"}
        onClose={() => setModalState({ type: null })}
        onSubmit={handleUpdate}
        initialData={modalState.category}
        title="Editar categoría"
      />
    </div>
  );
}
