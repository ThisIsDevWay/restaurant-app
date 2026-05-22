"use client";

import { Loader2, CheckCircle2, FileDown, X, Download } from "lucide-react";
import { cn } from "@/lib/utils";

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
}: DailyMenuHeaderProps) {
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
    </div>
  );
}
