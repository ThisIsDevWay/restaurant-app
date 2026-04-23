import { Label } from "@/components/ui/label";
import { RadioGroup } from "@/components/ui/radio-group";
import { ListFilter, PanelsTopLeft, LayoutGrid, Image as LucideImage, MapPin, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import type { SettingsFormData, FormErrors } from "./SettingsForm.types";
import { HeroImageUpload } from "@/components/admin/settings/HeroImageUpload";
import { RestaurantLogoUpload } from "@/components/admin/settings/RestaurantLogoUpload";

interface SettingsDesignTabProps {
    form: SettingsFormData;
    errors?: FormErrors;
    updateField: <K extends keyof SettingsFormData>(key: K, value: SettingsFormData[K]) => void;
}

export function SettingsDesignTab({ form, updateField, errors = {} }: SettingsDesignTabProps) {
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
            <div className="bg-white rounded-2xl p-6 md:p-8 shadow-card border border-border">
                <h2 className="text-xl font-bold flex items-center gap-2 text-text-main mb-1">
                    <LucideImage className="h-5 w-5 text-primary" />
                    Información y Cabecera del Menú
                </h2>
                <p className="text-text-muted text-sm mb-6">
                    Configura la identidad de tu restaurante, enlaces sociales y el banner principal (Hero) del menú público.
                </p>

                <div className="mb-8 pb-8 border-b border-border/50">
                    <div className="mb-6">
                        <RestaurantLogoUpload
                            logoUrl={form.logoUrl}
                            onLogoChange={(url) => updateField("logoUrl", url)}
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="restaurantName" className={cn(errors.restaurantName && "text-error")}>Nombre del Restaurante</Label>
                            <Input
                                id="restaurantName"
                                value={form.restaurantName}
                                onChange={(e) => updateField("restaurantName", e.target.value)}
                                placeholder="Ej. G&M "
                                className={cn(
                                    "rounded-xl border-border/60 focus-visible:ring-primary/20",
                                    errors.restaurantName && "border-error focus-visible:ring-error/20"
                                )}
                            />
                            {errors.restaurantName && (
                                <p className="text-xs text-error font-medium">{errors.restaurantName}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="instagramUrl">Instagram URL / Usuario</Label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">@</span>
                                <Input
                                    id="instagramUrl"
                                    value={form.instagramUrl.replace(/^@/, "").replace(/https:\/\/instagram.com\//, "")}
                                    onChange={(e) => updateField("instagramUrl", e.target.value)}
                                    placeholder="usuario"
                                    className="pl-7 rounded-xl border-border/60 focus-visible:ring-primary/20"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <HeroImageUpload
                    coverImageUrl={form.coverImageUrl}
                    onImageChange={(url) => updateField("coverImageUrl", url)}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    <div className="space-y-2">
                        <Label htmlFor="branchName" className="flex items-center gap-1.5">
                            <MapPin className="h-4 w-4 text-text-muted" />
                            Sucursal / Ubicación
                        </Label>
                        <Input
                            id="branchName"
                            value={form.branchName}
                            onChange={(e) => updateField("branchName", e.target.value)}
                            placeholder="Ej. Sucursal Centro"
                            className="rounded-xl border-border/60 focus-visible:ring-primary/20"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="scheduleText" className="flex items-center gap-1.5">
                            <Clock className="h-4 w-4 text-text-muted" />
                            Horario
                        </Label>
                        <Input
                            id="scheduleText"
                            value={form.scheduleText}
                            onChange={(e) => updateField("scheduleText", e.target.value)}
                            placeholder="Ej. 11:00 am - 11:00 pm"
                            className="rounded-xl border-border/60 focus-visible:ring-primary/20"
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl p-6 md:p-8 shadow-card border border-border">
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-2 text-text-main mb-1">
                        <LayoutGrid className="h-5 w-5 text-primary" />
                        Diseño del Menú
                    </h2>
                    <p className="text-text-muted text-sm mb-6">
                        Elige la estructura visual con la que tus clientes verán el catálogo y los detalles de cada plato.
                        Ambos diseños incluyen tipografía dinámica y el nuevo selector de cantidades Stepper (+ / 0 / -).
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
                                    "flex flex-col h-full rounded-xl border-2 bg-bg-app p-4 hover:bg-gray-50 cursor-pointer transition-all",
                                    form.menuLayout === "modern" ? "border-primary bg-primary/5" : "border-border"
                                )}
                            >
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2 bg-white rounded-lg shadow-sm">
                                        <ListFilter className="h-5 w-5 text-primary" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-semibold text-text-main">Moderno (Horizontal)</div>
                                        <div className="text-xs text-text-muted font-medium">Recomendado</div>
                                    </div>
                                </div>
                                <ul className="text-sm text-text-muted space-y-2 flex-1 mt-2">
                                    <li className="flex items-start gap-2">
                                        <span className="text-primary mt-0.5">•</span>
                                        Tarjetas del menú compactas con imagen a la izquierda.
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-primary mt-0.5">•</span>
                                        Detalle del plato dividido (70/30) resaltando la rentabilidad del espacio vertical.
                                    </li>
                                </ul>
                            </Label>
                        </div>

                        {/* Classic Layout */}
                        <div className="relative">
                            <Label
                                onClick={() => updateField("menuLayout", "classic")}
                                className={cn(
                                    "flex flex-col h-full rounded-xl border-2 bg-bg-app p-4 hover:bg-gray-50 cursor-pointer transition-all",
                                    form.menuLayout === "classic" ? "border-primary bg-primary/5" : "border-border"
                                )}
                            >
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2 bg-white rounded-lg shadow-sm">
                                        <PanelsTopLeft className="h-5 w-5 text-amber" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-semibold text-text-main">Clásico (Vertical)</div>
                                        <div className="text-xs text-text-muted font-medium">Diseño Original Mejorado</div>
                                    </div>
                                </div>
                                <ul className="text-sm text-text-muted space-y-2 flex-1 mt-2">
                                    <li className="flex items-start gap-2">
                                        <span className="text-amber mt-0.5">•</span>
                                        Tarjetas grandes con foto panorámica en la parte superior.
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-amber mt-0.5">•</span>
                                        Modal apilado: Foto grande 100% de ancho con las opciones de compra desplazables debajo.
                                    </li>
                                </ul>
                            </Label>
                        </div>
                    </RadioGroup>
                </div>

                <div className="mt-10 pt-8 border-t border-border">
                    <h2 className="text-xl font-bold flex items-center gap-2 text-text-main mb-1">
                        <ListFilter className="h-5 w-5 text-primary" />
                        Ordenamiento del Menú
                    </h2>
                    <p className="text-text-muted text-sm mb-6">
                        Configura cómo se ordenarán los platos dentro de cada categoría en el menú público.
                    </p>

                    <RadioGroup
                        value={form.menuItemSortMode}
                        onValueChange={(val) => updateField("menuItemSortMode", val as "custom" | "price_asc" | "price_desc")}
                        className="grid grid-cols-1 md:grid-cols-3 gap-4"
                    >
                        <Label
                            onClick={() => updateField("menuItemSortMode", "custom")}
                            className={cn(
                                "flex flex-col rounded-xl border-2 bg-bg-app p-4 hover:bg-gray-50 cursor-pointer transition-all text-center",
                                form.menuItemSortMode === "custom" ? "border-primary bg-primary/5" : "border-border"
                            )}
                        >
                            <span className="font-semibold text-text-main text-sm">Personalizado</span>
                            <span className="text-[10px] text-text-muted mt-1">Orden manual</span>
                        </Label>

                        <Label
                            onClick={() => updateField("menuItemSortMode", "price_asc")}
                            className={cn(
                                "flex flex-col rounded-xl border-2 bg-bg-app p-4 hover:bg-gray-50 cursor-pointer transition-all text-center",
                                form.menuItemSortMode === "price_asc" ? "border-primary bg-primary/5" : "border-border"
                            )}
                        >
                            <span className="font-semibold text-text-main text-sm">Precio (Asc.)</span>
                            <span className="text-[10px] text-text-muted mt-1">Menor a mayor</span>
                        </Label>

                        <Label
                            onClick={() => updateField("menuItemSortMode", "price_desc")}
                            className={cn(
                                "flex flex-col rounded-xl border-2 bg-bg-app p-4 hover:bg-gray-50 cursor-pointer transition-all text-center",
                                form.menuItemSortMode === "price_desc" ? "border-primary bg-primary/5" : "border-border"
                            )}
                        >
                            <span className="font-semibold text-text-main text-sm">Precio (Desc.)</span>
                            <span className="text-[10px] text-text-muted mt-1">Mayor a menor</span>
                        </Label>
                    </RadioGroup>
                </div>
            </div>
        </div>
    );
}
