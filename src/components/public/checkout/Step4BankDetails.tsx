"use client";

import { useState, useEffect } from "react";
import { Copy, Check, Clock, ExternalLink, Banknote, Building2, Phone, BadgeInfo, Mail, User } from "lucide-react";
import { useKeyboardOpen } from "@/hooks/useKeyboardOpen";
import { formatBs, formatRef } from "@/lib/money";
import { cn } from "@/lib/utils";
import { ReferenceEntry } from "./ReferenceEntry";
import { ComprobanteUpload } from "./ComprobanteUpload";
import { useComprobanteUpload } from "@/hooks/useComprobanteUpload";
import type { PaymentInitResult, BankDetails } from "@/lib/payment-providers/types";
import { buildPagoMovilClipboard } from "@/lib/clipboard-pago-movil";

interface Step4BankDetailsProps {
  orderId: string;
  checkoutToken: string;
  expiresAt: string | null;
  initResult: PaymentInitResult;
  grandTotalBsCents: number;
  grandTotalUsdCents: number;
  onConfirmed: () => void;
  onExpired?: () => void;
  onError: (msg: string) => void;
  onFallbackWhatsApp: () => void;
  paymentMethod: string | null;
  fallbackBankDetails?: BankDetails | null;
  cashAmountUsd?: string | null;
  acceptChangeBs?: boolean | null;
  activeProviderId?: string;
}

export function Step4BankDetails({
  orderId,
  checkoutToken,
  expiresAt,
  initResult,
  grandTotalBsCents,
  grandTotalUsdCents,
  onConfirmed,
  onExpired,
  onError,
  onFallbackWhatsApp,
  paymentMethod,
  fallbackBankDetails,
  cashAmountUsd,
  acceptChangeBs,
  activeProviderId,
}: Step4BankDetailsProps) {
  const [amountCopied, setAmountCopied] = useState(false);
  const { isKeyboardOpen, keyboardHeight } = useKeyboardOpen();

  const screen = initResult.screen;

  // Display mode driven by paymentMethod — never derived from bankDetails structure
  const isEfectivo = paymentMethod === "efectivo";
  const isZelle = paymentMethod === "zelle";
  const isBinance = paymentMethod === "binance";
  const isTransferBs = paymentMethod === "transfer";
  const isPagoMovil = !paymentMethod || paymentMethod === "pago_movil";
  const isUsdPayment = isZelle || isBinance || isEfectivo;
  const primaryCurrency = isUsdPayment ? "USD" : "Bs";

  // bankDetails: from initResult for enter_reference/waiting_auto; fallback for whatsapp screen
  const bankDetails: BankDetails | null =
    screen === "enter_reference" || screen === "waiting_auto"
      ? (initResult as any).bankDetails ?? fallbackBankDetails ?? null
      : fallbackBankDetails ?? null;

  // Countdown
  const [secondsLeft, setSecondsLeft] = useState(() =>
    expiresAt
      ? Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))
      : 0
  );

  useEffect(() => {
    if (!expiresAt || secondsLeft <= 0) return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onExpired?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, secondsLeft, onExpired]);

  const [detailsCopied, setDetailsCopied] = useState(false);

  const safeCopy = (value: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(value).catch(() => {
          fallbackCopy(value);
        });
      } else {
        fallbackCopy(value);
      }
    } catch {
      fallbackCopy(value);
    }
  };

  const fallbackCopy = (value: string) => {
    const ta = document.createElement("textarea");
    ta.value = value;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    ta.style.top = "-9999px";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  };

  const copyAllDetails = () => {
    if (!bankDetails) return;
    let text = "";

    if (isPagoMovil) {
      text = buildPagoMovilClipboard({
        bankName: bankDetails.bankName,
        bankCode: bankDetails.bankCode,
        phone: bankDetails.accountPhone,
        rifOrCedula: bankDetails.accountRif,
        amountBsCents: grandTotalBsCents,
      });
    } else if (isTransferBs) {
      text = [
        bankDetails.transferBankName ? `Banco: ${bankDetails.transferBankName}` : "",
        bankDetails.transferAccountName ? `Titular: ${bankDetails.transferAccountName}` : "",
        bankDetails.transferAccountNumber ? `Cuenta: ${bankDetails.transferAccountNumber}` : "",
        bankDetails.transferAccountRif ? `RIF: ${bankDetails.transferAccountRif}` : "",
        `Monto: ${formatBs(grandTotalBsCents)}`,
      ].filter(Boolean).join("\n");
    } else if (isZelle) {
      const email = bankDetails.zelleEmail || bankDetails.transferAccountNumber || "";
      const name = bankDetails.zelleName || bankDetails.transferAccountName || "";
      text = [
        `Zelle Correo: ${email}`,
        `Titular: ${name}`,
        `Monto: ${formatRef(grandTotalUsdCents)}`,
      ].filter(Boolean).join("\n");
    } else if (isBinance) {
      const payId = bankDetails.binancePayId || bankDetails.transferAccountNumber || "";
      const email = bankDetails.binanceEmail || bankDetails.transferAccountName || "";
      text = [
        `Binance Pay ID: ${payId}`,
        `Correo/Teléfono: ${email}`,
        `Monto: ${formatRef(grandTotalUsdCents)}`,
      ].filter(Boolean).join("\n");
    }

    if (text) {
      safeCopy(text);
      setDetailsCopied(true);
      setTimeout(() => setDetailsCopied(false), 2000);
    }
  };

  const upload = useComprobanteUpload({ orderId });

  const copyAmount = () => {
    const raw = isUsdPayment
      ? (grandTotalUsdCents / 100).toFixed(2).replace(".", ",")
      : (grandTotalBsCents / 100).toFixed(2).replace(".", ",");
    safeCopy(raw);
    setAmountCopied(true);
    setTimeout(() => setAmountCopied(false), 1800);
  };

  // Section title
  const sectionTitle = isZelle
    ? "Datos de Zelle"
    : isBinance
      ? "Datos de Binance Pay"
      : isEfectivo
        ? "Pago en Efectivo"
        : isTransferBs
          ? "Datos de Transferencia"
          : "Datos de Pago Móvil";

  const isAutoVerificationActive =
    (isPagoMovil || isTransferBs) &&
    (activeProviderId === "local_notifications" || activeProviderId === "pabilo_notifications");

  return (
    <div
      className="flex flex-col gap-4"
      style={{
        paddingBottom: `calc(${isKeyboardOpen ? keyboardHeight : 0}px + env(safe-area-inset-bottom))`
      }}
    >
      {/* Compact Hero Card */}
      <div
        className="rounded-[16px] p-3.5 text-white flex flex-col items-center justify-center text-center select-none shadow-sm relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #1f1609 0%, #2f251d 100%)",
          minHeight: "100px",
        }}
      >
        <p className="font-display text-[26px] font-bold leading-tight tabular-nums">
          {isUsdPayment ? formatRef(grandTotalUsdCents) : formatBs(grandTotalBsCents)}
        </p>
        <p className="font-sans text-[12px] text-white/60 font-medium tabular-nums mt-0.5">
          {isUsdPayment
            ? `≈ ${formatBs(grandTotalBsCents)}`
            : `≈ ${formatRef(grandTotalUsdCents)}`}
        </p>

        {!isEfectivo && (
          <p className="text-[10px] text-yellow-300 font-sans font-bold mt-1.5 uppercase tracking-wider">
            Transferir monto exacto con céntimos
          </p>
        )}

        {expiresAt && (
          <div
            className={cn(
              "mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold transition-colors",
              secondsLeft === 0
                ? "text-primary animate-pulse"
                : secondsLeft < 300
                ? "text-yellow-300 animate-pulse"
                : "text-white/50"
            )}
          >
            <Clock className="w-3 h-3" />
            <span>
              {secondsLeft === 0
                ? "Pedido expirado"
                : secondsLeft < 300
                ? `¡Expira pronto! ${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}`
                : `Expira en ${Math.floor(secondsLeft / 60)} min`}
            </span>
          </div>
        )}
      </div>

      {/* Simple Auto-Verification Banner */}
      {isAutoVerificationActive && (
        <div className="flex items-center justify-center gap-2 py-2 px-3 bg-success/5 border border-success/15 rounded-[12px] text-success font-sans text-[12px] font-semibold animate-in fade-in duration-300 w-full select-none leading-none">
          <span className="h-2 w-2 animate-pulse rounded-full bg-success shadow-[0_0_6px_rgba(34,197,94,0.6)] shrink-0" />
          <span>Verificación automática activa.</span>
        </div>
      )}

      {/* ── Efectivo: instrucción + preferencias del cliente ── */}
      {isEfectivo && (
        <div className="flex flex-col gap-2.5">
          <div className="bg-[#E8EFE3] rounded-[16px] p-4 flex items-start gap-3 border border-[rgba(63,107,74,0.25)]">
            <div className="w-10 h-10 rounded-[12px] bg-[#3F6B4A] flex items-center justify-center shrink-0">
              <Banknote className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-sans text-[13px] font-bold text-[#3F6B4A]">
                Paga en efectivo al recibir
              </p>
              <p className="font-sans text-[12px] text-[#3F6B4A]/70 mt-0.5 leading-snug">
                Ten el monto en USD listo. El cobrador lo gestionará contigo.
              </p>
            </div>
          </div>

          {/* Preferencias indicadas por el cliente */}
          {(cashAmountUsd || acceptChangeBs !== null && acceptChangeBs !== undefined) && (
            <div className="rounded-[14px] border border-border/50 bg-bg-card divide-y divide-border/40 overflow-hidden">
              {cashAmountUsd && (
                <div className="flex items-center justify-between px-4 py-3">
                  <p className="font-sans text-[11px] uppercase tracking-[0.1em] text-text-muted">
                    Paga con
                  </p>
                  <p className="font-sans text-[14px] font-bold text-text-main tabular-nums">
                    USD {parseFloat(cashAmountUsd).toFixed(2)}
                  </p>
                </div>
              )}
              {acceptChangeBs !== null && acceptChangeBs !== undefined && (
                <div className="flex items-center justify-between px-4 py-3">
                  <p className="font-sans text-[11px] uppercase tracking-[0.1em] text-text-muted">
                    Vuelto en Bs
                  </p>
                  <span
                    className={cn(
                      "font-sans text-[12px] font-semibold px-2.5 py-1 rounded-full",
                      acceptChangeBs
                        ? "bg-[#E8EFE3] text-[#3F6B4A]"
                        : "bg-primary/10 text-primary"
                    )}
                  >
                    {acceptChangeBs ? "Acepta" : "Prefiere exacto"}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Datos bancarios compactados (no aplica para efectivo) ── */}
      {!isEfectivo && bankDetails && (
        <div className="bg-bg-card border border-border/60 rounded-[20px] p-5 flex flex-col gap-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-border/40 pb-2">
            <span className="font-sans text-[11px] font-bold uppercase tracking-wider text-text-muted">
              {sectionTitle}
            </span>
          </div>

          <div className="flex flex-col gap-3 font-sans text-[14px] text-text-main font-medium leading-relaxed">
            {isPagoMovil && (
              <>
                <div className="flex items-center gap-2.5">
                  <Building2 className="w-4 h-4 text-text-muted shrink-0" />
                  <span className="text-text-muted font-normal">Banco:</span>
                  <span className="font-bold">{bankDetails.bankName} ({bankDetails.bankCode})</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Phone className="w-4 h-4 text-text-muted shrink-0" />
                  <span className="text-text-muted font-normal">Teléfono:</span>
                  <span className="font-bold tabular-nums">{bankDetails.accountPhone}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <BadgeInfo className="w-4 h-4 text-text-muted shrink-0" />
                  <span className="text-text-muted font-normal">RIF / Cédula:</span>
                  <span className="font-bold uppercase tabular-nums">{bankDetails.accountRif}</span>
                </div>
              </>
            )}

            {isTransferBs && (
              <>
                {bankDetails.transferBankName && (
                  <div className="flex items-start gap-2.5">
                    <Building2 className="w-4 h-4 text-text-muted shrink-0 mt-0.5" />
                    <div className="flex flex-wrap gap-1">
                      <span className="text-text-muted font-normal">Banco:</span>
                      <span className="font-bold">{bankDetails.transferBankName}</span>
                    </div>
                  </div>
                )}
                {bankDetails.transferAccountName && (
                  <div className="flex items-start gap-2.5">
                    <User className="w-4 h-4 text-text-muted shrink-0 mt-0.5" />
                    <div className="flex flex-wrap gap-1">
                      <span className="text-text-muted font-normal">Titular:</span>
                      <span className="font-bold">{bankDetails.transferAccountName}</span>
                    </div>
                  </div>
                )}
                {bankDetails.transferAccountNumber && (
                  <div className="flex items-start gap-2.5">
                    <BadgeInfo className="w-4 h-4 text-text-muted shrink-0 mt-0.5" />
                    <div className="flex flex-col min-w-0">
                      <span className="text-text-muted font-normal text-[12px] leading-none mb-1">Número de Cuenta:</span>
                      <span className="font-bold font-mono tracking-tight text-[13px] break-all">{bankDetails.transferAccountNumber}</span>
                    </div>
                  </div>
                )}
                {bankDetails.transferAccountRif && (
                  <div className="flex items-start gap-2.5">
                    <BadgeInfo className="w-4 h-4 text-text-muted shrink-0 mt-0.5" />
                    <div className="flex flex-wrap gap-1">
                      <span className="text-text-muted font-normal">RIF / Cédula:</span>
                      <span className="font-bold uppercase tabular-nums">{bankDetails.transferAccountRif}</span>
                    </div>
                  </div>
                )}
              </>
            )}

            {isZelle && (
              <>
                {(bankDetails.zelleEmail || bankDetails.transferAccountNumber) && (
                  <div className="flex items-start gap-2.5">
                    <Mail className="w-4 h-4 text-text-muted shrink-0 mt-0.5" />
                    <div className="flex flex-col min-w-0">
                      <span className="text-text-muted font-normal text-[12px] leading-none mb-1">Correo Zelle:</span>
                      <span className="font-bold break-all">{(bankDetails.zelleEmail || bankDetails.transferAccountNumber)!}</span>
                    </div>
                  </div>
                )}
                {(bankDetails.zelleName || bankDetails.transferAccountName) && (
                  <div className="flex items-start gap-2.5">
                    <User className="w-4 h-4 text-text-muted shrink-0 mt-0.5" />
                    <div className="flex flex-wrap gap-1">
                      <span className="text-text-muted font-normal">Titular:</span>
                      <span className="font-bold">{(bankDetails.zelleName || bankDetails.transferAccountName)!}</span>
                    </div>
                  </div>
                )}
              </>
            )}

            {isBinance && (
              <>
                {(bankDetails.binancePayId || bankDetails.transferAccountNumber) && (
                  <div className="flex items-start gap-2.5">
                    <BadgeInfo className="w-4 h-4 text-text-muted shrink-0 mt-0.5" />
                    <div className="flex flex-wrap gap-1">
                      <span className="text-text-muted font-normal">Binance Pay ID:</span>
                      <span className="font-bold tabular-nums">{(bankDetails.binancePayId || bankDetails.transferAccountNumber)!}</span>
                    </div>
                  </div>
                )}
                {(bankDetails.binanceEmail || bankDetails.transferAccountName) && (
                  <div className="flex items-start gap-2.5">
                    <Mail className="w-4 h-4 text-text-muted shrink-0 mt-0.5" />
                    <div className="flex flex-col min-w-0">
                      <span className="text-text-muted font-normal text-[12px] leading-none mb-1">Correo / Teléfono:</span>
                      <span className="font-bold break-all">{(bankDetails.binanceEmail || bankDetails.transferAccountName)!}</span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Unified Copy Button */}
          <button
            onClick={copyAllDetails}
            className={cn(
              "w-full h-11 rounded-xl flex items-center justify-center gap-2 font-semibold text-sm transition-all border active:scale-[0.98]",
              detailsCopied
                ? "bg-[#E8EFE3] border-[rgba(63,107,74,0.25)] text-[#3F6B4A]"
                : "bg-surface-section border-border text-text-muted hover:text-text-main active:bg-border/60"
            )}
          >
            {detailsCopied ? (
              <>
                <Check className="w-4 h-4" strokeWidth={2.5} />
                ¡Datos copiados!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copiar datos de pago
              </>
            )}
          </button>
        </div>
      )}

      {/* ── WhatsApp screen: comprobante + enlace ── */}
      {screen === "whatsapp" && (
        <div className="flex flex-col gap-3">
          <div>
            <p className="font-sans text-[10px] uppercase tracking-[0.12em] text-text-muted pl-1 mb-2">
              {isEfectivo
                ? "Confirma tu pedido por WhatsApp"
                : isZelle || isBinance
                  ? "Sube tu comprobante de pago"
                  : "Sube tu comprobante"}
            </p>
            {!isEfectivo && (
              <ComprobanteUpload
                comprobante={upload.comprobante}
                fileInputRef={upload.fileInputRef}
                isDragging={upload.isDragging}
                handleFileSelect={upload.handleFileSelect}
                handleDrop={upload.handleDrop}
                handleDragOver={upload.handleDragOver}
                handleDragLeave={upload.handleDragLeave}
                retryUpload={upload.retryUpload}
                clearComprobante={upload.clearComprobante}
              />
            )}
          </div>

          <div className="mt-1">
            <p className="text-[11px] text-text-muted text-center leading-normal px-2">
              El restaurante coordinará el pago contigo por WhatsApp.
            </p>

            {/* Sticky/Fixed footer for the primary WhatsApp CTA button */}
            <div className="fixed bottom-0 inset-x-0 z-30 px-5 pt-3.5 pb-[calc(env(safe-area-inset-bottom)+16px)] bg-bg-app/95 backdrop-blur-xl border-t border-border flex flex-col gap-1.5">
              {(isEfectivo || upload.isReady) ? (
                <a
                  href={(initResult as any).waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    setTimeout(() => { onConfirmed(); }, 1200);
                  }}
                  className="w-full h-14 bg-[#25D366] text-white rounded-full flex items-center justify-center gap-2.5 font-semibold text-[15px] shadow-elevated active:scale-[0.98] transition-all"
                >
                  <ExternalLink className="w-5 h-5" />
                  Abrir WhatsApp
                </a>
              ) : (
                <button
                  disabled
                  className="w-full h-14 bg-border/40 text-text-muted rounded-full flex items-center justify-center gap-2.5 font-semibold text-[15px] cursor-not-allowed opacity-60 transition-all"
                >
                  <ExternalLink className="w-5 h-5 text-text-muted/50" />
                  Sube tu comprobante para continuar
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Enter reference OTP (Pago Móvil / Transfer) ── */}
      {screen === "enter_reference" && (
        <div className="mt-2">
          <p className="font-sans text-[10px] uppercase tracking-[0.12em] text-text-muted pl-1 mb-3">
            {isPagoMovil
              ? "Últimos 4 dígitos de la referencia"
              : "Número de referencia"}
          </p>
          <ReferenceEntry
            orderId={orderId}
            checkoutToken={checkoutToken}
            onConfirmed={onConfirmed}
            onExpired={onExpired}
            onError={onError}
            onFallbackWhatsApp={onFallbackWhatsApp}
            activeProviderId={activeProviderId}
          />
        </div>
      )}

      {/* ── Waiting auto ── */}
      {screen === "waiting_auto" && (
        <div className="bg-surface-section rounded-[12px] p-3 flex items-start gap-2.5">
          <div className="w-2 h-2 rounded-full bg-[#3F6B4A] animate-pulse mt-1 shrink-0" />
          <p className="font-sans text-[12px] text-text-muted">
            {isEfectivo
              ? "Tu pedido fue registrado. Realiza el pago en efectivo al recibir."
              : "Realiza el pago con los datos de arriba. La confirmación es automática."}
          </p>
        </div>
      )}
    </div>
  );
}
