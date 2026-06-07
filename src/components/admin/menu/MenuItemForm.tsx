"use client";

import { ChevronLeft, Trash2, AlertCircle, Printer, X, ChevronDown, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMenuItemForm } from "@/hooks/useMenuItemForm";
import { MenuItemImageUpload } from "./MenuItemImageUpload";
import { MenuItemPriceSection } from "./MenuItemPriceSection";
import type { MenuItemFormProps } from "./MenuItemForm.types";
import MenuItemFormStyles from "./MenuItemFormStyles";

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
  availableContornos,
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
  const isPrepackaged = form.watch("isPrepackaged");
  const hideAdicionales = form.watch("hideAdicionales");
  const hideBebidas = form.watch("hideBebidas");

  return (
    <>
      <MenuItemFormStyles />

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
                    maxLength={50}
                  />
                  <div
                    className="mif-char-counter"
                    style={{
                      color: (watchedName?.length || 0) > 32
                        ? "#b00020"
                        : (watchedName?.length || 0) > 22
                          ? "#d97706"
                          : "#9c8c78"
                    }}
                  >
                    <Printer size={12} />
                    <span>{(watchedName?.length || 0)}/32</span>
                    <span style={{ fontWeight: 400, fontSize: 10, opacity: 0.8 }}>
                      {(watchedName?.length || 0) > 32
                        ? "— Se cortará en el ticket"
                        : (watchedName?.length || 0) > 22
                          ? "— Podría cortarse en el ticket"
                          : "— Ideal para impresión en ticket"}
                    </span>
                  </div>
                  {form.errors.name && (
                    <p className="mif-field-error">{form.errors.name.message}</p>
                  )}
                </div>

                {/* ── Porción de proteína ── */}
                <div>
                  <label className="mif-label">Porción de proteína</label>
                  <input
                    {...form.register("portionNote")}
                    placeholder="Ej: 200g · 1 pechuga · 3 tenders · Plato completo"
                    className="mif-input"
                    maxLength={100}
                  />
                  <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 11, color: "#9c8c78", marginTop: 5, lineHeight: 1.5 }}>
                    Visible en el menú digital y TV. Vacío = sin proteína definida (sopas, postres, etc.)
                  </p>
                  {form.errors.portionNote && (
                    <p className="mif-field-error">{(form.errors.portionNote as { message?: string }).message}</p>
                  )}
                </div>

                {/* ── Contornos que incluye ── */}
                <div>
                  <label className="mif-label">
                    Contornos que incluye{" "}
                    <span style={{ color: "#9c8c78", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>
                      (acompañantes del plato)
                    </span>
                  </label>
                  <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 11, color: "#9c8c78", marginBottom: 8, lineHeight: 1.5 }}>
                    Marca &quot;Removible&quot; si el cliente puede pedirlo sin ese contorno. Vacío = sin acompañantes fijos (sopas, etc.)
                  </p>

                  {form.contornos.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 8 }}>
                      {form.contornos.map((c) => (
                        <div
                          key={c.id}
                          style={{
                            display: "flex", alignItems: "center", gap: 8,
                            padding: "6px 8px 6px 12px",
                            background: "#fff8f3", border: "1px solid #f0e6df", borderRadius: 8,
                          }}
                        >
                          <span style={{ flex: 1, fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, fontWeight: 600, color: "#251a07" }}>
                            {c.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => form.toggleContornoRemovable(c.id)}
                            style={{
                              display: "inline-flex", alignItems: "center", gap: 4,
                              padding: "3px 9px",
                              background: c.removable ? "#f0fdf4" : "#fdf8f3",
                              border: `1px solid ${c.removable ? "#86efac" : "#e0d5cc"}`,
                              borderRadius: 100, cursor: "pointer",
                              fontFamily: "'Plus Jakarta Sans', sans-serif",
                              fontSize: 11, fontWeight: 600,
                              color: c.removable ? "#15803d" : "#9c8c78",
                              flexShrink: 0,
                            }}
                          >
                            <RotateCcw size={9} />
                            {c.removable ? "Removible" : "Fijo"}
                          </button>
                          <button
                            type="button"
                            onClick={() => form.removeContorno(c.id)}
                            style={{
                              display: "flex", alignItems: "center", justifyContent: "center",
                              width: 24, height: 24, borderRadius: "50%",
                              background: "transparent", border: "1px solid #f0e6df",
                              cursor: "pointer", color: "#9c8c78", flexShrink: 0,
                            }}
                          >
                            <X size={11} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {availableContornos.filter((ac) => !form.contornos.find((c) => c.id === ac.id)).length > 0 && (
                    <div style={{ position: "relative" }}>
                      <select
                        value=""
                        onChange={(e) => {
                          const id = e.target.value;
                          if (!id) return;
                          const item = availableContornos.find((ac) => ac.id === id);
                          if (item) form.addContorno({ id: item.id, name: item.name, removable: false });
                        }}
                        style={{
                          width: "100%", height: 42, padding: "0 36px 0 14px",
                          fontFamily: "'Plus Jakarta Sans', sans-serif",
                          fontSize: 14, fontWeight: 500, color: "#251a07",
                          background: "#fff", border: "1px solid #ede0d8",
                          borderRadius: 10, outline: "none",
                          appearance: "none", cursor: "pointer",
                        }}
                      >
                        <option value="">+ Agregar contorno…</option>
                        {availableContornos
                          .filter((ac) => !form.contornos.find((c) => c.id === ac.id))
                          .map((ac) => (
                            <option key={ac.id} value={ac.id}>
                              {ac.name} — {ac.categoryName}
                            </option>
                          ))}
                      </select>
                      <ChevronDown size={14} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#9c8c78", pointerEvents: "none" }} />
                    </div>
                  )}

                  {form.contornos.length === 0 && availableContornos.length === 0 && (
                    <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 12, color: "#c4b09a", fontStyle: "italic" }}>
                      No hay ítems de contorno disponibles. Crea ítems en categorías simples primero.
                    </p>
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

            {/* Prepackaged toggle */}
            <div
              className="mif-toggle-row"
              style={{ marginTop: 12, background: "#f3f8ff", border: "1px solid #d0e1f9" }}
              onClick={() => form.setValue("isPrepackaged", !isPrepackaged)}
            >
              <div>
                <p className="mif-toggle-label">Ítem Pre-empaquetado</p>
                <p className="mif-toggle-sub">
                  {isPrepackaged
                    ? "Exento de cargos por envase (ej: latas, botellas, snacks sellados)"
                    : "Requiere envase del restaurante (se cobrará tarifa de empaque)"}
                </p>
              </div>
              <div
                className="mif-toggle-track"
                style={{ background: isPrepackaged ? "#0066cc" : "#e0d5cc" }}
              >
                <div
                  className="mif-toggle-thumb"
                  style={{ left: isPrepackaged ? 21 : 3 }}
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