"use client";

import { useState } from "react";
import {
  Loader2,
  Check,
  Eye,
  Pencil,
  MessageCircle,
  Info,
  Save,
} from "lucide-react";
import { saveTemplateAction, toggleTemplateAction } from "@/actions/whatsapp-templates";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface Template {
  id: string;
  key: string;
  label: string;
  body: string;
  isActive: boolean;
}

const TEMPLATE_ICONS: Record<string, any> = {
  received: MessageCircle,
  paid: Check,
  kitchen: Info,
  delivered: Info,
  checkout_manual: MessageCircle,
};

const TEMPLATE_DESCRIPTIONS: Record<string, string> = {
  received: "Confirmación inicial de recepción de pedido",
  paid: "Notificación de pago verificado con éxito",
  kitchen: "Aviso de que el pedido ha pasado a preparación",
  delivered: "Notificación de que el pedido va en camino",
  checkout_manual: "Instrucciones para pagos manuales",
};

const AVAILABLE_VARIABLES = [
  // Core
  { key: "{nombre}", label: "Nombre", sample: "Juan" },
  { key: "{numeroPedido}", label: "Orden", sample: "#42" },
  { key: "{items}", label: "Productos", sample: "__ITEMS__" },
  { key: "{telefono}", label: "Teléfono", sample: "04141234567" },
  { key: "{restaurantName}", label: "Restaurante", sample: "Mi Restaurante" },
  { key: "{modoPedido}", label: "Modo pedido", sample: "📦 Retira en el local" },
  { key: "{tiempoEstimado}", label: "Tiempo est.", sample: "25 min" },
  // Financial
  { key: "{total}", label: "Total Bs.", sample: "Bs. 15.340,58" },
  { key: "{baseImponible}", label: "Base imp.", sample: "Bs. 13.224,64" },
  { key: "{iva}", label: "IVA (16%)", sample: "Bs. 2.115,94" },
  { key: "{ref}", label: "Ref $", sample: "REF 32,36" },
  // Surcharges
  { key: "{packagingFee}", label: "Envases", sample: "Bs. 2.284,97" },
  { key: "{deliveryFee}", label: "Delivery fee", sample: "Bs. 500,00" },
];

const SAMPLE_ITEMS = [
  "*Pechuga a la plancha*",
  "Base · Bs. 2.702,14 / REF 5,70",
  "Contornos",
  "  Arroz Amarillo (en lugar de Ensalada) · incluido",
  "Adicionales",
  "  2× Papas Fritas · + Bs. 1.896,24",
  "  2× Patacones · + Bs. 1.706,62",
  "Bebidas",
  "  2× Jugo de Parchita · + Bs. 1.137,74",
  "💰 Total ítem: Bs. 13.055,61",
].join("\n");

function renderPreview(body: string): string {
  let result = body;
  for (const v of AVAILABLE_VARIABLES) {
    const val = v.key === "{items}" ? SAMPLE_ITEMS : v.sample;
    result = result.replaceAll(v.key, val);
  }
  return result;
}

export function TemplateEditor({ templates }: { templates: Template[] }) {
  const [editingBody, setEditingBody] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState<Record<string, boolean>>({});

  const handleSave = async (key: string) => {
    const body = editingBody[key];
    if (body === undefined) return;
    setSaving(key);
    const result = await saveTemplateAction({ key, body });
    if (result?.data?.success) {
      setEditingBody((prev) => {
        const n = { ...prev };
        delete n[key];
        return n;
      });
    }
    setSaving(null);
  };

  const handleToggle = async (key: string, enabled: boolean) => {
    await toggleTemplateAction({ key, isActive: enabled });
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 pb-24">
      {templates.map((template) => {
        const isEditing = expandedKey === template.key;
        const bodyContent = editingBody[template.key] ?? template.body;
        const isPreviewMode = showPreview[template.key];
        const Icon = TEMPLATE_ICONS[template.key] || MessageCircle;

        return (
          <Card
            key={template.key}
            className={cn(
              "overflow-hidden transition-all duration-300 border-none shadow-sm h-fit",
              isEditing ? "ring-2 ring-primary/20 shadow-xl" : "hover:shadow-md"
            )}
          >
            {/* Header */}
            <div
              className={cn(
                "p-5 flex items-center justify-between cursor-pointer select-none",
                template.isActive ? "bg-white" : "bg-muted/10 grayscale-[0.5]"
              )}
              onClick={() => setExpandedKey(isEditing ? null : template.key)}
            >
              <div className="flex items-center gap-4">
                <div className={cn(
                  "p-3 rounded-2xl",
                  template.isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                )}>
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-bold text-text-main leading-tight text-base">{template.label}</h4>
                  <p className="text-[11px] text-text-muted mt-0.5 font-medium uppercase tracking-wider opacity-70">
                    ID: {template.key}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4" onClick={e => e.stopPropagation()}>
                <Switch
                  checked={template.isActive}
                  onCheckedChange={(checked) => handleToggle(template.key, checked)}
                />
              </div>
            </div>

            {/* Content Area */}
            {isEditing && (
              <div className="border-t border-border/40 animate-in slide-in-from-top-2 duration-300">
                <div className="p-5 bg-muted/5">
                  <p className="text-xs text-text-muted mb-5 px-1 font-medium italic">
                    {TEMPLATE_DESCRIPTIONS[template.key]}
                  </p>

                  <div className="flex items-center justify-between mb-3 px-1">
                    <Label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">
                      {isPreviewMode ? "VISTA PREVIA" : "EDITOR DE CONTENIDO"}
                    </Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPreview(prev => ({ ...prev, [template.key]: !prev[template.key] }))}
                      className="h-8 px-3 text-[10px] font-black rounded-lg hover:bg-primary/10 hover:text-primary transition-colors uppercase tracking-widest"
                    >
                      {isPreviewMode ? (
                        <><Pencil className="h-3.5 w-3.5 mr-2" /> Editar</>
                      ) : (
                        <><Eye className="h-3.5 w-3.5 mr-2" /> Previsualizar</>
                      )}
                    </Button>
                  </div>

                  {isPreviewMode ? (
                    <div className="rounded-3xl bg-[#e5ddd5] p-5 shadow-inner min-h-[220px] relative overflow-hidden ring-1 ring-black/5">
                      <div className="absolute inset-0 opacity-15 pointer-events-none" style={{ backgroundImage: "url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')" }} />
                      <div className="relative bg-white p-4 rounded-2xl rounded-tr-none shadow-md max-w-[90%] float-left animate-in zoom-in-95 duration-200 ring-1 ring-black/5">
                        <div className="text-[14px] leading-relaxed text-[#111b21] whitespace-pre-wrap font-medium">
                          {renderPreview(bodyContent)}
                        </div>
                        <div className="text-[10px] text-[#667781] text-right mt-1.5 font-medium flex items-center justify-end gap-1">
                          10:45 AM
                          <Check className="h-3 w-3 text-sky-400" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      <div className="relative group">
                        <textarea
                          value={bodyContent}
                          onChange={(e) => setEditingBody(prev => ({ ...prev, [template.key]: e.target.value }))}
                          className="w-full min-h-[240px] p-5 bg-white border border-border/60 rounded-3xl text-[14px] leading-relaxed focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-medium resize-none shadow-sm placeholder:text-text-muted/40"
                          placeholder="Escribe el contenido del mensaje..."
                        />
                      </div>

                      <div className="space-y-3">
                        <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted/60 pl-1">Variables Dinámicas</h5>
                        <div className="flex flex-wrap gap-2 p-1">
                          {AVAILABLE_VARIABLES.map((v) => (
                            <button
                              key={v.key}
                              type="button"
                              onClick={() => {
                                const newBody = bodyContent + v.key;
                                setEditingBody(prev => ({ ...prev, [template.key]: newBody }));
                              }}
                              className="px-3 py-2 bg-white border border-border/40 hover:border-primary/40 hover:bg-primary/5 rounded-xl text-[11px] font-bold text-text-main transition-all active:scale-95 shadow-sm uppercase tracking-tight"
                            >
                              {v.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="pt-2 flex gap-3">
                        <Button
                          className="flex-1 h-12 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold shadow-lg shadow-primary/20 transition-all text-sm uppercase tracking-wide"
                          onClick={() => handleSave(template.key)}
                          disabled={saving === template.key || bodyContent === template.body}
                        >
                          {saving === template.key ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                            <><Save className="h-4 w-4 mr-2" /> Guardar Cambios</>
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          className="h-12 px-6 rounded-2xl font-bold text-text-muted hover:bg-muted text-xs uppercase"
                          onClick={() => setExpandedKey(null)}
                        >
                          Cerrar
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
