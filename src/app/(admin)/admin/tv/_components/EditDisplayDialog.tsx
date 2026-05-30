"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { Settings as SettingsIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TvDisplay } from "@/db/schema/tv";
import { updateTvDisplayAction } from "@/actions/tv";

export function EditDisplayDialog({
  display,
  onClose,
  onSaved,
}: {
  display: TvDisplay;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(display.name);
  const [orientation, setOrientation] = useState<TvDisplay["orientation"]>(display.orientation);
  const [rotationDegrees, setRotationDegrees] = useState<number>(display.rotationDegrees);
  const [audioEnabled, setAudioEnabled] = useState(display.audioEnabled);
  const [volumePercent, setVolumePercent] = useState(display.volumePercent);
  const [notes, setNotes] = useState(display.notes ?? "");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const res = await updateTvDisplayAction({
      id: display.id,
      name: name.trim() || undefined,
      orientation,
      rotationDegrees: rotationDegrees as 0 | 90 | 180 | 270,
      audioEnabled,
      volumePercent,
      notes: notes || null,
    });
    setSubmitting(false);
    if (res?.data?.success) {
      toast.success("TV actualizada");
      onSaved();
    } else {
      toast.error(res?.data?.error ?? "Error al guardar");
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="rounded-2xl border-border bg-surface-section sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-lg font-bold text-text-main flex items-center gap-2">
            <SettingsIcon className="h-5 w-5 text-amber-500" />
            Configurar Pantalla
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="edit-name" className="text-xs font-bold text-text-muted">NOMBRE DE LA PANTALLA</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              className="bg-bg-app border-border rounded-xl"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-text-muted">ORIENTACIÓN FÍSICA</Label>
              <Select
                value={orientation}
                onValueChange={(v) => setOrientation(v as TvDisplay["orientation"])}
              >
                <SelectTrigger className="bg-bg-app border-border rounded-xl h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Automática</SelectItem>
                  <SelectItem value="landscape">Horizontal</SelectItem>
                  <SelectItem value="portrait">Vertical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-text-muted">ROTACIÓN CSS ADICIONAL</Label>
              <Select
                value={String(rotationDegrees)}
                onValueChange={(v) => setRotationDegrees(Number(v))}
              >
                <SelectTrigger className="bg-bg-app border-border rounded-xl h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Sin rotación (0°)</SelectItem>
                  <SelectItem value="90">90° derecha</SelectItem>
                  <SelectItem value="180">180° invertido</SelectItem>
                  <SelectItem value="270">90° izquierda</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-[10px] text-text-muted leading-relaxed">
            &quot;Automática&quot; le delega la elección al navegador; usar Horizontal/Vertical para forzar en pantallas giradas 90 grados.
          </p>

          <div className="border-t border-border/40 pt-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-text-main">
              <span>Habilitar Sonido</span>
              <Switch
                checked={audioEnabled}
                onCheckedChange={setAudioEnabled}
              />
            </div>
            <p className="text-[10px] text-text-muted leading-relaxed">
              Si está silenciado, todos los videos se reproducirán mudos por defecto. Si se habilita, se respetará el volumen asignado.
            </p>
            
            <div className="space-y-1.5">
              <Label htmlFor="edit-volume" className="text-xs font-bold text-text-muted flex justify-between">
                <span>VOLUMEN GLOBAL</span>
                <span className="font-mono text-amber-600 font-bold">{volumePercent}%</span>
              </Label>
              <input
                id="edit-volume"
                type="range"
                min={0}
                max={100}
                step={5}
                value={volumePercent}
                onChange={(e) => setVolumePercent(Number(e.target.value))}
                disabled={!audioEnabled}
                className="w-full mt-1.5 h-1.5 bg-bg-app border border-border rounded-lg appearance-none cursor-pointer accent-amber-500 disabled:opacity-30 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          <div className="space-y-1.5 pt-1">
            <Label htmlFor="edit-notes" className="text-xs font-bold text-text-muted">NOTAS DE UBICACIÓN / SOPORTE</Label>
            <Input
              id="edit-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Smart TV TCL de 55&apos;&apos; colgado detrás de caja principal"
              className="bg-bg-app border-border rounded-xl"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
            <Button type="button" variant="outline" onClick={onClose} className="rounded-xl border-border hover:bg-bg-app">
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting} className="rounded-xl bg-amber-500 text-white hover:bg-amber-600 shadow-md shadow-amber-500/10">
              {submitting ? "Guardando…" : "Guardar cambios"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
