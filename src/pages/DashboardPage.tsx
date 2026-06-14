import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useUserOutlets } from '../hooks/useOutlets';
import type { ShiftNote } from '../types';
import {
  Package,
  AlertTriangle,
  FileText,
  DollarSign,
  Wine,
  Calendar,
} from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
}

function KPICard({ title, value, subtitle, icon }: KPICardProps) {
  return (
    <div className="kpi-card">
      <div className="flex items-start justify-between mb-4">
        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 flex items-center justify-center">
          {icon}
        </div>
      </div>
      <h3 className="text-sm font-medium text-zinc-400 mb-1">{title}</h3>
      <p className="text-2xl font-bold text-white mb-1">{value}</p>
      <p className="text-xs text-zinc-500">{subtitle}</p>
    </div>
  );
}

interface StockItem {
  outlet_id: string;
  name: string;
  category: string;
  on_hand_units: number;
  opening_units: number;
  value_aed: number;
}

interface RecentShiftProps {
  note: ShiftNote & { outlets?: { name: string } };
}

function RecentShift({ note }: RecentShiftProps) {
  const shiftTypeColors: Record<string, string> = {
    morning: 'text-amber-400 bg-amber-400/10',
    afternoon: 'text-sky-400 bg-sky-400/10',
    evening: 'text-violet-400 bg-violet-400/10',
    night: 'text-indigo-400 bg-indigo-400/10',
  };

  return (
    <div className="flex items-start gap-4 py-3 border-b border-[#1e1e21] last:border-0">
      <div className="h-10 w-10 rounded-xl bg-[#1a1a1d] flex items-center justify-center flex-shrink-0">
        <Calendar className="h-5 w-5 text-zinc-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-sm font-medium text-white">
            {new Date(note.shift_date).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}
          </p>
          <span
            className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${
              shiftTypeColors[note.shift_type] || 'text-zinc-400 bg-zinc-400/10'
            }`}
          >
            {note.shift_type}
          </span>
        </div>
        <p className="text-xs text-zinc-500 truncate">
          {note.outlets?.name || 'Unknown Outlet'}
        </p>
        {note.service_summary && (
          <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
            {note.service_summary}
          </p>
        )}
      </div>
    </div>
  );
}

function LowStockRow({ item }: { item: StockItem }) {
  const percentage = item.opening_units > 0 ? (item.on_hand_units / item.opening_units) * 100 : 0;
  const statusColor =
    percentage <= 10 ? 'bg-rose-500' : percentage <= 25 ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <div className="flex items-center justify-between py-3 border-b border-[#1e1e21] last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{item.name}</p>
        <p className="text-xs text-zinc-500">
          {item.on_hand_units.toFixed(1)} / {item.opening_units.toFixed(1)} bottles
        </p>
      </div>
      <div className="flex items-center gap-3">
        <div className="w-24 h-2 bg-[#1a1a1d] rounded-full overflow-hidden">
          <div
            className={`h-full ${statusColor} transition-all`}
            style={{ width: `${Math.min(Math.max(percentage, 0), 100)}%` }}
          />
        </div>
        <span className="text-xs text-zinc-400 w-10 text-right">{percentage.toFixed(0)}%</span>
      </div>
    </div>
  );
}

function parseFormatMl(format: string | null): number {
  if (!format) return 750;
  const m = format.match(/([\d.]+)\s*(ml|cl|l)/i);
  if (!m) return 750;
  const val = parseFloat(m[1]);
  const unit = m[2].toLowerCase();
  if (unit === 'l') return val * 1000;
  if (unit === 'cl') return val * 10;
  return val;
}

export function DashboardPage() {
  const { outlets, loading: outletsLoading } = useUserOutlets();
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [shiftNotes, setShiftNotes] = useState<(ShiftNote & { outlets?: { name: string } })[]>([]);
  const [recipeMargins, setRecipeMargins] = useState<{ outlet_id: string | null; margin: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      if (outlets.length === 0) {
        setStockItems([]);
        setShiftNotes([]);
        setRecipeMargins([]);
        setLoading(false);
        return;
      }

      const outletIds = outlets.map((o) => o.id);

      const [stockRes, shiftsRes, recipesRes] = await Promise.all([
        supabase
          .from('inventory_stock')
          .select('outlet_id, on_hand_ml, opening_stock_ml, ingredient_id, wine_id, ingredients(name, category, unit_cost, bottle_size), wines(wine, category, cost_aed, format)')
          .in('outlet_id', outletIds)
          .gt('opening_stock_ml', 0),
        supabase
          .from('shift_notes')
          .select('*, outlets(name)')
          .in('outlet_id', outletIds)
          .order('shift_date', { ascending: false })
          .limit(5),
        supabase
          .from('recipes')
          .select('outlet_id, selling_price, cost, calculated_cost')
          .in('outlet_id', outletIds),
      ]);

      if (stockRes.data) {
        const built: StockItem[] = stockRes.data.map((r: any) => {
          if (r.ingredient_id && r.ingredients) {
            const bottleMl = Number(r.ingredients.bottle_size) || 750;
            const unitCost = Number(r.ingredients.unit_cost) || 0;
            return {
              outlet_id: r.outlet_id,
              name: r.ingredients.name,
              category: r.ingredients.category,
              on_hand_units: (Number(r.on_hand_ml) || 0) / bottleMl,
              opening_units: (Number(r.opening_stock_ml) || 0) / bottleMl,
              value_aed: ((Number(r.on_hand_ml) || 0) / bottleMl) * unitCost,
            };
          }
          const bottleMl = parseFormatMl(r.wines?.format ?? null);
          const unitCost = Number(r.wines?.cost_aed) || 0;
          return {
            outlet_id: r.outlet_id,
            name: r.wines?.wine ?? 'Unknown wine',
            category: r.wines?.category ?? 'Wine',
            on_hand_units: (Number(r.on_hand_ml) || 0) / bottleMl,
            opening_units: (Number(r.opening_stock_ml) || 0) / bottleMl,
            value_aed: ((Number(r.on_hand_ml) || 0) / bottleMl) * unitCost,
          };
        });
        setStockItems(built);
      }

      if (shiftsRes.data) setShiftNotes(shiftsRes.data);

      if (recipesRes.data) {
        const margins = recipesRes.data
          .filter((r: any) => r.selling_price > 0)
          .map((r: any) => ({
            outlet_id: r.outlet_id,
            margin: ((r.selling_price - (r.calculated_cost ?? r.cost ?? 0)) / r.selling_price) * 100,
          }));
        setRecipeMargins(margins);
      }

      setLoading(false);
    }

    if (!outletsLoading) {
      fetchDashboardData();
    }
  }, [outlets, outletsLoading]);

  const lowStockItems = stockItems
    .filter((item) => item.opening_units > 0 && item.on_hand_units / item.opening_units <= 0.25)
    .sort((a, b) => a.on_hand_units / a.opening_units - b.on_hand_units / b.opening_units)
    .slice(0, 5);

  const totalInventoryValue = stockItems.reduce((sum, item) => sum + item.value_aed, 0);

  const avgRecipeMargin =
    recipeMargins.length > 0
      ? recipeMargins.reduce((sum, r) => sum + r.margin, 0) / recipeMargins.length
      : 0;

  const isLoading = outletsLoading || loading;

  if (outlets.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="h-20 w-20 rounded-2xl bg-[#1a1a1d] flex items-center justify-center mb-6">
          <Wine className="h-10 w-10 text-zinc-600" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">Welcome to BevCore</h3>
        <p className="text-zinc-400 mb-6 max-w-md">
          Get started by creating your first outlet to begin managing your beverage operations.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-zinc-400 mt-1">Overview of your beverage operations</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <KPICard
          title="Total Inventory Value"
          value={`AED ${totalInventoryValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
          subtitle="Current on-hand value"
          icon={<Package className="h-6 w-6 text-amber-400" />}
        />
        <KPICard
          title="Low Stock Items"
          value={lowStockItems.length}
          subtitle="At or below 25% of opening stock"
          icon={<AlertTriangle className="h-6 w-6 text-amber-400" />}
        />
        <KPICard
          title="Recipe Margin"
          value={`${avgRecipeMargin.toFixed(1)}%`}
          subtitle="Average across costed recipes"
          icon={<DollarSign className="h-6 w-6 text-amber-400" />}
        />
        <KPICard
          title="Shift Reports"
          value={shiftNotes.length}
          subtitle="Most recent entries"
          icon={<FileText className="h-6 w-6 text-amber-400" />}
        />
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Low Stock Alerts */}
        <div className="lg:col-span-2 luxury-card">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-rose-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Low Stock Alerts</h2>
                <p className="text-xs text-zinc-500">Items at or below 25% of opening stock</p>
              </div>
            </div>
            {lowStockItems.length > 0 && (
              <span className="status-badge status-badge-error">{lowStockItems.length} items</span>
            )}
          </div>

          {lowStockItems.length > 0 ? (
            <div>{lowStockItems.map((item, i) => <LowStockRow key={`${item.outlet_id}-${item.name}-${i}`} item={item} />)}</div>
          ) : (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-zinc-600 mx-auto mb-3" />
              <p className="text-zinc-400">All items are well stocked</p>
            </div>
          )}
        </div>

        {/* Recent Shift Activity */}
        <div className="luxury-card">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-xl bg-sky-500/10 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-sky-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Recent Shifts</h2>
              <p className="text-xs text-zinc-500">Latest activity</p>
            </div>
          </div>

          {shiftNotes.length > 0 ? (
            <div>{shiftNotes.map((note) => <RecentShift key={note.id} note={note} />)}</div>
          ) : (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-zinc-600 mx-auto mb-3" />
              <p className="text-zinc-400">No recent shifts recorded</p>
            </div>
          )}
        </div>
      </div>

      {/* Outlet Performance */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Outlet Performance</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {outlets.map((outlet) => {
            const outletStock = stockItems.filter((i) => i.outlet_id === outlet.id);
            const outletMargins = recipeMargins.filter((r) => r.outlet_id === outlet.id);
            const lowStockCount = outletStock.filter(
              (i) => i.opening_units > 0 && i.on_hand_units / i.opening_units <= 0.25
            ).length;
            const totalValue = outletStock.reduce((sum, i) => sum + i.value_aed, 0);

            return (
              <div key={outlet.id} className="luxury-card hover:border-[#2e2e31] transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{outlet.name}</h3>
                    <p className="text-xs text-zinc-500 capitalize">{outlet.type}</p>
                  </div>
                  <span
                    className={`status-badge ${
                      lowStockCount > 0 ? 'status-badge-warning' : 'status-badge-success'
                    }`}
                  >
                    {lowStockCount > 0 ? `${lowStockCount} alerts` : 'Healthy'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Items</p>
                    <p className="text-xl font-bold text-white">{outletStock.length}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Recipes</p>
                    <p className="text-xl font-bold text-white">{outletMargins.length}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Value</p>
                    <p className="text-xl font-bold text-white">
                      {`AED ${totalValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
