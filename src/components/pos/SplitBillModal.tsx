"use client";

import { useMemo, useState } from "react";
import { X, Plus, Minus, Users, Trash2, Check } from "lucide-react";
import { toast } from "sonner";
import { formatBs, formatRef } from "@/lib/money";
import { splitOrderAction } from "@/actions/split-order";

interface SnapshotLine {
  name: string;
  quantity: number;
  itemTotalBsCents: number;
}

interface SplitBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: {
    id: string;
    orderNumber: number;
    tableNumber?: string | null;
    itemsSnapshot: SnapshotLine[];
    subtotalUsdCents: number;
    subtotalBsCents: number;
  };
  rate: number;
  onSuccess: () => void;
}

const DEFAULT_LABELS = ["Cliente A", "Cliente B", "Cliente C", "Cliente D", "Cliente E", "Cliente F"];

/**
 * Feature A — Divide una cuenta de mesa ya existente en sub-cuentas cobrables
 * por separado. Reparte las unidades de cada línea del `itemsSnapshot` entre
 * pagadores. No recalcula precios: usa los montos congelados de la orden.
 */
export function SplitBillModal({ isOpen, onClose, order, rate, onSuccess }: SplitBillModalProps) {
  const lines = order.itemsSnapshot ?? [];
  // assignment[payerIndex][lineIndex] = unidades asignadas
  const [payerCount, setPayerCount] = useState(2);
  const [assignment, setAssignment] = useState<number[][]>(() =>
    Array.from({ length: 2 }, () => new Array(lines.length).fill(0)),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const perUnitBs = (lineIdx: number) => {
    const l = lines[lineIdx];
    if (!l || l.quantity === 0) return 0;
    return Math.round(l.itemTotalBsCents / l.quantity);
  };

  const remainingForLine = (lineIdx: number) => {
    const assigned = assignment.reduce((sum, row) => sum + (row[lineIdx] ?? 0), 0);
    return lines[lineIdx].quantity - assigned;
  };

  const payerTotalBs = (payerIdx: number) =>
    lines.reduce((sum, _l, lineIdx) => sum + (assignment[payerIdx][lineIdx] ?? 0) * perUnitBs(lineIdx), 0);

  const payerItemCount = (payerIdx: number) =>
    lines.reduce((sum, _l, lineIdx) => sum + (assignment[payerIdx][lineIdx] ?? 0), 0);

  const allAssigned = useMemo(
    () => lines.every((_l, i) => remainingForLine(i) === 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [assignment, lines],
  );
  const everyPayerHasItems = useMemo(
    () => Array.from({ length: payerCount }).every((_p, i) => payerItemCount(i) > 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [assignment, payerCount],
  );
  const canConfirm = allAssigned && everyPayerHasItems && !isSubmitting;

  function setCell(payerIdx: number, lineIdx: number, delta: number) {
    setAssignment((prev) => {
      const next = prev.map((row) => [...row]);
      const current = next[payerIdx][lineIdx] ?? 0;
      const assignedOther = next.reduce((s, row, p) => (p === payerIdx ? s : s + (row[lineIdx] ?? 0)), 0);
      const max = lines[lineIdx].quantity - assignedOther;
      next[payerIdx][lineIdx] = Math.max(0, Math.min(max, current + delta));
      return next;
    });
  }

  function addPayer() {
    if (payerCount >= 6) return;
    setPayerCount((c) => c + 1);
    setAssignment((prev) => [...prev, new Array(lines.length).fill(0)]);
  }

  function removePayer(payerIdx: number) {
    if (payerCount <= 2) return;
    setPayerCount((c) => c - 1);
    setAssignment((prev) => prev.filter((_row, i) => i !== payerIdx));
  }

  async function handleConfirm() {
    if (!canConfirm) return;
    setIsSubmitting(true);
    try {
      const splits = Array.from({ length: payerCount }).map((_p, payerIdx) => ({
        label: DEFAULT_LABELS[payerIdx],
        lines: lines
          .map((_l, lineIdx) => ({ index: lineIdx, quantity: assignment[payerIdx][lineIdx] ?? 0 }))
          .filter((l) => l.quantity > 0),
      }));
      const res = await splitOrderAction({ parentOrderId: order.id, splits });
      if (res?.data?.success) {
        toast.success(`Cuenta dividida en ${payerCount} sub-pedidos`);
        onSuccess();
        onClose();
      } else {
        toast.error(res?.serverError ?? "Error al dividir la cuenta");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/50" onClick={onClose} style={{ backdropFilter: "blur(2px)" }} />
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6 pointer-events-none">
        <div className="pointer-events-auto flex w-full max-w-3xl flex-col rounded-3xl bg-white shadow-2xl" style={{ maxHeight: "92dvh" }}>
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
            <div className="flex items-center gap-2">
              <Users size={18} className="text-[var(--color-primary)]" />
              <div className="flex flex-col">
                <span className="font-display font-bold text-[var(--color-text-main)]">Dividir Cuenta</span>
                <span className="text-[11px] text-[var(--color-text-muted)]">
                  Pedido #{order.orderNumber}{order.tableNumber ? ` · ${order.tableNumber}` : ""} · {formatBs(order.subtotalBsCents)} ({formatRef(order.subtotalUsdCents)})
                </span>
              </div>
            </div>
            <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-surface-section)] hover:bg-[var(--color-border)] transition-colors">
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {/* Payer chips */}
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {Array.from({ length: payerCount }).map((_p, i) => (
                <div key={i} className="flex items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-section)] px-3 py-1.5">
                  <span className="text-xs font-black text-[var(--color-text-main)]">{DEFAULT_LABELS[i]}</span>
                  <span className="text-[10px] font-bold text-[var(--color-text-muted)] tabular-nums">{formatBs(payerTotalBs(i))}</span>
                  {payerCount > 2 && (
                    <button onClick={() => removePayer(i)} className="ml-0.5 text-slate-300 hover:text-red-500 transition-colors">
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              ))}
              {payerCount < 6 && (
                <button onClick={addPayer} className="flex items-center gap-1 rounded-xl border border-dashed border-[var(--color-border)] px-3 py-1.5 text-xs font-bold text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors">
                  <Plus size={13} /> Sub-cuenta
                </button>
              )}
            </div>

            {/* Assignment grid */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="text-[10px] font-black uppercase tracking-wider text-[var(--color-text-muted)]">
                    <th className="px-2 py-2 text-left">Ítem</th>
                    <th className="px-2 py-2 text-center">Rest.</th>
                    {Array.from({ length: payerCount }).map((_p, i) => (
                      <th key={i} className="px-2 py-2 text-center whitespace-nowrap">{DEFAULT_LABELS[i].replace("Cliente ", "")}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, lineIdx) => {
                    const rem = remainingForLine(lineIdx);
                    return (
                      <tr key={lineIdx} className="border-t border-[var(--color-border)]/50">
                        <td className="px-2 py-2">
                          <div className="font-bold text-[var(--color-text-main)]">{line.name}</div>
                          <div className="text-[10px] text-[var(--color-text-muted)] tabular-nums">x{line.quantity} · {formatBs(perUnitBs(lineIdx))} c/u</div>
                        </td>
                        <td className="px-2 py-2 text-center">
                          <span className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-black tabular-nums ${rem === 0 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{rem}</span>
                        </td>
                        {Array.from({ length: payerCount }).map((_p, payerIdx) => {
                          const val = assignment[payerIdx][lineIdx] ?? 0;
                          return (
                            <td key={payerIdx} className="px-1 py-2">
                              <div className="flex items-center justify-center gap-1">
                                <button onClick={() => setCell(payerIdx, lineIdx, -1)} disabled={val === 0} className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--color-surface-section)] text-[var(--color-text-muted)] disabled:opacity-30 hover:bg-[var(--color-border)] transition-colors">
                                  <Minus size={12} />
                                </button>
                                <span className="w-5 text-center text-sm font-black tabular-nums text-[var(--color-text-main)]">{val}</span>
                                <button onClick={() => setCell(payerIdx, lineIdx, 1)} disabled={rem === 0} className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--color-surface-section)] text-[var(--color-text-muted)] disabled:opacity-30 hover:bg-[var(--color-primary)] hover:text-white transition-colors">
                                  <Plus size={12} />
                                </button>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer */}
          <div className="shrink-0 border-t border-[var(--color-border)] px-5 py-4">
            {!allAssigned && (
              <p className="mb-2 text-center text-[11px] font-bold text-amber-600">Asigna todas las unidades antes de confirmar.</p>
            )}
            <button
              onClick={handleConfirm}
              disabled={!canConfirm}
              className="flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-base font-black text-white transition-all active:scale-[0.98] disabled:opacity-50 disabled:grayscale"
              style={{ background: "var(--color-primary)" }}
            >
              {isSubmitting ? (
                <><div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" /><span className="uppercase tracking-widest">Dividiendo...</span></>
              ) : (
                <><Check size={20} /><span className="uppercase tracking-widest">Confirmar División ({payerCount})</span></>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
