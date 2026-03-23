"use client";

import { useState, useRef, useEffect } from "react";
import { Plus, Trash2, Pencil, Check, X, GripVertical } from "lucide-react";
import {
  createContorno,
  updateContorno,
  deleteContorno,
  toggleContornoAvailability,
  getContornoUsage,
  reorderContornos,
} from "@/actions/contornos";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { formatBs, formatRef } from "@/lib/money";

interface Contorno {
  id: string;
  name: string;
  priceUsdCents: number;
  isAvailable: boolean;
  sortOrder: number;
}

interface ContornosClientProps {
  contornos: Contorno[];
  exchangeRate: number;
}

function ContornoSheet({
  open,
  onClose,
  onSubmit,
  title,
  exchangeRate,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; priceUsdCents: number; isAvailable: boolean; sortOrder: number }) => Promise<void>;
  title: string;
  exchangeRate: number;
}) {
  const [name, setName] = useState("");
  const [priceDollars, setPriceDollars] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; price?: string }>({});

  useEffect(() => {
    if (open) {
      setName("");
      setPriceDollars("");
      setErrors({});
    }
  }, [open]);

  const priceUsdCents = priceDollars ? Math.round(parseFloat(priceDollars) * 100) : 0;
  const priceBs = Math.round(priceUsdCents * exchangeRate);

  function validate(): boolean {
    const newErrors: { name?: string; price?: string } = {};
    if (!name.trim()) newErrors.name = "Nombre requerido";
    else if (name.trim().length > 100) newErrors.name = "Máximo 100 caracteres";
    if (!priceDollars) {
      newErrors.price = "Precio requerido";
    } else {
      const num = parseFloat(priceDollars);
      if (isNaN(num) || num < 0) newErrors.price = "Precio inválido";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    await onSubmit({ name: name.trim(), priceUsdCents, isAvailable: true, sortOrder: 0 });
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-white p-6 shadow-elevated ring-1 ring-border sm:mx-4 animate-in">
        <h2 className="text-lg font-semibold text-text-main mb-5">{title}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-main">Nombre *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); if (errors.name) setErrors((prev) => ({ ...prev, name: undefined })); }}
              placeholder="Ej: Arroz blanco"
              autoFocus
              className={`w-full rounded-xl border bg-white px-4 py-2.5 text-sm text-text-main placeholder:text-text-muted outline-none transition-all ${errors.name ? "border-error focus:border-error focus:ring-2 focus:ring-error/20" : "border-border focus:border-primary focus:ring-2 focus:ring-primary/20"}`}
            />
            {errors.name && <p className="mt-1 text-xs text-error">{errors.name}</p>}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-main">Precio (USD) *</label>
            <p className="mb-1.5 text-[11px] text-text-muted">Coloca 0 si el contorno no tiene precio adicional</p>
            <div className="flex items-center gap-3">
              <span className="text-sm text-text-muted">REF $</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={priceDollars}
                onChange={(e) => { setPriceDollars(e.target.value); if (errors.price) setErrors((prev) => ({ ...prev, price: undefined })); }}
                placeholder="0.00"
                inputMode="decimal"
                className={`w-32 rounded-xl border bg-white px-4 py-2.5 text-sm font-mono text-text-main placeholder:text-text-muted outline-none transition-all ${errors.price ? "border-error" : "border-border focus:border-primary focus:ring-2 focus:ring-primary/20"}`}
              />
              {priceUsdCents > 0 && <span className="text-xs text-text-muted">≈ {formatBs(priceBs)}</span>}
            </div>
            {errors.price && <p className="mt-1 text-xs text-error">{errors.price}</p>}
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
            <Button type="submit" disabled={loading || !name.trim()} className="flex-1">{loading ? "Guardando..." : "Guardar"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function InlineEditRow({
  item,
  exchangeRate,
  onSave,
  onCancel,
}: {
  item: Contorno;
  exchangeRate: number;
  onSave: (data: { name: string; priceUsdCents: number }) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(item.name);
  const [priceDollars, setPriceDollars] = useState((item.priceUsdCents / 100).toFixed(2));
  const [saving, setSaving] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => { nameRef.current?.focus(); }, []);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await onSave({ name: name.trim(), priceUsdCents: Math.round(parseFloat(priceDollars) * 100) });
    setSaving(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") onCancel();
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-primary/5" onKeyDown={handleKeyDown}>
      <div className="h-4 w-4 shrink-0" />
      <div className="flex-1 flex items-center gap-2">
        <input
          ref={nameRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 rounded-lg border border-border bg-white px-3 py-1.5 text-sm text-text-main outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
        />
        <div className="flex items-center gap-1">
          <span className="text-xs text-text-muted">$</span>
          <input
            value={priceDollars}
            onChange={(e) => setPriceDollars(e.target.value)}
            type="number"
            step="0.01"
            min="0"
            className="w-20 rounded-lg border border-border bg-white px-2 py-1.5 text-sm font-mono text-text-main outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
          />
        </div>
      </div>
      <button
        type="button"
        onClick={handleSave}
        disabled={saving || !name.trim()}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-success hover:bg-success/10 disabled:opacity-50 disabled:pointer-events-none"
      >
        <Check className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-text-muted hover:bg-error/10 hover:text-error"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function ContornosClient({
  contornos,
  exchangeRate,
}: ContornosClientProps) {
  const [items, setItems] = useState(contornos);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [deleteWarning, setDeleteWarning] = useState<{
    id: string;
    name: string;
    count: number;
  } | null>(null);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);

  const handleCreate = async (data: { name: string; priceUsdCents: number; isAvailable: boolean; sortOrder: number }) => {
    const result = await createContorno(data);
    if (result.success) {
      setItems((prev) => [...prev, result.contorno!].sort((a, b) => a.sortOrder - b.sortOrder));
    }
  };

  const handleSave = async (id: string, data: { name: string; priceUsdCents: number }) => {
    const result = await updateContorno(id, data);
    if (result.success) {
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...data } : i)));
      setEditingId(null);
    }
  };

  const handleToggle = async (id: string, isAvailable: boolean) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, isAvailable } : i)));
    await toggleContornoAvailability(id, isAvailable);
  };

  const handleDeleteClick = async (id: string, name: string) => {
    const count = await getContornoUsage(id);
    if (count > 0) {
      setDeleteWarning({ id, name, count });
    } else {
      if (confirm("¿Eliminar este contorno?")) {
        await deleteContorno(id);
        setItems((prev) => prev.filter((i) => i.id !== id));
      }
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteWarning) return;
    await deleteContorno(deleteWarning.id);
    setItems((prev) => prev.filter((i) => i.id !== deleteWarning.id));
    setDeleteWarning(null);
  };

  const handleDragStart = (idx: number) => {
    setDraggingIdx(idx);
  };

  const handleDragEnter = (idx: number) => {
    if (draggingIdx === null || draggingIdx === idx) return;

    const newItems = [...items];
    const draggedItem = newItems.splice(draggingIdx, 1)[0];
    newItems.splice(idx, 0, draggedItem);

    setItems(newItems);
    setDraggingIdx(idx);
  };

  const handleDragEnd = async () => {
    if (draggingIdx === null) return;

    const reordered = items.map((item, i) => ({ ...item, sortOrder: i }));
    setItems(reordered);
    setDraggingIdx(null);

    await reorderContornos(reordered.map((i) => i.id));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-main">Contornos</h1>
          <p className="text-sm text-text-muted">Gestiona los acompañamientos disponibles para los platos</p>
        </div>
        <Button onClick={() => setShowCreateSheet(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nuevo contorno
        </Button>
      </div>

      <Card className="ring-1 ring-border">
        <CardContent className="p-0">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-sm font-medium text-text-main">Sin contornos</p>
              <Button onClick={() => setShowCreateSheet(true)} className="mt-4 gap-2" size="sm">
                <Plus className="h-3.5 w-3.5" />
                Crear contorno
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {items.map((item, idx) => {
                if (editingId === item.id) {
                  return (
                    <InlineEditRow
                      key={item.id}
                      item={item}
                      exchangeRate={exchangeRate}
                      onSave={(data) => handleSave(item.id, data)}
                      onCancel={() => setEditingId(null)}
                    />
                  );
                }

                const priceBs = Math.round(item.priceUsdCents * exchangeRate);
                return (
                  <div
                    key={item.id}
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
                          {item.name}
                        </p>
                        <p className="text-xs text-text-muted mt-0.5 flex items-center gap-1.5">
                          <span className="font-mono font-medium">{formatRef(item.priceUsdCents)}</span>
                          {item.priceUsdCents > 0 && <span>≈ {formatBs(priceBs)}</span>}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-6 pl-8 md:pl-0">
                      <div className="flex items-center gap-6">
                        {/* Visibility Switch */}
                        <div className="flex flex-col items-start gap-1">
                          <span className="text-[10px] font-bold text-text-main uppercase leading-none tracking-wider">Visible</span>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={item.isAvailable}
                              onCheckedChange={(val) => handleToggle(item.id, val)}
                              className="scale-90 origin-left"
                            />
                            <span className={`text-[11px] font-medium leading-none ${item.isAvailable ? "text-success" : "text-text-muted text-opacity-50"}`}>
                              {item.isAvailable ? "Disponible" : "No disp."}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 pt-2 md:pt-0">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setEditingId(item.id)}
                          className="h-8 w-8 text-text-muted hover:text-primary hover:bg-primary/10 transition-colors"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleDeleteClick(item.id, item.name)}
                          className="h-8 w-8 text-text-muted hover:text-error hover:bg-error/10 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <ContornoSheet
        open={showCreateSheet}
        onClose={() => setShowCreateSheet(false)}
        onSubmit={handleCreate}
        title="Nuevo contorno"
        exchangeRate={exchangeRate}
      />

      {deleteWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setDeleteWarning(null)} />
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-elevated ring-1 ring-border mx-4">
            <h3 className="text-lg font-semibold text-text-main mb-2">Contorno asignado</h3>
            <p className="text-sm text-text-muted mb-5">
              &quot;{deleteWarning.name}&quot; está asignado a <strong>{deleteWarning.count}</strong> plato
              {deleteWarning.count !== 1 ? "s" : ""}. ¿Eliminar de todos?
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setDeleteWarning(null)} className="flex-1">Cancelar</Button>
              <Button variant="destructive" onClick={handleConfirmDelete} className="flex-1">Eliminar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
