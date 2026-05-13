"use client";

import { Loader2, CheckCircle2, FileDown, X, Download, Eye } from "lucide-react";

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

  return (
    <div style={{ marginBottom: 8 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Epilogue:wght@700;900&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
        .dmh-save-btn {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 9px 20px;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 13px; font-weight: 700;
          border-radius: 100px; border: none; cursor: pointer;
          transition: background 0.15s ease, transform 0.1s ease;
          letter-spacing: 0.01em;
        }
        .dmh-save-btn:active:not(:disabled) { transform: scale(0.97); }
        .dmh-stat-card {
          background: #fff;
          border: 1px solid #f0e6df;
          border-radius: 16px;
          padding: 16px 20px;
          flex: 1; min-width: 0;
        }
        .dmh-pdf-btn {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 9px 20px;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 13px; font-weight: 700;
          border-radius: 100px; border: 1.5px solid #f0e6df;
          cursor: pointer;
          transition: all 0.15s ease;
          background: #fff; color: #5f5e5e;
        }
        .dmh-pdf-btn:hover:not(:disabled) {
          border-color: #bb0005; color: #bb0005; background: #fef7f6;
        }
        .dmh-pdf-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .dmh-pdf-btn:active:not(:disabled) { transform: scale(0.97); }
        .dmh-modal-overlay {
          position: fixed; inset: 0; z-index: 9999;
          background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center;
          animation: dmh-fade-in 0.2s ease;
        }
        .dmh-modal-content {
          background: #fff; border-radius: 20px;
          width: 90%; max-width: 680px; height: 88vh;
          display: flex; flex-direction: column;
          box-shadow: 0 25px 60px rgba(0,0,0,0.3);
          overflow: hidden;
          animation: dmh-scale-in 0.2s ease;
        }
        .dmh-modal-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px 24px;
          border-bottom: 1px solid #f0e6df;
        }
        .dmh-modal-body { flex: 1; min-height: 0; }
        .dmh-modal-body iframe {
          width: 100%; height: 100%; border: none;
        }
        .dmh-modal-footer {
          display: flex; align-items: center; justify-content: flex-end; gap: 10px;
          padding: 14px 24px;
          border-top: 1px solid #f0e6df;
        }
        @keyframes dmh-fade-in { from { opacity: 0 } to { opacity: 1 } }
        @keyframes dmh-scale-in { from { transform: scale(0.95); opacity: 0 } to { transform: scale(1); opacity: 1 } }
      `}</style>

      {/* Title row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{
            fontFamily: "'Epilogue', sans-serif",
            fontSize: 30, fontWeight: 900, color: "#251a07",
            letterSpacing: "-0.03em", margin: 0, lineHeight: 1.1,
          }}>
            Menú del día
          </h1>
          <p style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 13, color: "#9c8c78", margin: "5px 0 0",
          }}>
            Activa los platos disponibles para cada día
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {/* PDF button */}
          <button
            onClick={onGeneratePdf}
            disabled={!hasItems || pdfStatus === "loading"}
            className="dmh-pdf-btn"
            title={!hasItems ? "Agrega platos al menú primero" : "Generar PDF del menú"}
          >
            {pdfStatus === "loading" ? (
              <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />Generando…</>
            ) : (
              <><FileDown size={14} />Generar PDF</>
            )}
          </button>

          {/* Save button */}
          <button
            onClick={onSave}
            disabled={!isDirty || isPending}
            className="dmh-save-btn"
            style={{
              background: isDirty ? "#bb0005" : "#f0e6df",
              color: isDirty ? "#fff" : "#9c8c78",
              cursor: !isDirty || isPending ? "not-allowed" : "pointer",
              opacity: isPending ? 0.7 : 1,
            }}
          >
            {isPending ? (
              <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />Guardando...</>
            ) : isDirty ? (
              "Guardar cambios"
            ) : (
              <><CheckCircle2 size={14} />Guardado</>
            )}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {[
          { value: itemCount, label: "Platos activos" },
          { value: contornoCount, label: "Contornos activos" },
          { value: adicionalCount, label: "Adicionales activos" },
          { value: bebidaCount, label: "Bebidas activas" },
        ].map(({ value, label }) => (
          <div key={label} className="dmh-stat-card">
            <p style={{
              fontFamily: "'Epilogue', sans-serif",
              fontSize: 26, fontWeight: 900, color: "#251a07",
              margin: 0, lineHeight: 1,
            }}>
              {value}
            </p>
            <p style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: 11, color: "#9c8c78", margin: "4px 0 0",
              fontWeight: 600, letterSpacing: "0.02em",
            }}>
              {label}
            </p>
          </div>
        ))}
      </div>

      {/* PDF Error toast */}
      {pdfStatus === "error" && (
        <div style={{
          marginTop: 12, padding: "10px 16px", borderRadius: 12,
          background: "#fef2f2", border: "1px solid #fecaca",
          color: "#991b1b", fontSize: 13, fontWeight: 500,
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          {pdfErrorMessage ?? "Error al generar el PDF"}
          <button
            onClick={onResetPdf}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#991b1b", marginLeft: "auto" }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* PDF Preview Modal */}
      {pdfStatus === "ready" && pdfPreviewUrl && (
        <div className="dmh-modal-overlay" onClick={onResetPdf}>
          <div className="dmh-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="dmh-modal-header">
              <div>
                <h2 style={{
                  fontFamily: "'Epilogue', sans-serif",
                  fontSize: 18, fontWeight: 900, color: "#251a07",
                  margin: 0,
                }}>
                  Vista previa del menú
                </h2>
                <p style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: 12, color: "#9c8c78", margin: "3px 0 0",
                }}>
                  Revisa que todos los platos estén correctos antes de descargar
                </p>
              </div>
              <button
                onClick={onResetPdf}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  padding: 8, borderRadius: 10, color: "#9c8c78",
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="dmh-modal-body">
              <iframe src={pdfPreviewUrl} title="Vista previa PDF del menú" />
            </div>

            <div className="dmh-modal-footer">
              <button onClick={onResetPdf} className="dmh-pdf-btn" style={{ borderColor: "#e5e5e5" }}>
                Cerrar
              </button>
              <button
                onClick={onDownloadPdf}
                className="dmh-save-btn"
                style={{ background: "#bb0005", color: "#fff" }}
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