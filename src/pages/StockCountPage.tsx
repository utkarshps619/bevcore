import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { ClipboardCheck, Save, Search, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';

interface Outlet {
  id: string;
  name: string;
}

interface StockRow {
  outlet_id: string;
  ingredient_id: string | null;
  wine_id: string | null;
  on_hand_ml: number;
  opening_stock_ml: number;
  name: string;
  category: string;
  bottle_size_ml: number;
  unit_cost: number;
  item_type: 'ingredient' | 'wine';
}

const CATEGORY_BADGE: Record<string, string> = {
  Cocktail: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  Spirit: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
  Liqueur: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  Beer: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  Red: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  White: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  Rose: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  Champagne: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  Sparkling: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
};

function rowKeyOf(r: StockRow) {
  return r.ingredient_id ? `ing_${r.ingredient_id}` : `wine_${r.wine_id}`;
}

function badgeClass(category: string) {
  return CATEGORY_BADGE[category] || 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
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

export function StockCountPage() {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [outletId, setOutletId] = useState('');
  const [rows, setRows] = useState<StockRow[]>([]);
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'ingredient' | 'wine'>('all');

  useEffect(() => {
    const loadOutlets = async () => {
      const { data } = await supabase.from('outlets').select('id, name').order('name');
      setOutlets(data || []);
      if (data && data.length > 0) setOutletId((prev) => prev || data[0].id);
    };
    loadOutlets();
  }, []);

  useEffect(() => {
    if (!outletId) return;
    const load = async () => {
      setLoading(true);

      const { data: stockData } = await supabase
        .from('inventory_stock')
        .select('outlet_id, ingredient_id, wine_id, on_hand_ml, opening_stock_ml')
        .eq('outlet_id', outletId)
        .gt('opening_stock_ml', 0);

      const stock = stockData || [];
      const ingredientIds = stock.filter((s) => s.ingredient_id).map((s) => s.ingredient_id as string);
      const wineIds = stock.filter((s) => s.wine_id).map((s) => s.wine_id as string);

      const [ingredientsRes, winesRes, countsRes] = await Promise.all([
        ingredientIds.length
          ? supabase.from('ingredients').select('id, name, category, bottle_size, unit_cost').in('id', ingredientIds)
          : Promise.resolve({ data: [] as any[] }),
        wineIds.length
          ? supabase.from('wines').select('id, wine, category, format, cost_aed').in('id', wineIds)
          : Promise.resolve({ data: [] as any[] }),
        supabase
          .from('inventory_counts')
          .select('ingredient_id, wine_id, counted_ml')
          .eq('outlet_id', outletId)
          .eq('count_date', new Date().toISOString().split('T')[0]),
      ]);

      const ingMap = new Map((ingredientsRes.data || []).map((i: any) => [i.id, i]));
      const wineMap = new Map((winesRes.data || []).map((w: any) => [w.id, w]));

      const built: StockRow[] = stock
        .map((s) => {
          if (s.ingredient_id) {
            const ing = ingMap.get(s.ingredient_id);
            if (!ing) return null;
            return {
              outlet_id: s.outlet_id,
              ingredient_id: s.ingredient_id,
              wine_id: null,
              on_hand_ml: Number(s.on_hand_ml) || 0,
              opening_stock_ml: Number(s.opening_stock_ml) || 0,
              name: ing.name,
              category: ing.category,
              bottle_size_ml: Number(ing.bottle_size) || 750,
              unit_cost: Number(ing.unit_cost) || 0,
              item_type: 'ingredient' as const,
            };
          } else if (s.wine_id) {
            const wine = wineMap.get(s.wine_id);
            if (!wine) return null;
            return {
              outlet_id: s.outlet_id,
              ingredient_id: null,
              wine_id: s.wine_id,
              on_hand_ml: Number(s.on_hand_ml) || 0,
              opening_stock_ml: Number(s.opening_stock_ml) || 0,
              name: wine.wine,
              category: wine.category,
              bottle_size_ml: parseFormatMl(wine.format),
              unit_cost: Number(wine.cost_aed) || 0,
              item_type: 'wine' as const,
            };
          }
          return null;
        })
        .filter(Boolean) as StockRow[];

      built.sort((a, b) => a.name.localeCompare(b.name));
      setRows(built);

      const prefill: Record<string, string> = {};
      (countsRes.data || []).forEach((c: any) => {
        const key = c.ingredient_id ? `ing_${c.ingredient_id}` : `wine_${c.wine_id}`;
        const item = built.find((b) => rowKeyOf(b) === key);
        const bottleMl = item?.bottle_size_ml || 750;
        prefill[key] = (Number(c.counted_ml) / bottleMl).toFixed(2);
      });
      setCounts(prefill);
      setLoading(false);
    };
    load();
  }, [outletId]);

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (filterType !== 'all' && r.item_type !== filterType) return false;
      if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [rows, filterType, search]);

  const rowKey = rowKeyOf;

  const handleSave = async (r: StockRow) => {
    const key = rowKey(r);
    const bottleVal = parseFloat(counts[key]);
    if (isNaN(bottleVal) || bottleVal < 0) return;

    const countedMl = bottleVal * r.bottle_size_ml;
    const variance_ml = countedMl - r.on_hand_ml;
    const variance_aed = variance_ml * (r.unit_cost / r.bottle_size_ml);

    setSaving((prev) => ({ ...prev, [key]: true }));

    const payload: any = {
      outlet_id: r.outlet_id,
      count_date: new Date().toISOString().split('T')[0],
      counted_ml: countedMl,
      theoretical_ml: r.on_hand_ml,
      variance_ml,
      variance_aed,
    };
    if (r.ingredient_id) {
      payload.ingredient_id = r.ingredient_id;
      await supabase
        .from('inventory_counts')
        .upsert(payload, { onConflict: 'outlet_id,ingredient_id,count_date' });
    } else {
      payload.wine_id = r.wine_id;
      await supabase
        .from('inventory_counts')
        .upsert(payload, { onConflict: 'outlet_id,wine_id,count_date' });
    }

    setSaving((prev) => ({ ...prev, [key]: false }));
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
          <ClipboardCheck className="h-5 w-5 text-amber-400" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-white">Physical Stock Count</h1>
          <p className="text-sm text-zinc-400">
            Enter actual bottle/unit counts — variance vs theoretical on-hand is calculated automatically.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <select
          value={outletId}
          onChange={(e) => setOutletId(e.target.value)}
          className="bg-zinc-900 border border-zinc-800 text-zinc-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
        >
          {outlets.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items..."
            className="bg-zinc-900 border border-zinc-800 text-zinc-200 text-sm rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500/40 w-56"
          />
        </div>

        <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
          {(['all', 'ingredient', 'wine'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`text-xs px-3 py-1.5 rounded-md transition-colors capitalize ${
                filterType === t ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {t === 'all' ? 'All' : t === 'ingredient' ? 'Ingredients' : 'Wines'}
            </button>
          ))}
        </div>

        <span className="text-xs text-zinc-500 ml-auto">{filteredRows.length} items</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-zinc-500 gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading stock...
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900 text-zinc-400 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3">Item</th>
                <th className="text-left px-4 py-3">Category</th>
                <th className="text-right px-4 py-3">Theoretical (units)</th>
                <th className="text-right px-4 py-3">Counted (units)</th>
                <th className="text-right px-4 py-3">Variance</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {filteredRows.map((r) => {
                const key = rowKey(r);
                const theoreticalUnits = r.on_hand_ml / r.bottle_size_ml;
                const countedVal = counts[key];
                const countedUnits = countedVal !== undefined && countedVal !== '' ? parseFloat(countedVal) : null;
                const varianceUnits = countedUnits !== null ? countedUnits - theoreticalUnits : null;
                const isOk = varianceUnits === null || Math.abs(varianceUnits) < 0.15;

                return (
                  <tr key={key} className="bg-zinc-950 hover:bg-zinc-900/60 transition-colors">
                    <td className="px-4 py-2.5 text-zinc-200">{r.name}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${badgeClass(r.category)}`}>
                        {r.category}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right text-zinc-400 tabular-nums">
                      {theoreticalUnits.toFixed(2)}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={counts[key] ?? ''}
                        onChange={(e) => setCounts((prev) => ({ ...prev, [key]: e.target.value }))}
                        placeholder="0.00"
                        className="w-24 bg-zinc-900 border border-zinc-800 text-zinc-100 text-right text-sm rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
                      />
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {varianceUnits === null ? (
                        <span className="text-zinc-600">—</span>
                      ) : (
                        <span
                          className={`flex items-center justify-end gap-1 ${
                            isOk ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {isOk ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                          {varianceUnits > 0 ? '+' : ''}
                          {varianceUnits.toFixed(2)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={() => handleSave(r)}
                        disabled={countedUnits === null || saving[key]}
                        className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 disabled:opacity-30 transition-colors"
                      >
                        {saving[key] ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                        Save
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
