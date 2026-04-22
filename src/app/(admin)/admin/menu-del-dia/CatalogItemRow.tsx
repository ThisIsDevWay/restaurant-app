"use client";

import Image from "next/image";
import { formatRef } from "@/lib/money";
import type { CatalogItem } from "@/app/(admin)/admin/menu-del-dia/DailyMenu.types";

interface CatalogItemRowProps {
  item: CatalogItem;
  isOn: boolean;
  onToggle: (id: string) => void;
}

export function CatalogItemRow({ item, isOn, onToggle }: CatalogItemRowProps) {
  return (
    <button
      onClick={() => onToggle(item.id)}
      style={{
        display: "flex", width: "100%", alignItems: "center", gap: 10,
        padding: "9px 12px",
        background: isOn ? "#fff" : "#fff8f3",
        border: `1.5px solid ${isOn ? "#bb0005" : "#ede0d8"}`,
        borderRadius: 12,
        cursor: "pointer", textAlign: "left",
        transition: "all 0.13s ease",
        outline: "none",
      }}
      onMouseEnter={(e) => {
        if (!isOn) (e.currentTarget as HTMLButtonElement).style.borderColor = "#d4a99f";
      }}
      onMouseLeave={(e) => {
        if (!isOn) (e.currentTarget as HTMLButtonElement).style.borderColor = "#ede0d8";
      }}
    >
      {/* Checkbox */}
      <div style={{
        width: 18, height: 18, borderRadius: 6, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: isOn ? "#bb0005" : "#fff",
        border: `2px solid ${isOn ? "#bb0005" : "#d4c5bc"}`,
        transition: "all 0.13s ease",
      }}>
        {isOn && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>

      {/* Image */}
      {item.imageUrl ? (
        <Image
          src={item.imageUrl}
          alt={item.name}
          width={36}
          height={36}
          style={{
            width: 36, height: 36, borderRadius: 8,
            objectFit: "cover", flexShrink: 0,
            border: "1px solid #f0e6df",
          }}
        />
      ) : (
        <div style={{
          width: 36, height: 36, borderRadius: 8, flexShrink: 0,
          background: "#fff2e2", border: "1px solid #f0e6df",
        }} />
      )}

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 13, fontWeight: 600,
          color: isOn ? "#bb0005" : "#251a07",
          margin: 0, overflow: "hidden",
          textOverflow: "ellipsis", whiteSpace: "nowrap",
          transition: "color 0.13s ease",
        }}>
          {item.name}
        </p>
        <p style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 11, fontWeight: 600,
          color: "#1a7a45", margin: "2px 0 0",
        }}>
          {formatRef(item.priceUsdCents)}
        </p>
      </div>
    </button>
  );
}