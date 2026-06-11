import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Users, Plus, AlertTriangle, CheckCircle2, Loader2, Trash2 } from 'lucide-react';

interface Outlet {
  id: string;
  name: string;
}

interface Item {
  id: string;
  name: string;
  category: string;
  bottle_size_ml: number;
  unit_cost: number;
  item_type: 'ingredient' | 'wine';
}

interface LogRow {
  id: string;
  outlet_id: string;
  shift_date: string;
  shift_type: string;
  staff_name: string;
  ingredient_id: string | null;
  wine_id: string | null;
  opening_ml: number;
  closing_ml: number;
  expected_usage_ml: number;
  actual_usage_ml: number;
  variance_ml: number;
  variance_aed: number;
  notes: string | null;
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

const todayStr = () => new Date().toISOString().split('T')[0];

export function ShiftVariancePage() {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [outletId, setOutletId] = useState('');
  const [shiftDate, setShiftDate] = useState(todayStr());
  const [shiftType, setShiftType] = useState<'AM' | 'PM' | 'Night'>('PM');
  const [staffName, setStaffName] = useState('');

  const [items, setItems] = useState<Item[]>([]);
  const [itemKey, setItemKey] = useState('');
  const [openingUnits, setOpeningUnits] = useState('');
  const [closingUnits, setClosingUnits] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

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
    const loadItems = async () => {
      const { data: stockData } = await supabase
        .from('inventory_stock')
        .select('ingredient_id, wine_id')
        .eq('outlet_id', outletId)
        .gt('opening_stock_ml', 0);

      const stock = stockData || [];
      const ingredientIds = stock.filter((s) => s.ingredient_id).map((s) => s.ingredient_id as string);
      const wineIds = stock.filter((s) => s.wine_id).map((s) => s.wine_id as string);

      const [ingredientsRes, winesRes] = await Promise.all([
        ingredientIds.length
          ? supabase.from('ingredients').select('id, name, category, bottle_size, unit_cost').in('id', ingredientIds)
          : Promise.resolve({ data: [] as any[] }),
        wineIds.length
          ? supabase.from('wines').select('id, wine, category, format, cost_aed').in('id', wineIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const built: Item[] = [
        ...(ingredientsRes.data || []).map((i: any) => ({
          id: i.id,
          name: i.name,
          category: i.category,
          bottle_size_ml: Number(i.bottle_size) || 750,
          unit_cost: Number(i.unit_cost) || 0,
          item_type: 'ingredient' as const,
        })),
        ...(winesRes.data || []).map((w: any) => ({
          id: w.id,
          name: w.wine,
          category: w.category,
          bottle_size_ml: parseFormatMl(w.format),
          unit_cost: Number(w.cost_aed) || 0,
          item_type: 'wine' as const,
        })),
      ];

      built.sort((a, b) => a.name.localeCompare(b.name));
      setItems(built);
      setItemKey('');
    };
    loadItems();
  }, [outletId]);

  const refreshLogs = async () => {
    if (!outletId) return;
    setLoadingLogs(true);
    const { data } = await supabase
      .from('shift_variance_logs')
      .select('*')
      .eq('outlet_id', outletId)
      .eq('shift_date', shiftDate)
      .order('created_at', { ascending: false });
    setLogs(data || []);
    setLoadingLogs(false);
  };

  useEffect(() => {
    refreshLogs();
  }, [outletId, shiftDate]);

  const selectedItem = useMemo(() => {
    if (!itemKey) return null;
    const [type, id] = itemKey.split(':');
    return items.find((i) => i.item_type === type && i.id === id) || null;
  }, [itemKey, items]);

  const itemNameById = useMemo(() => {
    const map = new Map<string, Item>();
    items.forEach((i) => map.set(`${i.item_type}:${i.id}`, i));
    return map;
  }, [items]);

  const handleAdd = async () => {
    setError(null);
    if (!selectedItem || !staffName.trim()) {
      setError('Select an item and enter the staff name.');
      return;
    }
    const opening = parseFloat(openingUnits);
    const closing = parseFloat(closingUnits);
    if (isNaN(opening) || isNaN(closing) || opening < 0 || closing < 0) {
      setError('Enter valid opening and closing counts.');
      return;
    }

    setSaving(true);
    try {
      const opening_ml = opening * selectedItem.bottle_size_ml;
      const closing_ml = closing * selectedItem.bottle_size_ml;

      let expected_usage_ml = 0;
      if (selectedItem.item_type === 'ingredient') {
        const { data: txns } = await supabase
          .from('inventory_transactions')
          .select('quantity_ml')
          .eq('outlet_id', outletId)
          .eq('ingredient_id', selectedItem.id)
          .eq('transaction_type', 'sale_deduction')
          .eq('sale_date', shiftDate);
        expected_usage_ml = (txns || []).reduce((sum, t) => sum + Math.abs(Number(t.quantity_ml) || 0), 0);
      }

      const actual_usage_ml = opening_ml - closing_ml;
      const variance_ml = actual_usage_ml - expected_usage_ml;
      const variance_aed = variance_ml * (selectedItem.unit_cost / selectedItem.bottle_size_ml);

      const payload: any = {
        outlet_id: outletId,
        shift_date: shiftDate,
        shift_type: shiftType,
        staff_name: staffName.trim(),
        opening_ml,
        closing_ml,
        expected_usage_ml,
        variance_aed,
        notes: notes.trim() || null,
      };
      if (selectedItem.item_type === 'ingredient') payload.ingredient_id = selectedItem.id;
      else payload.wine_id = selectedItem.id;

      const { error: insertError } = await supabase.from('shift_variance_logs').insert(payload);
      if (insertError) throw insertError;

      setOpeningUnits('');
      setClosingUnits('');
      setNotes('');
      setItemKey('');
      await refreshLogs();
    } catch (err: any) {
      setError(err.message || 'Failed to save entry');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from('shift_variance_logs').delete().eq('id', id);
    await refreshLogs();
  };

  const staffSummary = useMemo(() => {
    const map = new Map<string, { count: number; variance_aed: number }>();
    logs.forEach((l) => {
      const cur = map.get(l.staff_name) || { count: 0, variance_aed: 0 };
      cur.count += 1;
      cur.variance_aed += Number(l.variance_aed) || 0;
      map.set(l.staff_name, cur);
    });
    return Array.from(map.entries()).sort((a, b) => a[1].variance_aed - b[1].variance_aed);
  }, [logs]);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
          <Users className="h-5 w-5 text-amber-400" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-white">Staff Shift Variance</h1>
          <p className="text-sm text-zinc-400">
            Log opening/closing counts per shift — variance vs POS-expected usage is attributed to the staff member.
          </p>
        </div>
      </div>

      {/* Filters */}
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

        <input
          type="date"
          value={shiftDate}
          onChange={(e) => setShiftDate(e.target.value)}
          className="bg-zinc-900 border border-zinc-800 text-zinc-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
        />

        <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
          {(['AM', 'PM', 'Night'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setShiftType(t)}
              className={`text-xs px-3 py-1.5 rounded-md transition-colors ${
                shiftType === t ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Entry form */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 mb-6 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <input
            value={staffName}
            onChange={(e) => setStaffName(e.target.value)}
            placeholder="Staff name"
            className="bg-zinc-900 border border-zinc-800 text-zinc-100 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
          />

          <select
            value={itemKey}
            onChange={(e) => setItemKey(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 text-zinc-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500/40 lg:col-span-2"
          >
            <option value="">Select item...</option>
            {items.map((i) => (
              <option key={`${i.item_type}:${i.id}`} value={`${i.item_type}:${i.id}`}>
                {i.name} ({i.category})
              </option>
            ))}
          </select>

          <input
            type="number"
            step="0.01"
            min="0"
            value={openingUnits}
            onChange={(e) => setOpeningUnits(e.target.value)}
            placeholder="Opening (units)"
            className="bg-zinc-900 border border-zinc-800 text-zinc-100 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
          />

          <input
            type="number"
            step="0.01"
            min="0"
            value={closingUnits}
            onChange={(e) => setClosingUnits(e.target.value)}
            placeholder="Closing (units)"
            className="bg-zinc-900 border border-zinc-800 text-zinc-100 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
          />
        </div>

        <div className="flex gap-3">
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (optional)"
            className="flex-1 bg-zinc-900 border border-zinc-800 text-zinc-100 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
          />
          <button
            onClick={handleAdd}
            disabled={saving}
            className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 disabled:opacity-40 transition-colors"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Log Entry
          </button>
        </div>

        {error && <p className="text-rose-400 text-sm">{error}</p>}
      </div>

      {/* Staff summary */}
      {staffSummary.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
          {staffSummary.map(([name, s]) => (
            <div key={name} className="rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3">
              <p className="text-zinc-200 text-sm font-medium">{name}</p>
              <p className="text-xs text-zinc-500 mb-1">{s.count} item(s) logged</p>
              <p className={`text-sm font-semibold ${s.variance_aed < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {s.variance_aed >= 0 ? '+' : ''}
                {s.variance_aed.toFixed(2)} AED variance
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Logs table */}
      {loadingLogs ? (
        <div className="flex items-center justify-center py-12 text-zinc-500 gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading entries...
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12 text-zinc-500 text-sm">No shift variance entries logged for this date.</div>
      ) : (
        <div className="rounded-xl border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900 text-zinc-400 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3">Staff</th>
                <th className="text-left px-4 py-3">Shift</th>
                <th className="text-left px-4 py-3">Item</th>
                <th className="text-right px-4 py-3">Actual Usage</th>
                <th className="text-right px-4 py-3">Expected Usage</th>
                <th className="text-right px-4 py-3">Variance</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {logs.map((l) => {
                const key = l.ingredient_id ? `ingredient:${l.ingredient_id}` : `wine:${l.wine_id}`;
                const item = itemNameById.get(key);
                const isOk = Math.abs(Number(l.variance_aed)) < 5;
                return (
                  <tr key={l.id} className="bg-zinc-950 hover:bg-zinc-900/60 transition-colors">
                    <td className="px-4 py-2.5 text-zinc-200">{l.staff_name}</td>
                    <td className="px-4 py-2.5 text-zinc-400">{l.shift_type}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-200">{item?.name || '—'}</span>
                        {item && (
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${badgeClass(item.category)}`}>
                            {item.category}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right text-zinc-400 tabular-nums">
                      {Number(l.actual_usage_ml).toFixed(0)} ml
                    </td>
                    <td className="px-4 py-2.5 text-right text-zinc-400 tabular-nums">
                      {Number(l.expected_usage_ml).toFixed(0)} ml
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      <span className={`flex items-center justify-end gap-1 ${isOk ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isOk ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                        {Number(l.variance_aed) >= 0 ? '+' : ''}
                        {Number(l.variance_aed).toFixed(2)} AED
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={() => handleDelete(l.id)}
                        className="text-zinc-500 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
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
