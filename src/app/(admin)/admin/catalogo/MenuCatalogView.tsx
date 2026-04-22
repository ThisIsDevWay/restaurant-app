"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Plus, Pencil, Image as ImageIcon, AlertTriangle } from "lucide-react";

interface MenuItem {
  id: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  categoryName: string;
  priceUsdCents: number;
  costUsdCents: number | null;
  costUpdatedAt?: string | Date | null;
  isAvailable: boolean;
}

interface MenuCatalogViewProps {
  items: MenuItem[];
}

function formatRef(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
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

const CATEGORY_COLORS: string[] = [
  "#bb0005", "#1a6b3a", "#0d5a8a", "#7b3fa0", "#b56000", "#1a5c6e",
];

export default function MenuCatalogView({ items }: MenuCatalogViewProps) {
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const categories = useMemo(() => {
    const order: string[] = [];
    items.forEach((i) => { if (!order.includes(i.categoryName)) order.push(i.categoryName); });
    return order;
  }, [items]);

  const grouped = useMemo(() => {
    const cats = activeCategory === "all" ? categories : [activeCategory];
    return cats.reduce<Record<string, MenuItem[]>>((acc, cat) => {
      acc[cat] = items.filter((i) => i.categoryName === cat);
      return acc;
    }, {});
  }, [activeCategory, categories, items]);

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
    categories.forEach((c, i) => { m[c] = CATEGORY_COLORS[i % CATEGORY_COLORS.length]; });
    return m;
  }, [categories]);

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
              {items.length} {items.length === 1 ? "item" : "items"} · {categories.length} {categories.length === 1 ? "categoría" : "categorías"}
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
              <span className="mcv-stat-value" style={{ color: "#251a07" }}>{categories.length}</span>
            </div>
          </div>
        )}

        {/* ── Category filter pills ── */}
        {categories.length > 1 && (
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
            {categories.map((cat) => (
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
            {activeCategory === "all" && categories.length > 1 && (
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
                <article key={item.id} className="mcv-card">

                  {/* Image */}
                  <div className="mcv-img-wrap">
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.imageUrl} alt={item.name} className="mcv-img" />
                    ) : (
                      <div className="mcv-img-placeholder">
                        <ImageIcon size={28} color="#c4b09a" />
                      </div>
                    )}

                    {/* Availability badge */}
                    <div
                      className="mcv-avail-dot"
                      style={{
                        background: item.isAvailable
                          ? "rgba(234,247,240,0.92)"
                          : "rgba(253,234,236,0.92)",
                        color: item.isAvailable ? "#1a7a45" : "#b00020",
                      }}
                    >
                      <span
                        className="mcv-avail-dot-inner"
                        style={{ background: item.isAvailable ? "#1a7a45" : "#b00020" }}
                      />
                      {item.isAvailable ? "Disponible" : "Agotado"}
                    </div>

                    {/* Edit button */}
                    <Link
                      href={`/admin/catalogo/${item.id}/edit`}
                      className="mcv-edit-btn"
                      title="Editar"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Pencil size={14} />
                    </Link>
                  </div>

                  {/* Card body */}
                  <div className="mcv-card-body">
                    <div>
                      <p className="mcv-item-name">{item.name}</p>
                      {item.description && (
                        <p className="mcv-item-desc">{item.description}</p>
                      )}
                    </div>

                    <div className="mcv-card-footer">
                      <span className="mcv-price">{formatRef(item.priceUsdCents)}</span>
                      <MarginBadge item={item} />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}

      </div>
    </>
  );
}