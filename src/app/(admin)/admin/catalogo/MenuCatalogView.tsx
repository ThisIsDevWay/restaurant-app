"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Plus, Image as ImageIcon, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import CatalogItemCard from "./CatalogItemCard";

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

interface MenuCatalogViewProps {
  items: MenuItem[];
  categories: Array<{ id: string; name: string; isSimple?: boolean }>;
  availableContornos: Array<{ id: string; name: string; categoryName: string }>;
  exchangeRate: number;
}

const CATEGORY_COLORS: string[] = [
  "#bb0005", "#1a6b3a", "#0d5a8a", "#7b3fa0", "#b56000", "#1a5c6e",
];

export default function MenuCatalogView({
  items,
  categories,
  availableContornos,
  exchangeRate,
}: MenuCatalogViewProps) {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [search, setSearch] = useState("");

  const categoryNames = useMemo(() => {
    const order: string[] = [];
    items.forEach((i) => { if (!order.includes(i.categoryName)) order.push(i.categoryName); });
    return order;
  }, [items]);

  const grouped = useMemo(() => {
    const cats = activeCategory === "all" ? categoryNames : [activeCategory];
    const normalizedSearch = search.toLowerCase().trim();

    return cats.reduce<Record<string, MenuItem[]>>((acc, cat) => {
      const filtered = items.filter((i) => {
        const matchesCat = i.categoryName === cat;
        const matchesSearch = !normalizedSearch ||
          i.name.toLowerCase().includes(normalizedSearch) ||
          i.description?.toLowerCase().includes(normalizedSearch);
        return matchesCat && matchesSearch;
      });

      if (filtered.length > 0) {
        acc[cat] = filtered;
      }
      return acc;
    }, {});
  }, [activeCategory, categoryNames, items, search]);

  const stats = useMemo(() => {
    const available = items.filter((i) => i.isAvailable).length;
    const withCost = items.filter((i) => i.costUsdCents !== null && i.priceUsdCents > 0);
    const avgMargin = withCost.length > 0
      ? Math.round(withCost.reduce((s, i) => s + ((i.priceUsdCents - i.costUsdCents!) / i.priceUsdCents) * 100, 0) / withCost.length)
      : null;
    return { available, total: items.length, avgMargin };
  }, [items]);

  const catColorMap = useMemo(() => {
    const m: Record<string, string> = {};
    categoryNames.forEach((c, i) => { m[c] = CATEGORY_COLORS[i % CATEGORY_COLORS.length]; });
    return m;
  }, [categoryNames]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Epilogue:wght@700;900&family=Plus+Jakarta+Sans:wght@400;500;600&display=swap');

        .mcv * { box-sizing: border-box; }

        .mcv-stat-card {
          background: #fff;
          border: 1px solid #f0e6df;
          border-radius: 16px;
          padding: 18px 22px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          flex: 1;
          min-width: 0;
        }
        .mcv-stat-label {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #9c8c78;
        }
        .mcv-stat-value {
          font-family: 'Epilogue', sans-serif;
          font-size: 28px;
          font-weight: 900;
          color: #251a07;
          line-height: 1;
        }

        .mcv-pill {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 13px;
          font-weight: 600;
          padding: 7px 16px;
          border-radius: 100px;
          border: 1.5px solid transparent;
          cursor: pointer;
          transition: all 0.15s ease;
          white-space: nowrap;
          background: transparent;
        }
        .mcv-pill:hover { opacity: 0.85; }
        .mcv-pill-active {
          background: #bb0005;
          color: #fff;
          border-color: #bb0005;
        }
        .mcv-pill-inactive {
          background: #fff;
          color: #251a07;
          border-color: #e7bdb7;
        }
        .mcv-pill-inactive:hover {
          border-color: #bb0005;
          color: #bb0005;
        }

        .mcv-category-header {
          display: flex;
          align-items: baseline;
          gap: 12px;
          margin: 40px 0 20px;
          padding-bottom: 12px;
          border-bottom: 2px solid #f5ede6;
        }
        .mcv-category-name {
          font-family: 'Epilogue', sans-serif;
          font-size: 22px;
          font-weight: 900;
          color: #251a07;
          letter-spacing: -0.02em;
        }
        .mcv-category-count {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 13px;
          font-weight: 600;
          color: #9c8c78;
        }
        .mcv-category-bar {
          height: 3px;
          border-radius: 100px;
          flex: 1;
          margin-left: 8px;
          align-self: center;
          opacity: 0.25;
        }

        .mcv-search-container {
          margin-bottom: 24px;
          position: relative;
        }
        .mcv-search-input {
          width: 100%;
          padding: 12px 16px 12px 42px;
          border-radius: 14px;
          border: 1.5px solid #f0e6df;
          background: #fff;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 15px;
          color: #251a07;
          transition: all 0.2s ease;
          outline: none;
        }
        .mcv-search-input:focus {
          border-color: #bb0005;
          box-shadow: 0 0 0 4px rgba(187, 0, 5, 0.05);
        }
        .mcv-search-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: #9c8c78;
          pointer-events: none;
        }
        .mcv-search-clear {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f5ede6;
          color: #9c8c78;
          cursor: pointer;
          border: none;
          padding: 0;
          transition: all 0.2s ease;
        }
        .mcv-search-clear:hover {
          background: #e7bdb7;
          color: #bb0005;
        }

        .mcv-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 16px;
        }

        .mcv-card {
          background: #fff;
          border: 1px solid #f0e6df;
          border-radius: 20px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          transition: box-shadow 0.2s ease, transform 0.2s ease;
          position: relative;
        }
        .mcv-card:hover {
          box-shadow: 0 8px 32px rgba(37, 26, 7, 0.10);
          transform: translateY(-2px);
        }
        .mcv-card:hover .mcv-edit-btn { opacity: 1; }

        .mcv-img-wrap {
          position: relative;
          width: 100%;
          padding-top: 56.25%;
          background: #fff2e2;
          flex-shrink: 0;
          overflow: hidden;
        }
        .mcv-img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .mcv-img-placeholder {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .mcv-avail-dot {
          position: absolute;
          top: 12px;
          left: 12px;
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 4px 10px 4px 8px;
          border-radius: 100px;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 11px;
          font-weight: 700;
          backdrop-filter: blur(8px);
          letter-spacing: 0.03em;
        }
        .mcv-avail-dot-inner {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .mcv-edit-btn {
          position: absolute;
          top: 12px;
          right: 12px;
          width: 32px;
          height: 32px;
          border-radius: 10px;
          background: rgba(255,255,255,0.92);
          border: 1px solid #e7bdb7;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          opacity: 0;
          transition: opacity 0.18s ease;
          text-decoration: none;
          color: #251a07;
        }
        .mcv-edit-btn:hover { background: #fff; border-color: #bb0005; color: #bb0005; }

        .mcv-card-body {
          padding: 16px 18px 18px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          flex: 1;
        }

        .mcv-item-name {
          font-family: 'Epilogue', sans-serif;
          font-size: 17px;
          font-weight: 700;
          color: #251a07;
          line-height: 1.25;
          letter-spacing: -0.01em;
        }
        .mcv-item-desc {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 12.5px;
          color: #9c8c78;
          line-height: 1.5;
        }

        .mcv-card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 10px;
          border-top: 1px solid #f5ede6;
          margin-top: auto;
        }
        .mcv-price {
          font-family: 'Epilogue', sans-serif;
          font-size: 20px;
          font-weight: 900;
          color: #bb0005;
          letter-spacing: -0.02em;
        }

        .mcv-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 80px 24px;
          text-align: center;
          gap: 12px;
        }

        .mcv-add-btn {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          background: #bb0005;
          color: #fff;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 14px;
          font-weight: 600;
          padding: 10px 20px;
          border-radius: 100px;
          text-decoration: none;
          transition: background 0.15s ease, transform 0.12s ease;
          letter-spacing: 0.01em;
        }
        .mcv-add-btn:hover { background: #e2231a; transform: scale(1.02); }
        .mcv-add-btn:active { transform: scale(0.97); }

        /* Estilos de Edición Rápida en Tarjetas */
        .mcv-card-editing:hover {
          box-shadow: none;
          transform: none;
        }

        .mcv-img-upload-overlay {
          position: absolute;
          inset: 0;
          background: rgba(37, 26, 7, 0.45);
          backdrop-filter: blur(2px);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          opacity: 0;
          transition: opacity 0.2s ease;
        }
        .mcv-img-wrap:hover .mcv-img-upload-overlay,
        .mcv-img-wrap:focus-within .mcv-img-upload-overlay {
          opacity: 1;
        }

        .mcv-upload-label {
          background: #fff;
          color: #251a07;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 11px;
          font-weight: 600;
          padding: 6px 10px;
          border-radius: 6px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s ease;
          border: 1px solid #ede0d8;
        }
        .mcv-upload-label:hover {
          background: #fdfbf9;
          border-color: #bb0005;
          color: #bb0005;
        }

        .mcv-remove-img-btn {
          width: 26px;
          height: 26px;
          border-radius: 6px;
          background: #fff;
          border: 1px solid #f5c5c8;
          color: #b00020;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          padding: 0;
        }
        .mcv-remove-img-btn:hover {
          background: #fdeaec;
          border-color: #b00020;
        }

        .mcv-edit-label {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 10px;
          font-weight: 600;
          color: #9c8c78;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 2px;
          display: block;
        }

        .mcv-edit-input,
        .mcv-edit-select {
          width: 100%;
          height: 32px;
          padding: 0 8px;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 13px;
          font-weight: 500;
          color: #251a07;
          background: #fff;
          border: 1.5px solid #ede0d8;
          border-radius: 6px;
          outline: none;
          transition: all 0.15s ease;
        }
        .mcv-edit-input:focus,
        .mcv-edit-select:focus {
          border-color: #bb0005;
          box-shadow: 0 0 0 3px rgba(187, 0, 5, 0.05);
        }

        .mcv-edit-price-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }
        .mcv-edit-price-prefix {
          position: absolute;
          left: 8px;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 13px;
          color: #9c8c78;
          font-weight: 500;
          pointer-events: none;
        }
        .mcv-edit-price-input {
          width: 100%;
          height: 32px;
          padding: 0 8px 0 18px;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 13px;
          font-weight: 600;
          color: #bb0005;
          background: #fff;
          border: 1.5px solid #ede0d8;
          border-radius: 6px;
          outline: none;
          transition: all 0.15s ease;
        }
        .mcv-edit-price-input:focus {
          border-color: #bb0005;
          box-shadow: 0 0 0 3px rgba(187, 0, 5, 0.05);
        }

        .mcv-edit-price-bs {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 11px;
          color: #9c8c78;
          margin-top: 2px;
          font-weight: 500;
        }

        .mcv-edit-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #fff;
          border: 1px solid #e0d5cc;
          padding: 4px 6px 4px 8px;
          border-radius: 8px;
          margin-right: 4px;
          margin-bottom: 4px;
          color: #251a07;
          max-width: 100%;
          box-shadow: 0 1px 2px rgba(37, 26, 7, 0.02);
        }

        .mcv-chip-name {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 12px;
          font-weight: 600;
          color: #251a07;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 100px;
        }

        .mcv-chip-removable-toggle {
          border: 1px solid #e0d5cc;
          background: #fdf8f3;
          color: #9c8c78;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 10px;
          font-weight: 700;
          padding: 0 6px;
          height: 20px;
          border-radius: 5px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 3px;
          transition: all 0.15s ease;
        }
        .mcv-chip-removable-toggle.active {
          background: #eaf7f0;
          border-color: #86efac;
          color: #1a7a45;
        }
        .mcv-chip-removable-toggle:hover {
          border-color: #bb0005;
          color: #bb0005;
          background: #fff;
        }

        .mcv-chip-remove {
          border: none;
          background: transparent;
          color: #c4b09a;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          transition: all 0.15s ease;
        }
        .mcv-chip-remove:hover {
          background: #fdeaec;
          color: #b00020;
        }

        .mcv-action-btn {
          flex: 1;
          height: 32px;
          border-radius: 6px;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: none;
        }
        .mcv-btn-secondary {
          background: transparent;
          border: 1px solid #ede0d8;
          color: #9c8c78;
        }
        .mcv-btn-secondary:hover:not(:disabled) {
          border-color: #251a07;
          color: #251a07;
        }
        .mcv-btn-primary {
          background: #bb0005;
          color: #fff;
        }
        .mcv-btn-primary:hover:not(:disabled) {
          background: #e2231a;
        }
        .mcv-action-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .mcv-card-error {
          background: #fdeaec;
          border: 1px solid #f5c5c8;
          color: #b00020;
          padding: 6px 8px;
          border-radius: 6px;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 11px;
          line-height: 1.3;
        }

        .mcv-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: mcv-spin 0.8s linear infinite;
        }
        @keyframes mcv-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div className="mcv" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", minHeight: "100vh" }}>

        {/* ── Page header ── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
          <div>
            <h1 style={{
              fontFamily: "'Epilogue', sans-serif",
              fontSize: 34, fontWeight: 900, color: "#251a07",
              letterSpacing: "-0.03em", margin: 0, lineHeight: 1.1,
            }}>
              Menú
            </h1>
            <p style={{ fontSize: 14, color: "#9c8c78", margin: "6px 0 0", fontWeight: 500 }}>
              {items.length} {items.length === 1 ? "item" : "items"} · {categoryNames.length} {categoryNames.length === 1 ? "categoría" : "categorías"}
            </p>
          </div>
          <Link href="/admin/catalogo/new" className="mcv-add-btn">
            <Plus size={15} />
            Nuevo item
          </Link>
        </div>

        {/* ── Stats bar ── */}
        {items.length > 0 && (
          <div style={{ display: "flex", gap: 12, marginBottom: 28, flexWrap: "wrap" }}>
            <div className="mcv-stat-card">
              <span className="mcv-stat-label">Total items</span>
              <span className="mcv-stat-value">{stats.total}</span>
            </div>
            <div className="mcv-stat-card">
              <span className="mcv-stat-label">Disponibles</span>
              <span className="mcv-stat-value" style={{ color: "#1a7a45" }}>{stats.available}</span>
            </div>
            <div className="mcv-stat-card">
              <span className="mcv-stat-label">Margen promedio</span>
              <span className="mcv-stat-value" style={{ color: stats.avgMargin !== null && stats.avgMargin < 20 ? "#b00020" : stats.avgMargin !== null && stats.avgMargin < 40 ? "#9a5e00" : "#1a7a45" }}>
                {stats.avgMargin !== null ? `${stats.avgMargin}%` : "—"}
              </span>
            </div>
            <div className="mcv-stat-card">
              <span className="mcv-stat-label">Categorías</span>
              <span className="mcv-stat-value" style={{ color: "#251a07" }}>{categoryNames.length}</span>
            </div>
          </div>
        )}

        {/* ── Search bar ── */}
        <div className="mcv-search-container">
          <Search size={18} className="mcv-search-icon" />
          <input
            type="text"
            className="mcv-search-input"
            placeholder="Buscar por nombre o descripción..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              className="mcv-search-clear"
              onClick={() => setSearch("")}
              title="Limpiar búsqueda"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* ── Category filter pills ── */}
        {categoryNames.length > 1 && (
          <div style={{
            display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8,
            padding: "12px 0", borderTop: "1px solid #f0e6df",
          }}>
            <button
              className={`mcv-pill ${activeCategory === "all" ? "mcv-pill-active" : "mcv-pill-inactive"}`}
              onClick={() => setActiveCategory("all")}
            >
              Todos
              <span style={{
                marginLeft: 6, fontSize: 11, fontWeight: 700, opacity: 0.7,
              }}>{items.length}</span>
            </button>
            {categoryNames.map((cat) => (
              <button
                key={cat}
                className={`mcv-pill ${activeCategory === cat ? "mcv-pill-active" : "mcv-pill-inactive"}`}
                style={activeCategory === cat ? { background: catColorMap[cat], borderColor: catColorMap[cat] } : {}}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
                <span style={{
                  marginLeft: 6, fontSize: 11, fontWeight: 700,
                  opacity: activeCategory === cat ? 0.75 : 0.55,
                }}>{items.filter((i) => i.categoryName === cat).length}</span>
              </button>
            ))}
          </div>
        )}

        {/* ── Empty state ── */}
        {items.length === 0 && (
          <div style={{ background: "#fff", border: "1px solid #f0e6df", borderRadius: 20 }}>
            <div className="mcv-empty">
              <div style={{
                width: 56, height: 56, borderRadius: 16,
                background: "#fff2e2",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <ImageIcon size={24} color="#c87800" />
              </div>
              <p style={{
                fontFamily: "'Epilogue', sans-serif",
                fontSize: 20, fontWeight: 900, color: "#251a07",
                margin: 0, letterSpacing: "-0.02em",
              }}>
                Menú vacío
              </p>
              <p style={{ fontSize: 13, color: "#9c8c78", margin: 0, maxWidth: 260 }}>
                Agrega tu primer plato para comenzar a recibir pedidos
              </p>
              <Link href="/admin/catalogo/new" className="mcv-add-btn" style={{ marginTop: 8 }}>
                <Plus size={14} />
                Agregar item
              </Link>
            </div>
          </div>
        )}

        {/* ── Category sections ── */}
        {Object.entries(grouped).map(([cat, catItems]) => (
          <section key={cat}>
            {/* Category header — only shown in "all" view with multiple categories */}
            {activeCategory === "all" && categoryNames.length > 1 && (
              <div className="mcv-category-header">
                <span
                  className="mcv-category-name"
                  style={{ color: catColorMap[cat] }}
                >
                  {cat}
                </span>
                <span className="mcv-category-count">
                  {catItems.length} {catItems.length === 1 ? "item" : "items"}
                </span>
                <div
                  className="mcv-category-bar"
                  style={{ background: catColorMap[cat] }}
                />
              </div>
            )}

            {/* Items grid */}
            <div className="mcv-grid">
              {catItems.map((item) => (
                <CatalogItemCard
                  key={item.id}
                  item={item}
                  categories={categories}
                  availableContornos={availableContornos}
                  exchangeRate={exchangeRate}
                  onUpdateSuccess={() => router.refresh()}
                />
              ))}
            </div>
          </section>
        ))}

      </div>
    </>
  );
}