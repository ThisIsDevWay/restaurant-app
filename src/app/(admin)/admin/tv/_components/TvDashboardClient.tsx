"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { supabaseBrowser } from "@/lib/supabase-client";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import {
  Tv,
  ImageIcon,
  CalendarHeart,
  PlugZap,
  Wifi,
  WifiOff,
  Clock,
  Volume2,
  VolumeX,
  Activity,
  ChevronRight,
  ArrowRight,
  Sparkles,
  Settings as SettingsIcon,
  RefreshCw,
  Trash2,
  Link as LinkIcon,
  Copy,
  Check,
  Film,
  GripVertical,
  Video as VideoIcon,
} from "lucide-react";
import QRCode from "react-qr-code";
import { cn } from "@/lib/utils";
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
import { Switch } from "@/components/ui/switch";
import { useConfirm } from "@/components/ui/confirm-dialog";
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
  initialStats: {
    mediaCount: number;
    activeEventsCount: number;
  };
};

export function TvDashboardClient({ initialDisplays, initialStats }: Props) {
  const [displays, setDisplays] = useState<TvDisplay[]>(initialDisplays);
  const [onlineDisplayIds, setOnlineDisplayIds] = useState<Set<string>>(new Set());
  const [pairOpen, setPairOpen] = useState(false);
  const [provisionOpen, setProvisionOpen] = useState(false);
  const [editing, setEditing] = useState<TvDisplay | null>(null);
  const [mediaConfig, setMediaConfig] = useState<TvDisplay | null>(null);
  const [, startTransition] = useTransition();

  const searchParams = useSearchParams();
  const router = useRouter();

  // Handle URL query parameters (e.g. ?pair=true)
  useEffect(() => {
    if (searchParams?.get("pair") === "true") {
      setPairOpen(true);
      const params = new URLSearchParams(searchParams.toString());
      params.delete("pair");
      const query = params.toString();
      router.replace(`/admin/tv${query ? `?${query}` : ""}`);
    }
  }, [searchParams, router]);

  // Refresh TV Displays data from API
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

  // Presence: subscribe to the shared TV tracker channel to get real-time
  // online/offline status for each display without polling the DB.
  useEffect(() => {
    const channel = supabaseBrowser.channel("tv-presence-tracker");
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<{ displayId: string }>();
        const ids = new Set<string>();
        Object.values(state).forEach((presences) => {
          presences.forEach((p) => { if (p.displayId) ids.add(p.displayId); });
        });
        setOnlineDisplayIds(ids);
      })
      .subscribe();
    return () => { supabaseBrowser.removeChannel(channel); };
  }, []);

  // Compute live client-side stats
  const registeredCount = displays.filter((d) => d.isActive).length;
  const onlineCount = displays.filter(
    (d) => d.isActive && onlineDisplayIds.has(d.id),
  ).length;

  const cards = [
    {
      label: "Pantallas Registradas",
      value: registeredCount,
      subtitle: "Smart TVs vinculadas",
      icon: Tv,
      onClick: () => {
        const el = document.getElementById("active-screens-card");
        if (el) el.scrollIntoView({ behavior: "smooth" });
      },
      gradient: "from-amber-500/10 to-amber-600/5 border-amber-500/20",
      iconBg: "bg-amber-500/10",
      iconColor: "text-amber-600",
    },
    {
      label: "Smart TVs Online",
      value: onlineCount,
      subtitle: "Transmitiendo en vivo",
      icon: onlineCount > 0 ? Wifi : WifiOff,
      onClick: () => {
        const el = document.getElementById("active-screens-card");
        if (el) el.scrollIntoView({ behavior: "smooth" });
      },
      gradient: onlineCount > 0 ? "from-emerald-500/10 to-emerald-600/5 border-emerald-500/20" : "from-slate-500/10 to-slate-600/5 border-slate-500/20",
      iconBg: onlineCount > 0 ? "bg-emerald-500/10" : "bg-slate-500/10",
      iconColor: onlineCount > 0 ? "text-emerald-600" : "text-slate-500",
      pulse: onlineCount > 0,
    },
    {
      label: "Biblioteca de Medios",
      value: initialStats.mediaCount,
      subtitle: "Imágenes, videos y pizarras",
      icon: ImageIcon,
      href: "/admin/tv/media",
      gradient: "from-blue-500/10 to-blue-600/5 border-blue-500/20",
      iconBg: "bg-blue-500/10",
      iconColor: "text-blue-600",
    },
    {
      label: "Eventos Especiales",
      value: initialStats.activeEventsCount,
      subtitle: "Programas activos",
      icon: CalendarHeart,
      href: "/admin/tv/events",
      gradient: "from-rose-500/10 to-rose-600/5 border-rose-500/20",
      iconBg: "bg-rose-500/10",
      iconColor: "text-rose-600",
    },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      {/* Premium Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-amber-500/15 bg-gradient-to-br from-amber-50/60 via-surface-section to-surface-section p-6 md:p-8 shadow-sm">
        {/* Decorative subtle background aura */}
        <div className="absolute right-0 top-0 -mr-20 -mt-20 h-80 w-80 rounded-full bg-amber-200/25 blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2.5 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs font-bold text-amber-700 uppercase tracking-wider">
              <Activity className="h-3 w-3 animate-pulse" />
              Centro de Transmisión
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-text-main tracking-tight font-serif">
              Señalización Digital
            </h1>
            <p className="text-sm md:text-base text-text-muted leading-relaxed">
              Controla y personaliza en tiempo real las pantallas del restaurante. Diseña pizarras premium para el Menú del Día, sube anuncios y programa eventos privados desde una interfaz unificada.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 shrink-0 self-start md:self-auto">
            <Button
              variant="outline"
              size="lg"
              onClick={() => setProvisionOpen(true)}
              className="rounded-xl border-amber-500/20 text-amber-700 bg-amber-500/5 hover:bg-amber-500/10 transition-all font-semibold"
            >
              <LinkIcon className="h-4.5 w-4.5" />
              Pre-provisionar TV
            </Button>
            <Button
              size="lg"
              onClick={() => setPairOpen(true)}
              className="rounded-xl bg-amber-500 text-white hover:bg-amber-600 hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg hover:shadow-amber-500/10 transition-all font-semibold"
            >
              <PlugZap className="h-4.5 w-4.5" />
              Emparejar nueva TV
            </Button>
          </div>
        </div>
      </div>

      {/* Dynamic Status Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const content = (
            <Card className={`h-full border bg-gradient-to-br ${card.gradient} hover:-translate-y-1 hover:shadow-md hover:shadow-amber-500/[0.02] transition-all duration-300 cursor-pointer`}>
              <CardContent className="p-5 flex flex-col justify-between h-full min-h-[110px]">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                      {card.label}
                    </p>
                    <p className="text-3xl font-extrabold text-text-main tracking-tight font-mono">
                      {card.value}
                    </p>
                  </div>
                  <div className="relative">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110 shadow-sm ${card.iconBg}`}>
                      <card.icon className={`h-5.5 w-5.5 ${card.iconColor}`} />
                    </div>
                    {card.pulse && (
                      <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-xs text-text-muted mt-4 font-medium flex items-center justify-between group-hover:text-text-main transition-colors">
                  <span>{card.subtitle}</span>
                  <ChevronRight className="h-3.5 w-3.5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all shrink-0" />
                </p>
              </CardContent>
            </Card>
          );

          if (card.href) {
            return (
              <Link key={card.label} href={card.href} className="group block h-full">
                {content}
              </Link>
            );
          }

          return (
            <div key={card.label} onClick={card.onClick} className="group block h-full select-none">
              {content}
            </div>
          );
        })}
      </div>

      {/* Main Sections Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2/3 width): Screens Administration grid */}
        <div className="lg:col-span-2">
          <Card id="active-screens-card" className="border border-border/80 bg-surface-section/60 backdrop-blur-md shadow-sm h-full flex flex-col">
            <CardHeader className="border-b border-border/50 pb-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="space-y-0.5">
                  <CardTitle className="text-lg font-bold text-text-main flex items-center gap-2">
                    <Tv className="h-5 w-5 text-amber-500" />
                    Monitoreo y Control de Pantallas
                  </CardTitle>
                  <p className="text-xs text-text-muted">
                    Administra orientación, playlists personalizadas de medios y volumen de tus TVs vinculadas
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={refresh} className="h-8 text-xs font-semibold">
                    <RefreshCw className="h-3.5 w-3.5 mr-1" />
                    Refrescar
                  </Button>
                  <Badge variant="outline" className="text-xs font-semibold px-2.5 py-0.5 h-6">
                    {displays.length} registradas
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 flex flex-col justify-center min-h-[300px]">
              {displays.length === 0 ? (
                <div className="p-4">
                  <EmptyState onPair={() => setPairOpen(true)} />
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {displays.map((d) => (
                    <DisplayRow
                      key={d.id}
                      display={d}
                      isOnline={d.isActive && onlineDisplayIds.has(d.id)}
                      onEdit={() => setEditing(d)}
                      onConfigureMedia={() => setMediaConfig(d)}
                      onChange={refresh}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column (1/3 width): Interactive Operative Guide */}
        <div className="space-y-6">
          <Card className="border border-border/80 bg-surface-section/60 backdrop-blur-md shadow-sm h-full flex flex-col justify-between">
            <CardHeader className="border-b border-border/50 pb-4">
              <CardTitle className="text-lg font-bold text-text-main flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-500" />
                Guía de Enlace
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5 pb-6 space-y-5 text-xs flex-1">
              <div className="flex gap-3.5 group">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/20 text-[11px] font-bold text-amber-700 group-hover:scale-110 transition-transform">
                  1
                </span>
                <div className="space-y-0.5">
                  <p className="font-bold text-text-main">Abre el portal en la TV</p>
                  <p className="text-text-muted leading-relaxed">
                    Abre el navegador web de tu Smart TV e ingresa a la dirección:
                  </p>
                  <div className="mt-1">
                    <code className="bg-amber-500/5 border border-amber-500/10 text-amber-700 px-2 py-0.7 rounded text-[11px] font-mono font-semibold">
                      /tv
                    </code>
                  </div>
                </div>
              </div>

              <div className="flex gap-3.5 group">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/20 text-[11px] font-bold text-amber-700 group-hover:scale-110 transition-transform">
                  2
                </span>
                <div className="space-y-0.5">
                  <p className="font-bold text-text-main">Obtén el código numérico</p>
                  <p className="text-text-muted leading-relaxed">
                    La pantalla de la TV cargará y mostrará un código de emparejamiento de 4 dígitos.
                  </p>
                </div>
              </div>

              <div className="flex gap-3.5 group">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/20 text-[11px] font-bold text-amber-700 group-hover:scale-110 transition-transform">
                  3
                </span>
                <div className="space-y-0.5">
                  <p className="font-bold text-text-main">Vincula desde el Panel</p>
                  <p className="text-text-muted leading-relaxed">
                    Haz clic en el botón <strong className="text-text-main">&quot;Emparejar nueva TV&quot;</strong> de arriba, ingresa el código y ponle un nombre descriptivo a tu TV.
                  </p>
                </div>
              </div>

              <div className="flex gap-3.5 group">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/20 text-[11px] font-bold text-amber-700 group-hover:scale-110 transition-transform">
                  4
                </span>
                <div className="space-y-0.5">
                  <p className="font-bold text-text-main">Sube Medios y ¡Listo!</p>
                  <p className="text-text-muted leading-relaxed">
                    Ve a la pestaña Medios, sube videos/imágenes o crea pizarras del Menú del Día. La TV se actualizará automáticamente en pocos segundos.
                  </p>
                </div>
              </div>

              <div className="border-t border-border/50 pt-4 flex flex-wrap gap-1.5 font-medium text-[10px]">
                <Badge variant="secondary" className="px-2 font-medium">Multi-Resolución</Badge>
                <Badge variant="secondary" className="px-2 font-medium">Caché offline</Badge>
                <Badge variant="secondary" className="px-2 font-medium">Tiempo Real</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>

      {/* Quick Navigation Action Panels */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-text-main tracking-tight font-serif flex items-center gap-2">
          Secciones de Configuración
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Link href="/admin/tv/media" className="group">
            <Card className="border border-border/80 bg-surface-section hover:border-blue-400 hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 h-full">
              <CardContent className="p-5 flex items-start gap-4">
                <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform text-blue-600">
                  <ImageIcon className="h-5.5 w-5.5" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-sm text-text-main flex items-center gap-1 group-hover:text-blue-700 transition-colors">
                    Biblioteca de Medios
                    <ArrowRight className="h-3.5 w-3.5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  </h3>
                  <p className="text-xs text-text-muted leading-relaxed">
                    Sube banners promocionales y videos. Diseña la pizarra interactiva en 9:16 con sincronización al menú en tiempo real.
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/tv/events" className="group">
            <Card className="border border-border/80 bg-surface-section hover:border-rose-400 hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 h-full">
              <CardContent className="p-5 flex items-start gap-4">
                <div className="h-10 w-10 rounded-xl bg-rose-500/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform text-rose-600">
                  <CalendarHeart className="h-5.5 w-5.5" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-sm text-text-main flex items-center gap-1 group-hover:text-rose-700 transition-colors">
                    Eventos Especiales
                    <ArrowRight className="h-3.5 w-3.5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  </h3>
                  <p className="text-xs text-text-muted leading-relaxed">
                    Define transmisiones automáticas exclusivas para reservas, bodas corporativas, partidos en vivo o celebraciones.
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {/* Dialogs */}
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
    <div className="py-12 text-center max-w-md mx-auto">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 mb-4 border border-amber-500/15">
        <Tv className="h-7 w-7 text-amber-600 animate-pulse" />
      </div>
      <h3 className="text-base font-bold text-text-main mb-1.5">
        No hay pantallas emparejadas
      </h3>
      <p className="text-xs text-text-muted mb-6 leading-relaxed">
        Comienza emparejando un Smart TV o tablet abriendo la dirección <code className="bg-bg-app px-1.5 py-0.5 rounded text-[11px] font-mono border border-border">/tv</code> en su navegador y usando el código de enlace de 4 dígitos.
      </p>
      <Button size="sm" onClick={onPair} className="font-semibold h-9 rounded-lg bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/10">
        <PlugZap className="h-4 w-4 mr-1.5" />
        Enlazar Mi Primera TV
      </Button>
    </div>
  );
}

/* ───────────────────────── Display Card ───────────────────────── */

function DisplayRow({
  display,
  isOnline,
  onEdit,
  onConfigureMedia,
  onChange,
}: {
  display: TvDisplay;
  isOnline: boolean;
  onEdit: () => void;
  onConfigureMedia: () => void;
  onChange: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const { confirm, confirmDialog } = useConfirm();

  useEffect(() => {
    setMounted(true);
  }, []);

  const lastSeenMs = display.lastSeenAt
    ? Date.now() - new Date(display.lastSeenAt).getTime()
    : Infinity;
  
  const lastSeenText = !mounted
    ? "Cargando..."
    : lastSeenMs === Infinity
      ? "Nunca visto"
      : lastSeenMs < 10_000
        ? "En línea"
        : lastSeenMs < 30_000
          ? "Hace unos segundos"
          : lastSeenMs < 60_000
            ? `Hace ${Math.floor(lastSeenMs / 1000)}s`
            : lastSeenMs < 3_600_000
              ? `Hace ${Math.floor(lastSeenMs / 60_000)}m`
              : lastSeenMs < 86_400_000
                ? `Hace ${Math.floor(lastSeenMs / 3_600_000)}h`
                : new Date(display.lastSeenAt!).toLocaleDateString("es-VE", {
                    day: "numeric",
                    month: "short",
                  });

  const handleRevoke = async () => {
    const ok = await confirm({
      title: "Revocar acceso",
      description: `"${display.name}" volverá al modo de emparejamiento.`,
      confirmLabel: "Revocar",
      destructive: true,
    });
    if (!ok) return;
    const res = await revokeTvDisplayAction({ id: display.id });
    if (res?.data?.success) {
      toast.success("TV revocada");
      onChange();
    } else {
      toast.error("Error al revocar");
    }
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: "Eliminar TV",
      description: `¿Eliminar permanentemente "${display.name}"? Esta acción no se puede deshacer.`,
      confirmLabel: "Eliminar",
      destructive: true,
    });
    if (!ok) return;
    const res = await deleteTvDisplayAction({ id: display.id });
    if (res?.data?.success) {
      toast.success("TV eliminada");
      onChange();
    } else {
      toast.error("Error al eliminar");
    }
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4.5 gap-4 hover:bg-amber-500/[0.01] transition-all duration-200">
        <div className="flex items-start gap-3.5 min-w-0">
          <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0 text-amber-600 shadow-sm border border-amber-500/15">
            <Tv className={cn("h-5 w-5", display.orientation === "portrait" && "rotate-90")} />
          </div>
          
          <div className="space-y-1.5 min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-sm font-bold text-text-main truncate max-w-[200px] sm:max-w-[300px]">
                {display.name}
              </h4>
              {!display.isActive ? (
                <Badge variant="destructive" className="text-[9px] px-1.5 h-4.5 font-bold uppercase tracking-wider">Revocada</Badge>
              ) : (
                <Badge
                  className={cn(
                    "text-[9px] px-1.5 h-4.5 border font-bold uppercase tracking-wider",
                    isOnline
                      ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                      : "bg-slate-50 border-slate-200 text-slate-600"
                  )}
                >
                  {isOnline ? "Online" : "Offline"}
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-text-muted">
              <div className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                <span>Actividad: {lastSeenText}</span>
              </div>
              
              <span className="text-border/60 font-light">•</span>
              
              <div>
                <span>Orientación: </span>
                <span className="text-text-main font-semibold capitalize">
                  {display.orientation === "auto" ? "Automática" : display.orientation === "landscape" ? "Horizontal" : "Vertical"}
                </span>
                {display.rotationDegrees > 0 && ` (+${display.rotationDegrees}°)`}
              </div>

              {display.lastReportedSize && (
                <>
                  <span className="text-border/60 font-light">•</span>
                  <div className="font-mono">
                    <span className="font-sans text-text-muted">Resolución: </span>
                    <span className="text-text-main font-semibold">{display.lastReportedSize}</span>
                  </div>
                </>
              )}

              <span className="text-border/60 font-light">•</span>

              <div className="flex items-center gap-1">
                {display.audioEnabled ? (
                  <>
                    <Volume2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>
                      Audio: <strong className="text-text-main">{display.volumePercent}%</strong>
                    </span>
                  </>
                ) : (
                  <>
                    <VolumeX className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>Silenciado</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0 sm:self-center">
          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
            className="h-8 text-[11px] font-semibold border-border hover:bg-amber-500/5 hover:border-amber-500/20 hover:text-amber-700 rounded-lg px-3"
          >
            <SettingsIcon className="h-3.5 w-3.5 mr-1" />
            Editar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onConfigureMedia}
            className="h-8 text-[11px] font-semibold border-border hover:bg-blue-500/5 hover:border-blue-500/20 hover:text-blue-700 rounded-lg px-3"
          >
            <Film className="h-3.5 w-3.5 mr-1" />
            Medios
          </Button>
          {display.isActive ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRevoke}
              className="h-8 text-[11px] font-semibold border-border hover:bg-rose-500/5 hover:border-rose-500/20 hover:text-rose-600 rounded-lg px-3"
            >
              Revocar
            </Button>
          ) : (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              className="h-8 text-[11px] font-semibold shadow-sm rounded-lg px-3"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Eliminar
            </Button>
          )}
        </div>
      </div>
      {confirmDialog}
    </>
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
                setCode(e.target.value.replace(/\D/g, "").slice(0, 4))
              }
              inputMode="numeric"
              autoComplete="off"
              autoFocus
              placeholder="0000"
              className="font-mono text-3xl tracking-[0.4em] text-center h-14 bg-bg-app border-border focus:border-amber-500 rounded-xl"
              maxLength={4}
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

  // Load library + current display selection
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
    setSubmitting(true);
    if (res?.data?.success) {
      toast.success(
        selectedIds.length === 0
          ? "Lista de reproducción borrada — esta TV reproducirá toda la biblioteca global"
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
      <DialogContent className="max-w-3xl max-h-[85vh] p-0 flex flex-col gap-0 rounded-2xl border-border bg-surface-section overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-border/40 shrink-0">
          <DialogTitle className="font-serif text-lg font-bold text-text-main flex items-center gap-2 pr-8">
            <Film className="h-5 w-5 text-amber-500 animate-pulse" />
            Playlist Curada de &quot;{display.name}&quot;
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 min-h-0 min-w-0">
          {loading ? (
            <div className="py-16 text-center text-xs text-text-muted flex flex-col items-center justify-center gap-2">
              <RefreshCw className="h-6 w-6 animate-spin text-amber-500" />
              <span>Cargando medios de la biblioteca...</span>
            </div>
          ) : library.length === 0 ? (
            <div className="py-12 text-center max-w-sm mx-auto">
              <div className="h-12 w-12 rounded-xl bg-slate-500/10 flex items-center justify-center mx-auto mb-4 border border-border">
                <Film className="h-5 w-5 text-slate-500" />
              </div>
              <p className="text-xs text-text-muted leading-relaxed">
                La biblioteca de medios está vacía. Sube imágenes, videos o diseña pizarras de menú en la{" "}
                <Link href="/admin/tv/media" className="text-amber-600 hover:underline font-semibold">
                  Biblioteca de medios
                </Link>{" "}
                para poder asignarlos a esta pantalla.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Info banner */}
              <div
                className={`rounded-xl border p-4 text-[11px] leading-relaxed ${
                  selectedIds.length === 0
                    ? "border-amber-500/20 bg-amber-500/5 text-amber-800"
                    : "border-emerald-500/20 bg-emerald-500/5 text-text-main"
                }`}
              >
                {selectedIds.length === 0 ? (
                  <>
                    <strong>Modo Global Activo:</strong> Al no tener una playlist exclusiva configurada, esta pantalla reproducirá automáticamente <strong>todos</strong> los medios activos de la biblioteca general en bucle continuo. Marca elementos de la lista inferior para crear una playlist exclusiva.
                  </>
                ) : (
                  <>
                    <strong>Playlist Personalizada:</strong> Esta TV reproducirá de manera exclusiva y cíclica los {selectedIds.length} medio(s) seleccionados, respetando el orden numérico asignado. Haz clic y arrastra el ícono <GripVertical className="h-3 w-3 inline" /> para reordenar la secuencia.
                  </>
                )}
              </div>

              {/* Selected (ordered) */}
              {selectedItems.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold text-text-main uppercase tracking-wider">
                      Playlist de la TV ({selectedItems.length})
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClear}
                      className="h-7 text-xs hover:bg-rose-500/10 hover:text-rose-600 font-semibold"
                    >
                      Remover Todos
                    </Button>
                  </div>
                  <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                    {selectedItems.map((item, idx) => (
                      <div
                        key={item.id}
                        draggable
                        onDragStart={() => handleReorderDragStart(item.id)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => handleReorderDrop(item.id)}
                        className="flex items-center gap-3 rounded-xl border border-border/80 bg-bg-app p-2 cursor-move group hover:border-amber-500/20 hover:bg-amber-500/[0.01] transition"
                      >
                        <GripVertical className="h-4 w-4 text-text-muted shrink-0 cursor-grab active:cursor-grabbing" />
                        <span className="text-[11px] font-mono text-text-muted w-5 shrink-0 font-bold">
                          #{idx + 1}
                        </span>
                        <MediaThumb item={item} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-text-main truncate">
                            {item.title}
                          </p>
                          <p className="text-[10px] text-text-muted capitalize">
                            {item.type === "image" ? "Imagen" : item.type === "menu_board" ? "Pizarra Menú" : "Video"} · {item.durationSeconds}s
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggle(item.id)}
                          className="p-2 rounded-lg text-rose-500/70 hover:text-rose-600 hover:bg-rose-500/10 transition shrink-0"
                          title="Quitar de playlist"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Available pool */}
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider">
                    Medios Disponibles ({availableItems.length})
                  </h3>
                  {availableItems.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSelectAll}
                      className="h-7 text-xs text-amber-700 hover:bg-amber-500/5 font-semibold"
                    >
                      Añadir Todos
                    </Button>
                  )}
                </div>
                {availableItems.length === 0 ? (
                  <p className="text-[11px] text-text-muted py-2 select-none italic text-center">
                    Has añadido todos los medios disponibles en la biblioteca general.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[220px] overflow-y-auto pr-1">
                    {availableItems.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggle(item.id)}
                        className="flex items-center gap-2 rounded-xl border border-border bg-bg-app p-2 hover:border-amber-500/30 hover:bg-amber-500/[0.01] transition text-left group"
                      >
                        <MediaThumb item={item} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-bold text-text-main truncate group-hover:text-amber-700">
                            {item.title}
                          </p>
                          <p className="text-[9px] text-text-muted capitalize">
                            {item.type === "image" ? "Imagen" : item.type === "menu_board" ? "Pizarra" : "Video"} · {item.durationSeconds}s
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-border/40 bg-bg-app/40 shrink-0">
          <Button variant="outline" onClick={onClose} disabled={submitting} className="rounded-xl border-border">
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={submitting || loading} className="rounded-xl bg-amber-500 text-white hover:bg-amber-600 shadow-sm shadow-amber-500/5">
            {submitting ? "Guardando…" : "Guardar Playlist"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MediaThumb({ item }: { item: TvMedia }) {
  return (
    <div className="relative w-10 h-10 rounded overflow-hidden bg-black shrink-0 border border-border">
      {item.type === "image" && item.publicUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.publicUrl}
          alt=""
          className="w-full h-full object-cover"
        />
      ) : item.type === "menu_board" ? (
        <div className="w-full h-full flex items-center justify-center bg-amber-500/10 text-[8px] font-extrabold text-amber-700">
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
        <div className="w-full h-full flex items-center justify-center text-white/50 bg-slate-950">
          <VideoIcon className="h-4 w-4" />
        </div>
      )}
      <div className="absolute bottom-0 right-0 bg-black/60 p-0.5 rounded-tl-[3px] border-t border-l border-white/5">
        {item.type === "image" ? (
          <ImageIcon className="h-2 w-2 text-white" />
        ) : item.type === "menu_board" ? (
          <Tv className="h-2 w-2 text-white" />
        ) : (
          <VideoIcon className="h-2 w-2 text-white" />
        )}
      </div>
    </div>
  );
}
