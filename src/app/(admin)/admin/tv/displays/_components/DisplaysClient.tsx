"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  PlugZap,
  Wifi,
  WifiOff,
  RefreshCw,
  Settings as SettingsIcon,
  Trash2,
  Volume2,
  VolumeX,
  Link,
  Copy,
  Check,
  Tv,
  Film,
  GripVertical,
  Image as ImageIcon,
  Video as VideoIcon,
} from "lucide-react";
import QRCode from "react-qr-code";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  pairTvDisplayAction,
  updateTvDisplayAction,
  revokeTvDisplayAction,
  deleteTvDisplayAction,
  setDisplayMediaAction,
} from "@/actions/tv";
import type { TvDisplay, TvMedia } from "@/db/schema/tv";

type Props = {
  initialDisplays: TvDisplay[];
};

export function DisplaysClient({ initialDisplays }: Props) {
  const [displays, setDisplays] = useState<TvDisplay[]>(initialDisplays);
  const [pairOpen, setPairOpen] = useState(false);
  const [provisionOpen, setProvisionOpen] = useState(false);
  const [editing, setEditing] = useState<TvDisplay | null>(null);
  const [mediaConfig, setMediaConfig] = useState<TvDisplay | null>(null);
  const [, startTransition] = useTransition();

  const refresh = async () => {
    try {
      const resp = await fetch("/api/admin/tv/displays", { cache: "no-store" });
      if (!resp.ok) return;
      const data = (await resp.json()) as { displays: TvDisplay[] };
      setDisplays(data.displays);
    } catch {
      /* ignore */
    }
  };

  // Auto-refresh every 10s so online indicator stays current.
  useEffect(() => {
    const id = window.setInterval(refresh, 10_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-text-main">Smart TVs</h1>
          <p className="text-sm text-text-muted">
            Empareja, renombra y administra las pantallas del restaurante.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="lg" onClick={refresh}>
            <RefreshCw className="h-4 w-4" />
            Refrescar
          </Button>
          <Button variant="outline" size="lg" onClick={() => setProvisionOpen(true)}>
            <Link className="h-4 w-4" />
            Pre-provisionar TV
          </Button>
          <Button size="lg" onClick={() => setPairOpen(true)}>
            <PlugZap className="h-4 w-4" />
            Emparejar nueva TV
          </Button>
        </div>
      </div>

      {displays.length === 0 ? (
        <EmptyState onPair={() => setPairOpen(true)} />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {displays.map((d) => (
            <DisplayCard
              key={d.id}
              display={d}
              onEdit={() => setEditing(d)}
              onConfigureMedia={() => setMediaConfig(d)}
              onChange={refresh}
            />
          ))}
        </div>
      )}

      <PairDialog
        open={pairOpen}
        onClose={() => setPairOpen(false)}
        onPaired={() => {
          setPairOpen(false);
          refresh();
        }}
      />

      <ProvisionDialog
        open={provisionOpen}
        onClose={() => {
          setProvisionOpen(false);
          refresh();
        }}
      />

      {editing && (
        <EditDisplayDialog
          display={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
          startTransition={startTransition}
        />
      )}

      {mediaConfig && (
        <DisplayMediaDialog
          display={mediaConfig}
          onClose={() => setMediaConfig(null)}
        />
      )}
    </div>
  );
}

/* ───────────────────────── Empty State ───────────────────────── */

function EmptyState({ onPair }: { onPair: () => void }) {
  return (
    <Card className="ring-1 ring-border">
      <CardContent className="py-16 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 mb-4">
          <PlugZap className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-lg font-semibold text-text-main mb-2">
          Aún no hay TVs emparejadas
        </h2>
        <p className="text-sm text-text-muted max-w-md mx-auto mb-6">
          Abre la URL{" "}
          <code className="bg-bg-app px-1.5 py-0.5 rounded text-xs">/tv</code>{" "}
          en el navegador del Smart TV. Mostrará un código de 4 dígitos. Luego, presiona el botón de abajo y emparéjala.
        </p>
        <Button size="lg" onClick={onPair}>
          <PlugZap className="h-4 w-4" />
          Emparejar mi primera TV
        </Button>
      </CardContent>
    </Card>
  );
}

/* ───────────────────────── Display Card ───────────────────────── */

function DisplayCard({
  display,
  onEdit,
  onConfigureMedia,
  onChange,
}: {
  display: TvDisplay;
  onEdit: () => void;
  onConfigureMedia: () => void;
  onChange: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const lastSeenMs = display.lastSeenAt
    ? Date.now() - new Date(display.lastSeenAt).getTime()
    : Infinity;
  const isOnline = display.isActive && lastSeenMs < 30_000;
  
  const lastSeenText = !mounted
    ? "Cargando..."
    : lastSeenMs === Infinity
      ? "Nunca"
      : lastSeenMs < 60_000
        ? `${Math.floor(lastSeenMs / 1000)}s`
        : lastSeenMs < 3_600_000
          ? `${Math.floor(lastSeenMs / 60_000)} min`
          : `${Math.floor(lastSeenMs / 3_600_000)} h`;

  const handleRevoke = async () => {
    if (!confirm(`¿Revocar acceso de "${display.name}"? La pantalla volverá al modo de emparejamiento.`)) return;
    const res = await revokeTvDisplayAction({ id: display.id });
    if (res?.data?.success) {
      toast.success("TV revocada");
      onChange();
    } else {
      toast.error("Error al revocar");
    }
  };

  const handleDelete = async () => {
    if (!confirm(`¿Eliminar permanentemente "${display.name}"?`)) return;
    const res = await deleteTvDisplayAction({ id: display.id });
    if (res?.data?.success) {
      toast.success("TV eliminada");
      onChange();
    } else {
      toast.error("Error al eliminar");
    }
  };

  return (
    <Card className="ring-1 ring-border">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${isOnline ? "bg-success" : "bg-text-muted/40"}`}
              aria-hidden
            />
            {display.name}
          </CardTitle>
          {!display.isActive && <Badge variant="destructive">Revocada</Badge>}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-center justify-between text-text-muted">
          <span className="flex items-center gap-1.5">
            {isOnline ? (
              <Wifi className="h-3.5 w-3.5 text-success" />
            ) : (
              <WifiOff className="h-3.5 w-3.5" />
            )}
            {isOnline ? "En línea" : "Desconectada"}
          </span>
          <span className="text-xs">Última actividad: {lastSeenText}</span>
        </div>

        <div className="space-y-1 text-xs text-text-muted">
          <div>
            <span className="font-medium">Orientación:</span>{" "}
            <Badge variant="outline" className="text-[10px]">
              {display.orientation}
            </Badge>{" "}
            {display.rotationDegrees > 0 && (
              <Badge variant="outline" className="text-[10px]">
                +{display.rotationDegrees}°
              </Badge>
            )}
          </div>
          {display.lastReportedSize && (
            <div>
              <span className="font-medium">Tamaño reportado:</span>{" "}
              {display.lastReportedSize}
            </div>
          )}
          <div className="flex items-center gap-1.5">
            {display.audioEnabled ? (
              <>
                <Volume2 className="h-3 w-3 text-success" />
                <span>
                  Audio habilitado · {display.volumePercent}%
                </span>
              </>
            ) : (
              <>
                <VolumeX className="h-3 w-3" />
                <span>Sin audio</span>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={onEdit}>
            <SettingsIcon className="h-3.5 w-3.5" />
            Editar
          </Button>
          <Button variant="outline" size="sm" onClick={onConfigureMedia}>
            <Film className="h-3.5 w-3.5" />
            Medios
          </Button>
          {display.isActive ? (
            <Button variant="outline" size="sm" onClick={handleRevoke}>
              Revocar
            </Button>
          ) : (
            <Button variant="destructive" size="sm" onClick={handleDelete}>
              <Trash2 className="h-3.5 w-3.5" />
              Eliminar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/* ───────────────────────── Pair Dialog ───────────────────────── */

function PairDialog({
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
    if (!/^[0-9]{4}$/.test(code)) {
      toast.error("El código debe tener 4 dígitos");
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Emparejar nueva TV</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="pair-code">Código de la TV</Label>
            <Input
              id="pair-code"
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, "").slice(0, 4))
              }
              inputMode="numeric"
              autoComplete="off"
              autoFocus
              placeholder="0000"
              className="font-mono text-2xl tracking-[0.4em] text-center"
              maxLength={4}
            />
            <p className="mt-1.5 text-xs text-text-muted">
              Abre la URL{" "}
              <code className="bg-bg-app px-1 py-0.5 rounded">/tv</code> en la
              Smart TV para ver el código.
            </p>
          </div>
          <div>
            <Label htmlFor="pair-name">Nombre de la TV</Label>
            <Input
              id="pair-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: TV Barra"
              maxLength={80}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Emparejando…" : "Emparejar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ───────────────────────── Provision Dialog ───────────────────────── */

type ProvisionResult = {
  displayId: string;
  displayName: string;
  displayToken: string;
  previewUrl: string;
};

function ProvisionDialog({
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tv className="h-5 w-5" />
            Pre-provisionar TV
          </DialogTitle>
        </DialogHeader>

        {step === "form" && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-text-muted">
              Genera un enlace de instalación directo. Al abrirlo en el Aiwa TV
              (Fully Kiosk Browser) la pantalla se activa sin código de emparejamiento.
            </p>
            <div>
              <Label htmlFor="provision-name">Nombre de la TV</Label>
              <Input
                id="provision-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: TV Barra Principal"
                maxLength={80}
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Generando…" : "Generar enlace"}
              </Button>
            </div>
          </form>
        )}

        {step === "result" && result && (
          <div className="space-y-5">
            <p className="text-sm text-text-muted">
              TV{" "}
              <span className="font-semibold text-text-main">
                {result.displayName}
              </span>{" "}
              creada. Copia la URL o escanea el QR con tu teléfono para configurar el Aiwa TV.
            </p>

            {/* QR Code */}
            <div className="flex justify-center rounded-xl bg-white p-4">
              <QRCode value={result.previewUrl} size={200} />
            </div>

            {/* URL + copy button */}
            <div className="flex items-center gap-2">
              <code className="flex-1 overflow-x-auto rounded-md bg-bg-app px-3 py-2 text-xs text-text-muted whitespace-nowrap">
                {result.previewUrl}
              </code>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={copyUrl}
                className="shrink-0"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-success" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>

            <p className="text-xs text-text-muted">
              <strong>Importante:</strong> este enlace activa la TV
              inmediatamente. Guárdalo en un lugar seguro; cualquiera que lo
              abra tomará control de esa pantalla.
            </p>

            <div className="flex justify-end">
              <Button onClick={onClose}>Listo</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ───────────────────────── Edit Display Dialog ───────────────────────── */

function EditDisplayDialog({
  display,
  onClose,
  onSaved,
}: {
  display: TvDisplay;
  onClose: () => void;
  onSaved: () => void;
  startTransition: React.TransitionStartFunction;
}) {
  const [name, setName] = useState(display.name);
  const [orientation, setOrientation] = useState<TvDisplay["orientation"]>(
    display.orientation,
  );
  const [rotationDegrees, setRotationDegrees] = useState<number>(
    display.rotationDegrees,
  );
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar TV</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="edit-name">Nombre</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
            />
          </div>
          <div>
            <Label>Orientación</Label>
            <Select
              value={orientation}
              onValueChange={(v) =>
                setOrientation(v as TvDisplay["orientation"])
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Automática</SelectItem>
                <SelectItem value="landscape">Horizontal</SelectItem>
                <SelectItem value="portrait">Vertical</SelectItem>
              </SelectContent>
            </Select>
            <p className="mt-1 text-xs text-text-muted">
              &quot;Automática&quot; deja que la TV detecte; &quot;Horizontal/Vertical&quot; fuerza la rotación CSS si la TV está montada al revés.
            </p>
          </div>
          <div>
            <Label>Rotación adicional</Label>
            <Select
              value={String(rotationDegrees)}
              onValueChange={(v) => setRotationDegrees(Number(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">0°</SelectItem>
                <SelectItem value="90">90°</SelectItem>
                <SelectItem value="180">180°</SelectItem>
                <SelectItem value="270">270°</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="border-t border-border pt-4 space-y-3">
            <div className="text-sm font-semibold text-text-main">Audio</div>
            <label className="flex items-start gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={audioEnabled}
                onChange={(e) => setAudioEnabled(e.target.checked)}
                className="h-4 w-4 mt-0.5"
              />
              <span>
                Audio habilitado en esta TV
                <br />
                <span className="text-xs text-text-muted">
                  Si está desactivado, todos los videos van mudos. Si está activado, cada video usa su propia configuración de audio.
                </span>
              </span>
            </label>
            <div>
              <Label htmlFor="edit-volume">
                Volumen: <span className="font-mono">{volumePercent}%</span>
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
                className="w-full mt-2 disabled:opacity-50"
              />
              <p className="text-xs text-text-muted mt-1">
                La primera vez la TV puede pedir un toque para desbloquear el audio (regla del navegador).
              </p>
            </div>
          </div>
          <div>
            <Label htmlFor="edit-notes">Notas (opcional)</Label>
            <Input
              id="edit-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: TV Samsung de 55 pulgadas, mesa 12"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ──────────────────── Display Media Config Dialog ──────────────────── */

function DisplayMediaDialog({
  display,
  onClose,
}: {
  display: TvDisplay;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [library, setLibrary] = useState<TvMedia[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const dragIdRef = useRef<string | null>(null);

  // Load library + current selection.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await fetch(
          `/api/admin/tv/displays/${display.id}/media`,
          { cache: "no-store" },
        );
        if (!resp.ok) {
          toast.error("Error al cargar los medios");
          return;
        }
        const data = (await resp.json()) as {
          library: TvMedia[];
          selectedIds: string[];
        };
        if (cancelled) return;
        setLibrary(data.library);
        setSelectedIds(data.selectedIds);
      } catch {
        if (!cancelled) toast.error("Error de red");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [display.id]);

  const selectedSet = new Set(selectedIds);
  const selectedItems = selectedIds
    .map((id) => library.find((m) => m.id === id))
    .filter((m): m is TvMedia => Boolean(m));
  const availableItems = library.filter((m) => !selectedSet.has(m.id));

  const toggle = (mediaId: string) => {
    setSelectedIds((prev) =>
      prev.includes(mediaId)
        ? prev.filter((id) => id !== mediaId)
        : [...prev, mediaId],
    );
  };

  const handleReorderDragStart = (id: string) => {
    dragIdRef.current = id;
  };
  const handleReorderDrop = (targetId: string) => {
    const sourceId = dragIdRef.current;
    dragIdRef.current = null;
    if (!sourceId || sourceId === targetId) return;
    setSelectedIds((prev) => {
      const next = [...prev];
      const from = next.indexOf(sourceId);
      const to = next.indexOf(targetId);
      if (from === -1 || to === -1) return prev;
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const handleSave = async () => {
    setSubmitting(true);
    const res = await setDisplayMediaAction({
      displayId: display.id,
      mediaIds: selectedIds,
    });
    setSubmitting(false);
    if (res?.data?.success) {
      toast.success(
        selectedIds.length === 0
          ? "Selección limpiada — esta TV mostrará toda la biblioteca"
          : `${selectedIds.length} medio(s) asignados a "${display.name}"`,
      );
      onClose();
    } else {
      toast.error(res?.data?.error ?? "Error al guardar");
    }
  };

  const handleSelectAll = () => setSelectedIds(library.map((m) => m.id));
  const handleClear = () => setSelectedIds([]);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Film className="h-5 w-5" />
            Medios de &quot;{display.name}&quot;
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-16 text-center text-sm text-text-muted">
            Cargando…
          </div>
        ) : library.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-text-muted">
              La biblioteca general está vacía. Sube imágenes o videos en{" "}
              <code className="bg-bg-app px-1.5 py-0.5 rounded text-xs">
                Biblioteca de medios
              </code>{" "}
              para poder asignarlos.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Info banner */}
            <div
              className={`rounded-lg border p-3 text-xs ${
                selectedIds.length === 0
                  ? "border-info/30 bg-info/5 text-info"
                  : "border-success/30 bg-success/5 text-text-main"
              }`}
            >
              {selectedIds.length === 0 ? (
                <>
                  <strong>Modo por defecto:</strong> sin selección esta TV
                  reproduce <strong>toda</strong> la biblioteca general en el
                  orden global. Marca elementos abajo para curar una playlist
                  propia.
                </>
              ) : (
                <>
                  <strong>Playlist personalizada:</strong> esta TV reproducirá
                  solo los {selectedIds.length} medio(s) seleccionados, en el
                  orden mostrado. Arrastra para reordenar.
                </>
              )}
            </div>

            {/* Selected (ordered) */}
            {selectedItems.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-text-main">
                    Seleccionados ({selectedItems.length})
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClear}
                    className="h-7 text-xs"
                  >
                    Limpiar
                  </Button>
                </div>
                <div className="space-y-1.5">
                  {selectedItems.map((item, idx) => (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={() => handleReorderDragStart(item.id)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => handleReorderDrop(item.id)}
                      className="flex items-center gap-3 rounded-lg border border-border bg-bg-surface p-2 cursor-move group hover:border-primary/40 transition"
                    >
                      <GripVertical className="h-4 w-4 text-text-muted shrink-0" />
                      <span className="text-xs font-mono text-text-muted w-6 shrink-0">
                        {idx + 1}
                      </span>
                      <MediaThumb item={item} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-main truncate">
                          {item.title}
                        </p>
                        <p className="text-xs text-text-muted">
                          {item.type === "image" ? "Imagen" : "Video"} ·{" "}
                          {item.durationSeconds}s
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggle(item.id)}
                        className="p-1.5 rounded text-error/70 hover:text-error hover:bg-error/10 transition shrink-0"
                        title="Quitar"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Available pool */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-text-main">
                  Disponibles en biblioteca ({availableItems.length})
                </h3>
                {availableItems.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSelectAll}
                    className="h-7 text-xs"
                  >
                    Seleccionar todo
                  </Button>
                )}
              </div>
              {availableItems.length === 0 ? (
                <p className="text-xs text-text-muted py-2">
                  Has seleccionado todos los medios disponibles.
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {availableItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggle(item.id)}
                      className="flex items-center gap-2 rounded-lg border border-border bg-bg-surface p-2 hover:border-primary/60 hover:bg-primary/5 transition text-left"
                    >
                      <MediaThumb item={item} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-text-main truncate">
                          {item.title}
                        </p>
                        <p className="text-[10px] text-text-muted">
                          {item.type === "image" ? "Imagen" : "Video"} ·{" "}
                          {item.durationSeconds}s
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={submitting || loading}>
            {submitting ? "Guardando…" : "Guardar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MediaThumb({ item }: { item: TvMedia }) {
  return (
    <div className="relative w-12 h-12 rounded overflow-hidden bg-black shrink-0 ring-1 ring-border">
      {item.type === "image" && item.publicUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.publicUrl}
          alt=""
          className="w-full h-full object-cover"
        />
      ) : item.type === "menu_board" ? (
        <div className="w-full h-full flex items-center justify-center bg-amber-500/15 text-[9px] font-bold text-amber-600">
          MENÚ
        </div>
      ) : item.thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.thumbnailUrl}
          alt=""
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-white/60">
          <VideoIcon className="h-4 w-4" />
        </div>
      )}
      <div className="absolute bottom-0 right-0 bg-black/70 p-0.5 rounded-tl">
        {item.type === "image" ? (
          <ImageIcon className="h-2.5 w-2.5 text-white" />
        ) : (
          <VideoIcon className="h-2.5 w-2.5 text-white" />
        )}
      </div>
    </div>
  );
}
