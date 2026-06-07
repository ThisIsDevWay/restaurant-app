"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Plus, Image as ImageIcon, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import CatalogItemCard from "./CatalogItemCard";
import MenuCatalogStyles from "./MenuCatalogStyles";

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
      <MenuCatalogStyles />

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