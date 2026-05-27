import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { TrendingUp, TrendingDown, DollarSign, Wine, AlertTriangle, Award } from 'lucide-react';

interface Recipe {
  id: string;
  name: string;
  category: string;
  cost: number;
  selling_price: number;
}

interface KPIs {
  totalRecipes: number;
  avgMargin: number;
  avgCost: number;
  avgPrice: number;
  highMarginCount: number;
  lowMarginCount: number;
}

function getMargin(cost: number, price: number): number {
  if (!price || price === 0) return 0;
  return ((price - cost) / price) * 100;
}

function marginColor(margin: number): string {
  if (margin >= 70) return 'text-emerald-400';
  if (margin >= 50) return 'text-amber-400';
  return 'text-rose-400';
}

function marginBg(margin: number): string {
  if (margin >= 70) return 'bg-emerald-500/10 border-emerald-500/20';
  if (margin >= 50) return 'bg-amber-500/10 border-amber-500/20';
  return 'bg-rose-500/10 border-rose-500/20';
}

export function PourCostDashboard() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');

  useEffect(() => {
    fetchRecipes();
  }, []);

  const fetchRecipes = async () => {
    const { data, error } = await supabase
      .from('recipes')
      .select('id, name, category, cost, selling_price')
      .or('outlet_id.is.null,outlet_id.not.is.null')
      .order('name');

    if (!error && data) setRecipes(data);
    setLoading(false);
  };

  const categories = ['All', ...Array.from(new Set(recipes.map((r) => r.category).filter(Boolean)))];

  const filtered = recipes.filter((r) => {
    const matchesCat = selectedCategory === 'All' || r.category === selectedCategory;
    const hasData = r.cost > 0 && r.selling_price > 0;
    return matchesCat && hasData;
  });

  const kpis: KPIs = {
    totalRecipes: filtered.length,
    avgMargin: filtered.length
      ? filtered.reduce((sum, r) => sum + getMargin(r.cost, r.selling_price), 0) / filtered.length
      : 0,
    avgCost: filtered.length
      ? filtered.reduce((sum, r) => sum + r.cost, 0) / filtered.length
      : 0,
    avgPrice: filtered.length
      ? filtered.reduce((sum, r) => sum + r.selling_price, 0) / filtered.length
      : 0,
    highMarginCount: filtered.filter((r) => getMargin(r.cost, r.selling_price) >= 70).length,
    lowMarginCount: filtered.filter((r) => getMargin(r.cost, r.selling_price) < 50).length,
  };

  const sorted = [...filtered].sort(
    (a, b) => getMargin(b.cost, b.selling_price) - getMargin(a.cost, a.selling_price)
  );

  const top10 = sorted.slice(0, 10);
  const bottom10 = [...sorted].reverse().slice(0, 10);

  // Margin distribution
  const distribution = [
    { label: '70%+', count: filtered.filter((r) => getMargin(r.cost, r.selling_price) >= 70).length, color: 'bg-emerald-500' },
    { label: '50–70%', count: filtered.filter((r) => { const m = getMargin(r.cost, r.selling_price); return m >= 50 && m < 70; }).length, color: 'bg-amber-500' },
    { label: '<50%', count: filtered.filter((r) => getMargin(r.cost, r.selling_price) < 50).length, color: 'bg-rose-500' },
  ];

  const maxDist = Math.max(...distribution.map((d) => d.count), 1);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="h-8 w-8 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Pour Cost Dashboard</h1>
          <p className="text-zinc-400 mt-1">Recipe margin analysis and cost tracking</p>
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="luxury-input w-auto min-w-[160px]"
        >
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat === 'All' ? 'All Categories' : cat.charAt(0).toUpperCase() + cat.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="luxury-card">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-9 w-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Wine className="h-5 w-5 text-amber-400" />
            </div>
            <span className="text-sm text-zinc-400">Total Recipes</span>
          </div>
          <p className="text-3xl font-bold text-white">{kpis.totalRecipes}</p>
        </div>

        <div className="luxury-card">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-emerald-400" />
            </div>
            <span className="text-sm text-zinc-400">Avg Margin</span>
          </div>
          <p className={`text-3xl font-bold ${marginColor(kpis.avgMargin)}`}>
            {kpis.avgMargin.toFixed(1)}%
          </p>
        </div>

        <div className="luxury-card">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-9 w-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-blue-400" />
            </div>
            <span className="text-sm text-zinc-400">Avg Cost</span>
          </div>
          <p className="text-3xl font-bold text-white">AED {kpis.avgCost.toFixed(2)}</p>
        </div>

        <div className="luxury-card">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-9 w-9 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-purple-400" />
            </div>
            <span className="text-sm text-zinc-400">Avg Selling Price</span>
          </div>
          <p className="text-3xl font-bold text-white">AED {kpis.avgPrice.toFixed(2)}</p>
        </div>
      </div>

      {/* Margin Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="luxury-card">
          <div className="flex items-center gap-3 mb-4">
            <Award className="h-5 w-5 text-emerald-400" />
            <span className="text-sm font-medium text-zinc-300">Healthy (70%+)</span>
          </div>
          <p className="text-4xl font-bold text-emerald-400">{kpis.highMarginCount}</p>
          <p className="text-zinc-500 text-sm mt-1">
            {kpis.totalRecipes > 0 ? ((kpis.highMarginCount / kpis.totalRecipes) * 100).toFixed(0) : 0}% of recipes
          </p>
        </div>

        <div className="luxury-card">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="h-5 w-5 text-rose-400" />
            <span className="text-sm font-medium text-zinc-300">At Risk (&lt;50%)</span>
          </div>
          <p className="text-4xl font-bold text-rose-400">{kpis.lowMarginCount}</p>
          <p className="text-zinc-500 text-sm mt-1">
            {kpis.totalRecipes > 0 ? ((kpis.lowMarginCount / kpis.totalRecipes) * 100).toFixed(0) : 0}% of recipes
          </p>
        </div>

        {/* Distribution Bar */}
        <div className="luxury-card">
          <p className="text-sm font-medium text-zinc-300 mb-4">Margin Distribution</p>
          <div className="space-y-3">
            {distribution.map((d) => (
              <div key={d.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-zinc-400">{d.label}</span>
                  <span className="text-xs text-zinc-400">{d.count}</span>
                </div>
                <div className="h-2 rounded-full bg-[#1e1e21] overflow-hidden">
                  <div
                    className={`h-full rounded-full ${d.color}`}
                    style={{ width: `${(d.count / maxDist) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top & Bottom 10 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 10 */}
        <div className="luxury-card">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-emerald-400" />
            <h2 className="text-base font-semibold text-white">Top 10 — Highest Margin</h2>
          </div>
          <div className="space-y-2">
            {top10.map((r, idx) => {
              const margin = getMargin(r.cost, r.selling_price);
              return (
                <div key={r.id} className={`flex items-center justify-between p-3 rounded-xl border ${marginBg(margin)}`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs text-zinc-500 w-5 shrink-0">{idx + 1}</span>
                    <div className="min-w-0">
                      <p className="text-sm text-white font-medium truncate">{r.name}</p>
                      <p className="text-xs text-zinc-500">AED {r.cost.toFixed(2)} cost · AED {r.selling_price} price</p>
                    </div>
                  </div>
                  <span className={`text-sm font-bold shrink-0 ml-3 ${marginColor(margin)}`}>
                    {margin.toFixed(0)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom 10 */}
        <div className="luxury-card">
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown className="h-5 w-5 text-rose-400" />
            <h2 className="text-base font-semibold text-white">Bottom 10 — Lowest Margin</h2>
          </div>
          <div className="space-y-2">
            {bottom10.map((r, idx) => {
              const margin = getMargin(r.cost, r.selling_price);
              return (
                <div key={r.id} className={`flex items-center justify-between p-3 rounded-xl border ${marginBg(margin)}`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs text-zinc-500 w-5 shrink-0">{idx + 1}</span>
                    <div className="min-w-0">
                      <p className="text-sm text-white font-medium truncate">{r.name}</p>
                      <p className="text-xs text-zinc-500">AED {r.cost.toFixed(2)} cost · AED {r.selling_price} price</p>
                    </div>
                  </div>
                  <span className={`text-sm font-bold shrink-0 ml-3 ${marginColor(margin)}`}>
                    {margin.toFixed(0)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
