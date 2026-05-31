import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Trash2, ArrowLeftRight, Search, Plus, X } from 'lucide-react';

const OUTLETS = [
  { id: 'b74408fc-3de1-4178-b643-947107c62364', name: 'Bull & Bear' },
  { id: 'c740b7e6-ce62-487d-9ae5-997f536c7a73', name: 'St Trop' },
  { id: '6c7253dd-3885-4ea1-b280-c75741063179', name: 'Peacock Alley' },
  { id: 'c697e95e-f9b2-4431-916e-88950264ea92', name: 'IRD' },
];

const WASTAGE_REASONS = [
  { value: 'spillage', label: 'Spillage' },
  { value: 'breakage', label: 'Breakage' },
  { value: 'expired', label: 'Expired' },
  { value: 'training', label: 'Training' },
  { value: 'quality', label: 'Quality Reject' },
  { value: 'other', label: 'Other' },
];

const UNIT_OPTIONS = [
  { value: 'ml', label: 'ML' },
  { value: 'btl', label: 'BTL' },
  { value: 'keg', label: 'KEG' },
];

interface SearchResult {
  id: string;
  name: string;
  type: 'ingredient' | 'recipe';
  bottle_size?: number;
  unit_cost?: number;
  cost_per_ml?: number;
  category?: string;
  calculated_cost?: number;
  selling_price?: number;
  ingredients?: Array<{ name: string; amount: string }>;
}

interface Adjustment {
  id: string;
  type: string;
  item_type: string;
  ingredient_name: string;
  quantity_value: number;
  quantity_unit: string;
  quantity_ml: number;
  wastage_reason?: string;
  outlet_id?: string;
  outlet_from_id?: string;
  outlet_to_id?: string;
  notes?: string;
  adjustment_date: string;
}

function ItemSearch({ onSelect, resetKey }: { onSelect: (item: SearchResult) => void; resetKey: number }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const skipSearch = useRef(false);

  useEffect(() => {
    setQuery('');
    setSelected(null);
    setResults([]);
    setOpen(false);
    skipSearch.current = false;
  }, [resetKey]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (skipSearch.current) { skipSearch.current = false; return; }
    if (query.length < 2) { setResults([]); setOpen(false); return; }
    const run = async () => {
      const [ingRes, recRes, wineRes] = await Promise.all([
        supabase.from('ingredients')
          .select('id, name, category, bottle_size, unit_cost, cost_per_ml')
          .ilike('name', `%${query}%`).limit(4),
        supabase.from('recipes')
          .select('id, name, category, calculated_cost, selling_price, ingredients')
          .ilike('name', `%${query}%`).limit(4),
        supabase.from('wines')
          .select('id, wine, category, cost_aed')
          .ilike('wine', `%${query}%`).limit(4),
      ]);
      const ingredients: SearchResult[] = (ingRes.data ?? []).map((i) => ({ ...i, type: 'ingredient' as const }));
      const recipes: SearchResult[] = (recRes.data ?? []).map((r) => ({ ...r, type: 'recipe' as const }));
      const wines: SearchResult[] = (wineRes.data ?? []).map((w) => ({
        id: w.id, name: w.wine, type: 'ingredient' as const,
        category: w.category, bottle_size: 750,
        unit_cost: w.cost_aed, cost_per_ml: w.cost_aed ? w.cost_aed / 750 : 0,
      }));
      setResults([...ingredients, ...wines, ...recipes]);
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
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setSelected(null); }}
          onFocus={() => !selected && results.length > 0 && setOpen(true)}
          placeholder="Search ingredient, wine or cocktail..."
          className="luxury-input w-full pl-9 pr-8"
        />
        {query && (
          <button onClick={() => { setQuery(''); setSelected(null); setResults([]); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-20 w-full mt-1 bg-[#1a1a1d] border border-[#2e2e31] rounded-xl overflow-hidden shadow-xl">
          {/* Ingredients group */}
          {results.filter(r => r.type === 'ingredient').length > 0 && (
            <>
              <div className="px-4 py-1.5 text-xs font-semibold text-zinc-600 uppercase tracking-wider border-b border-[#2e2e31]">
                Ingredients & Wines
              </div>
              {results.filter(r => r.type === 'ingredient').map((item) => (
                <button key={item.id}
                  onMouseDown={(e) => { e.preventDefault(); choose(item); }}
                  className="w-full text-left px-4 py-2.5 hover:bg-white/5 transition-colors flex items-center justify-between">
                  <span className="text-white text-sm">{item.name}</span>
                  <span className="text-xs text-zinc-500">{item.category} · {item.bottle_size}ml</span>
                </button>
              ))}
            </>
          )}
          {/* Recipes group */}
          {results.filter(r => r.type === 'recipe').length > 0 && (
            <>
              <div className="px-4 py-1.5 text-xs font-semibold text-zinc-600 uppercase tracking-wider border-b border-[#2e2e31] border-t border-t-[#2e2e31]">
                Cocktails & Recipes
              </div>
              {results.filter(r => r.type === 'recipe').map((item) => (
                <button key={item.id}
                  onMouseDown={(e) => { e.preventDefault(); choose(item); }}
                  className="w-full text-left px-4 py-2.5 hover:bg-white/5 transition-colors flex items-center justify-between">
                  <span className="text-white text-sm">{item.name}</span>
                  <span className="text-xs text-zinc-500">
                    Recipe {item.calculated_cost ? `· AED ${Number(item.calculated_cost).toFixed(2)} cost` : ''}
                  </span>
                </button>
              ))}
            </>
          )}
        </div>
      )}

      {selected && (
        <div className="mt-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-400 flex items-center justify-between">
          {selected.type === 'ingredient' ? (
            <>
              <span>Bottle: {selected.bottle_size}ml · AED {Number(selected.cost_per_ml).toFixed(4)}/ml</span>
              <span className="text-zinc-500">Unit cost: AED {Number(selected.unit_cost).toFixed(2)}</span>
            </>
          ) : (
            <>
              <span className="capitalize">{selected.category}</span>
              {selected.calculated_cost
                ? <span className="text-zinc-500">Cost: AED {Number(selected.calculated_cost).toFixed(2)} · Sell: AED {selected.selling_price}</span>
                : <span className="text-zinc-500">Serving cost not calculated</span>
              }
            </>
          )}
        </div>
      )}
    </div>
  );
}

function QuantityInput({ value, unit, onValueChange, onUnitChange, item }: {
  value: string;
  unit: string;
  onValueChange: (v: string) => void;
  onUnitChange: (u: string) => void;
  item: SearchResult | null;
}) {
  const isRecipe = item?.type === 'recipe';

  // Recipes: GLASS (1 serve) | BATCH (multiple serves) | ML (pre-batch bulk)
  const recipeUnits = [
    { value: 'glass', label: 'GLASS' },
    { value: 'batch', label: 'BATCH' },
    { value: 'ml', label: 'ML' },
  ];

  const mlValue = (() => {
    const v = parseFloat(value);
    if (!v || !item) return null;
    if (isRecipe) {
      return unit === 'ml' ? v : null;
    }
    if (unit === 'ml') return v;
    return v * Number(item.bottle_size ?? 750);
  })();

  const costValue = (() => {
    const v = parseFloat(value);
    if (!v || !item) return null;
    if (isRecipe) {
      // GLASS = 1 serve cost. BATCH = same cost per unit (Sir enters total batches and we treat each batch as 1 serve unless he wants different).
      // For BATCH, we assume 1 batch = full recipe yield (typically 1 serve too unless they pre-batch in 10s — they enter count of batches × calculated_cost).
      if (item.calculated_cost) return v * Number(item.calculated_cost);
      return null;
    }
    if (!mlValue) return null;
    return mlValue * Number(item.cost_per_ml ?? 0);
  })();

  const units = isRecipe ? recipeUnits : UNIT_OPTIONS;

  // Recipe unit hint
  // Batch is standardised at 1000ml (1 litre premix)
  const BATCH_ML = 1000;

  const recipeHint = isRecipe ? (
    unit === 'glass'
      ? 'Single serve — 1 drink'
      : unit === 'batch'
      ? '1 batch = 1 litre premix (1000ml)'
      : 'Pre-batched volume in millilitres'
  ) : null;

  return (
    <div>
      <div className="flex gap-2">
        <input type="number" min="0" step="0.1" value={value}
          onChange={(e) => onValueChange(e.target.value)}
          placeholder="0" className="luxury-input flex-1" />
        <div className="flex bg-[#1a1a1d] border border-[#2e2e31] rounded-xl p-1 gap-1">
          {units.map((opt) => (
            <button key={opt.value} onClick={() => onUnitChange(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                unit === opt.value ? 'bg-amber-500 text-black' : 'text-zinc-400 hover:text-white'
              }`}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      {recipeHint && (
        <p className={`text-xs mt-1.5 ${unit === 'batch' ? 'text-amber-500/80' : 'text-zinc-600 italic'}`}>
          {recipeHint}
        </p>
      )}
      {(mlValue !== null || costValue !== null) && (
        <div className="mt-2 px-3 py-2 bg-[#0a0a0b] border border-[#1e1e21] rounded-lg text-xs text-zinc-400 flex gap-4">
          {mlValue !== null && <span>= <span className="text-white font-mono">{mlValue.toFixed(0)}ml</span></span>}
          {costValue !== null && <span>Cost loss: <span className="text-rose-400 font-mono">AED {costValue.toFixed(2)}</span></span>}
        </div>
      )}
    </div>
  );
}

export function StockAdjustmentsPage() {
  const [activeTab, setActiveTab] = useState<'wastage' | 'transfer'>('wastage');
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [wResetKey, setWResetKey] = useState(0);
  const [tResetKey, setTResetKey] = useState(0);

  const [wItem, setWItem] = useState<SearchResult | null>(null);
  const [wQty, setWQty] = useState('');
  const [wUnit, setWUnit] = useState('btl');
  const [wOutlet, setWOutlet] = useState(OUTLETS[0].id);
  const [wReason, setWReason] = useState('spillage');
  const [wDate, setWDate] = useState(new Date().toISOString().split('T')[0]);
  const [wNotes, setWNotes] = useState('');

  const [tItem, setTItem] = useState<SearchResult | null>(null);
  const [tQty, setTQty] = useState('');
  const [tUnit, setTUnit] = useState('btl');
  const [tFrom, setTFrom] = useState(OUTLETS[0].id);
  const [tTo, setTTo] = useState(OUTLETS[1].id);
  const [tDate, setTDate] = useState(new Date().toISOString().split('T')[0]);
  const [tNotes, setTNotes] = useState('');

  const fetchAdjustments = async () => {
    setLoading(true);
    const { data } = await supabase.from('stock_adjustments')
      .select('*').order('created_at', { ascending: false }).limit(50);
    setAdjustments(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchAdjustments(); }, []);

  const calcMl = (value: string, unit: string, item: SearchResult | null) => {
    const v = parseFloat(value);
    if (!v) return 0;
    if (item?.type === 'recipe') {
      if (unit === 'ml') return v;
      if (unit === 'batch') return v * 1000;
      return 0; // glass — no ml equivalent stored
    }
    if (unit === 'ml') return v;
    return v * Number(item?.bottle_size ?? 750);
  };

  const saveWastage = async () => {
    if (!wItem || !wQty) return;
    setSaving(true);
    const ml = calcMl(wQty, wUnit, wItem);
    await supabase.from('stock_adjustments').insert({
      type: 'wastage',
      item_type: wItem.type,
      outlet_id: wOutlet,
      ingredient_id: wItem.type === 'ingredient' ? wItem.id : null,
      recipe_id: wItem.type === 'recipe' ? wItem.id : null,
      ingredient_name: wItem.name,
      quantity_value: parseFloat(wQty),
      quantity_unit: wUnit,
      quantity_ml: ml,
      wastage_reason: wReason,
      notes: wNotes || null,
      adjustment_date: wDate,
    });
    setWQty(''); setWNotes(''); setWItem(null);
    setWResetKey(k => k + 1);
    await fetchAdjustments();
    setSaving(false);
  };

  const saveTransfer = async () => {
    if (!tItem || !tQty || tFrom === tTo) return;
    setSaving(true);
    const ml = calcMl(tQty, tUnit, tItem);
    await supabase.from('stock_adjustments').insert({
      type: 'transfer',
      item_type: tItem.type,
      outlet_from_id: tFrom,
      outlet_to_id: tTo,
      ingredient_id: tItem.type === 'ingredient' ? tItem.id : null,
      recipe_id: tItem.type === 'recipe' ? tItem.id : null,
      ingredient_name: tItem.name,
      quantity_value: parseFloat(tQty),
      quantity_unit: tUnit,
      quantity_ml: ml,
      notes: tNotes || null,
      adjustment_date: tDate,
    });
    setTQty(''); setTNotes(''); setTItem(null);
    setTResetKey(k => k + 1);
    await fetchAdjustments();
    setSaving(false);
  };

  const outletName = (id?: string) => OUTLETS.find((o) => o.id === id)?.name ?? '—';
  const recentWastage = adjustments.filter((a) => a.type === 'wastage');
  const recentTransfers = adjustments.filter((a) => a.type === 'transfer');

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Stock Adjustments</h1>
        <p className="text-zinc-500 text-sm mt-1">Record wastage and inter-outlet transfers for ingredients and cocktails</p>
      </div>

      <div className="flex gap-1 mb-6 bg-[#111113] border border-[#1e1e21] rounded-xl p-1 w-fit">
        <button onClick={() => setActiveTab('wastage')}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'wastage' ? 'bg-rose-500/90 text-white' : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }`}>
          <Trash2 className="h-4 w-4" /> Wastage
        </button>
        <button onClick={() => setActiveTab('transfer')}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'transfer' ? 'bg-blue-500/90 text-white' : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }`}>
          <ArrowLeftRight className="h-4 w-4" /> Transfer
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="bg-[#111113] border border-[#1e1e21] rounded-2xl p-6">
          <h2 className="text-white font-semibold mb-5">
            {activeTab === 'wastage' ? 'Record Wastage' : 'Record Transfer'}
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wide">Item</label>
              <ItemSearch
                onSelect={(item) => {
                  if (activeTab === 'wastage') {
                    setWItem(item);
                    setWUnit(item.type === 'recipe' ? 'glass' : 'btl');
                  } else {
                    setTItem(item);
                    setTUnit(item.type === 'recipe' ? 'glass' : 'btl');
                  }
                }}
                resetKey={activeTab === 'wastage' ? wResetKey : tResetKey}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wide">
                Quantity {(activeTab === 'wastage' ? wItem : tItem)?.type === 'recipe' ? '(serves)' : ''}
              </label>
              {activeTab === 'wastage' ? (
                <QuantityInput value={wQty} unit={wUnit} onValueChange={setWQty} onUnitChange={setWUnit} item={wItem} />
              ) : (
                <QuantityInput value={tQty} unit={tUnit} onValueChange={setTQty} onUnitChange={setTUnit} item={tItem} />
              )}
            </div>

            {activeTab === 'wastage' ? (
              <>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wide">Outlet</label>
                  <select value={wOutlet} onChange={(e) => setWOutlet(e.target.value)} className="luxury-input w-full">
                    {OUTLETS.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wide">Reason</label>
                  <div className="flex flex-wrap gap-2">
                    {WASTAGE_REASONS.map((r) => (
                      <button key={r.value} onClick={() => setWReason(r.value)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                          wReason === r.value
                            ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                            : 'border-[#2e2e31] text-zinc-400 hover:text-white hover:border-zinc-500'
                        }`}>
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wide">From</label>
                  <select value={tFrom} onChange={(e) => setTFrom(e.target.value)} className="luxury-input w-full">
                    {OUTLETS.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wide">To</label>
                  <select value={tTo} onChange={(e) => setTTo(e.target.value)} className="luxury-input w-full">
                    {OUTLETS.filter((o) => o.id !== tFrom).map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wide">Date</label>
              <input type="date" value={activeTab === 'wastage' ? wDate : tDate}
                onChange={(e) => activeTab === 'wastage' ? setWDate(e.target.value) : setTDate(e.target.value)}
                className="luxury-input w-full" />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wide">Notes (optional)</label>
              <input value={activeTab === 'wastage' ? wNotes : tNotes}
                onChange={(e) => activeTab === 'wastage' ? setWNotes(e.target.value) : setTNotes(e.target.value)}
                placeholder="Any additional context..."
                className="luxury-input w-full" />
            </div>

            <button
              onClick={activeTab === 'wastage' ? saveWastage : saveTransfer}
              disabled={saving || (activeTab === 'wastage' ? !wItem || !wQty : !tItem || !tQty)}
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                activeTab === 'wastage'
                  ? 'bg-rose-500/90 hover:bg-rose-500 text-white'
                  : 'bg-blue-500/90 hover:bg-blue-500 text-white'
              }`}>
              <Plus className="h-4 w-4" />
              {saving ? 'Saving...' : activeTab === 'wastage' ? 'Record Wastage' : 'Record Transfer'}
            </button>
          </div>
        </div>

        {/* Log */}
        <div className="bg-[#111113] border border-[#1e1e21] rounded-2xl p-6">
          <h2 className="text-white font-semibold mb-5">
            Recent {activeTab === 'wastage' ? 'Wastage' : 'Transfers'}
          </h2>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
              {(activeTab === 'wastage' ? recentWastage : recentTransfers).length === 0 ? (
                <p className="text-zinc-600 text-sm text-center py-10">No entries yet</p>
              ) : (
                (activeTab === 'wastage' ? recentWastage : recentTransfers).map((a) => (
                  <div key={a.id} className="px-4 py-3 bg-[#0a0a0b] border border-[#1e1e21] rounded-xl">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-white text-sm font-medium">{a.ingredient_name}</p>
                          {a.item_type === 'recipe' && (
                            <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400">cocktail</span>
                          )}
                        </div>
                        <p className="text-zinc-500 text-xs mt-0.5">
                          {a.quantity_value} {a.quantity_unit.toUpperCase()}
                          {a.item_type !== 'recipe' && ` · ${Number(a.quantity_ml).toFixed(0)}ml`}
                          {a.item_type === 'recipe' && a.quantity_unit === 'ml' && ` · ${Number(a.quantity_ml).toFixed(0)}ml`}
                          {a.type === 'wastage' && a.wastage_reason && (
                            <span className="ml-2 text-rose-400 capitalize">{a.wastage_reason}</span>
                          )}
                          {a.type === 'transfer' && (
                            <span className="ml-2 text-blue-400">
                              {outletName(a.outlet_from_id)} → {outletName(a.outlet_to_id)}
                            </span>
                          )}
                        </p>
                        {a.notes && <p className="text-zinc-600 text-xs mt-0.5 italic">{a.notes}</p>}
                      </div>
                      <span className="text-zinc-600 text-xs shrink-0">{a.adjustment_date}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
