"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { formatOrderDate, formatRate } from "@/lib/utils";
import { formatProvider } from "@/lib/payments/format-provider";
import { OrderModeChip } from "./OrderModeChip";
import {
  Phone,
  CreditCard,
  MapPin,
  ExternalLink,
  CheckCircle2,
  XCircle,
  AlertCircle,
  TrendingUp,
  ZoomIn,
  X,
} from "lucide-react";

/* ─────────────────────────────────────────────
   TYPES
───────────────────────────────────────────── */
type PaymentLog = {
  id: string;
  providerId: string;
  amountBsCents: number;
  reference: string | null;
  senderPhone: string | null;
  outcome: "confirmed" | "rejected" | "manual";
  createdAt: Date;
};

type OrderData = {
  customerPhone: string;
  paymentMethod: string;
  paymentProvider: string;
  paymentReference: string | null;
  rateSnapshotBsPerUsd: string;
  orderMode: string;
  deliveryAddress?: string | null;
  gpsCoords?: { lat: number; lng: number; accuracy: number } | null;
  comprobanteUrl?: string | null;
};

/* ─────────────────────────────────────────────
   OUTCOME BADGE
───────────────────────────────────────────── */
function OutcomeBadge({ outcome }: { outcome: PaymentLog["outcome"] }) {
  const config = {
    confirmed: {
      icon: CheckCircle2,
      label: "Confirmado",
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      dot: "bg-emerald-500",
    },
    manual: {
      icon: AlertCircle,
      label: "Manual",
      bg: "bg-amber-50",
      text: "text-amber-700",
      dot: "bg-amber-400",
    },
    rejected: {
      icon: XCircle,
      label: "Rechazado",
      bg: "bg-red-50",
      text: "text-red-600",
      dot: "bg-red-500",
    },
  }[outcome];

  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase",
        config.bg,
        config.text
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", config.dot)} />
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

/* ─────────────────────────────────────────────
   COMPROBANTE LIGHTBOX
───────────────────────────────────────────── */
function ComprobanteLightbox({
  url,
  onClose,
}: {
  url: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-end p-4 bg-black/40"
      onClick={onClose}
    >
      <div
        className="relative h-[92vh] max-w-xl w-full rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.3)] bg-white animate-in slide-in-from-right duration-500 ease-out"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-900 transition-all active:scale-90"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="w-full h-full p-8 flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt="Comprobante de pago"
            className="block w-auto h-auto max-w-full max-h-full object-contain"
          />
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   DATA ROW
───────────────────────────────────────────── */
function DataRow({
  label,
  value,
  accent,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  accent?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-2.5 border-b border-[#fff2e2] last:border-0">
      <dt className="text-[11px] font-medium text-[#9e8e7e] shrink-0 mt-0.5 uppercase tracking-wide">
        {label}
      </dt>
      <dd
        className={cn(
          "text-right",
          accent
            ? "text-[#bb0005] font-bold text-sm font-mono"
            : mono
            ? "text-xs font-mono font-semibold text-[#251a07]"
            : "text-sm font-semibold text-[#251a07]"
        )}
      >
        {value}
      </dd>
    </div>
  );
}

/* ─────────────────────────────────────────────
   SECTION LABEL
───────────────────────────────────────────── */
function SectionLabel({
  children,
  icon: Icon,
}: {
  children: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      {Icon && (
        <span className="w-5 h-5 rounded-md bg-[#bb0005]/10 flex items-center justify-center shrink-0">
          <Icon className="w-2.5 h-2.5 text-[#bb0005]" />
        </span>
      )}
      <span
        className="text-[10px] font-black uppercase tracking-[0.15em] text-[#bb0005]"
        style={{ fontFamily: "'Epilogue', sans-serif" }}
      >
        {children}
      </span>
      <span className="flex-1 h-px bg-gradient-to-r from-[#bb0005]/20 to-transparent" />
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
export function OrderPaymentPanel({
  order,
  latestLog,
}: {
  order: OrderData;
  latestLog: PaymentLog | null;
}) {
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const mapsUrl = order.gpsCoords
    ? `https://maps.google.com/?q=${order.gpsCoords.lat},${order.gpsCoords.lng}`
    : null;

  return (
    <>
      {/* ── LIGHTBOX ── */}
      {lightboxOpen && order.comprobanteUrl && (
        <ComprobanteLightbox
          url={order.comprobanteUrl}
          onClose={() => setLightboxOpen(false)}
        />
      )}

      {/*
       * CARD CONTAINER
       * Heritage Editorial: no border lines, depth through tonal layering.
       * Surface sits on surface-container-low via ambient shadow only.
       */}
      <div
        className="sticky top-4 rounded-2xl overflow-hidden"
        style={{
          background: "#ffffff",
          boxShadow:
            "0 8px 32px rgba(37,26,7,0.06), 0 2px 8px rgba(37,26,7,0.04)",
        }}
      >

        {/* ── HERO HEADER: Heritage Red ── */}
        <div
          className="relative px-5 py-5 overflow-hidden"
          style={{
            background: "linear-gradient(160deg, #bb0005 0%, #e2231a 100%)",
          }}
        >
          {/* Decorative grain texture */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
            }}
          />

          {/* Decorative circle */}
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/5" />
          <div className="absolute -bottom-6 -left-6 w-20 h-20 rounded-full bg-black/10" />

          <div className="relative z-10">
            {/* Mode chip */}
            <OrderModeChip
              mode={order.orderMode}
              className="py-1 px-3 text-[10px] font-bold bg-white/20 text-white border-white/30 backdrop-blur-sm mb-3"
            />

            {/* Phone number — hero typography */}
            <p
              className="text-white/60 text-[10px] font-bold uppercase tracking-widest mb-0.5"
              style={{ fontFamily: "'Epilogue', sans-serif" }}
            >
              Cliente
            </p>
            <div className="flex items-center justify-between gap-2">
              <span
                className="text-white font-black tracking-tight leading-none"
                style={{
                  fontFamily: "'Epilogue', sans-serif",
                  fontSize: "clamp(1.1rem, 3vw, 1.35rem)",
                }}
              >
                {order.customerPhone}
              </span>
              <a
                href={`tel:${order.customerPhone}`}
                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-[10px] font-bold tracking-wider uppercase transition-all hover:scale-105 active:scale-95 backdrop-blur-sm border border-white/20"
              >
                <Phone className="w-3 h-3" />
                Llamar
              </a>
            </div>
          </div>
        </div>

        {/* ── GPS + ADDRESS STRIP ── */}
        {(mapsUrl || order.deliveryAddress) && (
          <div
            className="px-5 py-4 space-y-3"
            style={{ background: "#fff8f3" }}
          >
            {mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-white hover:bg-[#bb0005] transition-all duration-300 hover:shadow-md active:scale-[0.98]"
                style={{
                  boxShadow: "0 1px 4px rgba(37,26,7,0.06)",
                }}
              >
                <span className="w-7 h-7 rounded-lg bg-[#bb0005]/10 group-hover:bg-white/20 flex items-center justify-center transition-colors shrink-0">
                  <MapPin className="w-3.5 h-3.5 text-[#bb0005] group-hover:text-white transition-colors" />
                </span>
                <span className="flex-1 text-xs font-bold text-[#251a07] group-hover:text-white transition-colors">
                  Ver ubicación GPS
                </span>
                <ExternalLink className="w-3 h-3 text-[#9e8e7e] group-hover:text-white/70 transition-colors" />
              </a>
            )}

            {order.deliveryAddress && (
              <div className="px-3.5 py-3 rounded-xl bg-white"
                style={{ boxShadow: "0 1px 4px rgba(37,26,7,0.06)" }}
              >
                <p className="text-[10px] font-black uppercase tracking-widest text-[#9e8e7e] mb-1.5"
                  style={{ fontFamily: "'Epilogue', sans-serif" }}>
                  Dirección de entrega
                </p>
                <p className="text-xs text-[#251a07] leading-relaxed font-medium">
                  {order.deliveryAddress}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── COMPROBANTE ── */}
        {order.comprobanteUrl && (
          <div
            className="px-5 pb-4"
            style={{ background: mapsUrl || order.deliveryAddress ? "#fff8f3" : "#fff8f3" }}
          >
            <SectionLabel>Comprobante de Pago</SectionLabel>
            <button
              onClick={() => setLightboxOpen(true)}
              className="group relative w-full rounded-2xl overflow-hidden cursor-zoom-in transition-all duration-300 hover:shadow-lg active:scale-[0.98]"
              style={{
                background: "#f5f0ea",
                boxShadow: "0 2px 12px rgba(37,26,7,0.1)",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={order.comprobanteUrl}
                alt="Comprobante de pago"
                className="w-full h-auto block object-contain transition-transform duration-500 group-hover:scale-[1.02]"
                style={{ maxHeight: "70vh" }}
              />
              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/90 backdrop-blur-sm text-[11px] font-black uppercase tracking-wider text-[#251a07] shadow-lg"
                  style={{ fontFamily: "'Epilogue', sans-serif" }}>
                  <ZoomIn className="w-3.5 h-3.5" />
                  Ampliar
                </span>
              </div>
            </button>
          </div>
        )}

        {/* ── PAYMENT INFO ── */}
        <div className="px-5 pt-5 pb-4" style={{ background: "#ffffff" }}>
          <SectionLabel icon={CreditCard}>Información de Pago</SectionLabel>

          <dl className="divide-y-0">
            <DataRow
              label="Método"
              value={formatProvider(order.paymentProvider)}
            />
            {order.paymentReference && (
              <DataRow
                label="Referencia"
                value={order.paymentReference}
                accent
                mono
              />
            )}
            {latestLog && (
              <>
                <DataRow
                  label="Estado red"
                  value={<OutcomeBadge outcome={latestLog.outcome} />}
                />
                <DataRow
                  label="Verificado"
                  value={
                    <span className="text-[11px] text-[#9e8e7e]">
                      {formatOrderDate(latestLog.createdAt)}
                    </span>
                  }
                />
              </>
            )}
          </dl>
        </div>

        {/* ── EXCHANGE RATE FOOTER ── */}
        {order.rateSnapshotBsPerUsd && (
          <div
            className="mx-4 mb-4 px-4 py-3 rounded-xl flex items-center justify-between"
            style={{
              background: "linear-gradient(135deg, #fff2e2 0%, #fff8f3 100%)",
            }}
          >
            <div className="flex items-center gap-2.5">
              <span
                className="w-6 h-6 rounded-lg flex items-center justify-center"
                style={{ background: "#bb0005" }}
              >
                <TrendingUp className="w-3 h-3 text-white" />
              </span>
              <span
                className="text-[10px] font-black uppercase tracking-widest text-[#9e8e7e]"
                style={{ fontFamily: "'Epilogue', sans-serif" }}
              >
                Tasa BCV
              </span>
            </div>
            <span
              className="text-sm font-black text-[#251a07]"
              style={{ fontFamily: "'Epilogue', sans-serif" }}
            >
              Bs.{" "}
              <span className="text-[#bb0005]">
                {formatRate(order.rateSnapshotBsPerUsd)}
              </span>
            </span>
          </div>
        )}
      </div>
    </>
  );
}