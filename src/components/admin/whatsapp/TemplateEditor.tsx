"use client";

import { useState, useMemo } from "react";
import {
  Loader2,
  Check,
  X,
  Eye,
  Pencil,
  MessageCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { saveTemplate, toggleTemplate } from "@/actions/whatsapp-templates";
import { Switch } from "@/components/ui/switch";

interface Template {
  id: string;
  key: string;
  label: string;
  body: string;
  isActive: boolean;
}

const TEMPLATE_ICONS: Record<string, string> = {
  received: "✅",
  paid: "✅",
  kitchen: "🍳",
  delivered: "🛵",
};

const TEMPLATE_DESCRIPTIONS: Record<string, string> = {
  received: "Se envía cuando el cliente confirma el pedido",
  paid: "Se envía cuando el admin confirma el pago",
  kitchen: "Se envía cuando el pedido pasa a cocina",
  delivered: "Se envía cuando el pedido sale a entrega",
};

const AVAILABLE_VARIABLES = [
  { key: "{nombre}", label: "Nombre del cliente", example: "Carlos" },
  { key: "{numeroPedido}", label: "Número de pedido", example: "#42" },
  { key: "{items}", label: "Detalle del pedido", example: null },
  { key: "{total}", label: "Total Bs.", example: "Bs. 550,00" },
  { key: "{baseImponible}", label: "Base imponible", example: "Bs. 474,14" },
  { key: "{iva}", label: "IVA (16%)", example: "Bs. 75,86" },
  { key: "{ref}", label: "REF equivalente", example: "REF 5,50" },
  { key: "{tiempoEstimado}", label: "Tiempo estimado", example: "25 min" },
];

// Sample data for preview
const SAMPLE_ITEMS = [
  "• Pollo Asado",
  "   └ Arroz",
  "   └ Ensalada",
  "   └ Papas fritas (en lugar de Tajadas)",
  "   └ + Queso extra",
  "   💰 Bs. 200,00",
  "",
  "• Carne Guisada",
  "   └ Arroz",
  "   └ Tajadas",
  "   └ + Malta Polar",
  "   💰 Bs. 180,00",
].join("\n");

function getPreviewValue(variable: string): string {
  const match = AVAILABLE_VARIABLES.find((v) => v.key === variable);
  if (variable === "{items}") return SAMPLE_ITEMS;
  return match?.example ?? variable;
}

function renderPreview(body: string): string {
  let result = body;
  for (const v of AVAILABLE_VARIABLES) {
    result = result.replaceAll(v.key, getPreviewValue(v.key));
  }
  return result;
}

export function TemplateEditor({ templates }: { templates: Template[] }) {
  const [editingBody, setEditingBody] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [messages, setMessages] = useState<
    Record<string, { type: "success" | "error"; text: string }>
  >({});
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState<Record<string, boolean>>({});

  const handleSave = async (key: string) => {
    const body = editingBody[key];
    if (body === undefined) return;

    setSaving(key);
    setMessages((prev) => {
      const n = { ...prev };
      delete n[key];
      return n;
    });

    const result = await saveTemplate(key, body);
    if (result.success) {
      setMessages((prev) => ({
        ...prev,
        [key]: { type: "success", text: "Guardado" },
      }));
      setEditingBody((prev) => {
        const n = { ...prev };
        delete n[key];
        return n;
      });
    } else {
      setMessages((prev) => ({
        ...prev,
        [key]: { type: "error", text: result.error },
      }));
    }

    setSaving(null);
    setTimeout(() => {
      setMessages((prev) => {
        const n = { ...prev };
        delete n[key];
        return n;
      });
    }, 3000);
  };

  const handleToggle = async (key: string, isActive: boolean) => {
    await toggleTemplate(key, isActive);
  };

  const insertVariable = (
    key: string,
    variable: string,
    textarea: HTMLTextAreaElement,
  ) => {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const current =
      editingBody[key] ??
      templates.find((t) => t.key === key)?.body ??
      "";
    const updated =
      current.substring(0, start) + variable + current.substring(end);
    setEditingBody((prev) => ({ ...prev, [key]: updated }));
  };

  return (
    <div className="rounded-card border border-border bg-white shadow-card overflow-hidden">
      {/* Section header */}
      <div className="border-b border-border bg-bg-app/50 px-4 py-3">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold text-text-main">
            Plantillas de mensajes WhatsApp
          </p>
        </div>
        <p className="mt-0.5 text-[11px] text-text-muted">
          Personaliza los mensajes automáticos que recibe el cliente
        </p>
      </div>

      {/* Templates list */}
      <div className="divide-y divide-border">
        {templates.map((template) => {
          const icon = TEMPLATE_ICONS[template.key] ?? "📱";
          const currentBody =
            editingBody[template.key] ?? template.body;
          const hasChanges = editingBody[template.key] !== undefined;
          const msg = messages[template.key];
          const isExpanded = expandedKey === template.key;
          const isPreview = showPreview[template.key] ?? false;

          return (
            <div
              key={template.key}
              className={`${template.isActive ? "" : "opacity-50"}`}
            >
              {/* Collapsed header */}
              <button
                onClick={() =>
                  setExpandedKey(isExpanded ? null : template.key)
                }
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-bg-app/30 transition-colors"
              >
                <span className="text-lg flex-shrink-0">{icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-main">
                    {template.label}
                  </p>
                  <p className="text-[11px] text-text-muted truncate">
                    {TEMPLATE_DESCRIPTIONS[template.key] ??
                      "Mensaje automático"}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {!template.isActive && (
                    <span className="rounded-full bg-text-muted/10 px-2 py-0.5 text-[10px] font-medium text-text-muted">
                      Inactivo
                    </span>
                  )}
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-text-muted" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-text-muted" />
                  )}
                </div>
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div className="border-t border-border/50 bg-bg-app/20 px-4 py-4 space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                  {/* Toggle + Status */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-text-muted">
                        Mensaje automático
                      </span>
                      <Switch
                        checked={template.isActive}
                        onCheckedChange={(val) =>
                          handleToggle(template.key, val)
                        }
                      />
                      <span
                        className={`text-[10px] font-medium ${template.isActive
                            ? "text-success"
                            : "text-text-muted"
                          }`}
                      >
                        {template.isActive ? "Activo" : "Inactivo"}
                      </span>
                    </div>

                    {/* Preview toggle */}
                    <button
                      onClick={() =>
                        setShowPreview((prev) => ({
                          ...prev,
                          [template.key]: !isPreview,
                        }))
                      }
                      className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors ${isPreview
                          ? "bg-primary/10 text-primary"
                          : "bg-bg-app text-text-muted hover:text-text-main"
                        }`}
                    >
                      {isPreview ? (
                        <Pencil className="h-3 w-3" />
                      ) : (
                        <Eye className="h-3 w-3" />
                      )}
                      {isPreview ? "Editar" : "Vista previa"}
                    </button>
                  </div>

                  {/* Editor or Preview */}
                  {isPreview ? (
                    /* WhatsApp-style preview */
                    <div className="rounded-xl bg-[#E5DDD5] bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZmlsdGVpZD0ibiI+PGZlVHVyYnVsZW5jZSB0eXBlPSJmcmFjdGFsTm9pc2UiIGJhc2VGcmVxdWVuY3k9IjAuNjUiIG51bU9jdGF2ZXM9IjMiIHN0aXRjaFRpbGVzPSJzdGl0Y2giLz48L2ZpbHRlcj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWx0ZXI9InVybCgjbikiIG9wYWNpdHk9IjAuMDUiLz48L3N2Zz4=')] p-4">
                      <div className="flex justify-end">
                        <div className="max-w-[85%] rounded-lg rounded-tr-sm bg-[#DCF8C6] px-3 py-2 shadow-sm">
                          <pre className="whitespace-pre-wrap font-sans text-[13px] text-[#111B21] leading-relaxed">
                            {renderPreview(currentBody)}
                          </pre>
                          <div className="mt-1 flex items-center justify-end gap-1">
                            <span className="text-[10px] text-[#667781]">
                              12:30
                            </span>
                            <Check className="h-3 w-3 text-[#53BDEB]" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Textarea */}
                      <textarea
                        value={currentBody}
                        onChange={(e) =>
                          setEditingBody((prev) => ({
                            ...prev,
                            [template.key]: e.target.value,
                          }))
                        }
                        rows={8}
                        maxLength={1000}
                        className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-[13px] font-mono outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 resize-none leading-relaxed"
                        placeholder="Escribe el mensaje..."
                      />

                      {/* Character count */}
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-text-muted">
                          {currentBody.length}/1000 caracteres
                        </span>
                      </div>

                      {/* Variables chips */}
                      <div>
                        <p className="mb-1.5 text-[11px] font-semibold text-text-muted">
                          Insertar variable:
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {AVAILABLE_VARIABLES.map((v) => (
                            <button
                              key={v.key}
                              type="button"
                              onClick={(e) => {
                                const textarea =
                                  e.currentTarget.parentElement?.parentElement
                                    ?.querySelector(
                                      "textarea",
                                    ) as HTMLTextAreaElement;
                                if (textarea)
                                  insertVariable(
                                    template.key,
                                    v.key,
                                    textarea,
                                  );
                              }}
                              title={v.label}
                              className="rounded-lg border border-border bg-white px-2 py-1 text-[11px] font-mono text-text-main hover:border-primary/40 hover:bg-primary/5 hover:text-primary transition-colors"
                            >
                              {v.key}
                              <span className="ml-1 text-[9px] text-text-muted font-sans">
                                {v.label}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-1">
                    {hasChanges && (
                      <button
                        onClick={() => handleSave(template.key)}
                        disabled={saving === template.key}
                        className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary/90 disabled:opacity-60 transition-colors"
                      >
                        {saving === template.key ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Check className="h-3.5 w-3.5" />
                        )}
                        Guardar cambios
                      </button>
                    )}
                    {hasChanges && (
                      <button
                        onClick={() =>
                          setEditingBody((prev) => {
                            const n = { ...prev };
                            delete n[template.key];
                            return n;
                          })
                        }
                        className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-xs text-text-muted hover:bg-bg-app transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                        Descartar
                      </button>
                    )}
                    {msg && (
                      <span
                        className={`text-xs font-medium ${msg.type === "success"
                            ? "text-success"
                            : "text-error"
                          }`}
                      >
                        {msg.text}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Variables reference footer */}
      <div className="border-t border-border bg-bg-app/30 px-4 py-3">
        <p className="mb-2 text-[11px] font-semibold text-text-muted">
          Variables disponibles
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {AVAILABLE_VARIABLES.map((v) => (
            <div
              key={v.key}
              className="flex items-center gap-1.5 rounded-lg bg-white px-2 py-1.5 ring-1 ring-border/50"
            >
              <code className="text-[10px] font-mono text-primary">
                {v.key}
              </code>
              <span className="text-[10px] text-text-muted">
                {v.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
