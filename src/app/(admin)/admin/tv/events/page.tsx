import Link from "next/link";
import { db } from "@/db";
import { tvEvents, tvEventMedia, tvEventAssignments } from "@/db/schema";
import { desc, sql, eq } from "drizzle-orm";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarHeart, Plus } from "lucide-react";
import { EventListItemActions } from "./_components/EventListItemActions";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const events = await db
    .select({
      id: tvEvents.id,
      name: tvEvents.name,
      description: tvEvents.description,
      startsAt: tvEvents.startsAt,
      endsAt: tvEvents.endsAt,
      isActive: tvEvents.isActive,
      appliesToAllDisplays: tvEvents.appliesToAllDisplays,
      createdAt: tvEvents.createdAt,
      mediaCount: sql<number>`(SELECT COUNT(*) FROM ${tvEventMedia} WHERE ${tvEventMedia.eventId} = ${tvEvents.id})`,
      assignmentCount: sql<number>`(SELECT COUNT(*) FROM ${tvEventAssignments} WHERE ${tvEventAssignments.eventId} = ${tvEvents.id})`,
    })
    .from(tvEvents)
    .orderBy(desc(tvEvents.createdAt));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-text-main">Eventos especiales</h1>
          <p className="text-sm text-text-muted">
            Bodas, festivales, fiestas privadas. Cuando un evento está activo, las TVs asignadas muestran sus medios en lugar de la rotación normal.
          </p>
        </div>
        <Link href="/admin/tv/events/new">
          <Button size="lg">
            <Plus className="h-4 w-4" />
            Nuevo evento
          </Button>
        </Link>
      </div>

      {events.length === 0 ? (
        <Card className="ring-1 ring-border">
          <CardContent className="py-16 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber/10 mb-4">
              <CalendarHeart className="h-6 w-6 text-amber" />
            </div>
            <h2 className="text-lg font-semibold text-text-main mb-2">
              Sin eventos creados
            </h2>
            <p className="text-sm text-text-muted max-w-md mx-auto mb-6">
              Crea un evento para una boda, festival o fiesta privada. Sube medios específicos y asígnalos a las TVs que quieras.
            </p>
            <Link href="/admin/tv/events/new">
              <Button size="lg">
                <Plus className="h-4 w-4" />
                Crear primer evento
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {events.map((ev) => (
            <Card key={ev.id} className="ring-1 ring-border">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/admin/tv/events/${ev.id}`}
                        className="hover:text-primary"
                      >
                        {ev.name}
                      </Link>
                      {ev.isActive && (
                        <Badge className="bg-success/10 text-success">
                          Activo
                        </Badge>
                      )}
                      {ev.appliesToAllDisplays && (
                        <Badge variant="outline">Todas las TVs</Badge>
                      )}
                    </CardTitle>
                    {ev.description && (
                      <p className="text-xs text-text-muted mt-1 truncate max-w-2xl">
                        {ev.description}
                      </p>
                    )}
                  </div>
                  <EventListItemActions eventId={ev.id} isActive={ev.isActive} />
                </div>
              </CardHeader>
              <CardContent className="text-sm text-text-muted space-y-1">
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  <span>
                    <strong>{Number(ev.mediaCount)}</strong> medios
                  </span>
                  <span>
                    <strong>
                      {ev.appliesToAllDisplays
                        ? "Todas"
                        : Number(ev.assignmentCount)}
                    </strong>{" "}
                    TVs asignadas
                  </span>
                  {ev.startsAt && (
                    <span>
                      Desde:{" "}
                      {new Date(ev.startsAt).toLocaleString("es-VE", {
                        timeZone: "America/Caracas",
                      })}
                    </span>
                  )}
                  {ev.endsAt && (
                    <span>
                      Hasta:{" "}
                      {new Date(ev.endsAt).toLocaleString("es-VE", {
                        timeZone: "America/Caracas",
                      })}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
