import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Plus, FlaskConical, Pencil, X, Save } from 'lucide-react';

const INGREDIENT_TABS = [
  { key: 'all', label: 'All' },
  { key: 'Spirit', label: 'Spirits' },
  { key: 'Liqueur', label: 'Liqueurs' },
  { key: 'Beer', label: 'Beers' },
  { key: 'Wine', label: 'Wines' },
  { key: 'Other', label: 'Others' },
];

interface Ingredient {
  id: string;
  name: string;
  category: string;
  bottle_size: number;
  unit_cost: number;
  cost_per_ml: number;
  sgl_shot_cost?: number;
  dbl_shot_cost?: number;
  supplier?: string;
}

interface Wine {
  id: string;
  wine: string;
  category: string;
  format?: string;
  country?: string;
  region?: string;
  grape?: string;
  vintage?: string;
  supplier?: string;
  cost_aed?: number;
  bottle_selling_price_aed?: number;
  pct_cost?: number;
  glass_selling_price_aed?: number;
  glass_size_ml?: number;
  outlets?: string;
  notes?: string;
}

function EditIngredientModal({ item, onClose, onSave }: { item: Ingredient; onClose: () => void; onSave: (updated: Partial<Ingredient>) => Promise<void> }) {
  const [form, setForm] = useState({
    name: item.name,
    category: item.category,
    bottle_size: item.bottle_size?.toString() ?? '',
    unit_cost: item.unit_cost?.toString() ?? '',
    supplier: item.supplier ?? '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const bottleSize = parseFloat(form.bottle_size);
    const unitCost = parseFloat(form.unit_cost);
    const costPerMl = bottleSize > 0 ? unitCost / bottleSize : 0;
    await onSave({
      name: form.name,
      category: form.category,
      bottle_size: bottleSize,
      unit_cost: unitCost,
      cost_per_ml: parseFloat(costPerMl.toFixed(5)),
      sgl_shot_cost: parseFloat((costPerMl * 30).toFixed(4)),
      dbl_shot_cost: parseFloat((costPerMl * 60).toFixed(4)),
      supplier: form.supplier || null,
    });
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#111113] border border-[#2e2e31] rounded-2xl p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-semibold text-lg">Edit Ingredient</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wide">Name</label>
            <input className="luxury-input w-full" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wide">Category</label>
            <select className="luxury-input w-full" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              <option>Spirit</option>
              <option>Liqueur</option>
              <option>Beer</option>
              <option>Other</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wide">Bottle Size (ml)</label>
              <input type="number" className="luxury-input w-full" value={form.bottle_size} onChange={(e) => setForm({ ...form, bottle_size: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wide">Unit Cost (AED)</label>
              <input type="number" step="0.01" className="luxury-input w-full" value={form.unit_cost} onChange={(e) => setForm({ ...form, unit_cost: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wide">Supplier</label>
            <input className="luxury-input w-full" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} />
          </div>
          {form.bottle_size && form.unit_cost && (
            <div className="bg-[#0a0a0b] border border-[#1e1e21] rounded-lg px-4 py-3 text-sm text-zinc-400">
              Cost/ml: <span className="text-amber-400 font-mono">{(parseFloat(form.unit_cost) / parseFloat(form.bottle_size)).toFixed(4)}</span>
              &nbsp;&nbsp;·&nbsp;&nbsp;
              Sgl shot (30ml): <span className="text-amber-400 font-mono">AED {((parseFloat(form.unit_cost) / parseFloat(form.bottle_size)) * 30).toFixed(2)}</span>
            </div>
          )}
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-[#2e2e31] text-zinc-400 hover:text-white text-sm transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 luxury-button flex items-center justify-center gap-2 text-sm">
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditWineModal({ item, onClose, onSave }: { item: Wine; onClose: () => void; onSave: (updated: Partial<Wine>) => Promise<void> }) {
  const [form, setForm] = useState({
    wine: item.wine ?? '',
    category: item.category ?? '',
    vintage: item.vintage ?? '',
    supplier: item.supplier ?? '',
    country: item.country ?? '',
    region: item.region ?? '',
    grape: item.grape ?? '',
    cost_aed: item.cost_aed?.toString() ?? '',
    bottle_selling_price_aed: item.bottle_selling_price_aed?.toString() ?? '',
    glass_selling_price_aed: item.glass_selling_price_aed?.toString() ?? '',
    glass_size_ml: item.glass_size_ml?.toString() ?? '',
    outlets: item.outlets ?? '',
    notes: item.notes ?? '',
  });
  const [saving, setSaving] = useState(false);

  const pctCost = form.cost_aed && form.bottle_selling_price_aed
    ? (parseFloat(form.cost_aed) / parseFloat(form.bottle_selling_price_aed))
    : null;

  const handleSave = async () => {
    setSaving(true);
    const cost = form.cost_aed ? parseFloat(form.cost_aed) : null;
    const price = form.bottle_selling_price_aed ? parseFloat(form.bottle_selling_price_aed) : null;
    await onSave({
      wine: form.wine,
      category: form.category,
      vintage: form.vintage || null,
      supplier: form.supplier || null,
      country: form.country || null,
      region: form.region || null,
      grape: form.grape || null,
      cost_aed: cost,
      bottle_selling_price_aed: price,
      pct_cost: cost && price ? parseFloat((cost / price).toFixed(4)) : null,
      glass_selling_price_aed: form.glass_selling_price_aed ? parseFloat(form.glass_selling_price_aed) : null,
      glass_size_ml: form.glass_size_ml ? parseInt(form.glass_size_ml) : null,
      outlets: form.outlets || null,
      notes: form.notes || null,
    });
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#111113] border border-[#2e2e31] rounded-2xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-semibold text-lg">Edit Wine</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wide">Wine Name</label>
            <input className="luxury-input w-full" value={form.wine} onChange={(e) => setForm({ ...form, wine: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wide">Type</label>
              <select className="luxury-input w-full" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {['Red','White','Rose','Champagne','Champagne Rose','Champagne BDB','Sparkling','Dessert','Orange','Non Alcoholic'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wide">Vintage</label>
              <input className="luxury-input w-full" value={form.vintage} onChange={(e) => setForm({ ...form, vintage: e.target.value })} placeholder="NV / 2022 / TBC" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wide">Country</label>
              <input className="luxury-input w-full" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wide">Supplier</label>
              <input className="luxury-input w-full" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wide">Grape</label>
            <input className="luxury-input w-full" value={form.grape} onChange={(e) => setForm({ ...form, grape: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wide">Cost (AED)</label>
              <input type="number" step="0.01" className="luxury-input w-full" value={form.cost_aed} onChange={(e) => setForm({ ...form, cost_aed: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wide">Bottle Price (AED)</label>
              <input type="number" step="0.01" className="luxury-input w-full" value={form.bottle_selling_price_aed} onChange={(e) => setForm({ ...form, bottle_selling_price_aed: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wide">Glass Price (AED)</label>
              <input type="number" step="0.01" className="luxury-input w-full" value={form.glass_selling_price_aed} onChange={(e) => setForm({ ...form, glass_selling_price_aed: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wide">Glass Size (ml)</label>
              <input type="number" className="luxury-input w-full" value={form.glass_size_ml} onChange={(e) => setForm({ ...form, glass_size_ml: e.target.value })} placeholder="75 / 150" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wide">Outlets</label>
            <input className="luxury-input w-full" value={form.outlets} onChange={(e) => setForm({ ...form, outlets: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wide">Notes</label>
            <input className="luxury-input w-full" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          {pctCost !== null && (
            <div className="bg-[#0a0a0b] border border-[#1e1e21] rounded-lg px-4 py-3 text-sm text-zinc-400">
              Pour cost: <span className={`font-mono font-semibold ${pctCost > 0.35 ? 'text-rose-400' : pctCost > 0.28 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {(pctCost * 100).toFixed(1)}%
              </span>
            </div>
          )}
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-[#2e2e31] text-zinc-400 hover:text-white text-sm transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 luxury-button flex items-center justify-center gap-2 text-sm">
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function IngredientsPage() {
  const [activeTab, setActiveTab] = useState('all');
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [wines, setWines] = useState<Wine[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [editIngredient, setEditIngredient] = useState<Ingredient | null>(null);
  const [editWine, setEditWine] = useState<Wine | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    const [ingRes, wineRes] = await Promise.all([
      supabase.from('ingredients').select('*').order('name'),
      supabase.from('wines').select('*').order('wine'),
    ]);
    if (ingRes.data) setIngredients(ingRes.data);
    if (wineRes.data) setWines(wineRes.data);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const handleSaveIngredient = async (updated: Partial<Ingredient>) => {
    if (!editIngredient) return;
    await supabase.from('ingredients').update(updated).eq('id', editIngredient.id);
    setIngredients((prev) => prev.map((i) => i.id === editIngredient.id ? { ...i, ...updated } : i));
  };

  const handleSaveWine = async (updated: Partial<Wine>) => {
    if (!editWine) return;
    await supabase.from('wines').update(updated).eq('id', editWine.id);
    setWines((prev) => prev.map((w) => w.id === editWine.id ? { ...w, ...updated } : w));
  };

  const filteredIngredients = ingredients.filter((i) => {
    const matchesTab = activeTab === 'all' || activeTab === 'Wine' ? (activeTab !== 'Wine') : i.category === activeTab;
    const matchesSearch = i.name.toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const filteredWines = wines.filter((w) => {
    return (
      w.wine?.toLowerCase().includes(search.toLowerCase()) ||
      w.country?.toLowerCase().includes(search.toLowerCase()) ||
      w.region?.toLowerCase().includes(search.toLowerCase()) ||
      w.grape?.toLowerCase().includes(search.toLowerCase()) ||
      w.category?.toLowerCase().includes(search.toLowerCase())
    );
  });

  const showWines = activeTab === 'Wine' || activeTab === 'all';
  const showIngredients = activeTab !== 'Wine';

  const counts: Record<string, number> = {
    all: ingredients.length + wines.length,
    Spirit: ingredients.filter((i) => i.category === 'Spirit').length,
    Liqueur: ingredients.filter((i) => i.category === 'Liqueur').length,
    Beer: ingredients.filter((i) => i.category === 'Beer').length,
    Wine: wines.length,
    Other: ingredients.filter((i) => i.category === 'Other').length,
  };

  const categoryBadge = (cat: string) => {
    const map: Record<string, string> = {
      Spirit: 'bg-amber-500/15 text-amber-400',
      Liqueur: 'bg-purple-500/15 text-purple-400',
      Beer: 'bg-yellow-500/15 text-yellow-400',
    };
    return map[cat] ?? 'bg-zinc-500/15 text-zinc-400';
  };

  const wineBadge = (cat: string) => {
    if (cat === 'Red') return 'bg-red-500/15 text-red-400';
    if (cat === 'White') return 'bg-yellow-500/15 text-yellow-300';
    if (cat === 'Rose') return 'bg-pink-500/15 text-pink-400';
    if (cat?.includes('Champagne')) return 'bg-amber-500/15 text-amber-400';
    if (cat === 'Sparkling') return 'bg-blue-500/15 text-blue-400';
    if (cat === 'Dessert') return 'bg-orange-500/15 text-orange-400';
    return 'bg-zinc-500/15 text-zinc-400';
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Modals */}
      {editIngredient && (
        <EditIngredientModal
          item={editIngredient}
          onClose={() => setEditIngredient(null)}
          onSave={handleSaveIngredient}
        />
      )}
      {editWine && (
        <EditWineModal
          item={editWine}
          onClose={() => setEditWine(null)}
          onSave={handleSaveWine}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Ingredients</h1>
          <p className="text-zinc-500 text-sm mt-1">Manage spirits, wines, beers and other ingredients</p>
        </div>
        <button className="luxury-button flex items-center gap-2 w-auto flex-shrink-0">
          <Plus className="h-4 w-4" />
          Add Ingredient
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, grape, region, country..."
          className="luxury-input w-full pl-10"
        />
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 mb-6 bg-[#111113] border border-[#1e1e21] rounded-xl p-1">
        {INGREDIENT_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-amber-500 text-black'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {tab.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              activeTab === tab.key ? 'bg-black/20 text-black' : 'bg-white/10 text-zinc-500'
            }`}>
              {counts[tab.key] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">

          {/* Ingredients table */}
          {showIngredients && filteredIngredients.length > 0 && (
            <div className="bg-[#111113] border border-[#1e1e21] rounded-xl overflow-hidden">
              {activeTab === 'all' && (
                <div className="px-5 py-3 border-b border-[#1e1e21]">
                  <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Spirits, Liqueurs & Beers</span>
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#1e1e21]">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Name</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Category</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Bottle Size</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Unit Cost</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Cost/ml</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Sgl Shot</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Dbl Shot</th>
                      <th className="w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredIngredients.map((ing, i) => (
                      <tr key={ing.id} className={`group border-b border-[#1e1e21]/50 hover:bg-white/[0.03] transition-colors ${i % 2 === 0 ? '' : 'bg-white/[0.01]'}`}>
                        <td className="px-5 py-3 text-white font-medium">{ing.name}</td>
                        <td className="px-5 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${categoryBadge(ing.category)}`}>
                            {ing.category}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right text-zinc-300">{ing.bottle_size ? `${ing.bottle_size}ml` : '—'}</td>
                        <td className="px-5 py-3 text-right text-zinc-300">{ing.unit_cost ? `AED ${Number(ing.unit_cost).toFixed(2)}` : '—'}</td>
                        <td className="px-5 py-3 text-right text-zinc-400 text-xs font-mono">{ing.cost_per_ml ? Number(ing.cost_per_ml).toFixed(4) : '—'}</td>
                        <td className="px-5 py-3 text-right text-zinc-300">{ing.sgl_shot_cost ? `AED ${Number(ing.sgl_shot_cost).toFixed(2)}` : '—'}</td>
                        <td className="px-5 py-3 text-right text-zinc-300">{ing.dbl_shot_cost ? `AED ${Number(ing.dbl_shot_cost).toFixed(2)}` : '—'}</td>
                        <td className="px-2 py-3 text-right">
                          <button
                            onClick={() => setEditIngredient(ing)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-amber-500/10 text-zinc-500 hover:text-amber-400"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Wines table */}
          {showWines && filteredWines.length > 0 && (
            <div className="bg-[#111113] border border-[#1e1e21] rounded-xl overflow-hidden">
              {activeTab === 'all' && (
                <div className="px-5 py-3 border-b border-[#1e1e21]">
                  <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Wines</span>
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#1e1e21]">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Wine</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Type</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Country</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Vintage</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Supplier</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Cost</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Btl Price</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Glass Price</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">% Cost</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Outlets</th>
                      <th className="w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredWines.map((w, i) => (
                      <tr key={w.id} className={`group border-b border-[#1e1e21]/50 hover:bg-white/[0.03] transition-colors ${i % 2 === 0 ? '' : 'bg-white/[0.01]'}`}>
                        <td className="px-5 py-3 text-white font-medium max-w-[200px]">
                          <span className="truncate block" title={w.wine}>{w.wine}</span>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${wineBadge(w.category)}`}>{w.category}</span>
                        </td>
                        <td className="px-5 py-3 text-zinc-300">{w.country || '—'}</td>
                        <td className="px-5 py-3 text-zinc-300">{w.vintage || '—'}</td>
                        <td className="px-5 py-3 text-zinc-400">{w.supplier || '—'}</td>
                        <td className="px-5 py-3 text-right text-zinc-300">{w.cost_aed ? `AED ${Number(w.cost_aed).toFixed(2)}` : '—'}</td>
                        <td className="px-5 py-3 text-right text-zinc-300">{w.bottle_selling_price_aed ? `AED ${Number(w.bottle_selling_price_aed).toLocaleString()}` : '—'}</td>
                        <td className="px-5 py-3 text-right text-zinc-300">
                          {w.glass_selling_price_aed ? `AED ${Number(w.glass_selling_price_aed).toFixed(0)}${w.glass_size_ml ? ` / ${w.glass_size_ml}ml` : ''}` : '—'}
                        </td>
                        <td className="px-5 py-3 text-right">
                          {w.pct_cost ? (
                            <span className={`text-xs font-semibold ${Number(w.pct_cost) > 0.35 ? 'text-rose-400' : Number(w.pct_cost) > 0.28 ? 'text-amber-400' : 'text-emerald-400'}`}>
                              {(Number(w.pct_cost) * 100).toFixed(1)}%
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-5 py-3 text-zinc-500 text-xs">{w.outlets || '—'}</td>
                        <td className="px-2 py-3 text-right">
                          <button
                            onClick={() => setEditWine(w)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-amber-500/10 text-zinc-500 hover:text-amber-400"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Empty state */}
          {filteredIngredients.length === 0 && (!showWines || filteredWines.length === 0) && (
            <div className="text-center py-20">
              <FlaskConical className="h-12 w-12 text-zinc-700 mx-auto mb-4" />
              <p className="text-zinc-500">No items found</p>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
