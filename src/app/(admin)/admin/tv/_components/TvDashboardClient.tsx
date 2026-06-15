"use client";

import { useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-client";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Tv,
  CalendarHeart,
  PlugZap,
  Wifi,
  WifiOff,
  Activity,
  ChevronRight,
  Sparkles,
  RefreshCw,
  Link as LinkIcon,
  Image as ImageIcon,
  GripVertical,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { TvDisplay, TvMedia } from "@/db/schema/tv";
import { EmptyState } from "./EmptyState";
import { DisplayRow } from "./DisplayRow";
import { PairDialog } from "./PairDialog";
import { ProvisionDialog } from "./ProvisionDialog";
import { EditDisplayDialog } from "./EditDisplayDialog";
import { DisplayMediaDialog } from "./DisplayMediaDialog";
import { MediaClient } from "./MediaClient";
import type { CategoryLite } from "./EditMediaDialog";
import { reorderTvDisplaysAction } from "@/actions/tv";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type EventMediaItem = TvMedia & { eventId: string; eventName: string };

type Props = {
  initialDisplays: TvDisplay[];
  initialMedia: TvMedia[];
  initialEventMedia: EventMediaItem[];
  categories: CategoryLite[];
  initialStats: {
    activeEventsCount: number;
  };
};

type Tab = "screens" | "media";

export function TvDashboardClient({
  initialDisplays,
  initialMedia,
  initialEventMedia,
  categories,
  initialStats,
}: Props) {
  const [displays, setDisplays] = useState<TvDisplay[]>(initialDisplays);
  const [onlineDisplayIds, setOnlineDisplayIds] = useState<Set<string>>(new Set());
  const [pairOpen, setPairOpen] = useState(false);
  const [provisionOpen, setProvisionOpen] = useState(false);
  const [editing, setEditing] = useState<TvDisplay | null>(null);
  const [mediaConfig, setMediaConfig] = useState<TvDisplay | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("screens");

  // Drag-and-drop state for display rows
  const dragIdRef = useRef<string | null>(null);
  const [draggedDisplayId, setDraggedDisplayId] = useState<string | null>(null);
  const [dragOverDisplayId, setDragOverDisplayId] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const router = useRouter();

  // Handle URL query parameters (e.g. ?pair=true, ?tab=media)
  useEffect(() => {
    const tabParam = searchParams?.get("tab");
    if (tabParam === "media" || tabParam === "screens") {
      setActiveTab(tabParam);
    }
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
      // Respect server-side order (already sorted by displayOrder)
      setDisplays(data.displays);
    } catch {
      /* ignore */
    }
  };

  // Presence: subscribe to the shared TV tracker channel
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

  // Compute stats
  const registeredCount = displays.filter((d) => d.isActive).length;
  const onlineCount = displays.filter(
    (d) => d.isActive && onlineDisplayIds.has(d.id),
  ).length;

  /* ── Drag-and-drop handlers for display rows ── */
  const handleDisplayDragStart = (id: string) => {
    dragIdRef.current = id;
    setDraggedDisplayId(id);
  };
  const handleDisplayDragEnd = () => {
    dragIdRef.current = null;
    setDraggedDisplayId(null);
    setDragOverDisplayId(null);
  };
  const handleDisplayDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };
  const handleDisplayDragEnter = (id: string) => {
    if (dragIdRef.current && dragIdRef.current !== id) {
      setDragOverDisplayId(id);
    }
  };
  const handleDisplayDrop = async (targetId: string) => {
    const sourceId = dragIdRef.current;
    dragIdRef.current = null;
    setDraggedDisplayId(null);
    setDragOverDisplayId(null);
    if (!sourceId || sourceId === targetId) return;

    const sourceIdx = displays.findIndex((d) => d.id === sourceId);
    const targetIdx = displays.findIndex((d) => d.id === targetId);
    if (sourceIdx === -1 || targetIdx === -1) return;

    // Optimistic update
    const next = [...displays];
    const [moved] = next.splice(sourceIdx, 1);
    next.splice(targetIdx, 0, moved);
    setDisplays(next);

    const res = await reorderTvDisplaysAction({
      orderedIds: next.map((d) => d.id),
    });
    if (!res?.data?.success) {
      toast.error("Error al reordenar pantallas");
      await refresh(); // revert
    }
  };

  const statCards = [
    {
      label: "Pantallas Registradas",
      value: registeredCount,
      subtitle: "Smart TVs vinculadas",
      icon: Tv,
      onClick: () => setActiveTab("screens"),
      gradient: "from-amber-500/10 to-amber-600/5 border-amber-500/20",
      iconColor: "text-amber-600",
    },
    {
      label: "Smart TVs Online",
      value: onlineCount,
      subtitle: "Transmitiendo en vivo",
      icon: onlineCount > 0 ? Wifi : WifiOff,
      onClick: () => setActiveTab("screens"),
      gradient:
        onlineCount > 0
          ? "from-emerald-500/10 to-emerald-600/5 border-emerald-500/20"
          : "from-slate-500/10 to-slate-600/5 border-slate-500/20",
      iconColor: onlineCount > 0 ? "text-emerald-600" : "text-slate-500",
      pulse: onlineCount > 0,
    },
    {
      label: "Eventos Especiales",
      value: initialStats.activeEventsCount,
      subtitle: "Programas activos",
      icon: CalendarHeart,
      href: "/admin/tv/events",
      gradient: "from-rose-500/10 to-rose-600/5 border-rose-500/20",
      iconColor: "text-rose-600",
    },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      {/* ── Hero Banner ── */}
      <div className="relative overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-br from-bg-card to-surface-section p-6 md:p-8 shadow-sm">
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
              Controla y personaliza en tiempo real las pantallas del restaurante. Diseña pizarras
              premium, sube anuncios y programa eventos desde una interfaz unificada.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 shrink-0 self-start md:self-auto">
            <Button
              variant="outline"
              size="lg"
              onClick={() => setProvisionOpen(true)}
              className="rounded-xl border-amber-500/20 text-amber-700 bg-amber-500/5 hover:bg-amber-500/10 transition-all font-semibold"
            >
              <LinkIcon className="h-4 w-4 mr-1.5" />
              Pre-provisionar TV
            </Button>
            <Button
              size="lg"
              onClick={() => setPairOpen(true)}
              className="rounded-xl bg-amber-500 text-white hover:bg-amber-600 hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg hover:shadow-amber-500/10 transition-all font-semibold"
            >
              <PlugZap className="h-4 w-4 mr-1.5" />
              Emparejar nueva TV
            </Button>
          </div>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {statCards.map((card) => {
          const content = (
            <Card
              className={`h-full border bg-gradient-to-br hover:-translate-y-1 hover:shadow-md transition-all duration-300 cursor-pointer group ${card.gradient}`}
            >
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
                      <card.icon className={`h-5 w-5 ${card.iconColor}`} />
                    </div>
                    {"pulse" in card && card.pulse && (
                      <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
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

          if ("href" in card && card.href) {
            return (
              <Link key={card.label} href={card.href} className="block h-full">
                {content}
              </Link>
            );
          }
          return (
            <div
              key={card.label}
              onClick={"onClick" in card ? card.onClick : undefined}
              className="block h-full select-none"
            >
              {content}
            </div>
          );
        })}
      </div>

      {/* ── Unified Tabs ── */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Tab)}>
        <TabsList className="mb-6 inline-flex w-full h-12 bg-bg-card border border-border/80 rounded-2xl p-1 gap-1 shadow-sm">
          <TabsTrigger
            value="screens"
            className="flex-1 h-10 rounded-xl font-semibold text-sm gap-2 data-active:bg-amber-500 data-active:text-white data-active:shadow-md data-active:shadow-amber-500/20 hover:bg-amber-500/5 hover:text-amber-700 transition-all cursor-pointer"
          >
            <Tv className="h-4 w-4" />
            Pantallas
            {displays.length > 0 && (
              <Badge className={cn("ml-1.5 font-bold px-1.5 py-0.5 text-[10px] rounded-full border-0 transition-colors duration-200",
                activeTab === "screens"
                  ? "bg-white text-amber-600 font-bold"
                  : "bg-amber-500/10 text-amber-700 font-bold"
              )}>
                {displays.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="media"
            className="flex-1 h-10 rounded-xl font-semibold text-sm gap-2 data-active:bg-blue-500 data-active:text-white data-active:shadow-md data-active:shadow-blue-500/20 hover:bg-blue-500/5 hover:text-blue-700 transition-all cursor-pointer"
          >
            <ImageIcon className="h-4 w-4" />
            Biblioteca de Medios
          </TabsTrigger>
        </TabsList>

        {/* ── Tab: Pantallas ── */}
        <TabsContent value="screens" className="mt-0 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: screens list */}
            <div className="lg:col-span-2">
              <Card
                id="active-screens-card"
                className="border border-border/80 bg-bg-card shadow-sm h-full flex flex-col"
              >
                <CardHeader className="border-b border-border/50 pb-4">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="space-y-0.5">
                      <CardTitle className="text-lg font-bold text-text-main flex items-center gap-2">
                        <Tv className="h-5 w-5 text-amber-500" />
                        Monitoreo y Control de Pantallas
                      </CardTitle>
                      <p className="text-xs text-text-muted">
                        Administra orientación, playlists y volumen de tus TVs. Arrastra las filas para reordenarlas.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={refresh}
                        className="h-8 text-xs font-semibold"
                      >
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
                        <DraggableDisplayRow
                          key={d.id}
                          display={d}
                          isOnline={d.isActive && onlineDisplayIds.has(d.id)}
                          isDragging={draggedDisplayId === d.id}
                          isDragOver={dragOverDisplayId === d.id}
                          onDragStart={() => handleDisplayDragStart(d.id)}
                          onDragEnd={handleDisplayDragEnd}
                          onDragOver={handleDisplayDragOver}
                          onDragEnter={() => handleDisplayDragEnter(d.id)}
                          onDrop={() => handleDisplayDrop(d.id)}
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

            {/* Right: pairing guide */}
            <div>
              <Card className="border border-border/80 bg-bg-card shadow-sm h-full flex flex-col">
                <CardHeader className="border-b border-border/50 pb-4">
                  <CardTitle className="text-lg font-bold text-text-main flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-amber-500" />
                    Guía de Enlace
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-5 pb-6 space-y-5 text-xs flex-1">
                  {[
                    {
                      step: "1",
                      title: "Abre el portal en la TV",
                      body: (
                        <>
                          Abre el navegador web de tu Smart TV e ingresa a la dirección:{" "}
                          <code className="bg-amber-500/5 border border-amber-500/10 text-amber-700 px-1.5 py-0.5 rounded text-[11px] font-mono font-semibold">
                            /tv
                          </code>
                        </>
                      ),
                    },
                    {
                      step: "2",
                      title: "Obtén el código de emparejamiento",
                      body: "La pantalla mostrará un código de 6 caracteres alfanuméricos.",
                    },
                    {
                      step: "3",
                      title: "Vincula desde el Panel",
                      body: 'Haz clic en "Emparejar nueva TV", ingresa el código y ponle un nombre descriptivo.',
                    },
                    {
                      step: "4",
                      title: "Sube Medios y ¡Listo!",
                      body: "Ve a la pestaña Medios, sube videos/imágenes o crea pizarras del Menú del Día. La TV se actualiza automáticamente.",
                    },
                  ].map(({ step, title, body }) => (
                    <div key={step} className="flex gap-3.5 group">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/20 text-[11px] font-bold text-amber-700 group-hover:scale-110 transition-transform">
                        {step}
                      </span>
                      <div className="space-y-0.5">
                        <p className="font-bold text-text-main">{title}</p>
                        <p className="text-text-muted leading-relaxed">{body}</p>
                      </div>
                    </div>
                  ))}

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

          {/* Quick nav to Events */}
          <div className="space-y-3">
            <h2 className="text-base font-bold text-text-main tracking-tight font-serif flex items-center gap-2">
              Secciones adicionales
            </h2>
            <Link href="/admin/tv/events" className="group block">
              <Card className="border border-border/80 bg-surface-section hover:border-rose-400 hover:-translate-y-0.5 hover:shadow-md transition-all duration-300">
                <CardContent className="p-5 flex items-start gap-4">
                  <div className="h-10 w-10 rounded-xl bg-rose-500/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform text-rose-600">
                    <CalendarHeart className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-sm text-text-main group-hover:text-rose-700 transition-colors">
                      Eventos Especiales
                    </h3>
                    <p className="text-xs text-text-muted leading-relaxed">
                      Define transmisiones automáticas exclusivas para reservas, bodas corporativas, partidos en vivo o celebraciones.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </TabsContent>

        {/* ── Tab: Medios ── */}
        <TabsContent value="media" className="mt-0">
          <MediaClient
            initialMedia={initialMedia}
            initialEventMedia={initialEventMedia}
            categories={categories}
          />
        </TabsContent>
      </Tabs>

      {/* ── Dialogs ── */}
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
          categories={categories}
          onClose={() => setMediaConfig(null)}
        />
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   DraggableDisplayRow — wraps DisplayRow with DnD affordances
────────────────────────────────────────────────────────────── */

function DraggableDisplayRow({
  display,
  isOnline,
  isDragging,
  isDragOver,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragEnter,
  onDrop,
  onEdit,
  onConfigureMedia,
  onChange,
}: {
  display: TvDisplay;
  isOnline: boolean;
  isDragging: boolean;
  isDragOver: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnter: () => void;
  onDrop: () => void;
  onEdit: () => void;
  onConfigureMedia: () => void;
  onChange: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragEnter={onDragEnter}
      onDrop={onDrop}
      className={`relative flex items-stretch transition-all duration-200 group/row ${
        isDragging
          ? "opacity-30 bg-amber-500/5 cursor-grabbing"
          : isDragOver
            ? "bg-amber-500/[0.04] ring-1 ring-inset ring-amber-500/40 cursor-grabbing"
            : "cursor-grab active:cursor-grabbing"
      }`}
    >
      {/* Drag handle indicator */}
      <div className="flex items-center justify-center px-2 shrink-0 text-text-muted/40 group-hover/row:text-text-muted/70 transition-colors select-none">
        <GripVertical className="h-4 w-4" />
      </div>

      {/* Drop target highlight bar */}
      {isDragOver && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500 rounded-r-full" />
      )}

      <div className="flex-1 min-w-0">
        <DisplayRow
          display={display}
          isOnline={isOnline}
          onEdit={onEdit}
          onConfigureMedia={onConfigureMedia}
          onChange={onChange}
        />
      </div>
    </div>
  );
}
