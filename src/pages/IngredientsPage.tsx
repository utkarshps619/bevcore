import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Plus, FlaskConical } from 'lucide-react';

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
  source?: string;
}

interface Wine {
  id: string;
  wine: string;
  category: string;
  format: string;
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

export function IngredientsPage() {
  const [activeTab, setActiveTab] = useState('all');
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [wines, setWines] = useState<Wine[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
    fetchAll();
  }, []);

  const filteredIngredients = ingredients.filter((i) => {
    const matchesTab = activeTab === 'all' || activeTab === 'Wine' ? true : i.category === activeTab;
    const matchesSearch = i.name.toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch && activeTab !== 'Wine';
  });

  const filteredWines = wines.filter((w) => {
    const matchesSearch =
      w.wine?.toLowerCase().includes(search.toLowerCase()) ||
      w.country?.toLowerCase().includes(search.toLowerCase()) ||
      w.region?.toLowerCase().includes(search.toLowerCase()) ||
      w.grape?.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  const showWines = activeTab === 'Wine' || activeTab === 'all';
  const showIngredients = activeTab !== 'Wine';

  // Count per tab
  const counts: Record<string, number> = {
    all: ingredients.length + wines.length,
    Spirit: ingredients.filter((i) => i.category === 'Spirit').length,
    Liqueur: ingredients.filter((i) => i.category === 'Liqueur').length,
    Beer: ingredients.filter((i) => i.category === 'Beer').length,
    Wine: wines.length,
    Other: ingredients.filter((i) => i.category === 'Other').length,
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Ingredients</h1>
          <p className="text-zinc-500 text-sm mt-1">Manage spirits, wines, beers and other ingredients</p>
        </div>
        <button className="luxury-button flex items-center gap-2">
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

          {/* Spirits / Liqueurs / Beers / Others table */}
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
                    </tr>
                  </thead>
                  <tbody>
                    {filteredIngredients.map((ing, i) => (
                      <tr key={ing.id} className={`border-b border-[#1e1e21]/50 hover:bg-white/2 transition-colors ${i % 2 === 0 ? '' : 'bg-white/[0.01]'}`}>
                        <td className="px-5 py-3 text-white font-medium">{ing.name}</td>
                        <td className="px-5 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            ing.category === 'Spirit' ? 'bg-amber-500/15 text-amber-400' :
                            ing.category === 'Liqueur' ? 'bg-purple-500/15 text-purple-400' :
                            ing.category === 'Beer' ? 'bg-yellow-500/15 text-yellow-400' :
                            'bg-zinc-500/15 text-zinc-400'
                          }`}>
                            {ing.category}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right text-zinc-300">{ing.bottle_size ? `${ing.bottle_size}ml` : '—'}</td>
                        <td className="px-5 py-3 text-right text-zinc-300">{ing.unit_cost ? `AED ${Number(ing.unit_cost).toFixed(2)}` : '—'}</td>
                        <td className="px-5 py-3 text-right text-zinc-400 text-xs">{ing.cost_per_ml ? `${Number(ing.cost_per_ml).toFixed(4)}` : '—'}</td>
                        <td className="px-5 py-3 text-right text-zinc-300">{ing.sgl_shot_cost ? `AED ${Number(ing.sgl_shot_cost).toFixed(2)}` : '—'}</td>
                        <td className="px-5 py-3 text-right text-zinc-300">{ing.dbl_shot_cost ? `AED ${Number(ing.dbl_shot_cost).toFixed(2)}` : '—'}</td>
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
                    </tr>
                  </thead>
                  <tbody>
                    {filteredWines.map((w, i) => (
                      <tr key={w.id} className={`border-b border-[#1e1e21]/50 hover:bg-white/2 transition-colors ${i % 2 === 0 ? '' : 'bg-white/[0.01]'}`}>
                        <td className="px-5 py-3 text-white font-medium max-w-[220px]">
                          <span className="truncate block" title={w.wine}>{w.wine}</span>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            w.category === 'Red' ? 'bg-red-500/15 text-red-400' :
                            w.category === 'White' ? 'bg-yellow-500/15 text-yellow-300' :
                            w.category === 'Rose' ? 'bg-pink-500/15 text-pink-400' :
                            w.category?.includes('Champagne') ? 'bg-amber-500/15 text-amber-400' :
                            w.category === 'Sparkling' ? 'bg-blue-500/15 text-blue-400' :
                            w.category === 'Dessert' ? 'bg-orange-500/15 text-orange-400' :
                            'bg-zinc-500/15 text-zinc-400'
                          }`}>
                            {w.category}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-zinc-300">{w.country || '—'}</td>
                        <td className="px-5 py-3 text-zinc-300">{w.vintage || '—'}</td>
                        <td className="px-5 py-3 text-zinc-400">{w.supplier || '—'}</td>
                        <td className="px-5 py-3 text-right text-zinc-300">{w.cost_aed ? `AED ${Number(w.cost_aed).toFixed(2)}` : '—'}</td>
                        <td className="px-5 py-3 text-right text-zinc-300">{w.bottle_selling_price_aed ? `AED ${Number(w.bottle_selling_price_aed).toLocaleString()}` : '—'}</td>
                        <td className="px-5 py-3 text-right text-zinc-300">
                          {w.glass_selling_price_aed
                            ? `AED ${Number(w.glass_selling_price_aed).toFixed(0)}${w.glass_size_ml ? ` / ${w.glass_size_ml}ml` : ''}`
                            : '—'}
                        </td>
                        <td className="px-5 py-3 text-right">
                          {w.pct_cost ? (
                            <span className={`text-xs font-semibold ${Number(w.pct_cost) > 0.35 ? 'text-rose-400' : Number(w.pct_cost) > 0.28 ? 'text-amber-400' : 'text-emerald-400'}`}>
                              {(Number(w.pct_cost) * 100).toFixed(1)}%
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-5 py-3 text-zinc-500 text-xs">{w.outlets || '—'}</td>
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
