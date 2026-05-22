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
    <Card className="border border-border-ghost bg-bg-card rounded-[14px] shadow-card">
      <CardContent className="p-6 md:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1">
            <Label htmlFor="ev-name" className="text-text-main font-semibold tracking-wide text-xs uppercase block">
              Nombre del evento *
            </Label>
            <Input
              id="ev-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Boda Pérez · Festival de Pasta · Cena de gala"
              maxLength={120}
              autoFocus
              className="border-0 border-b border-border bg-transparent hover:border-primary/50 focus:border-primary focus:border-b-2 rounded-none px-0 py-2 outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-primary transition-all w-full text-text-main"
            />
          </div>
          
          <div className="space-y-1">
            <Label htmlFor="ev-desc" className="text-text-main font-semibold tracking-wide text-xs uppercase block">
              Descripción
            </Label>
            <Input
              id="ev-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Notas internas (opcional)"
              className="border-0 border-b border-border bg-transparent hover:border-primary/50 focus:border-primary focus:border-b-2 rounded-none px-0 py-2 outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-primary transition-all w-full text-text-main"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-1">
              <Label htmlFor="ev-start" className="text-text-main font-semibold tracking-wide text-xs uppercase block">
                Inicio (opcional)
              </Label>
              <Input
                id="ev-start"
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className="border-0 border-b border-border bg-transparent hover:border-primary/50 focus:border-primary focus:border-b-2 rounded-none px-0 py-2 outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-primary transition-all w-full text-text-main"
              />
            </div>
            
            <div className="space-y-1">
              <Label htmlFor="ev-end" className="text-text-main font-semibold tracking-wide text-xs uppercase block">
                Fin (opcional)
              </Label>
              <Input
                id="ev-end"
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                className="border-0 border-b border-border bg-transparent hover:border-primary/50 focus:border-primary focus:border-b-2 rounded-none px-0 py-2 outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-primary transition-all w-full text-text-main"
              />
            </div>
          </div>

          <div className="p-3.5 bg-surface-section/40 border border-border-ghost rounded-[10px] hover:bg-surface-section/60 transition-all flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              id="ev-all-tvs"
              checked={appliesToAllDisplays}
              onChange={(e) => setAppliesToAllDisplays(e.target.checked)}
              className="h-4.5 w-4.5 text-primary border-border focus:ring-primary rounded mt-0.5 cursor-pointer accent-primary"
            />
            <label htmlFor="ev-all-tvs" className="text-sm text-text-main cursor-pointer select-none">
              <span className="font-semibold block">Aplicar a TODAS las TVs cuando esté activo</span>
              <span className="text-xs text-text-muted block mt-0.5 leading-relaxed">
                Útil para festivales o noches temáticas (ej: Festival de Pasta los martes).
              </span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.back()}
              className="bg-surface-section text-primary hover:bg-surface-section/80 rounded-full font-semibold px-6 py-2 transition-all active:scale-[0.96] shadow-sm h-10 text-sm"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={submitting}
              className="rounded-full bg-gradient-to-br from-primary to-primary-hover hover:from-primary-hover hover:to-primary text-white hover:scale-[1.02] active:scale-[0.96] shadow-sm transition-all font-semibold h-10 px-6 text-sm"
            >
              {submitting ? "Creando…" : "Crear evento"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
