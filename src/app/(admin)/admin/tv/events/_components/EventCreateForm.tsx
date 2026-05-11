"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createTvEventAction } from "@/actions/tv";

export function EventCreateForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [appliesToAllDisplays, setAppliesToAllDisplays] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Nombre requerido");
      return;
    }
    setSubmitting(true);
    const res = await createTvEventAction({
      name: name.trim(),
      description: description.trim() || null,
      startsAt: startsAt ? new Date(startsAt + ":00-04:00").toISOString() : null,
      endsAt: endsAt ? new Date(endsAt + ":00-04:00").toISOString() : null,
      appliesToAllDisplays,
    });
    setSubmitting(false);
    if (res?.data?.success && res.data.event) {
      toast.success("Evento creado");
      router.push(`/admin/tv/events/${res.data.event.id}`);
    } else {
      toast.error(res?.data?.error ?? "Error al crear");
    }
  };

  return (
    <Card className="ring-1 ring-border">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="ev-name">Nombre del evento *</Label>
            <Input
              id="ev-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Boda Pérez · Festival de Pasta · Cena de gala"
              maxLength={120}
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="ev-desc">Descripción</Label>
            <Input
              id="ev-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Notas internas (opcional)"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="ev-start">Inicio (opcional)</Label>
              <Input
                id="ev-start"
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="ev-end">Fin (opcional)</Label>
              <Input
                id="ev-end"
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
              />
            </div>
          </div>
          <label className="flex items-start gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={appliesToAllDisplays}
              onChange={(e) => setAppliesToAllDisplays(e.target.checked)}
              className="h-4 w-4 mt-0.5"
            />
            <span>
              Aplicar a TODAS las TVs cuando esté activo
              <br />
              <span className="text-xs text-text-muted">
                Útil para festivales o noches temáticas (ej: Festival de Pasta los martes).
              </span>
            </span>
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creando…" : "Crear evento"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
