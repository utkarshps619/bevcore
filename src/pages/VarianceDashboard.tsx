import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { AlertCircle, TrendingDown, Lock, CheckCircle } from 'lucide-react';

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
  const [sort_by, setSort_by] = useState<'variance' | 'category' | 'consumed'>('variance');
  const [entering_count, setEntering_count] = useState<string | null>(null);
  const [count_value, setCount_value] = useState('');

  // Load outlets
  useEffect(() => {
    const loadOutlets = async () => {
      const { data } = await supabase.from('outlets').select('*').order('name');
      setOutlets(data || []);
    };
    loadOutlets();
  }, []);

  // Load variance data
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      
      // Get variance data
      const { data: var_data } = await supabase
        .from('variance_report')
        .select('*')
        .eq('outlet_id', outlet_id);
      
      setVarianceData(var_data || []);

      // Get summary
      const { data: summary_data } = await supabase
        .rpc('variance_summary', { p_outlet_id: outlet_id });
      
      if (summary_data && summary_data.length > 0) {
        setSummary(summary_data[0]);
      }
      
      setLoading(false);
    };

    if (outlet_id) load();
  }, [outlet_id]);

  // Enter physical count
  const handleCountEntry = async (ingredient_id: string, value: number) => {
    await supabase.from('inventory_counts').insert({
      outlet_id,
      ingredient_id,
      count_date: new Date().toISOString().split('T')[0],
      counted_ml: value,
      theoretical_ml: variance_data.find(d => d.ingredient_id === ingredient_id)?.theoretical_on_hand_ml || 0,
    });

    setEntering_count(null);
    setCount_value('');
    
    // Refresh
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

  const status_color = {
    ok: 'bg-green-50 border-green-200',
    warning: 'bg-yellow-50 border-yellow-200',
    critical: 'bg-red-50 border-red-200',
  };

  const status_badge = {
    ok: 'text-green-700 bg-green-100',
    warning: 'text-yellow-700 bg-yellow-100',
    critical: 'text-red-700 bg-red-100',
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Pour Cost Variance</h1>
          <select
            value={outlet_id}
            onChange={(e) => setOutletId(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            {outlets.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="text-gray-600 text-sm">Total Variance</div>
              <div className={`text-2xl font-bold ${summary.total_variance_aed > 0 ? 'text-red-600' : 'text-green-600'}`}>
                AED {summary.total_variance_aed.toFixed(0)}
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="text-gray-600 text-sm">Count Progress</div>
              <div className="text-2xl font-bold">{summary.ingredients_counted}/{summary.ingredients_total}</div>
              <div className="text-xs text-gray-500">{Math.round((summary.ingredients_counted / summary.ingredients_total) * 100)}%</div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="text-gray-600 text-sm">Avg Variance %</div>
              <div className="text-2xl font-bold">{summary.avg_variance_percent}%</div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <div className="text-gray-600 text-sm">Consumed (Theory)</div>
              <div className="text-2xl font-bold">{(summary.total_theoretical_consumed_ml / 1000).toFixed(1)}L</div>
            </div>
          </div>
        )}

        {/* Sort Controls */}
        <div className="mb-4 flex gap-2">
          <button
            onClick={() => setSort_by('variance')}
            className={`px-3 py-1 rounded text-sm ${sort_by === 'variance' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300'}`}
          >
            By Variance
          </button>
          <button
            onClick={() => setSort_by('category')}
            className={`px-3 py-1 rounded text-sm ${sort_by === 'category' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300'}`}
          >
            By Category
          </button>
          <button
            onClick={() => setSort_by('consumed')}
            className={`px-3 py-1 rounded text-sm ${sort_by === 'consumed' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300'}`}
          >
            By Consumed
          </button>
        </div>

        {/* Variance Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 border-b border-gray-200">
              <tr>
                <th className="text-left p-3 font-semibold">Ingredient</th>
                <th className="text-left p-3 font-semibold">Category</th>
                <th className="text-right p-3 font-semibold">Opening</th>
                <th className="text-right p-3 font-semibold">Consumed</th>
                <th className="text-right p-3 font-semibold">Theoretical On Hand</th>
                <th className="text-right p-3 font-semibold">Counted</th>
                <th className="text-right p-3 font-semibold">Variance (ml)</th>
                <th className="text-right p-3 font-semibold">Variance (AED)</th>
                <th className="text-center p-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {sorted_data.map((row) => (
                <tr key={`${row.ingredient_id}`} className={`border-b border-gray-200 ${status_color[row.status]}`}>
                  <td className="p-3 font-medium">{row.ingredient_name}</td>
                  <td className="p-3 text-gray-600">{row.category}</td>
                  <td className="text-right p-3">{(row.opening_stock_ml / 1000).toFixed(1)}L</td>
                  <td className="text-right p-3">{(row.theoretical_consumed_ml / 1000).toFixed(1)}L</td>
                  <td className="text-right p-3 font-mono">{row.theoretical_on_hand_ml.toFixed(0)}</td>
                  <td className="text-right p-3">
                    {entering_count === row.ingredient_id ? (
                      <input
                        type="number"
                        autoFocus
                        value={count_value}
                        onChange={(e) => setCount_value(e.target.value)}
                        onBlur={() => {
                          if (count_value) handleCountEntry(row.ingredient_id, parseFloat(count_value));
                        }}
                        className="w-20 px-2 py-1 border border-blue-300 rounded"
                      />
                    ) : row.counted_ml ? (
                      <span className="cursor-pointer hover:underline" onClick={() => {
                        setEntering_count(row.ingredient_id);
                        setCount_value(row.counted_ml.toString());
                      }}>
                        {row.counted_ml.toFixed(0)}
                      </span>
                    ) : (
                      <button
                        onClick={() => {
                          setEntering_count(row.ingredient_id);
                          setCount_value('');
                        }}
                        className="text-blue-600 hover:underline"
                      >
                        Enter count
                      </button>
                    )}
                  </td>
                  <td className={`text-right p-3 font-mono ${row.actual_variance_ml < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {row.actual_variance_ml.toFixed(0)}
                  </td>
                  <td className={`text-right p-3 font-mono font-bold ${row.variance_aed < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {row.variance_aed > 0 ? '+' : ''}{row.variance_aed.toFixed(0)}
                  </td>
                  <td className="text-center p-3">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${status_badge[row.status]}`}>
                      {row.status === 'ok' && <CheckCircle className="inline w-4 h-4 mr-1" />}
                      {row.status === 'warning' && <AlertCircle className="inline w-4 h-4 mr-1" />}
                      {row.status === 'critical' && <TrendingDown className="inline w-4 h-4 mr-1" />}
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {loading && (
          <div className="text-center py-8 text-gray-600">Loading variance data...</div>
        )}
      </div>
    </div>
  );
};

export default VarianceDashboard;
