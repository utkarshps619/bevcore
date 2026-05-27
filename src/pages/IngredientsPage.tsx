import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Package, ChevronDown, ChevronUp } from 'lucide-react';

interface Ingredient {
  id: string;
  name: string;
  category: string;
  supplier: string;
  bottle_size: number;
  unit_cost: number;
  cost_per_ml: number;
  sgl_shot_cost: number;
  sgl_shot_selling_price: number;
  dbl_shot_cost: number;
  dbl_shot_selling_price: number;
  bottle_selling_price: number;
  source_sheet: string;
}

const categories = ['All', 'Spirit', 'Liqueur', 'Beer', 'Wine', 'Other'];

const categoryColors: Record<string, string> = {
  Spirit: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  Liqueur: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  Beer: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  Wine: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  Other: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
};

export function IngredientsPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchIngredients();
  }, []);

  const fetchIngredients = async () => {
    const { data, error } = await supabase
      .from('ingredients')
      .select('*')
      .order('name');

    if (!error && data) setIngredients(data);
    setLoading(false);
  };

  const filtered = ingredients.filter((ing) => {
    const matchesSearch = ing.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || ing.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const counts = categories.reduce((acc, cat) => {
    acc[cat] = cat === 'All'
      ? ingredients.length
      : ingredients.filter((i) => i.category === cat).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Ingredients</h1>
        <p className="text-zinc-400 mt-1">Spirits, liqueurs, beers and other items with costs</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`p-4 rounded-xl border text-left transition-all ${
              selectedCategory === cat
                ? 'bg-amber-500/10 border-amber-500/30'
                : 'bg-[#111113] border-[#1e1e21] hover:border-zinc-600'
            }`}
          >
            <p className="text-xs text-zinc-500 mb-1">{cat}</p>
            <p className="text-xl font-bold text-white">{counts[cat] || 0}</p>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="luxury-input pl-12"
          placeholder="Search ingredients..."
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="h-8 w-8 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mx-auto" />
        </div>
      ) : filtered.length > 0 ? (
        <div className="space-y-2">
          {filtered.map((ing) => (
            <div key={ing.id} className="luxury-card p-0 overflow-hidden">
              {/* Row */}
              <button
                onClick={() => setExpandedId(expandedId === ing.id ? null : ing.id)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-[#1a1a1d] transition-colors"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{ing.name}</p>
                    <p className="text-zinc-500 text-xs mt-0.5">{ing.supplier || '—'} · {ing.bottle_size}ml</p>
                  </div>
                  <span className={`px-2 py-1 rounded-lg border text-xs font-medium shrink-0 ${categoryColors[ing.category] || categoryColors.Other}`}>
                    {ing.category}
                  </span>
                  <div className="text-right shrink-0">
                    <p className="text-amber-400 font-semibold text-sm">AED {ing.unit_cost?.toFixed(2)}</p>
                    <p className="text-zinc-500 text-xs">{ing.cost_per_ml?.toFixed(4)}/ml</p>
                  </div>
                </div>
                <div className="ml-4 text-zinc-500 shrink-0">
                  {expandedId === ing.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </button>

              {/* Expanded detail */}
              {expandedId === ing.id && (
                <div className="border-t border-[#1e1e21] p-4 grid grid-cols-2 md:grid-cols-4 gap-4 bg-[#0a0a0b]">
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Sgl Shot Cost</p>
                    <p className="text-white font-medium">AED {ing.sgl_shot_cost?.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Sgl Shot Price</p>
                    <p className="text-white font-medium">AED {ing.sgl_shot_selling_price?.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Dbl Shot Cost</p>
                    <p className="text-white font-medium">AED {ing.dbl_shot_cost?.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Dbl Shot Price</p>
                    <p className="text-white font-medium">AED {ing.dbl_shot_selling_price?.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Bottle Selling Price</p>
                    <p className="text-white font-medium">AED {ing.bottle_selling_price?.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Cost Per ML</p>
                    <p className="text-white font-medium">AED {ing.cost_per_ml?.toFixed(4)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Source Sheet</p>
                    <p className="text-white font-medium">{ing.source_sheet || '—'}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="luxury-card text-center py-16">
          <Package className="h-16 w-16 text-zinc-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No Ingredients Found</h3>
          <p className="text-zinc-400">No ingredients match your current filters.</p>
        </div>
      )}
    </div>
  );
}
