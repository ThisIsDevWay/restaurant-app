import { Label } from "@/components/ui/label";
import { RadioGroup } from "@/components/ui/radio-group";
import { ListFilter, PanelsTopLeft, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SettingsFormData } from "./SettingsForm.types";

interface SettingsDesignTabProps {
    form: SettingsFormData;
    updateField: <K extends keyof SettingsFormData>(key: K, value: SettingsFormData[K]) => void;
}

export function SettingsDesignTab({ form, updateField }: SettingsDesignTabProps) {
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
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
            </div>
        </div>
    );
}
