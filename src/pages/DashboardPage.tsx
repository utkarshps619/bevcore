import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useUserOutlets } from '../hooks/useOutlets';
import type { InventoryItem, ShiftNote, Recipe } from '../types';
import {
  TrendingUp,
  TrendingDown,
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
  trend?: { value: number; label: string };
}

function KPICard({ title, value, subtitle, icon, trend }: KPICardProps) {
  return (
    <div className="kpi-card">
      <div className="flex items-start justify-between mb-4">
        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 flex items-center justify-center">
          {icon}
        </div>
        {trend && (
          <div
            className={`flex items-center gap-1 text-xs font-medium ${
              trend.value >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {trend.value >= 0 ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {Math.abs(trend.value)}%
          </div>
        )}
      </div>
      <h3 className="text-sm font-medium text-zinc-400 mb-1">{title}</h3>
      <p className="text-2xl font-bold text-white mb-1">{value}</p>
      <p className="text-xs text-zinc-500">{subtitle}</p>
    </div>
  );
}

interface LowStockItemProps {
  item: InventoryItem;
}

function LowStockItem({ item }: LowStockItemProps) {
  const percentage = (item.quantity / item.par_level) * 100;
  const statusColor =
    percentage <= 10
      ? 'bg-rose-500'
      : percentage <= 25
        ? 'bg-amber-500'
        : 'bg-emerald-500';

  return (
    <div className="flex items-center justify-between py-3 border-b border-[#1e1e21] last:border-0">
      <div className="flex-1">
        <p className="text-sm font-medium text-white">{item.name}</p>
        <p className="text-xs text-zinc-500">
          {item.quantity} / {item.par_level} {item.unit}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <div className="w-24 h-2 bg-[#1a1a1d] rounded-full overflow-hidden">
          <div
            className={`h-full ${statusColor} transition-all`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
        <span className="text-xs text-zinc-400 w-10 text-right">
          {percentage.toFixed(0)}%
        </span>
      </div>
    </div>
  );
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

export function DashboardPage() {
  const { outlets, loading: outletsLoading } = useUserOutlets();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [shiftNotes, setShiftNotes] = useState<(ShiftNote & { outlets?: { name: string } })[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      if (outlets.length === 0) {
        setInventory([]);
        setShiftNotes([]);
        setRecipes([]);
        setLoading(false);
        return;
      }

      const outletIds = outlets.map((o) => o.id);

      const [inventoryRes, shiftsRes, recipesRes] = await Promise.all([
        supabase
          .from('inventory_items')
          .select('*')
          .in('outlet_id', outletIds),
        supabase
          .from('shift_notes')
          .select('*, outlets(name)')
          .in('outlet_id', outletIds)
          .order('shift_date', { ascending: false })
          .limit(5),
        supabase
          .from('recipes')
          .select('*')
          .in('outlet_id', outletIds),
      ]);

      if (inventoryRes.data) setInventory(inventoryRes.data);
      if (shiftsRes.data) setShiftNotes(shiftsRes.data);
      if (recipesRes.data) setRecipes(recipesRes.data);
      setLoading(false);
    }

    if (!outletsLoading) {
      fetchDashboardData();
    }
  }, [outlets, outletsLoading]);

  const lowStockItems = inventory
    .filter((item) => item.quantity <= item.par_level * 0.5)
    .sort((a, b) => a.quantity / a.par_level - b.quantity / b.par_level)
    .slice(0, 5);

  const totalInventoryValue = inventory.reduce(
    (sum, item) => sum + item.quantity * item.cost_per_unit,
    0
  );

  const avgRecipeMargin =
    recipes.length > 0
      ? recipes.reduce((sum, r) => sum + ((r.selling_price - r.cost) / r.selling_price) * 100, 0) /
        recipes.length
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
          subtitle="Current stock value"
          icon={<Package className="h-6 w-6 text-amber-400" />}
          trend={{ value: 12.5, label: 'vs last month' }}
        />
        <KPICard
          title="Low Stock Items"
          value={lowStockItems.length}
          subtitle="Items below par level"
          icon={<AlertTriangle className="h-6 w-6 text-amber-400" />}
        />
        <KPICard
          title="Recipe Margin"
          value={`${avgRecipeMargin.toFixed(1)}%`}
          subtitle="Average profit margin"
          icon={<DollarSign className="h-6 w-6 text-amber-400" />}
          trend={{ value: 3.2, label: 'vs last month' }}
        />
        <KPICard
          title="Shift Reports"
          value={shiftNotes.length}
          subtitle="This month"
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
                <p className="text-xs text-zinc-500">Items requiring attention</p>
              </div>
            </div>
            {lowStockItems.length > 0 && (
              <span className="status-badge status-badge-error">
                {lowStockItems.length} items
              </span>
            )}
          </div>

          {lowStockItems.length > 0 ? (
            <div>{lowStockItems.map((item) => <LowStockItem key={item.id} item={item} />)}</div>
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
            const outletInventory = inventory.filter((i) => i.outlet_id === outlet.id);
            const outletRecipes = recipes.filter((r) => r.outlet_id === outlet.id);
            const lowStockCount = outletInventory.filter(
              (i) => i.quantity <= i.par_level * 0.5
            ).length;
            const totalValue = outletInventory.reduce(
              (sum, i) => sum + i.quantity * i.cost_per_unit,
              0
            );

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
                    <p className="text-xl font-bold text-white">{outletInventory.length}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Recipes</p>
                    <p className="text-xl font-bold text-white">{outletRecipes.length}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Value</p>
                    <p className="text-xl font-bold text-white">
                      ${totalValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
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
