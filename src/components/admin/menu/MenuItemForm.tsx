"use client";

import {
  ChevronLeft,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMenuItemForm } from "@/hooks/useMenuItemForm";
import { MenuItemImageUpload } from "./MenuItemImageUpload";
import { MenuItemPriceSection } from "./MenuItemPriceSection";
import { ContornosSection } from "./ContornosSection";
import { AdicionalesSection } from "./AdicionalesSection";
import { BebidasSection } from "./BebidasSection";
import type { MenuItemFormProps } from "./MenuItemForm.types";

export function MenuItemForm({
  categories,
  initialData,
  exchangeRate,
  allAdicionales,
  initialSelectedAdicionalIds = [],
  allContornos,
  initialSelectedContornos = [],
  allBebidas = [],
  initialSelectedBebidaIds = [],
  adicionalesEnabled = true,
  bebidasEnabled = true,
}: MenuItemFormProps) {
  const form = useMenuItemForm({
    categories,
    initialData,
    exchangeRate,
    initialSelectedAdicionalIds,
    initialSelectedContornos,
    initialSelectedBebidaIds,
  });

  const watchedName = form.watch("name");
  const watchedCategoryId = form.watch("categoryId");
  const selectedCategory = categories.find((c) => c.id === watchedCategoryId);
  const isSimpleCategory = selectedCategory?.isSimple ?? false;

  return (
    <form onSubmit={form.handleSubmit(form.onFormSubmit)} className="max-w-4xl mx-auto py-8 px-4">
      {/* ── Minimalistic Header ── */}
      <div className="flex items-center justify-between mb-12">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => window.location.href = "/admin/catalogo"}
            className="p-2 hover:bg-gray-50 rounded-full transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-gray-500" />
          </button>
          <div>
            <h1 className="text-2xl font-medium text-gray-900 tracking-tight">
              {form.isEdit ? (watchedName || initialData?.name) : "Nuevo producto"}
            </h1>
            <div className="flex items-center gap-3 mt-1">
              {selectedCategory && (
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  {selectedCategory.name}
                </span>
              )}
              <span className={`text-xs font-medium ${form.watch("isAvailable") ? "text-green-600" : "text-gray-500"}`}>
                {form.watch("isAvailable") ? "● Disponible" : "○ Oculto"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {form.isEdit && (
            <div className="flex items-center gap-2 mr-2 pr-2 border-r border-gray-200">
              {form.showDeleteConfirm ? (
                <>
                  <span className="text-xs text-red-600 font-medium">¿Confirmar?</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => form.setShowDeleteConfirm(false)}
                    className="text-gray-500 h-8"
                  >
                    No
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={form.onDelete}
                    disabled={form.submitting}
                    className="h-8 bg-red-600 hover:bg-red-700"
                  >
                    Sí, borrar
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => form.setShowDeleteConfirm(true)}
                  className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8 gap-1.5"
                >
                  <Trash2 className="h-4 w-4" />
                  Borrar
                </Button>
              )}
            </div>
          )}
          <Button
            type="button"
            variant="ghost"
            onClick={() => window.location.href = "/admin/catalogo"}
            className="text-gray-500 hover:text-gray-900"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={form.submitting || form.uploading}
            className="bg-primary text-white hover:bg-primary-hover px-6 font-medium"
          >
            {form.submitting ? "Guardando..." : form.isEdit ? "Guardar" : "Crear"}
          </Button>
        </div>
      </div>

      {form.error && (
        <div className="mb-8 p-4 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100 animate-in fade-in duration-300">
          <p className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {form.error}
          </p>
        </div>
      )}

      {/* ── Sections ── */}
      <div className="space-y-16">
        {/* Row 1: Basic Info & Image */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <section className="space-y-6">
            <header>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Información básica</h2>
            </header>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Nombre</label>
                <input
                  {...form.register("name")}
                  placeholder="Ej: Pollo Guisado"
                  className="w-full h-10 px-3 text-sm border border-gray-200 rounded-md focus:border-primary focus:outline-none transition-colors"
                />
                {form.errors.name && <p className="text-xs text-red-500">{form.errors.name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Descripción</label>
                <textarea
                  {...form.register("description")}
                  placeholder="Descripción del plato..."
                  rows={4}
                  className="w-full p-3 text-sm border border-gray-200 rounded-md focus:border-primary focus:outline-none transition-colors resize-none"
                />
                {form.errors.description && <p className="text-xs text-red-500">{form.errors.description.message}</p>}
              </div>
            </div>
          </section>

          <MenuItemImageUpload
            previewUrl={form.previewUrl}
            uploading={form.uploading}
            fileInputRef={form.fileInputRef}
            onUpload={form.handleImageUpload}
            onRemoveImage={form.handleRemoveImage}
          />
        </div>

        <MenuItemPriceSection
          register={form.register}
          errors={form.errors}
          watch={form.watch}
          setValue={form.setValue}
          categories={categories}
          exchangeRate={exchangeRate}
        />

        {!isSimpleCategory && allContornos.length > 0 && (
          <ContornosSection
            allContornos={allContornos}
            selectedContornos={form.selectedContornos}
            onToggle={form.toggleContorno}
            onToggleRemovable={form.toggleContornoRemovable}
            onToggleSubstitute={form.toggleSubstituteContorno}
          />
        )}

        {!isSimpleCategory && allAdicionales.length > 0 && (
          <AdicionalesSection
            allAdicionales={allAdicionales}
            selectedAdicionalIds={form.selectedAdicionalIds}
            onToggle={(id) => {
              form.setSelectedAdicionalIds((prev) =>
                prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
              );
            }}
            adicionalesEnabled={adicionalesEnabled}
          />
        )}

        {!isSimpleCategory && allBebidas.length > 0 && (
          <BebidasSection
            allBebidas={allBebidas}
            selectedBebidaIds={form.selectedBebidaIds}
            onToggle={(id) => {
              form.setSelectedBebidaIds((prev) =>
                prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
              );
            }}
            bebidasEnabled={bebidasEnabled}
          />
        )}
      </div>
    </form>
  );
}
