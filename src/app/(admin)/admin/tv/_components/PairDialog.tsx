"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { PlugZap } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { pairTvDisplayAction } from "@/actions/tv";

export function PairDialog({
  open,
  onClose,
  onPaired,
}: {
  open: boolean;
  onClose: () => void;
  onPaired: () => void;
}) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setCode("");
      setName("");
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[A-Z2-9]{6}$/.test(code)) {
      toast.error("El código debe tener 6 caracteres alfanuméricos");
      return;
    }
    if (!name.trim()) {
      toast.error("Asigna un nombre a la TV");
      return;
    }
    setSubmitting(true);
    const res = await pairTvDisplayAction({
      code,
      displayName: name.trim(),
    });
    setSubmitting(false);
    if (res?.data?.success) {
      toast.success(`TV "${res.data.displayName}" emparejada`);
      onPaired();
    } else {
      toast.error(res?.data?.error ?? "Error al emparejar");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="rounded-2xl border-border bg-surface-section sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-lg font-bold text-text-main flex items-center gap-2">
            <PlugZap className="h-5 w-5 text-amber-500" />
            Emparejar nueva TV
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="pair-code" className="text-xs font-bold text-text-muted">CÓDIGO DE EMPAREJAMIENTO</Label>
            <Input
              id="pair-code"
              value={code}
              onChange={(e) =>
                setCode(e.target.value.toUpperCase().replace(/[^A-Z2-9]/g, "").slice(0, 6))
              }
              autoComplete="off"
              autoFocus
              placeholder="ABCDEF"
              className="font-mono text-3xl tracking-[0.4em] text-center h-14 bg-bg-app border-border focus:border-amber-500 rounded-xl"
              maxLength={6}
            />
            <p className="text-[11px] text-text-muted leading-relaxed">
              Abre la dirección <code className="bg-bg-app px-1 py-0.5 rounded text-[10px] font-mono border">/tv</code> en tu Smart TV para ver el código de enlace.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pair-name" className="text-xs font-bold text-text-muted">NOMBRE PARA LA PANTALLA</Label>
            <Input
              id="pair-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: TV Barra Principal, TV Entrada"
              maxLength={80}
              className="bg-bg-app border-border rounded-xl"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
            <Button type="button" variant="outline" onClick={onClose} className="rounded-xl border-border hover:bg-bg-app">
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting} className="rounded-xl bg-amber-500 text-white hover:bg-amber-600 shadow-md shadow-amber-500/10">
              {submitting ? "Emparejando…" : "Emparejar TV"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
