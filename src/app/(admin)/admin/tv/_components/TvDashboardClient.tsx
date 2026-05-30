"use client";

import { useEffect, useState, useTransition } from "react";
import { supabaseBrowser } from "@/lib/supabase-client";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Tv,
  Image as ImageIcon,
  CalendarHeart,
  PlugZap,
  Wifi,
  WifiOff,
  Activity,
  ChevronRight,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Link as LinkIcon,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { TvDisplay } from "@/db/schema/tv";
import { EmptyState } from "./EmptyState";
import { DisplayRow } from "./DisplayRow";
import { PairDialog } from "./PairDialog";
import { ProvisionDialog } from "./ProvisionDialog";
import { EditDisplayDialog } from "./EditDisplayDialog";
import { DisplayMediaDialog } from "./DisplayMediaDialog";

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
            <Card className="h-full border bg-gradient-to-br hover:-translate-y-1 hover:shadow-md hover:shadow-amber-500/[0.02] transition-all duration-300 cursor-pointer">
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
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110 shadow-sm bg-surface-section">
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
                  <p className="font-bold text-text-main">Obtén el código de emparejamiento</p>
                  <p className="text-text-muted leading-relaxed">
                    La pantalla de la TV cargará y mostrará un código de emparejamiento de 6 caracteres alfanuméricos.
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

              <div className="flex items-center gap-1 text-[9px] text-text-muted mt-4">
                <span>Multi-Resolución</span>
                <span className="text-border/60">•</span>
                <span>Caché offline</span>
                <span className="text-border/60">•</span>
                <span>Tiempo Real</span>
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
