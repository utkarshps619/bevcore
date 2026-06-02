import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, BarChart3, Package, Trash2 } from 'lucide-react';

const OUTLETS = [
  { id: 'b74408fc-3de1-4178-b643-947107c62364', name: 'Bull & Bear',   pos: 'BULL AND BEAR',   color: 'amber' },
  { id: 'c740b7e6-ce62-487d-9ae5-997f536c7a73', name: 'St Trop',       pos: 'ST TROP',          color: 'rose' },
  { id: '6c7253dd-3885-4ea1-b280-c75741063179', name: 'Peacock Alley', pos: 'PEACOCK ALLEY',    color: 'blue' },
  { id: 'c697e95e-f9b2-4431-916e-88950264ea92', name: 'IRD',           pos: 'ROOM SERVICE',     color: 'emerald' },
];

const COLOR_MAP: Record<string, { bg: string; text: string; border: string; bar: string; badge: string }> = {
  amber:   { bg: 'bg-amber-500/10',   text: 'text-amber-400',   border: 'border-amber-500/20',  bar: 'bg-amber-500',   badge: 'bg-amber-500/20 text-amber-400' },
  rose:    { bg: 'bg-rose-500/10',    text: 'text-rose-400',    border: 'border-rose-500/20',   bar: 'bg-rose-500',    badge: 'bg-rose-500/20 text-rose-400' },
  blue:    { bg: 'bg-blue-500/10',    text: 'text-blue-400',    border: 'border-blue-500/20',   bar: 'bg-blue-500',    badge: 'bg-blue-500/20 text-blue-400' },
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20',bar: 'bg-emerald-500', badge: 'bg-emerald-500/20 text-emerald-400' },
};

interface OutletMetrics {
  id: string;
  name: string;
  color: string;
  revenue: number;
  cogs: number;
  pourCostPct: number;
  openingStockMl: number;
  onHandMl: number;
  consumedMl: number;
  items: number;
  wastageCount: number;
  wastageAed: number;
  transfersOut: number;
}

export function MultiOutletDashboard() {
  const [metrics, setMetrics] = useState<OutletMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [topItems, setTopItems] = useState<any[]>([]);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);

      // Revenue per outlet
      const { data: revenue } = await supabase
        .from('pos_sales_raw')
        .select('outlet_name, gross_sales');

      // COGS per outlet
      const { data: cogs } = await supabase
        .from('inventory_transactions')
        .select('outlet_id, quantity_ml, ingredients(cost_per_ml)')
        .eq('transaction_type', 'sale_deduction');

      // Inventory stock per outlet
      const { data: stock } = await supabase
        .from('inventory_stock')
        .select('outlet_id, opening_stock_ml, on_hand_ml')
        .gt('opening_stock_ml', 0);

      // Wastage per outlet
      const { data: wastage } = await supabase
        .from('stock_adjustments')
        .select('outlet_id, quantity_ml, ingredient_name, ingredients(unit_cost, bottle_size)')
        .eq('type', 'wastage');

      // Transfers out per outlet
      const { data: transfers } = await supabase
        .from('stock_adjustments')
        .select('outlet_from_id, quantity_ml')
        .eq('type', 'transfer');

      // Build per-outlet maps
      const revenueMap: Record<string, number> = {};
      (revenue ?? []).forEach((r: any) => {
        const outlet = OUTLETS.find(o => o.pos === r.outlet_name);
        if (outlet) revenueMap[outlet.id] = (revenueMap[outlet.id] ?? 0) + (r.gross_sales ?? 0);
      });

      const cogsMap: Record<string, number> = {};
      (cogs ?? []).forEach((r: any) => {
        const cpm = r.ingredients?.cost_per_ml ?? 0;
        const ml = Math.abs(r.quantity_ml ?? 0);
        cogsMap[r.outlet_id] = (cogsMap[r.outlet_id] ?? 0) + (ml * cpm);
      });

      const stockMap: Record<string, { opening: number; onHand: number; items: number }> = {};
      (stock ?? []).forEach((r: any) => {
        if (!stockMap[r.outlet_id]) stockMap[r.outlet_id] = { opening: 0, onHand: 0, items: 0 };
        stockMap[r.outlet_id].opening += r.opening_stock_ml ?? 0;
        stockMap[r.outlet_id].onHand += r.on_hand_ml ?? 0;
        stockMap[r.outlet_id].items += 1;
      });

      const wastageMap: Record<string, { count: number; aed: number }> = {};
      (wastage ?? []).forEach((r: any) => {
        if (!wastageMap[r.outlet_id]) wastageMap[r.outlet_id] = { count: 0, aed: 0 };
        wastageMap[r.outlet_id].count += 1;
        const unitCost = r.ingredients?.unit_cost ?? 0;
        const bottleSize = r.ingredients?.bottle_size ?? 750;
        const costPerMl = bottleSize > 0 ? unitCost / bottleSize : 0;
        wastageMap[r.outlet_id].aed += (r.quantity_ml ?? 0) * costPerMl;
      });

      const transferMap: Record<string, number> = {};
      (transfers ?? []).forEach((r: any) => {
        transferMap[r.outlet_from_id] = (transferMap[r.outlet_from_id] ?? 0) + 1;
      });

      const built: OutletMetrics[] = OUTLETS.map(o => {
        const rev = revenueMap[o.id] ?? 0;
        const cost = cogsMap[o.id] ?? 0;
        const s = stockMap[o.id] ?? { opening: 0, onHand: 0, items: 0 };
        const w = wastageMap[o.id] ?? { count: 0, aed: 0 };
        return {
          id: o.id,
          name: o.name,
          color: o.color,
          revenue: rev,
          cogs: cost,
          pourCostPct: rev > 0 ? (cost / rev) * 100 : 0,
          openingStockMl: s.opening,
          onHandMl: s.onHand,
          consumedMl: s.opening - s.onHand,
          items: s.items,
          wastageCount: w.count,
          wastageAed: w.aed,
          transfersOut: transferMap[o.id] ?? 0,
        };
      });

      setMetrics(built);

      // Top consumed ingredients across all outlets
      const { data: topConsumed } = await supabase
        .from('inventory_transactions')
        .select('outlet_id, ingredient_id, quantity_ml, ingredients(name, cost_per_ml)')
        .eq('transaction_type', 'sale_deduction')
        .order('quantity_ml', { ascending: true })
        .limit(100);

      const ingMap: Record<string, { name: string; totalMl: number; totalAed: number }> = {};
      (topConsumed ?? []).forEach((r: any) => {
        const id = r.ingredient_id;
        if (!ingMap[id]) ingMap[id] = { name: r.ingredients?.name ?? '—', totalMl: 0, totalAed: 0 };
        ingMap[id].totalMl += Math.abs(r.quantity_ml ?? 0);
        ingMap[id].totalAed += Math.abs(r.quantity_ml ?? 0) * (r.ingredients?.cost_per_ml ?? 0);
      });

      const sorted = Object.values(ingMap).sort((a, b) => b.totalMl - a.totalMl).slice(0, 8);
      setTopItems(sorted);
      setLoading(false);
    };

    fetchAll();
  }, []);

  const maxRevenue = Math.max(...metrics.map(m => m.revenue), 1);
  const maxPourCost = Math.max(...metrics.map(m => m.pourCostPct), 1);

  const fmt = (n: number) => n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(0)}K` : n.toFixed(0);

  const pourCostColor = (pct: number) =>
    pct > 30 ? 'text-rose-400' : pct > 22 ? 'text-amber-400' : 'text-emerald-400';

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Multi-Outlet Comparison</h1>
        <p className="text-zinc-500 text-sm mt-1">Pour cost, revenue and stock status across all outlets</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="h-8 w-8 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Outlet cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {metrics.map((m) => {
              const c = COLOR_MAP[m.color];
              return (
                <div key={m.id} className={`bg-[#111113] border ${c.border} rounded-2xl p-5 space-y-4`}>
                  <div className="flex items-center justify-between">
                    <span className="text-white font-semibold">{m.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${c.badge}`}>{m.items} items</span>
                  </div>

                  {/* Revenue */}
                  <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Revenue</p>
                    <p className={`text-2xl font-bold ${c.text}`}>AED {fmt(m.revenue)}</p>
                    <div className="mt-1.5 h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className={`h-full ${c.bar} rounded-full transition-all`} style={{ width: `${(m.revenue / maxRevenue) * 100}%` }} />
                    </div>
                  </div>

                  {/* Pour cost */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#0a0a0b] rounded-xl p-3">
                      <p className="text-xs text-zinc-500 mb-1">Pour Cost</p>
                      <p className={`text-lg font-bold ${pourCostColor(m.pourCostPct)}`}>
                        {m.pourCostPct.toFixed(1)}%
                      </p>
                      <p className="text-xs text-zinc-600 mt-0.5">AED {fmt(m.cogs)} COGS</p>
                    </div>
                    <div className="bg-[#0a0a0b] rounded-xl p-3">
                      <p className="text-xs text-zinc-500 mb-1">On Hand</p>
                      <p className={`text-lg font-bold ${m.onHandMl < 0 ? 'text-rose-400' : 'text-white'}`}>
                        {m.onHandMl < 0 ? '-' : ''}{Math.abs(m.onHandMl / 1000).toFixed(0)}L
                      </p>
                      <p className="text-xs text-zinc-600 mt-0.5">Open: {(m.openingStockMl / 1000).toFixed(0)}L</p>
                    </div>
                  </div>

                  {/* Wastage & Transfers */}
                  <div className="flex gap-2 pt-1 border-t border-[#1e1e21]">
                    <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                      <Trash2 className="h-3 w-3 text-rose-400" />
                      {m.wastageCount} wastage {m.wastageAed > 0 && `· AED ${fmt(m.wastageAed)}`}
                    </div>
                    {m.transfersOut > 0 && (
                      <div className="flex items-center gap-1.5 text-xs text-zinc-500 ml-auto">
                        <span>{m.transfersOut} transfers out</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Revenue bar chart */}
          <div className="bg-[#111113] border border-[#1e1e21] rounded-2xl p-6">
            <h2 className="text-white font-semibold mb-5 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-amber-400" />
              Revenue Comparison
            </h2>
            <div className="space-y-3">
              {[...metrics].sort((a, b) => b.revenue - a.revenue).map((m) => {
                const c = COLOR_MAP[m.color];
                return (
                  <div key={m.id} className="flex items-center gap-4">
                    <span className="text-sm text-zinc-400 w-28 shrink-0">{m.name}</span>
                    <div className="flex-1 h-7 bg-white/5 rounded-lg overflow-hidden relative">
                      <div
                        className={`h-full ${c.bar} rounded-lg flex items-center px-3 transition-all`}
                        style={{ width: `${(m.revenue / maxRevenue) * 100}%` }}
                      >
                        <span className="text-xs font-semibold text-black whitespace-nowrap">
                          AED {fmt(m.revenue)}
                        </span>
                      </div>
                    </div>
                    <span className={`text-xs w-14 text-right font-mono ${pourCostColor(m.pourCostPct)}`}>
                      {m.pourCostPct.toFixed(1)}% cost
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Pour cost visual */}
            <div className="mt-6 pt-5 border-t border-[#1e1e21]">
              <h3 className="text-sm text-zinc-400 mb-3">Pour Cost % by Outlet</h3>
              <div className="flex items-end gap-4 h-24">
                {metrics.map((m) => {
                  const c = COLOR_MAP[m.color];
                  const height = Math.max((m.pourCostPct / Math.max(maxPourCost, 1)) * 100, 4);
                  return (
                    <div key={m.id} className="flex-1 flex flex-col items-center gap-1.5">
                      <span className={`text-xs font-bold ${pourCostColor(m.pourCostPct)}`}>
                        {m.pourCostPct.toFixed(1)}%
                      </span>
                      <div className="w-full bg-white/5 rounded-t-lg relative" style={{ height: '80px' }}>
                        <div
                          className={`absolute bottom-0 left-0 right-0 ${c.bar} rounded-t-lg transition-all`}
                          style={{ height: `${height}%` }}
                        />
                      </div>
                      <span className="text-xs text-zinc-500">{m.name.split(' ')[0]}</span>
                    </div>
                  );
                })}
                {/* Target line */}
              </div>
              <p className="text-xs text-zinc-600 mt-2">
                Note: Pour cost calculated only on mapped recipes. As more cocktails are linked, these figures will rise to reflect actual cost.
              </p>
            </div>
          </div>

          {/* Two columns: Stock status + Top items */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Stock status */}
            <div className="bg-[#111113] border border-[#1e1e21] rounded-2xl p-6">
              <h2 className="text-white font-semibold mb-5 flex items-center gap-2">
                <Package className="h-4 w-4 text-amber-400" />
                Opening Stock vs Consumed
              </h2>
              <div className="space-y-4">
                {metrics.map((m) => {
                  const c = COLOR_MAP[m.color];
                  const pctConsumed = m.openingStockMl > 0
                    ? Math.min((m.consumedMl / m.openingStockMl) * 100, 100)
                    : 0;
                  return (
                    <div key={m.id}>
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-sm text-zinc-300">{m.name}</span>
                        <span className="text-xs text-zinc-500">
                          {(m.consumedMl / 1000).toFixed(0)}L / {(m.openingStockMl / 1000).toFixed(0)}L
                        </span>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${c.bar} rounded-full`}
                          style={{ width: `${Math.max(pctConsumed, 0)}%` }}
                        />
                      </div>
                      <p className="text-xs text-zinc-600 mt-0.5">
                        {pctConsumed.toFixed(0)}% consumed · {Math.max(m.onHandMl / 1000, 0).toFixed(0)}L remaining
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top consumed ingredients */}
            <div className="bg-[#111113] border border-[#1e1e21] rounded-2xl p-6">
              <h2 className="text-white font-semibold mb-5 flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-rose-400" />
                Top Consumed Ingredients
              </h2>
              {topItems.length === 0 ? (
                <p className="text-zinc-600 text-sm">No data yet</p>
              ) : (
                <div className="space-y-2">
                  {topItems.map((item, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2 bg-[#0a0a0b] rounded-xl">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs text-zinc-600 w-4 shrink-0">{i + 1}</span>
                        <span className="text-sm text-white truncate">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 ml-2">
                        <span className="text-xs text-zinc-500 font-mono">{(item.totalMl / 1000).toFixed(1)}L</span>
                        <span className="text-xs text-amber-400 font-mono">AED {fmt(item.totalAed)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Wastage summary across outlets */}
          {metrics.some(m => m.wastageCount > 0) && (
            <div className="bg-[#111113] border border-[#1e1e21] rounded-2xl p-6">
              <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                Wastage Summary
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {metrics.map((m) => {
                  const c = COLOR_MAP[m.color];
                  return (
                    <div key={m.id} className={`${c.bg} border ${c.border} rounded-xl p-4 text-center`}>
                      <p className={`text-2xl font-bold ${c.text}`}>{m.wastageCount}</p>
                      <p className="text-xs text-zinc-400 mt-0.5">{m.name}</p>
                      {m.wastageAed > 0 && (
                        <p className="text-xs text-rose-400 mt-1">AED {m.wastageAed.toFixed(0)} lost</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
