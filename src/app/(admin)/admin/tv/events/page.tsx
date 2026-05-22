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
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1.5">
          <h1 className="text-3xl md:text-4xl font-extrabold text-text-main tracking-tight font-display">
            Eventos especiales
          </h1>
          <p className="text-sm text-text-muted max-w-2xl leading-relaxed">
            Bodas, festivales, fiestas privadas. Cuando un evento está activo, las TVs asignadas muestran sus medios en lugar de la rotación normal.
          </p>
        </div>
        <Link href="/admin/tv/events/new">
          <Button size="lg" className="rounded-full bg-gradient-to-br from-primary to-primary-hover hover:from-primary-hover hover:to-primary text-white hover:scale-[1.02] active:scale-[0.96] shadow-sm transition-all font-semibold">
            <Plus className="h-5 w-5 mr-1" />
            Nuevo evento
          </Button>
        </Link>
      </div>

      {events.length === 0 ? (
        <Card className="border border-border-ghost bg-bg-card rounded-[14px] shadow-card">
          <CardContent className="py-16 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 mb-4">
              <CalendarHeart className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-lg font-bold text-text-main font-display mb-2">
              Sin eventos creados
            </h2>
            <p className="text-sm text-text-muted max-w-md mx-auto mb-6 leading-relaxed">
              Crea un evento para una boda, festival o fiesta privada. Sube medios específicos y asígnalos a las TVs que quieras.
            </p>
            <Link href="/admin/tv/events/new">
              <Button size="lg" className="rounded-full bg-gradient-to-br from-primary to-primary-hover hover:from-primary-hover hover:to-primary text-white hover:scale-[1.02] active:scale-[0.96] shadow-sm transition-all font-semibold">
                <Plus className="h-5 w-5 mr-1" />
                Crear primer evento
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {events.map((ev) => (
            <Card key={ev.id} className="border border-border-ghost bg-bg-card rounded-[14px] shadow-card hover:shadow-elevated transition-all duration-300">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0 space-y-1">
                    <CardTitle className="flex items-center gap-2.5 flex-wrap">
                      <Link
                        href={`/admin/tv/events/${ev.id}`}
                        className="hover:text-primary transition-colors font-display font-bold text-lg text-text-main"
                      >
                        {ev.name}
                      </Link>
                      {ev.isActive && (
                        <Badge className="bg-success/10 text-success border-0 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                          Activo
                        </Badge>
                      )}
                      {ev.appliesToAllDisplays && (
                        <Badge className="bg-text-muted/10 text-text-muted border-0 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                          Todas las TVs
                        </Badge>
                      )}
                    </CardTitle>
                    {ev.description && (
                      <p className="text-xs text-text-muted mt-1 leading-relaxed max-w-2xl">
                        {ev.description}
                      </p>
                    )}
                  </div>
                  <EventListItemActions eventId={ev.id} isActive={ev.isActive} />
                </div>
              </CardHeader>
              <CardContent className="text-xs text-text-muted pt-0 pb-4">
                <div className="flex flex-wrap gap-x-6 gap-y-1.5 border-t border-border-ghost pt-3 mt-1">
                  <span>
                    Medios: <strong className="text-text-main font-semibold">{Number(ev.mediaCount)}</strong>
                  </span>
                  <span>
                    Asignado a: <strong className="text-text-main font-semibold">
                      {ev.appliesToAllDisplays
                        ? "Todas las TVs"
                        : `${Number(ev.assignmentCount)} TVs`}
                    </strong>
                  </span>
                  {ev.startsAt && (
                    <span>
                      Inicio:{" "}
                      <strong className="text-text-main font-medium">
                        {new Date(ev.startsAt).toLocaleString("es-VE", {
                          timeZone: "America/Caracas",
                        })}
                      </strong>
                    </span>
                  )}
                  {ev.endsAt && (
                    <span>
                      Fin:{" "}
                      <strong className="text-text-main font-medium">
                        {new Date(ev.endsAt).toLocaleString("es-VE", {
                          timeZone: "America/Caracas",
                        })}
                      </strong>
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

