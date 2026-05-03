"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { SECTIONS, paletteFor } from "@/lib/salon-constants";
import type { EditingTable, TableShape } from "@/lib/salon-types";
import type { RestaurantTable } from "@/db/schema/restaurant-tables";
import { ShapeIcon } from "@/components/salon/SalonSharedUI";

interface TableFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingTable: EditingTable | null;
  setEditingTable: (table: EditingTable | null) => void;
  onSubmit: (e: React.FormEvent) => void;
  tables: RestaurantTable[];
  gridCols: number;
  gridRows: number;
}

export function TableFormModal({
  isOpen,
  onClose,
  editingTable,
  setEditingTable,
  onSubmit,
  tables,
  gridCols,
  gridRows,
}: TableFormModalProps) {
  if (!editingTable) return null;

  const isEdit = tables.some((t) => t.id === editingTable.id);

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md rounded-3xl bg-[#fff8f3] border-none shadow-2xl p-0 overflow-hidden">
        <form onSubmit={onSubmit}>
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="font-display text-2xl font-black text-[#251a07]">
              {isEdit ? "Editar Mesa" : "Nueva Mesa"}
            </DialogTitle>
            <DialogDescription className="text-[#9a7a5a]">
              Configura los detalles y la ubicación de la mesa en el salón.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 p-6 pt-2">
            {/* ID / Nombre */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="label" className="text-xs font-bold uppercase tracking-widest text-[#9a7a5a]">
                  Identificador
                </Label>
                <Input
                  id="label"
                  value={editingTable.label ?? ""}
                  onChange={(e) => setEditingTable({ ...editingTable, label: e.target.value })}
                  placeholder="Ej: Mesa 5"
                  className="rounded-xl border-2 border-[#e9e2d9] bg-white focus:border-[#bb0005] focus:ring-0"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="capacity" className="text-xs font-bold uppercase tracking-widest text-[#9a7a5a]">
                  Capacidad
                </Label>
                <Input
                  id="capacity"
                  type="number"
                  value={editingTable.capacity ?? 4}
                  onChange={(e) => setEditingTable({ ...editingTable, capacity: parseInt(e.target.value) })}
                  className="rounded-xl border-2 border-[#e9e2d9] bg-white focus:border-[#bb0005] focus:ring-0"
                  required
                />
              </div>
            </div>

            {/* Sección y Forma */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-[#9a7a5a]">Sección</Label>
                <Select
                  value={editingTable.section ?? "Principal"}
                  onValueChange={(v) => setEditingTable({ ...editingTable, section: v })}
                >
                  <SelectTrigger className="rounded-xl border-2 border-[#e9e2d9] bg-white focus:border-[#bb0005]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl bg-white shadow-xl">
                    {SECTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: paletteFor(s).dot }}
                          />
                          {s}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-[#9a7a5a]">Forma</Label>
                <div className="flex gap-2 p-1 rounded-xl border-2 border-[#e9e2d9] bg-white">
                  {(["cuadrada", "rectangular", "circular"] as TableShape[]).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setEditingTable({
                        ...editingTable,
                        shape: s,
                        colSpan: s === "rectangular" ? 3 : 2,
                        rowSpan: 2
                      })}
                      className={cn(
                        "flex flex-1 items-center justify-center rounded-lg py-1.5 transition-all",
                        editingTable.shape === s
                          ? "bg-[#bb0005] text-white shadow-md"
                          : "text-[#9a7a5a] hover:bg-[#fff2e2]"
                      )}
                    >
                      <ShapeIcon shape={s} size={18} />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Posición y Tamaño */}
            <div className="grid grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-[#9a7a5a]">Columna</Label>
                <Input
                  type="number"
                  min={1}
                  max={gridCols}
                  value={editingTable.gridCol ?? 1}
                  onChange={(e) => setEditingTable({ ...editingTable, gridCol: parseInt(e.target.value) })}
                  className="h-9 rounded-lg border-2 border-[#e9e2d9] bg-white text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-[#9a7a5a]">Fila</Label>
                <Input
                  type="number"
                  min={1}
                  max={gridRows}
                  value={editingTable.gridRow ?? 1}
                  onChange={(e) => setEditingTable({ ...editingTable, gridRow: parseInt(e.target.value) })}
                  className="h-9 rounded-lg border-2 border-[#e9e2d9] bg-white text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-[#9a7a5a]">Ancho (G)</Label>
                <Input
                  type="number"
                  min={1}
                  max={6}
                  value={editingTable.colSpan ?? 2}
                  onChange={(e) => setEditingTable({ ...editingTable, colSpan: parseInt(e.target.value) })}
                  className="h-9 rounded-lg border-2 border-[#e9e2d9] bg-white text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-[#9a7a5a]">Alto (G)</Label>
                <Input
                  type="number"
                  min={1}
                  max={6}
                  value={editingTable.rowSpan ?? 2}
                  onChange={(e) => setEditingTable({ ...editingTable, rowSpan: parseInt(e.target.value) })}
                  className="h-9 rounded-lg border-2 border-[#e9e2d9] bg-white text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-white p-3 border-2 border-[#e9e2d9]">
              <div className="space-y-0.5">
                <Label className="text-xs font-black text-[#251a07]">Mesa Activa</Label>
                <p className="text-[10px] text-[#9a7a5a]">Visible para meseros y clientes</p>
              </div>
              <Switch
                checked={editingTable.isActive ?? true}
                onCheckedChange={(c) => setEditingTable({ ...editingTable, isActive: c })}
              />
            </div>
          </div>

          <DialogFooter className="bg-[#f5ece0] p-6">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="rounded-xl text-[#9a7a5a] hover:bg-white/50"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="rounded-xl bg-[#bb0005] px-8 font-bold text-white hover:bg-[#9a0004]"
            >
              {isEdit ? "Guardar Cambios" : "Crear Mesa"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}
