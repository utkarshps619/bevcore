import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Plus, X, Truck, Package } from 'lucide-react';

const OUTLETS = [
  { id: 'b74408fc-3de1-4178-b643-947107c62364', name: 'Bull & Bear' },
  { id: 'c740b7e6-ce62-487d-9ae5-997f536c7a73', name: 'St Trop' },
  { id: '6c7253dd-3885-4ea1-b280-c75741063179', name: 'Peacock Alley' },
  { id: 'c697e95e-f9b2-4431-916e-88950264ea92', name: 'IRD' },
];

const UNIT_OPTIONS = [
  { value: 'btl', label: 'BTL' },
  { value: 'cs',  label: 'CASE' },
  { value: 'keg', label: 'KEG' },
  { value: 'ml',  label: 'ML' },
];

interface SearchResult {
  id: string;
  name: string;
  category: string;
  bottle_size: number;
  unit_cost: number;
  cost_per_ml: number;
  isWine?: boolean;
}

interface Delivery {
  id: string;
  ingredient_name: string;
  quantity_value: number;
  quantity_unit: string;
  quantity_ml: number;
  unit_cost_aed?: number;
  total_cost_aed?: number;
  supplier?: string;
  invoice_number?: string;
  delivery_date: string;
  outlet_id: string;
  notes?: string;
}

function IngredientSearch({ onSelect, resetKey }: { onSelect: (item: SearchResult) => void; resetKey: number }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const skipSearch = useRef(false);

  useEffect(() => { setQuery(''); setSelected(null); setResults([]); setOpen(false); skipSearch.current = false; }, [resetKey]);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (skipSearch.current) { skipSearch.current = false; return; }
    if (query.length < 2) { setResults([]); setOpen(false); return; }
    const run = async () => {
      const [ingRes, wineRes] = await Promise.all([
        supabase.from('ingredients').select('id, name, category, bottle_size, unit_cost, cost_per_ml').ilike('name', `%${query}%`).limit(5),
        supabase.from('wines').select('id, wine, category, cost_aed').ilike('wine', `%${query}%`).limit(4),
      ]);
      const ings: SearchResult[] = (ingRes.data ?? []).map(i => ({ ...i, type: 'ingredient' }));
      const wines: SearchResult[] = (wineRes.data ?? []).map(w => ({
        id: w.id, name: w.wine, category: w.category,
        bottle_size: 750, unit_cost: w.cost_aed ?? 0,
        cost_per_ml: w.cost_aed ? w.cost_aed / 750 : 0, isWine: true,
      }));
      setResults([...ings, ...wines]);
      setOpen(true);
    };
    run();
  }, [query]);

  const choose = (item: SearchResult) => {
    skipSearch.current = true;
    setSelected(item);
    setQuery(item.name);
    setOpen(false);
    onSelect(item);
  };

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
        <input value={query} onChange={e => { setQuery(e.target.value); setSelected(null); }}
          onFocus={() => !selected && results.length > 0 && setOpen(true)}
          placeholder="Search ingredient or wine..."
          className="luxury-input w-full pl-9 pr-8" />
        {query && (
          <button onMouseDown={e => { e.preventDefault(); setQuery(''); setSelected(null); setResults([]); setOpen(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-20 w-full mt-1 bg-[#1a1a1d] border border-[#2e2e31] rounded-xl overflow-hidden shadow-xl">
          {results.map(item => (
            <button key={item.id} onMouseDown={e => { e.preventDefault(); choose(item); }}
              className="w-full text-left px-4 py-2.5 hover:bg-white/5 transition-colors flex items-center justify-between">
              <span className="text-white text-sm">{item.name}</span>
              <span className="text-xs text-zinc-500">{item.category} · {item.bottle_size}ml</span>
            </button>
          ))}
        </div>
      )}
      {selected && (
        <div className="mt-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs flex justify-between">
          <span className="text-amber-400">{selected.category} · {selected.bottle_size}ml bottle</span>
          <span className="text-zinc-500">Last cost: AED {Number(selected.unit_cost).toFixed(2)}</span>
        </div>
      )}
    </div>
  );
}

export function DeliveriesPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  const [item, setItem] = useState<SearchResult | null>(null);
  const [qty, setQty] = useState('');
  const [unit, setUnit] = useState('btl');
  const [outlet, setOutlet] = useState(OUTLETS[0].id);
  const [unitCost, setUnitCost] = useState('');
  const [supplier, setSupplier] = useState('');
  const [invoice, setInvoice] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  const fetchDeliveries = async () => {
    setLoading(true);
    const { data } = await supabase.from('deliveries').select('*').order('created_at', { ascending: false }).limit(50);
    setDeliveries(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchDeliveries(); }, []);

  const calcMl = (value: string, unit: string, item: SearchResult | null): number => {
    const v = parseFloat(value);
    if (!v) return 0;
    const bottleSize = item?.bottle_size ?? 750;
    if (unit === 'ml') return v;
    if (unit === 'btl') return v * bottleSize;
    if (unit === 'keg') return v * bottleSize;
    if (unit === 'cs') return v * bottleSize; // bottle_size holds per-bottle ml; case qty assumed in name
    return v * bottleSize;
  };

  const totalMl = calcMl(qty, unit, item);
  const costOverride = unitCost ? parseFloat(unitCost) : null;
  const totalCost = costOverride && qty ? costOverride * parseFloat(qty) : null;

  const handleSave = async () => {
    if (!item || !qty) return;
    setSaving(true);
    const ml = calcMl(qty, unit, item);
    await supabase.from('deliveries').insert({
      outlet_id: outlet,
      ingredient_id: item.isWine ? null : item.id,
      wine_id: item.isWine ? item.id : null,
      item_type: item.isWine ? 'wine' : 'ingredient',
      ingredient_name: item.name,
      quantity_value: parseFloat(qty),
      quantity_unit: unit,
      quantity_ml: ml,
      unit_cost_aed: costOverride,
      total_cost_aed: totalCost,
      supplier: supplier || null,
      invoice_number: invoice || null,
      delivery_date: date,
      notes: notes || null,
    });
    // Update ingredient cost if overridden
    if (costOverride && !item.isWine) {
      const newCostPerMl = parseFloat((costOverride / (item.bottle_size ?? 750)).toFixed(5));
      await supabase.from('ingredients').update({
        unit_cost: costOverride,
        cost_per_ml: newCostPerMl,
        sgl_shot_cost: parseFloat((newCostPerMl * 30).toFixed(4)),
        dbl_shot_cost: parseFloat((newCostPerMl * 60).toFixed(4)),
      }).eq('id', item.id);
    }
    setQty(''); setUnitCost(''); setSupplier(''); setInvoice(''); setNotes(''); setItem(null);
    setResetKey(k => k + 1);
    await fetchDeliveries();
    setSaving(false);
  };

  const outletName = (id: string) => OUTLETS.find(o => o.id === id)?.name ?? '—';

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Truck className="h-6 w-6 text-amber-400" />
          Deliveries
        </h1>
        <p className="text-zinc-500 text-sm mt-1">Record incoming stock — updates on-hand inventory automatically</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="bg-[#111113] border border-[#1e1e21] rounded-2xl p-6">
          <h2 className="text-white font-semibold mb-5">Record Delivery</h2>
          <div className="space-y-4">

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wide">Item</label>
              <IngredientSearch onSelect={setItem} resetKey={resetKey} />
            </div>

            {/* Quantity + unit */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wide">Quantity</label>
              <div className="flex gap-2">
                <input type="number" min="0" step="0.1" value={qty}
                  onChange={e => setQty(e.target.value)}
                  placeholder="0" className="luxury-input flex-1" />
                <div className="flex bg-[#1a1a1d] border border-[#2e2e31] rounded-xl p-1 gap-1">
                  {UNIT_OPTIONS.map(opt => (
                    <button key={opt.value} onClick={() => setUnit(opt.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        unit === opt.value ? 'bg-amber-500 text-black' : 'text-zinc-400 hover:text-white'
                      }`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              {totalMl > 0 && (
                <p className="text-xs text-zinc-500 mt-1.5">
                  = <span className="text-white font-mono">{totalMl.toFixed(0)}ml</span>
                  {totalCost && <span className="ml-3">Total cost: <span className="text-amber-400 font-mono">AED {totalCost.toFixed(2)}</span></span>}
                </p>
              )}
            </div>

            {/* Outlet */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wide">Outlet</label>
              <select value={outlet} onChange={e => setOutlet(e.target.value)} className="luxury-input w-full">
                {OUTLETS.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>

            {/* Unit cost + supplier row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wide">
                  Unit Cost (AED)
                  <span className="text-zinc-600 normal-case ml-1">— updates ingredient</span>
                </label>
                <input type="number" step="0.01" value={unitCost}
                  onChange={e => setUnitCost(e.target.value)}
                  placeholder={item ? `Current: ${Number(item.unit_cost).toFixed(2)}` : 'Optional'}
                  className="luxury-input w-full" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wide">Supplier</label>
                <input value={supplier} onChange={e => setSupplier(e.target.value)}
                  placeholder="MMI, African+Eastern..." className="luxury-input w-full" />
              </div>
            </div>

            {/* Invoice + date row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wide">Invoice No.</label>
                <input value={invoice} onChange={e => setInvoice(e.target.value)}
                  placeholder="Optional" className="luxury-input w-full" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wide">Date</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="luxury-input w-full" />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wide">Notes (optional)</label>
              <input value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Any additional context..." className="luxury-input w-full" />
            </div>

            <button onClick={handleSave} disabled={saving || !item || !qty}
              className="w-full luxury-button flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
              <Plus className="h-4 w-4" />
              {saving ? 'Saving...' : 'Record Delivery'}
            </button>
          </div>
        </div>

        {/* Log */}
        <div className="bg-[#111113] border border-[#1e1e21] rounded-2xl p-6">
          <h2 className="text-white font-semibold mb-5 flex items-center gap-2">
            <Package className="h-4 w-4 text-amber-400" />
            Recent Deliveries
          </h2>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
            </div>
          ) : deliveries.length === 0 ? (
            <div className="text-center py-16">
              <Truck className="h-10 w-10 text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-600 text-sm">No deliveries recorded yet</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
              {deliveries.map(d => (
                <div key={d.id} className="px-4 py-3 bg-[#0a0a0b] border border-[#1e1e21] rounded-xl">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-white text-sm font-medium truncate">{d.ingredient_name}</p>
                      <p className="text-zinc-500 text-xs mt-0.5">
                        {d.quantity_value} {d.quantity_unit.toUpperCase()} · {Number(d.quantity_ml).toFixed(0)}ml
                        <span className="ml-2 text-emerald-400">{outletName(d.outlet_id)}</span>
                        {d.supplier && <span className="ml-2 text-zinc-600">· {d.supplier}</span>}
                      </p>
                      {d.total_cost_aed && (
                        <p className="text-xs text-amber-400/80 mt-0.5">AED {Number(d.total_cost_aed).toFixed(2)} total</p>
                      )}
                      {d.invoice_number && (
                        <p className="text-xs text-zinc-600 mt-0.5">Inv: {d.invoice_number}</p>
                      )}
                    </div>
                    <span className="text-zinc-600 text-xs shrink-0 mt-0.5">{d.delivery_date}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
