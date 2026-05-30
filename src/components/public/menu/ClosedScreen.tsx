import { Clock, CalendarClock } from "lucide-react";
import {
    formatBusinessHours,
    nextOpenLabel,
    type BusinessHours,
    type StatusOverride,
} from "@/lib/utils/date";

interface ClosedScreenProps {
    restaurantName?: string;
    logoUrl?: string | null;
    /** Manual override text; falls back to the auto-generated schedule. */
    scheduleText?: string | null;
    businessHours?: BusinessHours | null;
    statusOverride?: StatusOverride;
}

/**
 * Full-screen "restaurant is closed" state shown on the public menu and
 * checkout when {@link isMenuVisible} resolves to false. The copy makes it
 * explicit that this is a temporary, hours-based closure (not a permanent one).
 */
export function ClosedScreen({
    restaurantName = "El restaurante",
    logoUrl = null,
    scheduleText = null,
    businessHours = null,
    statusOverride = "auto",
}: ClosedScreenProps) {
    const schedule = scheduleText?.trim() || formatBusinessHours(businessHours);
    // En cierre manual ("Forzar cerrado") no afirmamos una hora exacta de reapertura.
    const nextOpen = statusOverride === "closed" ? null : nextOpenLabel(businessHours);

    return (
        <div className="min-h-screen bg-bg-app flex items-center justify-center p-4">
            <div className="text-center bg-white p-8 rounded-3xl shadow-elevated max-w-sm w-full animate-in fade-in zoom-in-95 duration-500">
                {logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={logoUrl}
                        alt={restaurantName}
                        className="mx-auto mb-6 h-20 w-20 object-contain rounded-2xl"
                    />
                ) : (
                    <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/5">
                        <span className="text-4xl">🕒</span>
                    </div>
                )}

                <h1 className="text-2xl font-black text-text-main mb-2 font-display tracking-tight">
                    Cerrado por ahora
                </h1>
                <p className="text-sm text-text-muted font-medium mb-1 leading-relaxed">
                    {restaurantName} sigue funcionando con normalidad; en este momento estamos
                    fuera del horario de atención, así que el menú no está disponible para pedidos.
                </p>
                <p className="text-sm text-text-muted font-medium mb-5 leading-relaxed">
                    Vuelve dentro de nuestro horario y con gusto te atendemos. 👇
                </p>

                {nextOpen && (
                    <div className="mb-3 flex items-center justify-center gap-2 rounded-2xl bg-primary/5 border border-primary/15 px-4 py-3 text-sm font-bold text-primary">
                        <CalendarClock className="h-4 w-4 shrink-0" />
                        <span>Abrimos {nextOpen}</span>
                    </div>
                )}

                {schedule && (
                    <div className="inline-flex items-center gap-2 rounded-full bg-bg-app/60 border border-border/40 px-4 py-2 text-xs font-semibold text-text-main">
                        <Clock className="h-3.5 w-3.5 text-primary" />
                        {schedule}
                    </div>
                )}
            </div>
        </div>
    );
}
