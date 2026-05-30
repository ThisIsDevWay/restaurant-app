"use client";

import { useState } from "react";
import { Copy, Check, Clock, ExternalLink, Banknote } from "lucide-react";
import { formatBs, formatRef } from "@/lib/money";
import { cn } from "@/lib/utils";
import { CopyRow } from "./CopyButton";
import { CopyAllButton } from "./CopyAllButton";
import { ReferenceEntry } from "./ReferenceEntry";
import { ComprobanteUpload } from "./ComprobanteUpload";
import { useComprobanteUpload } from "@/hooks/useComprobanteUpload";
import type { PaymentInitResult, BankDetails } from "@/lib/payment-providers/types";

interface Step4BankDetailsProps {
  orderId: string;
  checkoutToken: string;
  expiresAt: string | null;
  initResult: PaymentInitResult;
  grandTotalBsCents: number;
  grandTotalUsdCents: number;
  onConfirmed: () => void;
  onError: (msg: string) => void;
  paymentMethod: string | null;
  fallbackBankDetails?: BankDetails | null;
  cashAmountUsd?: string | null;
  acceptChangeBs?: boolean | null;
}

export function Step4BankDetails({
  orderId,
  checkoutToken,
  expiresAt,
  initResult,
  grandTotalBsCents,
  grandTotalUsdCents,
  onConfirmed,
  onError,
  paymentMethod,
  fallbackBankDetails,
  cashAmountUsd,
  acceptChangeBs,
}: Step4BankDetailsProps) {
  const [amountCopied, setAmountCopied] = useState(false);

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

  const upload = useComprobanteUpload({ orderId });

  const copyAmount = () => {
    const raw = isUsdPayment
      ? (grandTotalUsdCents / 100).toFixed(2).replace(".", ",")
      : (grandTotalBsCents / 100).toFixed(2).replace(".", ",");
    navigator.clipboard.writeText(raw).catch(() => {});
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

  return (
    <div className="flex flex-col gap-4">
      {/* Amount hero card */}
      <div
        className="rounded-[20px] p-4 text-white"
        style={{ background: "linear-gradient(135deg,#251a07,#3A2F26)" }}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="font-sans text-[10px] uppercase tracking-[0.14em] text-white/60 mb-1">
              MONTO A PAGAR
            </p>
            <p className="font-display text-[38px] font-bold leading-none tabular-nums">
              {isUsdPayment ? formatRef(grandTotalUsdCents) : formatBs(grandTotalBsCents)}
            </p>
            <p className="font-sans text-[13px] text-white/50 mt-1 tabular-nums">
              {isUsdPayment
                ? `≈ ${formatBs(grandTotalBsCents)}`
                : `≈ ${formatRef(grandTotalUsdCents)}`}
            </p>
          </div>
          {!isEfectivo && (
            <button
              onClick={copyAmount}
              aria-label="Copiar monto"
              className={cn(
                "w-10 h-10 rounded-[12px] flex items-center justify-center transition-colors",
                amountCopied ? "bg-white/25" : "bg-white/15 backdrop-blur"
              )}
            >
              {amountCopied ? (
                <Check className="w-4 h-4" strokeWidth={2.5} />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          )}
        </div>

        {expiresAt && secondsLeft > 0 && (
          <div
            className={cn(
              "mt-3 flex items-center gap-2 text-[11px] font-semibold",
              secondsLeft < 300 ? "text-yellow-300" : "text-white/50"
            )}
          >
            <Clock className="w-3.5 h-3.5" />
            {secondsLeft < 300
              ? `¡Expira pronto! ${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}`
              : `Expira en ${Math.floor(secondsLeft / 60)} min`}
          </div>
        )}
      </div>

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
                    ${parseFloat(cashAmountUsd).toFixed(2)}
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

      {/* ── Datos bancarios (no aplica para efectivo) ── */}
      {!isEfectivo && bankDetails && (
        <div className="flex flex-col gap-2">
          <p className="font-sans text-[10px] uppercase tracking-[0.12em] text-text-muted pl-1">
            {sectionTitle}
          </p>

          {/* Pago Móvil */}
          {isPagoMovil && (
            <>
              <CopyRow
                label="Banco"
                value={`${bankDetails.bankName} (${bankDetails.bankCode})`}
              />
              <CopyRow label="Teléfono" value={bankDetails.accountPhone} />
              <CopyRow label="RIF / Cédula" value={bankDetails.accountRif} />
              <div className="mt-1">
                <CopyAllButton
                  bankName={bankDetails.bankName}
                  bankCode={bankDetails.bankCode}
                  phone={bankDetails.accountPhone}
                  rifOrCedula={bankDetails.accountRif}
                  amountBsCents={grandTotalBsCents}
                />
              </div>
            </>
          )}

          {/* Transferencia Bancaria en Bs */}
          {isTransferBs && (
            <>
              {bankDetails.transferBankName && (
                <CopyRow label="Banco de Destino" value={bankDetails.transferBankName} />
              )}
              {bankDetails.transferAccountName && (
                <CopyRow label="Titular" value={bankDetails.transferAccountName} />
              )}
              {bankDetails.transferAccountNumber && (
                <CopyRow label="Número de Cuenta" value={bankDetails.transferAccountNumber} />
              )}
              {bankDetails.transferAccountRif && (
                <CopyRow label="RIF / Cédula" value={bankDetails.transferAccountRif} />
              )}
            </>
          )}

          {/* Zelle */}
          {isZelle && (
            <>
              {(bankDetails.zelleEmail || bankDetails.transferAccountNumber) && (
                <CopyRow
                  label="Correo Zelle"
                  value={(bankDetails.zelleEmail || bankDetails.transferAccountNumber)!}
                />
              )}
              {(bankDetails.zelleName || bankDetails.transferAccountName) && (
                <CopyRow
                  label="Titular"
                  value={(bankDetails.zelleName || bankDetails.transferAccountName)!}
                />
              )}
              <div className="bg-surface-section rounded-[12px] p-3 mt-1">
                <p className="font-sans text-[11px] text-text-muted leading-snug">
                  Realiza la transferencia en tu app de banco y toma una captura de la confirmación.
                </p>
              </div>
            </>
          )}

          {/* Binance Pay */}
          {isBinance && (
            <>
              {(bankDetails.binancePayId || bankDetails.transferAccountNumber) && (
                <CopyRow
                  label="Binance Pay ID"
                  value={(bankDetails.binancePayId || bankDetails.transferAccountNumber)!}
                />
              )}
              {(bankDetails.binanceEmail || bankDetails.transferAccountName) && (
                <CopyRow
                  label="Correo / Teléfono Binance"
                  value={(bankDetails.binanceEmail || bankDetails.transferAccountName)!}
                />
              )}
              <div className="bg-surface-section rounded-[12px] p-3 mt-1">
                <p className="font-sans text-[11px] text-text-muted leading-snug">
                  Busca el ID en la app de Binance y realiza el pago en USDT. Toma captura de la confirmación.
                </p>
              </div>
            </>
          )}
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
            <p className="font-sans text-[10px] uppercase tracking-[0.12em] text-text-muted pl-1 mb-2">
              Finaliza por WhatsApp
            </p>
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
            <p className="text-[11px] text-text-muted text-center mt-1.5">
              El restaurante coordinará el pago contigo por WhatsApp.
            </p>
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
            onError={onError}
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
