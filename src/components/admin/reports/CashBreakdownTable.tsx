"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { formatBs, formatRef } from "@/lib/money";
import type { CashBreakdownRow } from "@/db/queries/reports";

interface MethodGroup {
  method: string;
  orderCount: number;
  totalBsCents: number;
  totalUsdCents: number;
  packagingUsdCents: number;
  deliveryUsdCents: number;
  channels: ChannelGroup[];
}

interface ChannelGroup {
  channel: string;
  orderCount: number;
  totalBsCents: number;
  totalUsdCents: number;
  packagingUsdCents: number;
  deliveryUsdCents: number;
  modes: CashBreakdownRow[];
}

function buildHierarchy(rows: CashBreakdownRow[]): MethodGroup[] {
  const byMethod = new Map<string, CashBreakdownRow[]>();
  for (const r of rows) {
    const key = r.paymentMethod;
    if (!byMethod.has(key)) byMethod.set(key, []);
    byMethod.get(key)!.push(r);
  }

  const groups: MethodGroup[] = [];
  for (const [method, methodRows] of byMethod) {
    const byChannel = new Map<string, CashBreakdownRow[]>();
    for (const r of methodRows) {
      if (!byChannel.has(r.channel)) byChannel.set(r.channel, []);
      byChannel.get(r.channel)!.push(r);
    }

    const channels: ChannelGroup[] = [];
    for (const [channel, channelRows] of byChannel) {
      channels.push({
        channel,
        orderCount: channelRows.reduce((s, r) => s + r.orderCount, 0),
        totalBsCents: channelRows.reduce((s, r) => s + r.totalBsCents, 0),
        totalUsdCents: channelRows.reduce((s, r) => s + r.totalUsdCents, 0),
        packagingUsdCents: channelRows.reduce((s, r) => s + r.packagingUsdCents, 0),
        deliveryUsdCents: channelRows.reduce((s, r) => s + r.deliveryUsdCents, 0),
        modes: channelRows,
      });
    }

    groups.push({
      method,
      orderCount: methodRows.reduce((s, r) => s + r.orderCount, 0),
      totalBsCents: methodRows.reduce((s, r) => s + r.totalBsCents, 0),
      totalUsdCents: methodRows.reduce((s, r) => s + r.totalUsdCents, 0),
      packagingUsdCents: methodRows.reduce((s, r) => s + r.packagingUsdCents, 0),
      deliveryUsdCents: methodRows.reduce((s, r) => s + r.deliveryUsdCents, 0),
      channels,
    });
  }

  // Sort by total descending
  groups.sort((a, b) => b.totalBsCents - a.totalBsCents);
  return groups;
}

const channelColors: Record<string, string> = {
  "Web / Cliente": "bg-indigo-100 text-indigo-800 border-indigo-200",
  "Caja POS": "bg-emerald-100 text-emerald-800 border-emerald-200",
  "Mesero": "bg-orange-100 text-orange-800 border-orange-200",
  "Admin": "bg-slate-100 text-slate-800 border-slate-200",
};

export function CashBreakdownTable({ data }: { data: CashBreakdownRow[] }) {
  const hierarchy = useMemo(() => buildHierarchy(data), [data]);
  const [expandedMethods, setExpandedMethods] = useState<Set<string>>(() => new Set(hierarchy.map((g) => g.method)));
  const [expandedChannels, setExpandedChannels] = useState<Set<string>>(new Set());

  const grandTotalBs = hierarchy.reduce((s, g) => s + g.totalBsCents, 0);
  const grandTotalUsd = hierarchy.reduce((s, g) => s + g.totalUsdCents, 0);
  const grandOrders = hierarchy.reduce((s, g) => s + g.orderCount, 0);
  const grandPkg = hierarchy.reduce((s, g) => s + g.packagingUsdCents, 0);
  const grandDel = hierarchy.reduce((s, g) => s + g.deliveryUsdCents, 0);

  function toggleMethod(method: string) {
    setExpandedMethods((prev) => {
      const next = new Set(prev);
      if (next.has(method)) next.delete(method);
      else next.add(method);
      return next;
    });
  }

  function toggleChannel(key: string) {
    setExpandedChannels((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left text-text-main min-w-[800px]">
        <thead>
          <tr className="border-b border-border text-[10px] uppercase tracking-wide text-text-muted font-semibold">
            <th className="py-3 px-4 w-6"></th>
            <th className="py-3 px-4">Método / Canal / Modo</th>
            <th className="py-3 px-4 text-right">Pedidos</th>
            <th className="py-3 px-4 text-right">Total Bs</th>
            <th className="py-3 px-4 text-right">Total USD</th>
            <th className="py-3 px-4 text-right">Empaque</th>
            <th className="py-3 px-4 text-right">Delivery</th>
          </tr>
        </thead>
        <tbody>
          {hierarchy.length === 0 ? (
            <tr>
              <td colSpan={7} className="py-12 px-4 text-center text-text-muted">
                Sin transacciones en este periodo
              </td>
            </tr>
          ) : (
            hierarchy.map((mg) => {
              const isMethodExpanded = expandedMethods.has(mg.method);
              const MethodIcon = isMethodExpanded ? ChevronDown : ChevronRight;

              return (
                <MethodGroupRows
                  key={mg.method}
                  group={mg}
                  isExpanded={isMethodExpanded}
                  expandedChannels={expandedChannels}
                  onToggleMethod={() => toggleMethod(mg.method)}
                  onToggleChannel={toggleChannel}
                />
              );
            })
          )}

          {/* Grand total */}
          {hierarchy.length > 0 && (
            <tr className="font-bold border-t-2 border-border bg-bg-app/20 text-text-main">
              <td className="py-4 px-4" />
              <td className="py-4 px-4">TOTAL GENERAL</td>
              <td className="py-4 px-4 text-right tabular-nums">{grandOrders}</td>
              <td className="py-4 px-4 text-right tabular-nums">{formatBs(grandTotalBs)}</td>
              <td className="py-4 px-4 text-right tabular-nums">{formatRef(grandTotalUsd)}</td>
              <td className="py-4 px-4 text-right tabular-nums">{formatRef(grandPkg)}</td>
              <td className="py-4 px-4 text-right tabular-nums">{formatRef(grandDel)}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function MethodGroupRows({
  group,
  isExpanded,
  expandedChannels,
  onToggleMethod,
  onToggleChannel,
}: {
  group: MethodGroup;
  isExpanded: boolean;
  expandedChannels: Set<string>;
  onToggleMethod: () => void;
  onToggleChannel: (key: string) => void;
}) {
  const Icon = isExpanded ? ChevronDown : ChevronRight;

  return (
    <>
      {/* Level 1: Payment Method */}
      <tr
        className="border-b border-border bg-bg-app/10 cursor-pointer hover:bg-bg-app/30 transition-colors"
        onClick={onToggleMethod}
      >
        <td className="py-3 px-4 pl-1">
          <Icon className="h-4 w-4 text-text-muted" />
        </td>
        <td className="py-3 px-4 font-bold">{group.method}</td>
        <td className="py-3 px-4 text-right tabular-nums font-semibold">{group.orderCount}</td>
        <td className="py-3 px-4 text-right tabular-nums font-bold">{formatBs(group.totalBsCents)}</td>
        <td className="py-3 px-4 text-right tabular-nums font-medium text-primary">{formatRef(group.totalUsdCents)}</td>
        <td className="py-3 px-4 text-right tabular-nums text-text-muted">{formatRef(group.packagingUsdCents)}</td>
        <td className="py-3 px-4 text-right tabular-nums text-text-muted">{formatRef(group.deliveryUsdCents)}</td>
      </tr>

      {/* Level 2: Channel within method */}
      {isExpanded &&
        group.channels.map((cg) => {
          const channelKey = `${group.method}::${cg.channel}`;
          const isChExpanded = expandedChannels.has(channelKey);
          const ChIcon = isChExpanded ? ChevronDown : ChevronRight;
          const chColor = channelColors[cg.channel] ?? "bg-slate-100 text-slate-800 border-slate-200";

          return (
            <ChannelGroupRows
              key={channelKey}
              channelGroup={cg}
              channelKey={channelKey}
              isExpanded={isChExpanded}
              channelColor={chColor}
              onToggle={() => onToggleChannel(channelKey)}
            />
          );
        })}
    </>
  );
}

function ChannelGroupRows({
  channelGroup,
  channelKey,
  isExpanded,
  channelColor,
  onToggle,
}: {
  channelGroup: ChannelGroup;
  channelKey: string;
  isExpanded: boolean;
  channelColor: string;
  onToggle: () => void;
}) {
  const Icon = isExpanded ? ChevronDown : ChevronRight;

  return (
    <>
      {/* Level 2: Channel */}
      <tr
        className="border-b border-border cursor-pointer hover:bg-bg-app/20 transition-colors"
        onClick={onToggle}
      >
        <td className="py-2.5 px-4 pl-4">
          <Icon className="h-3.5 w-3.5 text-text-muted" />
        </td>
        <td className="py-2.5 px-4 pl-4">
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${channelColor}`}>
            {channelGroup.channel}
          </span>
        </td>
        <td className="py-2.5 px-4 text-right tabular-nums font-medium">{channelGroup.orderCount}</td>
        <td className="py-2.5 px-4 text-right tabular-nums font-medium">{formatBs(channelGroup.totalBsCents)}</td>
        <td className="py-2.5 px-4 text-right tabular-nums text-primary">{formatRef(channelGroup.totalUsdCents)}</td>
        <td className="py-2.5 px-4 text-right tabular-nums text-text-muted">{formatRef(channelGroup.packagingUsdCents)}</td>
        <td className="py-2.5 px-4 text-right tabular-nums text-text-muted">{formatRef(channelGroup.deliveryUsdCents)}</td>
      </tr>

      {/* Level 3: Mode within channel */}
      {isExpanded &&
        channelGroup.modes.map((mode, idx) => (
          <tr key={idx} className="border-b border-border/50 hover:bg-bg-app/10">
            <td className="py-2 px-4" />
            <td className="py-2 px-4 pl-10 text-text-muted text-xs">{mode.orderMode}</td>
            <td className="py-2 px-4 text-right tabular-nums text-xs text-text-muted">{mode.orderCount}</td>
            <td className="py-2 px-4 text-right tabular-nums text-xs">{formatBs(mode.totalBsCents)}</td>
            <td className="py-2 px-4 text-right tabular-nums text-xs text-primary">{formatRef(mode.totalUsdCents)}</td>
            <td className="py-2 px-4 text-right tabular-nums text-xs text-text-muted">{formatRef(mode.packagingUsdCents)}</td>
            <td className="py-2 px-4 text-right tabular-nums text-xs text-text-muted">{formatRef(mode.deliveryUsdCents)}</td>
          </tr>
        ))}
    </>
  );
}
