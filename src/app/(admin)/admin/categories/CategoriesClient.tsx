"use client";

import { useState } from "react";
import { Plus, Trash2, Pencil } from "lucide-react";
import {
  createCategory,
  updateCategory,
  deleteCategory,
} from "@/actions/categories";

interface Category {
  id: string;
  name: string;
  sortOrder: number;
  allowAlone: boolean;
}

export function CategoriesClient({
  categories,
}: {
  categories: Category[];
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newSortOrder, setNewSortOrder] = useState(0);
  const [newAllowAlone, setNewAllowAlone] = useState(true);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createCategory(newName.trim(), newSortOrder, newAllowAlone);
    setNewName("");
    setNewSortOrder(0);
    setNewAllowAlone(true);
  };

  const handleUpdate = async (id: string, name: string, sortOrder: number, allowAlone: boolean) => {
    await updateCategory(id, name, sortOrder, allowAlone);
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta categoría?")) return;
    await deleteCategory(id);
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-text-main">Categorías</h1>

      {/* Create new */}
      <div className="mb-6 flex flex-wrap gap-3">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nueva categoría"
          className="flex-1 rounded-input border border-border px-4 py-2.5 text-sm outline-none focus:border-primary"
        />
        <input
          type="number"
          value={newSortOrder}
          onChange={(e) => setNewSortOrder(parseInt(e.target.value) || 0)}
          placeholder="Orden"
          className="w-20 rounded-input border border-border px-4 py-2.5 text-sm outline-none focus:border-primary"
        />
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={newAllowAlone}
            onChange={(e) => setNewAllowAlone(e.target.checked)}
            id="newAllowAlone"
            className="h-4 w-4 rounded border-border accent-primary"
          />
          <label htmlFor="newAllowAlone" className="text-sm font-medium text-text-main">
            Permite pedir solo
          </label>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 rounded-input bg-primary px-4 py-2.5 text-sm font-semibold text-white"
        >
          <Plus className="h-4 w-4" />
          Crear
        </button>
      </div>

      {/* List */}
      <div className="overflow-hidden rounded-card border border-border bg-white shadow-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-bg-app text-left">
              <th className="px-4 py-3 font-semibold text-text-main">Nombre</th>
              <th className="px-4 py-3 font-semibold text-text-main">Orden</th>
              <th className="px-4 py-3 font-semibold text-text-main">Permite solo</th>
              <th className="px-4 py-3 font-semibold text-text-main">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => (
              <tr key={cat.id} className="border-b border-border last:border-b-0">
                <td className="px-4 py-3">
                  {editingId === cat.id ? (
                    <input
                      id={`edit-name-${cat.id}`}
                      defaultValue={cat.name}
                      className="w-full rounded-input border border-primary px-2 py-1 text-sm outline-none"
                    />
                  ) : (
                    <span className="font-medium text-text-main">{cat.name}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {editingId === cat.id ? (
                    <input
                      id={`edit-order-${cat.id}`}
                      type="number"
                      defaultValue={cat.sortOrder}
                      className="w-16 rounded-input border border-primary px-2 py-1 text-sm outline-none"
                    />
                  ) : (
                    <span className="text-text-muted">{cat.sortOrder}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {editingId === cat.id ? (
                    <input
                      id={`edit-allow-alone-${cat.id}`}
                      type="checkbox"
                      defaultChecked={cat.allowAlone}
                      className="h-4 w-4 rounded border-border accent-primary"
                    />
                  ) : (
                    <span
                      className={`inline-block rounded-pill px-2 py-0.5 text-xs font-semibold ${
                        cat.allowAlone
                          ? "bg-success/10 text-success"
                          : "bg-amber/10 text-amber"
                      }`}
                    >
                      {cat.allowAlone ? "Sí" : "No"}
                    </span>
                  )}
                </td>
                <td className="flex gap-2 px-4 py-3">
                  {editingId === cat.id ? (
                    <>
                      <button
                        onClick={() => {
                          const name = (
                            document.getElementById(
                              `edit-name-${cat.id}`,
                            ) as HTMLInputElement
                          )?.value;
                          const order = parseInt(
                            (
                              document.getElementById(
                                `edit-order-${cat.id}`,
                              ) as HTMLInputElement
                            )?.value ?? "0",
                            10,
                          );
                          const allowAlone = (
                            document.getElementById(
                              `edit-allow-alone-${cat.id}`,
                            ) as HTMLInputElement
                          )?.checked ?? true;
                          if (name) handleUpdate(cat.id, name, order, allowAlone);
                        }}
                        className="text-sm font-medium text-success"
                      >
                        Guardar
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-sm font-medium text-text-muted"
                      >
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setEditingId(cat.id)}
                        className="text-text-muted hover:text-primary"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(cat.id)}
                        className="text-text-muted hover:text-error"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
