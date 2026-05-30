import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { RadioGroup } from "@/components/ui/radio-group";
import { ListFilter, PanelsTopLeft, LayoutGrid, Image as LucideImage, MapPin, Clock, Star, Settings, EyeOff, Wand2, Copy, Trash2, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { SettingsFormData, FormErrors } from "./SettingsForm.types";
import { HeroImageUpload } from "@/components/admin/settings/HeroImageUpload";
import { RestaurantLogoUpload } from "@/components/admin/settings/RestaurantLogoUpload";
import { Card } from "@/components/ui/card";
import { formatBusinessHours, resolveOpenState, isOpenNow, getNowCaracas, normalizeBusinessHours, nextOpenLabel } from "@/lib/utils/date";

const STATUS_OVERRIDES = [
    { value: "auto" as const, label: "Automático" },
    { value: "open" as const, label: "Forzar abierto" },
    { value: "closed" as const, label: "Forzar cerrado" },
];

const HOUR_PRESETS = [
    { label: "Lun–Vie 9am–6pm", days: [1, 2, 3, 4, 5], open: "09:00", close: "18:00" },
    { label: "Lun–Sáb 8am–10pm", days: [1, 2, 3, 4, 5, 6], open: "08:00", close: "22:00" },
    { label: "Todos 10am–11pm", days: [0, 1, 2, 3, 4, 5, 6], open: "10:00", close: "23:00" },
];

interface SettingsDesignTabProps {
    form: SettingsFormData;
    errors?: FormErrors;
    updateField: <K extends keyof SettingsFormData>(key: K, value: SettingsFormData[K]) => void;
}

export function SettingsDesignTab({ form, updateField, errors = {} }: SettingsDesignTabProps) {
    const [timeUnit, setTimeUnit] = useState<"minutes" | "hours">(
        form.preOpenVisibilityMinutes % 60 === 0 && form.preOpenVisibilityMinutes > 0 ? "hours" : "minutes"
    );
    const [timeValue, setTimeValue] = useState(
        form.preOpenVisibilityMinutes % 60 === 0 && form.preOpenVisibilityMinutes > 0
            ? form.preOpenVisibilityMinutes / 60
            : form.preOpenVisibilityMinutes
    );

    useEffect(() => {
        const currentCalculated = timeUnit === "hours" ? timeValue * 60 : timeValue;
        if (form.preOpenVisibilityMinutes !== currentCalculated) {
            const raw = form.preOpenVisibilityMinutes;
            if (raw % 60 === 0 && raw > 0) {
                setTimeUnit("hours");
                setTimeValue(raw / 60);
            } else {
                setTimeUnit("minutes");
                setTimeValue(raw);
            }
        }
    }, [form.preOpenVisibilityMinutes, timeUnit, timeValue]);

    const schedule = normalizeBusinessHours(form.businessHours);

    const updateDaySchedule = (dayIdx: number, updater: (sched: any) => any) => {
        const current = normalizeBusinessHours(form.businessHours);
        const updatedDay = updater(current[dayIdx]);
        const updated = {
            ...current,
            [dayIdx]: updatedDay
        };
        updateField("businessHours", updated);
    };

    const toggleDayOpen = (dayIdx: number) => {
        updateDaySchedule(dayIdx, (sched) => {
            const nextOpen = !sched.isOpen;
            return {
                isOpen: nextOpen,
                intervals: nextOpen && sched.intervals.length === 0
                    ? [{ open: "11:30", close: "16:30" }]
                    : sched.intervals
            };
        });
    };

    const addInterval = (dayIdx: number) => {
        updateDaySchedule(dayIdx, (sched) => ({
            isOpen: true,
            intervals: [...sched.intervals, { open: "11:30", close: "16:30" }]
        }));
    };

    const removeInterval = (dayIdx: number, intervalIdx: number) => {
        updateDaySchedule(dayIdx, (sched) => {
            const nextIntervals = sched.intervals.filter((_: any, i: number) => i !== intervalIdx);
            return {
                isOpen: nextIntervals.length > 0,
                intervals: nextIntervals
            };
        });
    };

    const updateIntervalTime = (dayIdx: number, intervalIdx: number, field: "open" | "close", value: string) => {
        updateDaySchedule(dayIdx, (sched) => ({
            ...sched,
            intervals: sched.intervals.map((inv: any, i: number) =>
                i === intervalIdx ? { ...inv, [field]: value } : inv
            )
        }));
    };

    const copyDayScheduleToAll = (sourceDayIdx: number) => {
        const current = normalizeBusinessHours(form.businessHours);
        const sourceSched = current[sourceDayIdx];

        const updated = { ...current };
        for (let i = 0; i < 7; i++) {
            if (i !== sourceDayIdx) {
                updated[i] = {
                    isOpen: sourceSched.isOpen,
                    intervals: sourceSched.intervals.map((inv: any) => ({ ...inv }))
                };
            }
        }
        updateField("businessHours", updated);
    };

    const applyPreset1 = () => {
        const schedule = normalizeBusinessHours(form.businessHours);
        for (let i = 0; i < 7; i++) {
            const isWeekDay = i >= 1 && i <= 5;
            schedule[i] = {
                isOpen: isWeekDay,
                intervals: isWeekDay ? [{ open: "11:30", close: "16:30" }] : []
            };
        }
        updateField("businessHours", schedule);
    };

    const applyPreset2 = () => {
        const schedule = normalizeBusinessHours(form.businessHours);
        for (let i = 0; i < 7; i++) {
            const isActive = i >= 1 && i <= 6;
            schedule[i] = {
                isOpen: isActive,
                intervals: isActive ? [{ open: "11:30", close: "16:30" }] : []
            };
        }
        updateField("businessHours", schedule);
    };

    const applyPreset3 = () => {
        const schedule = normalizeBusinessHours(form.businessHours);
        for (let i = 0; i < 7; i++) {
            schedule[i] = {
                isOpen: true,
                intervals: [{ open: "11:30", close: "22:00" }]
            };
        }
        updateField("businessHours", schedule);
    };

    const handleTimeValueChange = (valStr: string) => {
        const val = Math.max(0, Math.floor(Number(valStr) || 0));
        setTimeValue(val);
        const total = timeUnit === "hours" ? val * 60 : val;
        updateField("preOpenVisibilityMinutes", total);
    };

    const handleTimeUnitChange = (unit: "minutes" | "hours") => {
        setTimeUnit(unit);
        const total = unit === "hours" ? timeValue * 60 : timeValue;
        updateField("preOpenVisibilityMinutes", total);
    };
    const now = getNowCaracas();
    const isOpen = resolveOpenState(form.businessHours, form.statusOverride, now);

    const getLiveStatusInfo = () => {
        if (form.statusOverride === "open") {
            return {
                label: "Forzado abierto",
                desc: "Operando bajo forzado manual (ignora el horario automático)",
                color: "text-emerald-700",
                bgColor: "bg-emerald-50 border-emerald-200/60",
                dotColor: "bg-emerald-500 shadow-sm shadow-emerald-500/20",
            };
        }
        if (form.statusOverride === "closed") {
            return {
                label: "Forzado cerrado",
                desc: "Inactivo por forzado manual (ignora el horario automático)",
                color: "text-rose-700",
                bgColor: "bg-rose-50 border-rose-200/60",
                dotColor: "bg-rose-500 shadow-sm shadow-rose-500/20",
            };
        }

        // Auto mode
        if (isOpen) {
            return {
                label: "Abierto ahora",
                desc: "Operando automáticamente según tu horario programado.",
                color: "text-emerald-700",
                bgColor: "bg-emerald-50 border-emerald-200/60",
                dotColor: "bg-emerald-500 animate-pulse shadow-sm shadow-emerald-500/20",
            };
        } else {
            const nextOpenText = nextOpenLabel(form.businessHours, now);
            return {
                label: "Cerrado",
                desc: nextOpenText
                    ? `Inactivo automáticamente. Abre ${nextOpenText}.`
                    : "Inactivo automáticamente (horario no configurado)",
                color: "text-rose-700",
                bgColor: "bg-rose-50 border-rose-200/60",
                dotColor: "bg-rose-500 shadow-sm shadow-rose-500/20",
            };
        }
    };

    const liveStatus = getLiveStatusInfo();

    const todaySched = schedule[now.weekday];

    // Formatting today's intervals beautifully e.g. "11:30 a.m. - 4:30 p.m."
    const prettyTime = (s: string): string => {
        const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
        if (!m) return s;
        const h24 = parseInt(m[1], 10);
        const min = parseInt(m[2], 10);
        const period = h24 < 12 ? "a.m." : "p.m.";
        const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
        return `${h12}:${String(min).padStart(2, "0")} ${period}`;
    };

    const todayIntervalsText = todaySched && todaySched.isOpen && todaySched.intervals.length > 0
        ? todaySched.intervals.map(inv => `${prettyTime(inv.open)} - ${prettyTime(inv.close)}`).join(", ")
        : "Cerrado todo el día";

    const nextOpenText = nextOpenLabel(form.businessHours, now);

    function formatPreOpenDuration(mins: number): string {
        if (mins % 60 === 0) {
            const hrs = mins / 60;
            return `${hrs} ${hrs === 1 ? "hora" : "horas"}`;
        }
        return `${mins} minutos`;
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">

            {/* Card 1 Unificada: Identidad, Portada y Horarios */}
            <Card className="p-6 border border-border/40 shadow-sm bg-white rounded-2xl hover:border-border/60 transition-all duration-200">
                <h2 className="text-lg font-bold flex items-center gap-2 text-text-main mb-2">
                    <Star className="h-5 w-5 text-primary" />
                    Identidad y Horarios del Restaurante
                </h2>
                <p className="text-text-muted text-xs mb-6">
                    Establece el nombre oficial, imágenes de marca, ubicación y horarios de atención al público de tu restaurante.
                </p>

                <div className="space-y-6">
                    {/* Sección Imágenes (Logo y Banner Portada) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-neutral-50/50 p-5 rounded-2xl border border-neutral-200/60 shadow-sm">
                        <div className="space-y-3 flex flex-col justify-between h-full">
                            <div>
                                <Label className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-1">Logo del Restaurante</Label>
                                <p className="text-[10px] text-text-muted">Se muestra en la barra de navegación y los comprobantes.</p>
                            </div>
                            <RestaurantLogoUpload
                                logoUrl={form.logoUrl}
                                logoImagekitFileId={form.logoImagekitFileId}
                                onLogoChange={(url, fileId) => {
                                    updateField("logoUrl", url);
                                    updateField("logoImagekitFileId", fileId);
                                }}
                            />
                        </div>
                        <div className="space-y-3 flex flex-col justify-between h-full border-t md:border-t-0 md:border-l border-neutral-200/50 pt-5 md:pt-0 md:pl-8">
                            <div>
                                <Label className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-1">Portada del Menú (Hero Banner)</Label>
                                <p className="text-[10px] text-text-muted">Fondo principal superior (Hero) en la vista del menú público.</p>
                            </div>
                            <HeroImageUpload
                                coverImageUrl={form.coverImageUrl}
                                coverImagekitFileId={form.coverImagekitFileId}
                                onImageChange={(url, fileId) => {
                                    updateField("coverImageUrl", url);
                                    updateField("coverImagekitFileId", fileId);
                                }}
                            />
                        </div>
                    </div>

                    {/* Información General */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <div className="space-y-1.5">
                            <Label htmlFor="restaurantName" className={cn("text-xs font-bold text-text-muted uppercase tracking-wider", errors.restaurantName && "text-error")}>
                                Nombre del Restaurante
                            </Label>
                            <Input
                                id="restaurantName"
                                value={form.restaurantName}
                                onChange={(e) => updateField("restaurantName", e.target.value)}
                                placeholder="Ej. G&M "
                                className={cn(
                                    "rounded-xl border-border/60 focus-visible:ring-primary/20 h-10 text-sm",
                                    errors.restaurantName && "border-error focus-visible:ring-error/20"
                                )}
                            />
                            {errors.restaurantName && (
                                <p className="text-xs text-error font-medium">{errors.restaurantName}</p>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="instagramUrl" className="text-xs font-bold text-text-muted uppercase tracking-wider">
                                Instagram (Usuario)
                            </Label>
                            <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted text-sm font-semibold">@</span>
                                <Input
                                    id="instagramUrl"
                                    value={form.instagramUrl.replace(/^@/, "").replace(/https:\/\/instagram.com\//, "")}
                                    onChange={(e) => updateField("instagramUrl", e.target.value)}
                                    placeholder="usuario"
                                    className="pl-8 rounded-xl border-border/60 focus-visible:ring-primary/20 h-10 text-sm"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="branchName" className="flex items-center gap-1.5 text-xs font-bold text-text-muted uppercase tracking-wider">
                                <MapPin className="h-3.5 w-3.5" />
                                Sucursal / Dirección
                            </Label>
                            <Input
                                id="branchName"
                                value={form.branchName}
                                onChange={(e) => updateField("branchName", e.target.value)}
                                placeholder="Ej. Sucursal Centro"
                                className="rounded-xl border-border/60 focus-visible:ring-primary/20 h-10 text-sm"
                            />
                        </div>
                    </div>

                    <div className="h-px bg-border/20 my-2" />
                </div>
            </Card>

            {/* Sección de Disponibilidad y Estado Operativo (Cockpit Moderno) */}
            <div className="flex flex-col gap-6 mt-6 w-full animate-in fade-in slide-in-from-bottom-2 duration-300">

                {/* Card 2: Horarios Semanales (Expandido a Ancho Completo) */}
                <Card className="p-6 border border-neutral-200/60 shadow-sm bg-white rounded-2xl hover:border-neutral-300/80 transition-all duration-200 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
                        <div className="space-y-1">
                            <h3 className="text-md font-bold flex items-center gap-2 text-text-main">
                                <Clock className="h-4 w-4 text-primary" />
                                Horario semanal del restaurante
                            </h3>
                            <p className="text-[11px] text-text-muted leading-relaxed">
                                Configura los horarios de apertura y cierre para cada día de la semana.
                            </p>
                        </div>

                        {/* Dropdown de Plantillas Rápidas */}
                        <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Plantilla:</span>
                            <select
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === "preset1") applyPreset1();
                                    else if (val === "preset2") applyPreset2();
                                    else if (val === "preset3") applyPreset3();
                                    e.target.value = ""; // Reset
                                }}
                                className="h-9 rounded-xl border border-neutral-200 bg-white px-3 text-xs font-bold outline-none cursor-pointer focus:ring-2 focus:ring-primary/10 shadow-sm"
                                defaultValue=""
                            >
                                <option value="" disabled>Aplicar plantilla rápida</option>
                                <option value="preset1">Lun–Vie 11:30 am – 4:30 pm</option>
                                <option value="preset2">Lun–Sáb 11:30 am – 4:30 pm</option>
                                <option value="preset3">Todos los días 11:30 am – 10:00 pm</option>
                            </select>
                        </div>
                    </div>

                    {/* Lista de Horarios Semanales (Fila única por día con máximo espacio horizontal) */}
                    <div className="space-y-2.5">
                        {[{ idx: 1, name: "Lunes" }, { idx: 2, name: "Martes" }, { idx: 3, name: "Miércoles" }, { idx: 4, name: "Jueves" }, { idx: 5, name: "Viernes" }, { idx: 6, name: "Sábado" }, { idx: 0, name: "Domingo" }].map(({ idx, name }) => {
                            const sched = schedule[idx];
                            return (
                                <div
                                    key={idx}
                                    className={cn(
                                        "flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-3.5 rounded-xl border transition-all duration-200 bg-white",
                                        sched.isOpen
                                            ? "border-neutral-200/80 shadow-sm hover:border-neutral-300/80"
                                            : "border-neutral-100/60 opacity-60 bg-neutral-50/40"
                                    )}
                                >
                                    {/* Izquierda: Día y select de Estado */}
                                    <div className="flex items-center gap-4 shrink-0 min-w-[170px]">
                                        <span className="text-sm font-extrabold text-text-main w-20">{name}</span>
                                        <select
                                            value={sched.isOpen ? "open" : "closed"}
                                            onChange={() => toggleDayOpen(idx)}
                                            className={cn(
                                                "h-8 rounded-xl border px-3 text-xs font-black outline-none cursor-pointer transition-all",
                                                sched.isOpen
                                                    ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                                                    : "text-neutral-500 bg-neutral-100 border-neutral-200"
                                            )}
                                        >
                                            <option value="open">Abierto</option>
                                            <option value="closed">Cerrado</option>
                                        </select>
                                    </div>

                                    {/* Centro: Intervalos de Horarios */}
                                    <div className="flex-1 min-w-0">
                                        {!sched.isOpen || sched.intervals.length === 0 ? (
                                            <span className="text-text-muted text-xs font-medium pl-1">— Cerrado todo el día</span>
                                        ) : (
                                            <div className="flex flex-wrap items-center gap-3">
                                                {sched.intervals.map((interval, intervalIdx) => (
                                                    <div
                                                        key={intervalIdx}
                                                        className="flex items-center gap-2 bg-neutral-50 px-3 py-1.5 rounded-xl border border-neutral-200/80 shadow-sm animate-in fade-in-50 duration-150 shrink-0"
                                                    >
                                                        {/* Hora de Apertura */}
                                                        <input
                                                            type="time"
                                                            value={interval.open}
                                                            onChange={(e) => updateIntervalTime(idx, intervalIdx, "open", e.target.value)}
                                                            className="h-8 px-3 rounded-xl border border-neutral-200 bg-white text-xs font-black focus:outline-none focus:ring-2 focus:ring-primary/20 w-[8rem] cursor-pointer"
                                                        />
                                                        <span className="text-text-muted text-[11px] font-black uppercase tracking-wider shrink-0">a</span>
                                                        {/* Hora de Cierre */}
                                                        <input
                                                            type="time"
                                                            value={interval.close}
                                                            onChange={(e) => updateIntervalTime(idx, intervalIdx, "close", e.target.value)}
                                                            className="h-8 px-3 rounded-xl border border-neutral-200 bg-white text-xs font-black focus:outline-none focus:ring-2 focus:ring-primary/20 w-[8rem] cursor-pointer"
                                                        />
                                                        {/* Eliminar Intervalo */}
                                                        {sched.intervals.length > 1 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => removeInterval(idx, intervalIdx)}
                                                                className="p-1 text-neutral-400 hover:text-red-500 rounded-lg hover:bg-neutral-100 transition-colors shrink-0 cursor-pointer ml-1"
                                                                title="Eliminar intervalo"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}

                                                {/* Agregar nuevo intervalo */}
                                                <button
                                                    type="button"
                                                    onClick={() => addInterval(idx)}
                                                    className="h-8 px-3 rounded-xl border border-dashed border-primary/40 hover:border-primary text-xs font-bold text-primary hover:bg-primary/5 flex items-center gap-1 transition-all shrink-0 cursor-pointer"
                                                >
                                                    + Intervalo
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Derecha: Acciones Rápidas (Solo si está abierto) */}
                                    {sched.isOpen && (
                                        <div className="flex items-center gap-2 shrink-0 self-end lg:self-auto">
                                            <button
                                                type="button"
                                                onClick={() => copyDayScheduleToAll(idx)}
                                                className="h-8 px-3.5 rounded-xl border border-neutral-200/80 bg-white flex items-center justify-center gap-1.5 text-xs font-extrabold text-neutral-600 hover:bg-neutral-50 hover:text-text-main active:scale-95 transition-all cursor-pointer shadow-sm"
                                                title="Copiar este horario a todos los demás días"
                                            >
                                                <Copy className="h-3.5 w-3.5 text-text-muted" />
                                                <span>Copiar a todos</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => toggleDayOpen(idx)}
                                                className="h-8 w-8 rounded-xl border border-neutral-200/80 bg-white flex items-center justify-center text-neutral-400 hover:border-red-200 hover:bg-red-50 hover:text-red-500 active:scale-95 transition-all cursor-pointer shadow-sm"
                                                title="Cerrar este día"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Texto de Catálogo */}
                    <div className="space-y-1.5 pt-4 border-t border-neutral-100">
                        <div className="flex items-center justify-between gap-2">
                            <Label htmlFor="scheduleText" className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Texto en Catálogo (Opcional)</Label>
                            <button
                                type="button"
                                onClick={() => {
                                    const generated = formatBusinessHours(form.businessHours);
                                    if (generated) updateField("scheduleText", generated);
                                }}
                                className="flex items-center gap-1 text-[10px] font-bold text-primary hover:underline cursor-pointer"
                            >
                                <Wand2 className="h-3 w-3" />
                                Generar texto
                            </button>
                        </div>
                        <Input
                            id="scheduleText"
                            value={form.scheduleText}
                            onChange={(e) => updateField("scheduleText", e.target.value)}
                            placeholder={formatBusinessHours(form.businessHours) ?? "Ej. Lun–Vie 9:00–18:00"}
                            className="rounded-xl bg-neutral-50 border-neutral-200 focus:border-primary/60 focus:ring-2 focus:ring-primary/10 h-11 px-4 text-sm font-semibold"
                        />
                        <p className="text-[10px] text-text-muted">Si se deja vacío, el sistema autogenera el texto basándose en tu horario.</p>
                    </div>
                </Card>

                {/* Card 3: Estado de Operaciones (Cockpit de Disponibilidad) */}
                <Card className="p-6 border border-neutral-200/60 shadow-sm bg-white rounded-2xl hover:border-neutral-300/80 transition-all duration-200 space-y-6">
                    <div className="space-y-1">
                        <h3 className="text-md font-bold flex items-center gap-2 text-text-main">
                            <Star className="h-4 w-4 text-primary" />
                            Estado operativo y disponibilidad
                        </h3>
                        <p className="text-[11px] text-text-muted leading-relaxed">
                            Controla el estado actual del restaurante y las opciones de disponibilidad en tiempo real.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                        {/* Columna Izquierda: Estado actual y controles manuales */}
                        <div className="space-y-6">
                            {/* Visual Status Indicator en Tiempo Real */}
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Estado Actual</Label>
                                <div className={cn("p-4 rounded-2xl border transition-all duration-300 flex items-start gap-3", liveStatus.bgColor)}>
                                    <span className={cn("h-2.5 w-2.5 rounded-full mt-1.5 shrink-0", liveStatus.dotColor)} />
                                    <div className="space-y-1 flex-1 min-w-0">
                                        <h3 className={cn("text-xs font-black tracking-wider uppercase flex items-center gap-1", liveStatus.color)}>
                                            {liveStatus.label}
                                        </h3>
                                        <p className="text-[11px] text-text-muted leading-relaxed font-semibold">
                                            {liveStatus.desc}
                                        </p>
                                        <div className="flex items-center gap-1.5 text-[10px] text-text-muted mt-1 bg-white/40 px-2 py-0.5 rounded-md border border-neutral-200/20 w-fit font-bold">
                                            <Clock className="h-3 w-3" />
                                            <span>Hoy: {todayIntervalsText}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Segmented Control (Estilo Vercel/Shopify) */}
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Fijar Estado Manualmente</Label>
                                <div className="flex bg-neutral-100 p-1 rounded-xl w-full border border-neutral-200/40">
                                    {STATUS_OVERRIDES.map((opt) => {
                                        const active = form.statusOverride === opt.value;
                                        return (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                onClick={() => updateField("statusOverride", opt.value)}
                                                className={cn(
                                                    "flex-1 py-2 text-[11px] font-bold rounded-lg transition-all cursor-pointer text-center",
                                                    active
                                                        ? "bg-white text-text-main shadow-sm border border-neutral-200/10"
                                                        : "text-text-muted hover:text-text-main"
                                                )}
                                            >
                                                {opt.label.toUpperCase()}
                                            </button>
                                        );
                                    })}
                                </div>
                                <p className="text-[10px] text-text-muted leading-normal">
                                    <strong>Automático</strong> respeta el horario semanal configurado arriba. <strong>Forzar</strong> ignora el horario.
                                </p>
                            </div>
                        </div>

                        {/* Columna Derecha: Oclusión de Catálogo y Vista Previa */}
                        <div className="space-y-6">
                            {/* Oclusión de Catálogo */}
                            <div className="rounded-2xl border border-neutral-200 bg-neutral-50/50 p-5 space-y-4 shadow-sm">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="space-y-1">
                                        <Label className="flex items-center gap-1.5 text-xs font-bold text-text-main uppercase tracking-wider">
                                            <EyeOff className="h-3.5 w-3.5 text-primary" />
                                            Oclusión de Catálogo
                                        </Label>
                                        <p className="text-[10px] text-text-muted leading-relaxed">
                                            Cuando el restaurante se encuentre cerrado:
                                        </p>
                                    </div>
                                    <Switch
                                        checked={form.hideMenuWhenClosed}
                                        onCheckedChange={(val) => updateField("hideMenuWhenClosed", val)}
                                    />
                                </div>

                                {form.hideMenuWhenClosed && (
                                    <div className="space-y-3 pt-3 border-t border-neutral-200/60 animate-in fade-in slide-in-from-top-1 duration-200">
                                        <div className="space-y-2 text-xs text-text-muted font-semibold pl-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-emerald-500">✓</span> Ocultar catálogo de platos
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-emerald-500">✓</span> Deshabilitar formulario de checkout
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-emerald-500">✓</span> Mostrar pantalla premium de &quot;Cerrado&quot;
                                            </div>
                                        </div>

                                        <div className="space-y-1.5 pt-2 border-t border-neutral-200/40">
                                            <Label htmlFor="preOpenWindow" className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Visible antes de abrir</Label>
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    id="preOpenWindow"
                                                    type="number"
                                                    min={0}
                                                    value={timeValue === 0 ? "" : timeValue}
                                                    onChange={(e) => handleTimeValueChange(e.target.value)}
                                                    placeholder="0"
                                                    className="rounded-xl bg-white border-neutral-200 focus:border-primary/60 focus:ring-2 focus:ring-primary/10 h-10 w-24 text-center font-bold text-sm"
                                                />
                                                <select
                                                    value={timeUnit}
                                                    onChange={(e) => handleTimeUnitChange(e.target.value as "minutes" | "hours")}
                                                    className="h-10 rounded-xl border border-neutral-200 bg-white px-3 text-xs font-semibold focus-visible:ring-2 focus-visible:ring-primary/20 outline-none cursor-pointer"
                                                >
                                                    <option value="minutes">minutos</option>
                                                    <option value="hours">horas</option>
                                                </select>
                                            </div>
                                            <p className="text-[10px] text-text-muted">Permite a los clientes navegar por la carta con esta antelación antes de abrir.</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Vista Previa para Clientes */}
                            <div className="rounded-2xl border border-neutral-200 bg-neutral-50/50 p-5 space-y-3 shadow-sm">
                                <Label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Vista previa para clientes</Label>
                                <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm flex items-center gap-4">
                                    <div className="p-3 bg-rose-50 rounded-xl border border-rose-100 text-rose-500 shrink-0">
                                        <Lock className="h-6 w-6" />
                                    </div>
                                    <div className="space-y-0.5 flex-1 min-w-0">
                                        <h4 className="text-sm font-bold text-rose-700">Cerrado</h4>
                                        <p className="text-xs text-text-main font-semibold">
                                            {nextOpenText ? `Abrimos ${nextOpenText}` : "Cerrado temporalmente"}
                                        </p>
                                        {form.hideMenuWhenClosed && form.preOpenVisibilityMinutes > 0 && (
                                            <p className="text-[10px] text-text-muted font-bold mt-1 text-rose-500">
                                                Puedes ver nuestro menú en {formatPreOpenDuration(form.preOpenVisibilityMinutes)}.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </Card>
            </div>

            {/* Card 4: Estructura y Orden */}
            <Card className="p-6 border border-border/40 shadow-sm bg-white rounded-2xl hover:border-border/60 transition-all duration-200">
                <div className="space-y-8">
                    <div>
                        <h2 className="text-lg font-bold flex items-center gap-2 text-text-main mb-2">
                            <LayoutGrid className="h-5 w-5 text-primary" />
                            Diseño Visual del Catálogo
                        </h2>
                        <p className="text-text-muted text-xs mb-6">
                            Elige la estructura visual con la que tus clientes verán el catálogo y el detalle de tus platos en la app.
                        </p>

                        <RadioGroup
                            value={form.menuLayout}
                            onValueChange={(val: "modern" | "classic") => updateField("menuLayout", val)}
                            className="grid grid-cols-1 md:grid-cols-2 gap-4"
                        >
                            {/* Modern Layout */}
                            <div className="relative">
                                <Label
                                    onClick={() => updateField("menuLayout", "modern")}
                                    className={cn(
                                        "flex flex-col h-full rounded-2xl border-2 bg-bg-app/20 p-5 hover:bg-bg-app/40 cursor-pointer transition-all duration-200 shadow-sm",
                                        form.menuLayout === "modern" ? "border-primary bg-primary/5/10" : "border-border/40"
                                    )}
                                >
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-2.5 bg-white rounded-xl shadow-sm border border-border/20">
                                            <ListFilter className="h-5 w-5 text-primary" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-bold text-text-main text-sm">Moderno (Horizontal)</div>
                                            <div className="text-[10px] text-text-muted font-medium uppercase tracking-wider">Recomendado</div>
                                        </div>
                                    </div>
                                    <ul className="text-xs text-text-muted space-y-2 flex-1 mt-1 leading-relaxed">
                                        <li className="flex items-start gap-2">
                                            <span className="text-primary mt-0.5 font-bold">•</span>
                                            Tarjetas del menú compactas con imagen a la izquierda para optimizar espacio.
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-primary mt-0.5 font-bold">•</span>
                                            Detalle del plato dividido (70/30) para maximizar la lectura en pantallas móviles.
                                        </li>
                                    </ul>
                                </Label>
                            </div>

                            {/* Classic Layout */}
                            <div className="relative">
                                <Label
                                    onClick={() => updateField("menuLayout", "classic")}
                                    className={cn(
                                        "flex flex-col h-full rounded-2xl border-2 bg-bg-app/20 p-5 hover:bg-bg-app/40 cursor-pointer transition-all duration-200 shadow-sm",
                                        form.menuLayout === "classic" ? "border-primary bg-primary/5/10" : "border-border/40"
                                    )}
                                >
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-2.5 bg-white rounded-xl shadow-sm border border-border/20">
                                            <PanelsTopLeft className="h-5 w-5 text-amber" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-bold text-text-main text-sm">Clásico (Vertical)</div>
                                            <div className="text-[10px] text-text-muted font-medium uppercase tracking-wider">Original Mejorado</div>
                                        </div>
                                    </div>
                                    <ul className="text-xs text-text-muted space-y-2 flex-1 mt-1 leading-relaxed">
                                        <li className="flex items-start gap-2">
                                            <span className="text-amber mt-0.5 font-bold">•</span>
                                            Tarjetas grandes con foto panorámica completa en la parte superior.
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-amber mt-0.5 font-bold">•</span>
                                            Modal apilado con foto panorámica completa al 100% de ancho del modal.
                                        </li>
                                    </ul>
                                </Label>
                            </div>
                        </RadioGroup>
                    </div>

                    <div className="pt-6 border-t border-border/40">
                        <h2 className="text-lg font-bold flex items-center gap-2 text-text-main mb-2">
                            <Settings className="h-5 w-5 text-primary" />
                            Ordenamiento del Catálogo
                        </h2>
                        <p className="text-text-muted text-xs mb-6">
                            Configura el criterio de ordenamiento automático por defecto para los platos dentro de cada categoría del menú.
                        </p>

                        <RadioGroup
                            value={form.menuItemSortMode}
                            onValueChange={(val) => updateField("menuItemSortMode", val as "custom" | "price_asc" | "price_desc")}
                            className="grid grid-cols-1 md:grid-cols-3 gap-3"
                        >
                            {[
                                { id: "custom", title: "Personalizado", desc: "Orden manual" },
                                { id: "price_asc", title: "Precio (Asc.)", desc: "Menor a mayor" },
                                { id: "price_desc", title: "Precio (Desc.)", desc: "Mayor a menor" },
                            ].map((opt) => (
                                <Label
                                    key={opt.id}
                                    onClick={() => updateField("menuItemSortMode", opt.id as any)}
                                    className={cn(
                                        "flex flex-col rounded-xl border-2 bg-bg-app/20 p-4 hover:bg-bg-app/40 cursor-pointer transition-all text-center select-none shadow-sm duration-200 active:scale-98",
                                        form.menuItemSortMode === opt.id ? "border-primary bg-primary/5/10" : "border-border/40"
                                    )}
                                >
                                    <span className="font-bold text-text-main text-xs">{opt.title}</span>
                                    <span className="text-[10px] text-text-muted mt-1 font-medium">{opt.desc}</span>
                                </Label>
                            ))}
                        </RadioGroup>
                    </div>
                </div>
            </Card>
        </div>
    );
}

