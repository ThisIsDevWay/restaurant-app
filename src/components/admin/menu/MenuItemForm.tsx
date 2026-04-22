"use client";

import { ChevronLeft, Trash2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMenuItemForm } from "@/hooks/useMenuItemForm";
import { MenuItemImageUpload } from "./MenuItemImageUpload";
import { MenuItemPriceSection } from "./MenuItemPriceSection";
import type { MenuItemFormProps } from "./MenuItemForm.types";

const SECTION_ACCENT = "#bb0005";

function SectionHeader({ number, label }: { number: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
      <span style={{
        fontFamily: "'Epilogue', sans-serif",
        fontSize: 11, fontWeight: 900,
        color: SECTION_ACCENT,
        letterSpacing: "0.08em",
        textTransform: "uppercase" as const,
        minWidth: 20,
      }}>
        {number}
      </span>
      <div style={{ height: 1, width: 24, background: SECTION_ACCENT, opacity: 0.3 }} />
      <span style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontSize: 11, fontWeight: 700,
        color: "#9c8c78",
        letterSpacing: "0.08em",
        textTransform: "uppercase" as const,
      }}>
        {label}
      </span>
    </div>
  );
}

export function MenuItemForm({
  categories,
  initialData,
  exchangeRate,
}: MenuItemFormProps) {
  const form = useMenuItemForm({
    categories,
    initialData,
    exchangeRate,
  });

  const watchedName = form.watch("name");
  const watchedCategoryId = form.watch("categoryId");
  const selectedCategory = categories.find((c) => c.id === watchedCategoryId);
  const isSimpleCategory = selectedCategory?.isSimple ?? false;
  const isAvailable = form.watch("isAvailable");
  const hideAdicionales = form.watch("hideAdicionales");
  const hideBebidas = form.watch("hideBebidas");

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Epilogue:wght@700;900&family=Plus+Jakarta+Sans:wght@400;500;600&display=swap');

        .mif * { box-sizing: border-box; }

        .mif-back-btn {
          display: inline-flex; align-items: center; justify-content: center;
          width: 36px; height: 36px; border-radius: 50%;
          background: #fff; border: 1px solid #f0e6df;
          cursor: pointer; transition: all 0.15s ease;
          color: #251a07;
          flex-shrink: 0;
        }
        .mif-back-btn:hover { border-color: #bb0005; color: #bb0005; background: #fff8f3; }

        .mif-input {
          width: 100%; height: 42px;
          padding: 0 14px;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 14px; font-weight: 500;
          color: #251a07;
          background: #fff;
          border: 1px solid #ede0d8;
          border-radius: 10px;
          outline: none;
          transition: border-color 0.15s ease;
        }
        .mif-input::placeholder { color: #c4b09a; font-weight: 400; }
        .mif-input:focus { border-color: #bb0005; }

        .mif-textarea {
          width: 100%;
          padding: 12px 14px;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 14px; font-weight: 400; line-height: 1.6;
          color: #251a07;
          background: #fff;
          border: 1px solid #ede0d8;
          border-radius: 10px;
          outline: none;
          resize: none;
          transition: border-color 0.15s ease;
        }
        .mif-textarea::placeholder { color: #c4b09a; }
        .mif-textarea:focus { border-color: #bb0005; }

        .mif-label {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 12px; font-weight: 600;
          color: #5f5e5e;
          display: block; margin-bottom: 6px;
          letter-spacing: 0.01em;
        }

        .mif-field-error {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 11.5px; color: #b00020;
          margin-top: 5px;
        }

        .mif-section-card {
          background: #fff;
          border: 1px solid #f0e6df;
          border-radius: 20px;
          padding: 28px 28px 32px;
        }

        .mif-toggle-row {
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 16px;
          background: #fff8f3;
          border: 1px solid #f0e6df;
          border-radius: 12px;
          cursor: pointer;
          transition: background 0.15s ease;
          margin-top: 4px;
        }
        .mif-toggle-row:hover { background: #fff2e2; }

        .mif-toggle-label {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 13px; font-weight: 600; color: #251a07;
        }
        .mif-toggle-sub {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 11.5px; color: #9c8c78; margin-top: 2px;
        }

        .mif-toggle-track {
          width: 40px; height: 22px; border-radius: 100px;
          transition: background 0.2s ease; flex-shrink: 0;
          position: relative;
        }
        .mif-toggle-thumb {
          position: absolute; top: 3px; width: 16px; height: 16px;
          border-radius: 50%; background: #fff;
          transition: left 0.2s ease;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        }

        .mif-save-btn {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 10px 24px;
          background: #bb0005; color: #fff;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 14px; font-weight: 600;
          border-radius: 100px; border: none; cursor: pointer;
          transition: background 0.15s ease, transform 0.1s ease;
          letter-spacing: 0.01em;
        }
        .mif-save-btn:hover:not(:disabled) { background: #e2231a; }
        .mif-save-btn:active:not(:disabled) { transform: scale(0.97); }
        .mif-save-btn:disabled { opacity: 0.55; cursor: not-allowed; }

        .mif-ghost-btn {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 10px 16px;
          background: transparent; color: #9c8c78;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 14px; font-weight: 600;
          border-radius: 100px; border: 1px solid #ede0d8;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .mif-ghost-btn:hover { border-color: #251a07; color: #251a07; }

        .mif-delete-btn {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 10px 16px;
          background: transparent; color: #b00020;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 14px; font-weight: 600;
          border-radius: 100px; border: 1px solid #f5c5c8;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .mif-delete-btn:hover { background: #fdeaec; border-color: #b00020; }

        .mif-confirm-row {
          display: flex; align-items: center; gap: 8px;
          padding: 6px 14px 6px 6px;
          background: #fdeaec;
          border: 1px solid #f5c5c8;
          border-radius: 100px;
        }
      `}</style>

      <form
        onSubmit={form.handleSubmit(form.onFormSubmit)}
        className="mif"
        style={{ maxWidth: 860, margin: "0 auto", padding: "0 0 80px" }}
      >

        {/* ── Sticky top bar ── */}
        <div style={{
          position: "sticky", top: 0, zIndex: 20,
          background: "rgba(255,248,243,0.92)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid #f0e6df",
          padding: "12px 0",
          marginBottom: 36,
          marginLeft: -24, marginRight: -24, paddingLeft: 24, paddingRight: 24,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
              <button
                type="button"
                className="mif-back-btn"
                onClick={() => window.location.href = "/admin/catalogo"}
              >
                <ChevronLeft size={18} />
              </button>
              <div style={{ minWidth: 0 }}>
                <h1 style={{
                  fontFamily: "'Epilogue', sans-serif",
                  fontSize: 20, fontWeight: 900, color: "#251a07",
                  letterSpacing: "-0.02em", margin: 0,
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}>
                  {form.isEdit
                    ? (watchedName || initialData?.name || "Editar item")
                    : "Nuevo producto"}
                </h1>
                {selectedCategory && (
                  <p style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontSize: 12, color: "#9c8c78", margin: "2px 0 0",
                  }}>
                    {selectedCategory.name}
                    <span style={{
                      marginLeft: 8,
                      color: isAvailable ? "#1a7a45" : "#9c8c78",
                      fontWeight: 600,
                    }}>
                      {isAvailable ? "● Disponible" : "○ Oculto"}
                    </span>
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              {form.isEdit && (
                <>
                  {form.showDeleteConfirm ? (
                    <div className="mif-confirm-row">
                      <span style={{
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        fontSize: 12, fontWeight: 600, color: "#b00020", paddingLeft: 8,
                      }}>
                        ¿Borrar?
                      </span>
                      <button
                        type="button"
                        className="mif-ghost-btn"
                        style={{ padding: "6px 12px", fontSize: 12 }}
                        onClick={() => form.setShowDeleteConfirm(false)}
                      >
                        No
                      </button>
                      <button
                        type="button"
                        style={{
                          display: "inline-flex", alignItems: "center",
                          padding: "6px 14px",
                          background: "#b00020", color: "#fff",
                          fontFamily: "'Plus Jakarta Sans', sans-serif",
                          fontSize: 12, fontWeight: 700,
                          borderRadius: 100, border: "none", cursor: "pointer",
                        }}
                        onClick={form.onDelete}
                        disabled={form.submitting}
                      >
                        Sí, borrar
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="mif-delete-btn"
                      style={{ padding: "8px 14px", fontSize: 13 }}
                      onClick={() => form.setShowDeleteConfirm(true)}
                    >
                      <Trash2 size={13} />
                      Borrar
                    </button>
                  )}
                </>
              )}
              <button
                type="button"
                className="mif-ghost-btn"
                onClick={() => window.location.href = "/admin/catalogo"}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="mif-save-btn"
                disabled={form.submitting || form.uploading}
              >
                {form.submitting
                  ? "Guardando..."
                  : form.isEdit ? "Guardar cambios" : "Crear producto"}
              </button>
            </div>
          </div>
        </div>

        {/* Error banner */}
        {form.error && (
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "14px 18px", marginBottom: 24,
            background: "#fdeaec", border: "1px solid #f5c5c8",
            borderRadius: 12,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 13, color: "#b00020",
          }}>
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            {form.error}
          </div>
        )}

        {/* ── Sections ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* 01 — Identidad */}
          <div className="mif-section-card">
            <SectionHeader number="01" label="Identidad" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label className="mif-label">Nombre del plato</label>
                  <input
                    {...form.register("name")}
                    placeholder="Ej: Pollo Guisado"
                    className="mif-input"
                  />
                  {form.errors.name && (
                    <p className="mif-field-error">{form.errors.name.message}</p>
                  )}
                </div>
                <div>
                  <label className="mif-label">Descripción</label>
                  <textarea
                    {...form.register("description")}
                    placeholder="Ingredientes, preparación o detalle del plato..."
                    rows={4}
                    className="mif-textarea"
                  />
                  {form.errors.description && (
                    <p className="mif-field-error">{form.errors.description.message}</p>
                  )}
                </div>
                <div>
                  <label className="mif-label">
                    Incluye{" "}
                    <span style={{ color: "#9c8c78", fontWeight: 400 }}>
                      (acompañamiento fijo)
                    </span>
                  </label>
                  <input
                    {...form.register("includedNote")}
                    placeholder="Ej: Papas fritas y bebida"
                    className="mif-input"
                  />
                  <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 11, color: "#9c8c78", marginTop: 5 }}>
                    Se muestra como badge verde en el menú y en el carrito. Solo para ítems con acompañamiento fijo (Comida Rápida, Menú Kids, etc.)
                  </p>
                  {form.errors.includedNote && (
                    <p className="mif-field-error">{(form.errors.includedNote as any).message}</p>
                  )}

                  {/* Hide Adicionales & Bebidas Toggles */}
                  <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 16 }}>
                    <div
                      className="mif-toggle-row"
                      style={{ padding: "12px 16px", background: "#fdfbf9", border: "1px solid #f0e6df", borderRadius: 8 }}
                      onClick={() => form.setValue("hideAdicionales", !hideAdicionales)}
                    >
                      <div>
                        <p className="mif-toggle-label" style={{ fontSize: 13 }}>Ocultar adicionales</p>
                        <p className="mif-toggle-sub" style={{ fontSize: 11 }}>
                          No mostrar la sección de &quot;Adicionales del día&quot; en el detalle de este ítem
                        </p>
                      </div>
                      <div className="mif-toggle-track" style={{ background: hideAdicionales ? "#1a7a45" : "#e0d5cc" }}>
                        <div className="mif-toggle-thumb" style={{ left: hideAdicionales ? 21 : 3 }} />
                      </div>
                    </div>

                    <div
                      className="mif-toggle-row"
                      style={{ padding: "12px 16px", background: "#fdfbf9", border: "1px solid #f0e6df", borderRadius: 8 }}
                      onClick={() => form.setValue("hideBebidas", !hideBebidas)}
                    >
                      <div>
                        <p className="mif-toggle-label" style={{ fontSize: 13 }}>Ocultar bebidas</p>
                        <p className="mif-toggle-sub" style={{ fontSize: 11 }}>
                          No mostrar la sección de &quot;Bebidas del día&quot; en el detalle de este ítem
                        </p>
                      </div>
                      <div className="mif-toggle-track" style={{ background: hideBebidas ? "#1a7a45" : "#e0d5cc" }}>
                        <div className="mif-toggle-thumb" style={{ left: hideBebidas ? 21 : 3 }} />
                      </div>
                    </div>
                  </div>

                </div>
              </div>
              <MenuItemImageUpload
                previewUrl={form.previewUrl}
                uploading={form.uploading}
                fileInputRef={form.fileInputRef}
                onUpload={form.handleImageUpload}
                onRemoveImage={form.handleRemoveImage}
              />
            </div>

            {/* Availability toggle */}
            <div
              className="mif-toggle-row"
              style={{ marginTop: 20 }}
              onClick={() => form.setValue("isAvailable", !isAvailable)}
            >
              <div>
                <p className="mif-toggle-label">Disponibilidad</p>
                <p className="mif-toggle-sub">
                  {isAvailable
                    ? "Visible para clientes · aparece en el menú"
                    : "Oculto · no aparece hasta que lo actives"}
                </p>
              </div>
              <div
                className="mif-toggle-track"
                style={{ background: isAvailable ? "#bb0005" : "#e0d5cc" }}
              >
                <div
                  className="mif-toggle-thumb"
                  style={{ left: isAvailable ? 21 : 3 }}
                />
              </div>
            </div>
          </div>

          {/* 02 — Precio y costo */}
          <div className="mif-section-card">
            <SectionHeader number="02" label="Precio y costo" />
            <MenuItemPriceSection
              register={form.register}
              errors={form.errors}
              watch={form.watch}
              setValue={form.setValue}
              categories={categories}
              exchangeRate={exchangeRate}
            />
          </div>

        </div>
      </form>
    </>
  );
}