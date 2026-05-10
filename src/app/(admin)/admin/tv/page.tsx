import Link from "next/link";
import {
  Tv,
  ImageIcon,
  CalendarHeart,
  PlugZap,
  Wifi,
  WifiOff,
} from "lucide-react";
import { db } from "@/db";
import { tvDisplays, tvMedia, tvEvents } from "@/db/schema";
import { count, eq, sql } from "drizzle-orm";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

async function getStats() {
  const [displaysCount] = await db
    .select({ count: count() })
    .from(tvDisplays)
    .where(eq(tvDisplays.isActive, true));

  const [onlineCount] = await db
    .select({ count: count() })
    .from(tvDisplays)
    .where(
      sql`${tvDisplays.isActive} = true AND ${tvDisplays.lastSeenAt} > NOW() - INTERVAL '30 seconds'`,
    );

  const [mediaCount] = await db
    .select({ count: count() })
    .from(tvMedia)
    .where(eq(tvMedia.isActive, true));

  const [activeEventsCount] = await db
    .select({ count: count() })
    .from(tvEvents)
    .where(eq(tvEvents.isActive, true));

  return {
    total: displaysCount?.count ?? 0,
    online: onlineCount?.count ?? 0,
    media: mediaCount?.count ?? 0,
    activeEvents: activeEventsCount?.count ?? 0,
  };
}

export default async function TvDashboardPage() {
  const stats = await getStats();

  const cards = [
    {
      label: "Smart TVs",
      value: stats.total,
      icon: Tv,
      href: "/admin/tv/displays",
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
    },
    {
      label: "TVs Online",
      value: stats.online,
      icon: stats.online > 0 ? Wifi : WifiOff,
      href: "/admin/tv/displays",
      iconBg: stats.online > 0 ? "bg-success/10" : "bg-text-muted/10",
      iconColor: stats.online > 0 ? "text-success" : "text-text-muted",
    },
    {
      label: "Medios",
      value: stats.media,
      icon: ImageIcon,
      href: "/admin/tv/media",
      iconBg: "bg-info/10",
      iconColor: "text-info",
    },
    {
      label: "Eventos activos",
      value: stats.activeEvents,
      icon: CalendarHeart,
      href: "/admin/tv/events",
      iconBg: "bg-amber/10",
      iconColor: "text-amber",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-text-main">Smart TVs</h1>
          <p className="text-sm text-text-muted">
            Administra las pantallas, los anuncios y los eventos especiales del restaurante.
          </p>
        </div>
        <Link
          href="/admin/tv/displays"
          className="inline-flex items-center gap-2 rounded-lg bg-primary text-white px-4 py-2 text-sm font-medium hover:bg-primary/90"
        >
          <PlugZap className="h-4 w-4" />
          Emparejar nueva TV
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Link key={card.label} href={card.href}>
            <Card className="ring-1 ring-border hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-text-muted uppercase tracking-wide">
                      {card.label}
                    </p>
                    <p className="text-3xl font-bold text-text-main tracking-tight">
                      {card.value}
                    </p>
                  </div>
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.iconBg}`}
                  >
                    <card.icon className={`h-5 w-5 ${card.iconColor}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="ring-1 ring-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tv className="h-5 w-5 text-primary" />
            Cómo funciona
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-text-muted">
          <p>
            <strong className="text-text-main">1.</strong> Abre{" "}
            <code className="bg-bg-app px-1.5 py-0.5 rounded text-xs">/tv</code>{" "}
            en el navegador del Smart TV. Mostrará un código de 4 dígitos.
          </p>
          <p>
            <strong className="text-text-main">2.</strong> En{" "}
            <Link
              href="/admin/tv/displays"
              className="text-primary hover:underline"
            >
              Pantallas
            </Link>
            , presiona &quot;Emparejar nueva TV&quot; e ingresa el código.
          </p>
          <p>
            <strong className="text-text-main">3.</strong> Sube imágenes y videos en{" "}
            <Link
              href="/admin/tv/media"
              className="text-primary hover:underline"
            >
              Medios
            </Link>
            . La TV los mostrará automáticamente en pocos segundos.
          </p>
          <p>
            <strong className="text-text-main">4.</strong> Para una boda, festival o
            evento privado, crea un{" "}
            <Link
              href="/admin/tv/events"
              className="text-primary hover:underline"
            >
              evento especial
            </Link>{" "}
            con sus propios medios y asígnalo a las TVs específicas.
          </p>
          <div className="flex items-center gap-2 pt-2">
            <Badge variant="outline">Polling cada 5s</Badge>
            <Badge variant="outline">Multi-TV</Badge>
            <Badge variant="outline">Horizontal & Vertical</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
