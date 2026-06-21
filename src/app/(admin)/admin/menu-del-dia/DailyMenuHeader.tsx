"use client";

import { useState } from "react";
import { Loader2, CheckCircle2, FileDown, X, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MenuTemplate } from "./DailyMenu.types";

interface DailyMenuHeaderProps {
  itemCount: number;
  contornoCount: number;
  adicionalCount: number;
  bebidaCount: number;
  isDirty: boolean;
  isPending: boolean;
  onSave: () => void;
  /** PDF state from useMenuPdfDownload */
  pdfStatus: "idle" | "loading" | "ready" | "error";
  pdfPreviewUrl?: string;
  pdfErrorMessage?: string;
  onGeneratePdf: () => void;
  onDownloadPdf: () => void;
  onResetPdf: () => void;
  templates: MenuTemplate[];
  onApplyTemplate: (template: MenuTemplate) => void;
  onSaveTemplate: (name: string, description: string | null) => Promise<{ success: boolean; error?: string }>;
  onDeleteTemplate: (id: string) => void;
}

export function DailyMenuHeader({
  itemCount,
  contornoCount,
  adicionalCount,
  bebidaCount,
  isDirty,
  isPending,
  onSave,
  pdfStatus,
  pdfPreviewUrl,
  pdfErrorMessage,
  onGeneratePdf,
  onDownloadPdf,
  onResetPdf,
  templates,
  onApplyTemplate,
  onSaveTemplate,
  onDeleteTemplate,
}: DailyMenuHeaderProps) {
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateDesc, setTemplateDesc] = useState("");
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [saveError, setSaveError] = useState("");

  const handleConfirmSaveTemplate = async () => {
    if (!templateName.trim()) return;
    setIsSavingTemplate(true);
    setSaveError("");
    try {
      const res = await onSaveTemplate(templateName.trim(), templateDesc.trim() || null);
      if (res.success) {
        setShowSaveDialog(false);
        setTemplateName("");
        setTemplateDesc("");
      } else {
        setSaveError(res.error || "Error al guardar la plantilla.");
      }
    } catch (err) {
      setSaveError("Ocurrió un error inesperado.");
    } finally {
      setIsSavingTemplate(false);
    }
  };
  const hasItems = itemCount > 0;

  const stats = [
    { value: itemCount, label: "Platos activos" },
    { value: contornoCount, label: "Contornos activos" },
    { value: adicionalCount, label: "Adicionales activos" },
    { value: bebidaCount, label: "Bebidas activas" },
  ];

  return (
    <div className="mb-2">
      {/* Title row */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2.5">
        <div>
          <h1 className="font-display text-[30px] font-black leading-none tracking-[-0.03em] text-text-main">
            Menú del día
          </h1>
          <p className="mt-1.5 text-[13px] text-text-muted">
            Activa los platos disponibles para cada día
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Template select */}
          <div className="flex items-center gap-1.5">
            <select
              value=""
              onChange={(e) => {
                const val = e.target.value;
                if (!val) return;
                if (val === "save_new") {
                  setTemplateName("");
                  setTemplateDesc("");
                  setSaveError("");
                  setShowSaveDialog(true);
                } else {
                  const t = templates.find((x) => x.id === val);
                  if (t) onApplyTemplate(t);
                }
                e.target.value = ""; // Reset
              }}
              className="h-[38px] rounded-full border border-border bg-white px-4 text-[12px] font-bold text-text-muted outline-none hover:border-primary focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Plantillas (Presets) ▼</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
              <option value="save_new" className="font-bold text-primary">
                + Guardar selección actual...
              </option>
            </select>
            {templates.length > 0 && (
              <select
                value=""
                onChange={(e) => {
                  const val = e.target.value;
                  if (val) onDeleteTemplate(val);
                  e.target.value = "";
                }}
                className="h-[38px] w-10 flex items-center justify-center rounded-full border border-border bg-white text-[12px] font-bold text-text-muted outline-none hover:border-error hover:text-error cursor-pointer"
                title="Eliminar plantilla..."
              >
                <option value="">✕</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* PDF button */}
          <button
            type="button"
            onClick={onGeneratePdf}
            disabled={!hasItems || pdfStatus === "loading"}
            title={!hasItems ? "Agrega platos al menú primero" : "Generar PDF del menú"}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-5 py-2.5 text-[13px] font-bold text-text-muted transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pdfStatus === "loading" ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Generando…
              </>
            ) : (
              <>
                <FileDown size={14} />
                Generar PDF
              </>
            )}
          </button>

          {/* Save button */}
          <button
            type="button"
            onClick={onSave}
            disabled={!isDirty || isPending}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-[13px] font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 active:translate-y-px disabled:cursor-not-allowed",
              isDirty
                ? "bg-primary text-white hover:bg-primary-hover"
                : "bg-surface-section text-text-muted",
              isPending && "opacity-70",
            )}
          >
            {isPending ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Guardando...
              </>
            ) : isDirty ? (
              "Guardar cambios"
            ) : (
              <>
                <CheckCircle2 size={14} />
                Guardado
              </>
            )}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {stats.map(({ value, label }) => (
          <div
            key={label}
            className="rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10 px-5 py-4 ring-1 ring-border"
          >
            <p className="font-display text-[26px] font-black leading-none text-text-main">
              {value}
            </p>
            <p className="mt-1 text-[11px] font-semibold tracking-wide text-text-muted">
              {label}
            </p>
          </div>
        ))}
      </div>

      {/* PDF Error toast */}
      {pdfStatus === "error" && (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-error/30 bg-error/5 px-4 py-2.5 text-[13px] font-medium text-error">
          {pdfErrorMessage ?? "Error al generar el PDF"}
          <button
            type="button"
            onClick={onResetPdf}
            aria-label="Cerrar"
            className="ml-auto text-error"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* PDF Preview Modal */}
      {pdfStatus === "ready" && pdfPreviewUrl && (
        <div
          className="animate-in fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={onResetPdf}
        >
          <div
            className="flex h-[88vh] w-[90%] max-w-[680px] flex-col overflow-hidden rounded-modal bg-white shadow-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div>
                <h2 className="font-display text-lg font-black text-text-main">
                  Vista previa del menú
                </h2>
                <p className="mt-0.5 text-xs text-text-muted">
                  Revisa que todos los platos estén correctos antes de descargar
                </p>
              </div>
              <button
                type="button"
                onClick={onResetPdf}
                aria-label="Cerrar"
                className="rounded-lg p-2 text-text-muted transition-colors hover:bg-bg-app hover:text-text-main"
              >
                <X size={20} />
              </button>
            </div>

            <div className="min-h-0 flex-1">
              <iframe
                src={pdfPreviewUrl}
                title="Vista previa PDF del menú"
                className="h-full w-full border-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 border-t border-border px-6 py-3.5">
              <button
                type="button"
                onClick={onResetPdf}
                className="rounded-full border border-border bg-white px-5 py-2.5 text-[13px] font-bold text-text-muted transition-colors hover:border-primary hover:text-primary"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={onDownloadPdf}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-primary-hover"
              >
                <Download size={14} />
                Descargar PDF
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Save Template Modal */}
      {showSaveDialog && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowSaveDialog(false)}
        >
          <div
            className="flex w-[90%] max-w-[420px] flex-col overflow-hidden rounded-modal bg-white shadow-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="font-display text-base font-black text-text-main">
                Guardar como plantilla
              </h2>
              <button
                type="button"
                onClick={() => setShowSaveDialog(false)}
                aria-label="Cerrar"
                className="rounded-lg p-2 text-text-muted transition-colors hover:bg-bg-app hover:text-text-main"
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {saveError && (
                <p className="text-xs text-error font-semibold bg-error/5 border border-error/20 p-2.5 rounded-lg">
                  {saveError}
                </p>
              )}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-muted uppercase">Nombre</label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="Ej: Menú Fin de Semana"
                  className="w-full h-9 rounded-lg border border-border px-3 text-[13px] outline-none focus:border-primary"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-muted uppercase">Descripción (Opcional)</label>
                <textarea
                  value={templateDesc}
                  onChange={(e) => setTemplateDesc(e.target.value)}
                  placeholder="Ej: Incluye pastas premium y adicionales del domingo"
                  rows={2}
                  className="w-full rounded-lg border border-border p-2.5 text-[13px] outline-none focus:border-primary resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-3.5 bg-bg-app">
              <button
                type="button"
                onClick={() => setShowSaveDialog(false)}
                className="rounded-full border border-border bg-white px-4 py-2 text-[12px] font-bold text-text-muted hover:border-primary hover:text-primary"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmSaveTemplate}
                disabled={!templateName.trim() || isSavingTemplate}
                className="rounded-full bg-primary px-4 py-2 text-[12px] font-bold text-white hover:bg-primary-hover disabled:opacity-50"
              >
                {isSavingTemplate ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
