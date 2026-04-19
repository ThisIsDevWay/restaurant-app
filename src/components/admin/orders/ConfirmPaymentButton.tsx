"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Loader2 } from "lucide-react";

export function ConfirmPaymentButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/confirm-manual`, {
        method: "POST",
      });
      if (res.ok) {
        setDone(true);
        setTimeout(() => router.refresh(), 600);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleConfirm}
      disabled={loading || done}
      aria-label="Confirmar pago manualmente"
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        gap: "7px",
        padding: "0 18px",
        height: "36px",
        borderRadius: "10px",
        border: "none",
        cursor: loading || done ? "not-allowed" : "pointer",
        fontFamily: "'Epilogue', sans-serif",
        fontSize: "12px",
        fontWeight: 800,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: "white",
        background: done
          ? "linear-gradient(135deg, #059669 0%, #10b981 100%)"
          : loading
          ? "linear-gradient(135deg, #bb0005 0%, #e2231a 100%)"
          : "linear-gradient(135deg, #059669 0%, #10b981 100%)",
        boxShadow: done
          ? "0 4px 14px rgba(5,150,105,0.35)"
          : loading
          ? "0 4px 14px rgba(187,0,5,0.25)"
          : "0 4px 14px rgba(5,150,105,0.30)",
        transition: "transform 0.15s, box-shadow 0.15s, background 0.3s",
        outline: "none",
        WebkitTapHighlightColor: "transparent",
        overflow: "hidden",
      }}
      onMouseEnter={(e) => {
        if (!loading && !done)
          (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.04)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
      }}
      onMouseDown={(e) => {
        if (!loading && !done)
          (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.97)";
      }}
      onMouseUp={(e) => {
        if (!loading && !done)
          (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.04)";
      }}
    >
      {/* Shimmer overlay while loading */}
      {loading && (
        <span
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(100deg, transparent 20%, rgba(255,255,255,0.18) 50%, transparent 80%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 1.2s infinite",
            borderRadius: "inherit",
          }}
        />
      )}

      {/* Icon */}
      <span
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 16,
          height: 16,
          flexShrink: 0,
          transition: "transform 0.3s",
          transform: done ? "scale(1.2)" : "scale(1)",
        }}
      >
        {loading ? (
          <Loader2
            style={{
              width: 13,
              height: 13,
              animation: "spin 0.75s linear infinite",
            }}
          />
        ) : (
          <Check style={{ width: 13, height: 13, strokeWidth: 2.8 }} />
        )}
      </span>

      {/* Label */}
      <span style={{ position: "relative", zIndex: 1, whiteSpace: "nowrap" }}>
        {done ? "¡Confirmado!" : loading ? "Confirmando..." : "Confirmar pago"}
      </span>

      {/* CSS keyframes */}
      <style>{`
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </button>
  );
}