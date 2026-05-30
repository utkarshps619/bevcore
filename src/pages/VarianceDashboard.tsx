import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { AlertCircle, TrendingDown, CheckCircle } from 'lucide-react';

interface VarianceRow {
  outlet_id: string;
  outlet_name: string;
  ingredient_id: string;
  ingredient_name: string;
  category: string;
  unit_cost: number;
  bottle_size: string;
  opening_stock_ml: number;
  theoretical_on_hand_ml: number;
  counted_ml: number;
  count_date: string;
  theoretical_consumed_ml: number;
  actual_variance_ml: number;
  variance_aed: number;
  status: 'ok' | 'warning' | 'critical';
  is_locked: boolean;
}

interface SummaryStats {
  total_variance_aed: number;
  total_theoretical_consumed_ml: number;
  total_counted_ml: number;
  ingredients_counted: number;
  ingredients_total: number;
  avg_variance_percent: number;
}

const VarianceDashboard = () => {
  const [outlet_id, setOutletId] = useState('b74408fc-3de1-4178-b643-947107c62364');
  const [outlets, setOutlets] = useState<any[]>([]);
  const [variance_data, setVarianceData] = useState<VarianceRow[]>([]);
  const [summary, setSummary] = useState<SummaryStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [sort_by, setSortBy] = useState<'variance' | 'category' | 'consumed'>('variance');
  const [entering_count, setEnteringCount] = useState<string | null>(null);
  const [count_value, setCountValue] = useState('');

  useEffect(() => {
    const loadOutlets = async () => {
      const { data } = await supabase.from('outlets').select('*').order('name');
      setOutlets(data || []);
    };
    loadOutlets();
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: var_data } = await supabase
        .from('variance_report')
        .select('*')
        .eq('outlet_id', outlet_id);
      setVarianceData(var_data || []);

      const { data: summary_data } = await supabase
        .rpc('variance_summary', { p_outlet_id: outlet_id });
      if (summary_data && summary_data.length > 0) setSummary(summary_data[0]);
      setLoading(false);
    };
    if (outlet_id) load();
  }, [outlet_id]);

  const handleCountEntry = async (ingredient_id: string, value: number) => {
    await supabase.from('inventory_counts').insert({
      outlet_id,
      ingredient_id,
      count_date: new Date().toISOString().split('T')[0],
      counted_ml: value,
      theoretical_ml: variance_data.find((d) => d.ingredient_id === ingredient_id)?.theoretical_on_hand_ml || 0,
    });
    setEnteringCount(null);
    setCountValue('');
    const { data: var_data } = await supabase
      .from('variance_report')
      .select('*')
      .eq('outlet_id', outlet_id);
    setVarianceData(var_data || []);
  };

  const sorted_data = [...variance_data].sort((a, b) => {
    if (sort_by === 'variance') return Math.abs(b.variance_aed) - Math.abs(a.variance_aed);
    if (sort_by === 'category') return a.category.localeCompare(b.category);
    return b.theoretical_consumed_ml - a.theoretical_consumed_ml;
  });

  const status_row: Record<string, string> = {
    ok: 'border-l-2 border-l-emerald-500/30',
    warning: 'border-l-2 border-l-amber-500/30',
    critical: 'border-l-2 border-l-rose-500/30',
  };

  const status_badge: Record<string, string> = {
    ok: 'text-emerald-400 bg-emerald-500/10',
    warning: 'text-amber-400 bg-amber-500/10',
    critical: 'text-rose-400 bg-rose-500/10',
  };

  return (
    <div className="min-h-screen bg-[#0a0a0b] p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-white">Pour Cost Variance</h1>
          <select
            value={outlet_id}
            onChange={(e) => setOutletId(e.target.value)}
            className="px-4 py-2 bg-[#1a1a1d] border border-[#2e2e31] rounded-lg text-sm text-white focus:outline-none focus:border-amber-500/50"
          >
            {outlets.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-[#111113] rounded-xl border border-[#1e1e21] p-4">
              <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Total Variance</div>
              <div className={`text-2xl font-bold ${summary.total_variance_aed < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                AED {summary.total_variance_aed?.toFixed(0)}
              </div>
            </div>
            <div className="bg-[#111113] rounded-xl border border-[#1e1e21] p-4">
              <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Count Progress</div>
              <div className="text-2xl font-bold text-white">
                {summary.ingredients_counted}/{summary.ingredients_total}
              </div>
              <div className="text-xs text-zinc-500 mt-1">
                {summary.ingredients_total > 0
                  ? Math.round((summary.ingredients_counted / summary.ingredients_total) * 100)
                  : 0}% complete
              </div>
            </div>
            <div className="bg-[#111113] rounded-xl border border-[#1e1e21] p-4">
              <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Avg Variance</div>
              <div className="text-2xl font-bold text-white">{summary.avg_variance_percent}%</div>
            </div>
            <div className="bg-[#111113] rounded-xl border border-[#1e1e21] p-4">
              <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Consumed (Theory)</div>
              <div className="text-2xl font-bold text-white">
                {((summary.total_theoretical_consumed_ml || 0) / 1000).toFixed(1)}L
              </div>
            </div>
          </div>
        )}

        {/* Sort Controls */}
        <div className="flex gap-2 mb-4">
          {(['variance', 'category', 'consumed'] as const).map((opt) => (
            <button
              key={opt}
              onClick={() => setSortBy(opt)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                sort_by === opt
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-[#1a1a1d] text-zinc-400 border border-[#2e2e31] hover:text-white'
              }`}
            >
              {opt === 'variance' ? 'By Variance' : opt === 'category' ? 'By Category' : 'By Consumed'}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-[#111113] rounded-xl border border-[#1e1e21] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-[#1e1e21]">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Ingredient</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Category</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Opening</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Consumed</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Theory On Hand</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Counted</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Variance ml</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Variance AED</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e1e21]">
              {sorted_data.map((row) => (
                <tr key={row.ingredient_id} className={`hover:bg-[#1a1a1d] transition-colors ${status_row[row.status]}`}>
                  <td className="px-4 py-3 font-medium text-white">{row.ingredient_name}</td>
                  <td className="px-4 py-3 text-zinc-400">{row.category}</td>
                  <td className="px-4 py-3 text-right text-zinc-300 font-mono">
                    {(row.opening_stock_ml / 1000).toFixed(1)}L
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-300 font-mono">
                    {(row.theoretical_consumed_ml / 1000).toFixed(1)}L
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-300 font-mono">
                    {row.theoretical_on_hand_ml?.toFixed(0)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {entering_count === row.ingredient_id ? (
                      <input
                        type="number"
                        autoFocus
                        value={count_value}
                        onChange={(e) => setCountValue(e.target.value)}
                        onBlur={() => {
                          if (count_value) handleCountEntry(row.ingredient_id, parseFloat(count_value));
                        }}
                        className="w-20 px-2 py-1 bg-[#0a0a0b] border border-amber-500/50 rounded text-white text-sm text-center focus:outline-none"
                      />
                    ) : row.counted_ml ? (
                      <span
                        className="text-zinc-300 font-mono cursor-pointer hover:text-amber-400"
                        onClick={() => { setEnteringCount(row.ingredient_id); setCountValue(row.counted_ml.toString()); }}
                      >
                        {row.counted_ml.toFixed(0)}
                      </span>
                    ) : (
                      <button
                        onClick={() => { setEnteringCount(row.ingredient_id); setCountValue(''); }}
                        className="text-xs text-amber-400 hover:text-amber-300"
                      >
                        Enter count
                      </button>
                    )}
                  </td>
                  <td className={`px-4 py-3 text-right font-mono ${row.actual_variance_ml < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {row.actual_variance_ml?.toFixed(0)}
                  </td>
                  <td className={`px-4 py-3 text-right font-mono font-semibold ${row.variance_aed < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {row.variance_aed > 0 ? '+' : ''}{row.variance_aed?.toFixed(0)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${status_badge[row.status]}`}>
                      {row.status === 'ok' && <CheckCircle className="w-3 h-3" />}
                      {row.status === 'warning' && <AlertCircle className="w-3 h-3" />}
                      {row.status === 'critical' && <TrendingDown className="w-3 h-3" />}
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
            </div>
          )}

          {!loading && sorted_data.length === 0 && (
            <div className="text-center py-12 text-zinc-500">
              No variance data found for this outlet
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VarianceDashboard;
