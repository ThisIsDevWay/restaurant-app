"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { Tv, Copy, Check } from "lucide-react";
import QRCode from "react-qr-code";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type ProvisionResult = {
  displayId: string;
  displayName: string;
  displayToken: string;
  previewUrl: string;
};

export function ProvisionDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [step, setStep] = useState<"form" | "result">("form");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ProvisionResult | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) {
      setStep("form");
      setName("");
      setResult(null);
      setCopied(false);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Asigna un nombre a la TV");
      return;
    }
    setSubmitting(true);
    try {
      const resp = await fetch("/api/admin/tv/displays/preprovision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: name.trim() }),
      });
      if (!resp.ok) {
        toast.error("Error al generar el enlace");
        return;
      }
      const data = (await resp.json()) as ProvisionResult;
      setResult(data);
      setStep("result");
    } catch {
      toast.error("Error de red");
    } finally {
      setSubmitting(false);
    }
  };

  const copyUrl = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.previewUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("No se pudo copiar al portapapeles");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="rounded-2xl border-border bg-surface-section sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-lg font-bold text-text-main flex items-center gap-2">
            <Tv className="h-5 w-5 text-amber-500" />
            Pre-provisionar TV
          </DialogTitle>
        </DialogHeader>

        {step === "form" && (
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <p className="text-xs text-text-muted leading-relaxed">
              Genera un enlace de instalación directo. Al abrirlo en el Smart TV (o Fully Kiosk Browser) la pantalla se activará inmediatamente sin necesidad de un código de emparejamiento numérico.
            </p>
            <div className="space-y-2">
              <Label htmlFor="provision-name" className="text-xs font-bold text-text-muted">NOMBRE DE LA TV</Label>
              <Input
                id="provision-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: TV Terraza Norte"
                maxLength={80}
                autoFocus
                className="bg-bg-app border-border rounded-xl"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
              <Button type="button" variant="outline" onClick={onClose} className="rounded-xl border-border hover:bg-bg-app">
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting} className="rounded-xl bg-amber-500 text-white hover:bg-amber-600 shadow-md shadow-amber-500/10">
                {submitting ? "Generando…" : "Generar enlace"}
              </Button>
            </div>
          </form>
        )}

        {step === "result" && result && (
          <div className="space-y-5 pt-2">
            <p className="text-xs text-text-muted leading-relaxed">
              La TV <strong className="text-text-main">&quot;{result.displayName}&quot;</strong> ha sido pre-registrada. Copia la URL o escanea el código QR con el dispositivo para configurarlo.
            </p>

            {/* QR Code */}
            <div className="flex justify-center rounded-2xl bg-white p-5 border border-border shadow-sm">
              <QRCode value={result.previewUrl} size={180} />
            </div>

            {/* URL + copy button */}
            <div className="flex items-center gap-2">
              <code className="flex-1 overflow-x-auto rounded-xl bg-bg-app border border-border px-3.5 py-2.5 text-[11px] text-text-muted whitespace-nowrap font-mono">
                {result.previewUrl}
              </code>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={copyUrl}
                className="shrink-0 h-10 w-10 p-0 rounded-xl border-border hover:bg-bg-app"
              >
                {copied ? (
                  <Check className="h-4.5 w-4.5 text-emerald-600" />
                ) : (
                  <Copy className="h-4.5 w-4.5 text-text-muted" />
                )}
              </Button>
            </div>

            <div className="rounded-xl bg-amber-500/5 border border-amber-500/15 p-3 text-[11px] text-amber-800 leading-relaxed">
              <strong>Aviso de seguridad:</strong> Este enlace tiene credenciales integradas que vinculan la pantalla automáticamente. No compartas este enlace públicamente.
            </div>

            <div className="flex justify-end pt-2 border-t border-border/40">
              <Button onClick={onClose} className="rounded-xl bg-amber-500 text-white hover:bg-amber-600 h-10">
                Finalizar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
