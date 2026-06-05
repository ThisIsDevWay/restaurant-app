"use client";

import { useState, useRef, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { Pencil, Image as ImageIcon, X, Upload, AlertTriangle, ExternalLink, Lock, RotateCcw } from "lucide-react";
import { formatBs, formatRef } from "@/lib/money";
import { updateMenuItemAction } from "@/actions/menu";
import { getImagekitAuthAction, deleteImagekitFileAction } from "@/actions/imagekit";
import { toOriginalUrl } from "@/lib/imagekit/utils";
import { IMAGEKIT_FOLDERS } from "@/lib/imagekit/folders";

interface Contorno {
  id: string;
  name: string;
  removable: boolean;
}

interface MenuItem {
  id: string;
  name: string;
  description?: string | null;
  includedNote?: string | null;
  portionNote?: string | null;
  hideAdicionales?: boolean;
  hideBebidas?: boolean;
  imageUrl?: string | null;
  imagekitFileId?: string | null;
  categoryName: string;
  categoryId: string;
  priceUsdCents: number;
  costUsdCents: number | null;
  costUpdatedAt?: string | Date | null;
  isAvailable: boolean;
  sortOrder?: number;
  isPrepackaged?: boolean;
  contornos: Contorno[];
}

interface CatalogItemCardProps {
  item: MenuItem;
  categories: Array<{ id: string; name: string; isSimple?: boolean }>;
  availableContornos: Array<{ id: string; name: string; categoryName: string }>;
  exchangeRate: number;
  onUpdateSuccess: () => void;
}

function getMargin(item: MenuItem): number | null {
  if (item.costUsdCents === null || item.priceUsdCents === 0) return null;
  return Math.round(((item.priceUsdCents - item.costUsdCents) / item.priceUsdCents) * 100);
}

function isStale(item: MenuItem): boolean {
  if (!item.costUpdatedAt) return false;
  return Date.now() - new Date(item.costUpdatedAt).getTime() > 7 * 24 * 60 * 60 * 1000;
}

function MarginBadge({ item }: { item: MenuItem }) {
  const pct = getMargin(item);
  if (pct === null) return <span style={{ fontSize: 12, color: "#9c8c78" }}>—</span>;
  const stale = isStale(item);
  const color = pct >= 40 ? "#1a7a45" : pct >= 20 ? "#9a5e00" : "#b00020";
  const bg = pct >= 40 ? "#eaf7f0" : pct >= 20 ? "#fff3e0" : "#fdeaec";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        padding: "2px 8px", borderRadius: 100,
        background: bg, color, fontWeight: 700, fontSize: 12,
        letterSpacing: "0.02em",
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: "50%",
          background: color, flexShrink: 0,
        }} />
        {pct}%
      </span>
      {stale && (
        <AlertTriangle size={12} style={{ color: "#c87800", flexShrink: 0 }} aria-label="Costo sin actualizar" />
      )}
    </span>
  );
}

export default function CatalogItemCard({
  item,
  categories,
  availableContornos,
  exchangeRate,
  onUpdateSuccess,
}: CatalogItemCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState(item.name);
  const [categoryId, setCategoryId] = useState(item.categoryId);
  const [priceDollars, setPriceDollars] = useState(String((item.priceUsdCents / 100).toFixed(2)));
  const [previewUrl, setPreviewUrl] = useState<string | null>(item.imageUrl ?? null);
  const [imagekitFileId, setImagekitFileId] = useState(item.imagekitFileId ?? "");
  const [itemContornos, setItemContornos] = useState<Contorno[]>(item.contornos);

  const pendingFileIdRef = useRef<string | null>(null);
  const [, startTransition] = useTransition();

  // Calculated values
  const currentPriceBs = parseFloat(priceDollars || "0") * exchangeRate * 100 || 0;
  const priceBsStr = currentPriceBs > 0 ? formatBs(currentPriceBs).replace("Bs.", "").trim() : "0,00";

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setError("Formato no soportado. Usa JPG, PNG o WebP.");
      return;
    }

    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setError("Imagen demasiado grande. Máximo 5MB.");
      return;
    }

    try {
      setUploading(true);
      setError(null);

      // Optimizar imagen: Max 1000px ancho, formato WebP, calidad 80%
      const { optimizeImage } = await import("@/lib/utils/image-optimization");
      const optimizedFile = await optimizeImage(file, {
        maxWidth: 1000,
        maxHeight: 1000,
        quality: 0.8,
      });

      if (pendingFileIdRef.current) {
        deleteImagekitFileAction({ fileId: pendingFileIdRef.current }).catch(() => {});
        pendingFileIdRef.current = null;
      }

      const authResult = await getImagekitAuthAction({});
      if (authResult?.serverError) throw new Error(authResult.serverError);
      if (!authResult?.data) throw new Error("Error obteniendo auth de subida");
      const { token, expire, signature, publicKey } = authResult.data;

      const formData = new FormData();
      formData.append("file", optimizedFile);
      formData.append("fileName", optimizedFile.name);
      formData.append("folder", IMAGEKIT_FOLDERS.menu);
      formData.append("useUniqueFileName", "true");
      formData.append("publicKey", publicKey);
      formData.append("signature", signature);
      formData.append("expire", String(expire));
      formData.append("token", token);

      const uploadRes = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
        method: "POST",
        body: formData,
      });
      if (!uploadRes.ok) throw new Error("Error al subir la imagen");
      const uploadData = (await uploadRes.json()) as { url: string; fileId: string };

      pendingFileIdRef.current = uploadData.fileId;
      const finalUrl = toOriginalUrl(uploadData.url);
      setPreviewUrl(finalUrl);
      setImagekitFileId(uploadData.fileId);
    } catch {
      setError("Error al subir la imagen");
    } finally {
      setUploading(false);
    }
  }

  function handleRemoveImage() {
    if (pendingFileIdRef.current) {
      deleteImagekitFileAction({ fileId: pendingFileIdRef.current }).catch(() => {});
      pendingFileIdRef.current = null;
    }
    setPreviewUrl(null);
    setImagekitFileId("");
  }

  function handleCancel() {
    if (pendingFileIdRef.current) {
      deleteImagekitFileAction({ fileId: pendingFileIdRef.current }).catch(() => {});
      pendingFileIdRef.current = null;
    }
    // Revert state to original item data
    setName(item.name);
    setCategoryId(item.categoryId);
    setPriceDollars(String((item.priceUsdCents / 100).toFixed(2)));
    setPreviewUrl(item.imageUrl ?? null);
    setImagekitFileId(item.imagekitFileId ?? "");
    setItemContornos(item.contornos);
    setError(null);
    setIsEditing(false);
  }

  async function handleSave() {
    if (!name.trim()) {
      setError("El nombre es requerido.");
      return;
    }

    const priceNum = parseFloat(priceDollars);
    if (isNaN(priceNum) || priceNum < 0) {
      setError("Precio inválido.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const priceUsdCents = Math.round(priceNum * 100);
      const contornoPayload = itemContornos.map((c) => ({ id: c.id, removable: c.removable }));

      const dataPayload = {
        name: name.trim(),
        description: item.description ?? undefined,
        portionNote: item.portionNote ?? null,
        includedNote: item.includedNote ?? null,
        hideAdicionales: item.hideAdicionales ?? false,
        hideBebidas: item.hideBebidas ?? false,
        priceUsdCents,
        costUsdCents: item.costUsdCents ?? undefined,
        categoryId,
        isAvailable: item.isAvailable,
        isPrepackaged: item.isPrepackaged ?? false,
        imageUrl: previewUrl ?? "",
        imagekitFileId: imagekitFileId || undefined,
        sortOrder: item.sortOrder ?? undefined,
        contornos: contornoPayload,
      };

      const result = await updateMenuItemAction({
        id: item.id,
        data: dataPayload,
      });

      if (result?.serverError) throw new Error(result.serverError);
      if (result?.validationErrors) {
        throw new Error("Error de validación al guardar cambios.");
      }

      pendingFileIdRef.current = null;
      setIsEditing(false);
      startTransition(() => {
        onUpdateSuccess();
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  if (isEditing) {
    return (
      <article className="mcv-card mcv-card-editing">
        {/* Image upload area */}
        <div className="mcv-img-wrap">
          {previewUrl ? (
            <Image
              src={previewUrl}
              alt={name}
              fill
              className="mcv-img"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 300px"
            />
          ) : (
            <div className="mcv-img-placeholder">
              <ImageIcon size={28} color="#c4b09a" />
            </div>
          )}

          <div className="mcv-img-upload-overlay">
            {uploading ? (
              <span className="mcv-spinner" />
            ) : (
              <>
                <label className="mcv-upload-label">
                  <Upload size={14} />
                  Subir
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleImageUpload}
                    style={{ display: "none" }}
                  />
                </label>
                {previewUrl && (
                  <button type="button" className="mcv-remove-img-btn" onClick={handleRemoveImage} title="Eliminar imagen">
                    <X size={12} />
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Card Body Edit Form */}
        <div className="mcv-card-body" style={{ gap: 8 }}>
          {error && (
            <div className="mcv-card-error">
              {error}
            </div>
          )}

          <div>
            <label className="mcv-edit-label">Nombre</label>
            <input
              type="text"
              className="mcv-edit-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
              placeholder="Nombre del plato"
            />
          </div>

          <div>
            <label className="mcv-edit-label">Categoría</label>
            <select
              className="mcv-edit-select"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mcv-edit-label">Precio</label>
            <div className="mcv-edit-price-wrapper">
              <span className="mcv-edit-price-prefix">$</span>
              <input
                type="text"
                className="mcv-edit-price-input"
                value={priceDollars}
                onChange={(e) => {
                  const val = e.target.value;
                  if (/^\d*\.?\d*$/.test(val)) {
                    setPriceDollars(val);
                  }
                }}
                placeholder="0.00"
              />
            </div>
            <p className="mcv-edit-price-bs">
              Ref. Bs. {priceBsStr}
            </p>
          </div>

          {/* Contornos */}
          <div style={{ marginTop: 2 }}>
            <label className="mcv-edit-label">Contornos</label>
            {itemContornos.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
                {itemContornos.map((c) => {
                  const cleanName = c.name.replace(/\s*\(contorno[s]?\)/i, "").trim();
                  return (
                    <div key={c.id} className="mcv-edit-chip">
                      <span className="mcv-chip-name" title={c.name}>
                        {cleanName}
                      </span>
                      <button
                        type="button"
                        className={`mcv-chip-removable-toggle ${c.removable ? "active" : ""}`}
                        title={c.removable ? "Removible: el cliente puede quitar este contorno" : "Fijo: acompañante obligatorio"}
                        onClick={() => {
                          setItemContornos(prev =>
                            prev.map(pc => pc.id === c.id ? { ...pc, removable: !pc.removable } : pc)
                          );
                        }}
                      >
                        {c.removable ? (
                          <>
                            <RotateCcw size={10} />
                            <span>Rem</span>
                          </>
                        ) : (
                          <>
                            <Lock size={10} />
                            <span>Fijo</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        className="mcv-chip-remove"
                        onClick={() => setItemContornos(prev => prev.filter(pc => pc.id !== c.id))}
                        title="Quitar acompañante"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add contorno dropdown */}
            {availableContornos.filter(ac => !itemContornos.some(c => c.id === ac.id)).length > 0 && (
              <select
                value=""
                onChange={(e) => {
                  const id = e.target.value;
                  if (!id) return;
                  const ac = availableContornos.find(i => i.id === id);
                  if (ac) {
                    setItemContornos(prev => [...prev, { id: ac.id, name: ac.name, removable: false }]);
                  }
                }}
                className="mcv-edit-select"
                style={{ height: 30, fontSize: 12, padding: "0 6px" }}
              >
                <option value="">+ Agregar contorno...</option>
                {availableContornos
                  .filter(ac => !itemContornos.some(c => c.id === ac.id))
                  .map(ac => {
                    const cleanAcName = ac.name.replace(/\s*\(contorno[s]?\)/i, "").trim();
                    return (
                      <option key={ac.id} value={ac.id}>
                        {cleanAcName} ({ac.categoryName})
                      </option>
                    );
                  })}
              </select>
            )}
          </div>

          {/* Form Actions */}
          <div style={{ display: "flex", gap: 6, marginTop: 8, borderTop: "1px solid #f5ede6", paddingTop: 8 }}>
            <button
              type="button"
              className="mcv-action-btn mcv-btn-secondary"
              onClick={handleCancel}
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="mcv-action-btn mcv-btn-primary"
              onClick={handleSave}
              disabled={saving || uploading}
            >
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>

          {/* Link to Full Edit Page */}
          <div style={{ display: "flex", justifyContent: "center", marginTop: 4 }}>
            <Link
              href={`/admin/catalogo/${item.id}/edit`}
              className="mcv-edit-advanced-link"
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: 11,
                fontWeight: 600,
                color: "#9c8c78",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                textDecoration: "none",
                transition: "color 0.15s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#bb0005")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#9c8c78")}
            >
              <span>Edición avanzada</span>
              <ExternalLink size={10} />
            </Link>
          </div>
        </div>
      </article>
    );
  }

  // Read mode rendering (matches original catalog item design)
  return (
    <article className="mcv-card">
      {/* Image */}
      <div className="mcv-img-wrap">
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={item.name}
            fill
            className="mcv-img"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 300px"
          />
        ) : (
          <div className="mcv-img-placeholder">
            <ImageIcon size={28} color="#c4b09a" />
          </div>
        )}

        {/* Availability badge */}
        <div
          className="mcv-avail-dot"
          style={{
            background: item.isAvailable ? "rgba(234,247,240,0.92)" : "rgba(253,234,236,0.92)",
            color: item.isAvailable ? "#1a7a45" : "#b00020",
          }}
        >
          <span
            className="mcv-avail-dot-inner"
            style={{ background: item.isAvailable ? "#1a7a45" : "#b00020" }}
          />
          {item.isAvailable ? "Disponible" : "Agotado"}
        </div>

        {/* Inline Edit button */}
        <button
          type="button"
          className="mcv-edit-btn"
          title="Edición rápida"
          onClick={() => setIsEditing(true)}
        >
          <Pencil size={14} />
        </button>
      </div>

      {/* Card body */}
      <div className="mcv-card-body">
        <div>
          <p className="mcv-item-name">{item.name}</p>
          {item.description && (
            <p className="mcv-item-desc">{item.description}</p>
          )}

          {/* Render included contornos list if any */}
          {item.contornos && item.contornos.length > 0 && (
            <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 4 }}>
              {item.contornos.map((c) => {
                const cleanName = c.name.replace(/\s*\(contorno[s]?\)/i, "").trim();
                return (
                  <span
                    key={c.id}
                    style={{
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontSize: 10,
                      fontWeight: 600,
                      background: "#fbf6f0",
                      border: "1px solid #f0e6df",
                      color: "#7e6d5a",
                      padding: "2px 6px",
                      borderRadius: 4,
                    }}
                  >
                    {cleanName}{c.removable ? " (Rem)" : ""}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        <div className="mcv-card-footer">
          <span className="mcv-price">{formatRef(item.priceUsdCents)}</span>
          <MarginBadge item={item} />
        </div>
      </div>
    </article>
  );
}
