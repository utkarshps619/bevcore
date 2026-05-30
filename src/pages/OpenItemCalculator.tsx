import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Trash2, Copy, Check, Search, Save, X } from 'lucide-react';

interface Ingredient {
  id: string;
  name: string;
  cost_per_ml: number;
  category: string;
}

interface SelectedIngredient {
  ingredient_id: string;
  name: string;
  amount_ml: number;
  cost: number;
}

const OpenItemCalculator = () => {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [filtered, setFiltered] = useState<Ingredient[]>([]);
  const [selected, setSelected] = useState<SelectedIngredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [target_margin, setTargetMargin] = useState(35);
  const [copied, setCopied] = useState(false);
  const [search, setSearch] = useState('');
  const [show_save_modal, setShowSaveModal] = useState(false);
  const [recipe_name, setRecipeName] = useState('');
  const [selling_price, setSellingPrice] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('ingredients')
        .select('id, name, cost_per_ml, category')
        .order('name');
      setIngredients(data || []);
      setFiltered(data || []);
      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(ingredients.filter((i) => i.name.toLowerCase().includes(q)));
  }, [search, ingredients]);

  const addIngredient = (ing: Ingredient) => {
    setSelected([
      ...selected,
      { ingredient_id: ing.id, name: ing.name, amount_ml: 30, cost: ing.cost_per_ml * 30 },
    ]);
  };

  const updateAmount = (index: number, amount: number) => {
    const updated = [...selected];
    const ing = ingredients.find((i) => i.id === updated[index].ingredient_id);
    if (ing) {
      updated[index].amount_ml = amount;
      updated[index].cost = ing.cost_per_ml * amount;
    }
    setSelected(updated);
  };

  const removeIngredient = (index: number) => {
    setSelected(selected.filter((_, i) => i !== index));
  };

  const total_cost = selected.reduce((sum, ing) => sum + ing.cost, 0);
  const suggested_price = target_margin > 0 ? total_cost / (target_margin / 100) : 0;

  const copyPrice = () => {
    navigator.clipboard.writeText(suggested_price.toFixed(2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveRecipe = async () => {
    if (!recipe_name.trim() || selected.length === 0) return;
    setSaving(true);

    const recipe_ingredients = selected.map((ing) => ({
      name: ing.name,
      amount: `${ing.amount_ml}ml`,
    }));

    const final_price = parseFloat(selling_price) || parseFloat(suggested_price.toFixed(2));

    const { error } = await supabase.from('recipes').insert({
      name: recipe_name.trim(),
      ingredients: recipe_ingredients,
      cost: total_cost,
      selling_price: final_price,
    });

    setSaving(false);

    if (!error) {
      setSaved(true);
      setShowSaveModal(false);
      setRecipeName('');
      setSellingPrice('');
      setTimeout(() => setSaved(false), 3000);
    } else {
      alert('Error saving recipe: ' + error.message);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="h-8 w-8 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0b] p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-white">Open Item Pricing</h1>
          {saved && (
            <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg flex items-center gap-2">
              <Check className="w-3 h-3" /> Recipe saved to database
            </span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Left: Ingredient picker */}
          <div className="col-span-2 space-y-4">
            <div className="bg-[#111113] rounded-xl border border-[#1e1e21] p-4">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search ingredients..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-[#1a1a1d] border border-[#2e2e31] rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/50"
                />
              </div>
              <div className="grid grid-cols-2 gap-2 max-h-80 overflow-y-auto pr-1">
                {filtered.map((ing) => (
                  <button
                    key={ing.id}
                    onClick={() => addIngredient(ing)}
                    className="text-left p-3 rounded-lg bg-[#1a1a1d] border border-[#2e2e31] hover:border-amber-500/40 hover:bg-[#1e1e21] transition-all text-sm"
                  >
                    <div className="font-medium text-white truncate">{ing.name}</div>
                    <div className="text-xs text-zinc-500 mt-0.5">
                      AED {ing.cost_per_ml?.toFixed(4)}/ml · {ing.category}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-[#111113] rounded-xl border border-[#1e1e21] p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  Cocktail Build
                </h2>
                {selected.length > 0 && (
                  <button
                    onClick={() => setShowSaveModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg hover:bg-amber-500/20 transition-all"
                  >
                    <Save className="w-3 h-3" /> Save as Recipe
                  </button>
                )}
              </div>
              {selected.length === 0 ? (
                <p className="text-zinc-500 text-sm py-4 text-center">
                  Click ingredients above to build your cocktail
                </p>
              ) : (
                <div className="space-y-2">
                  {selected.map((ing, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-[#1a1a1d] rounded-lg border border-[#2e2e31]">
                      <div className="flex-1 text-sm font-medium text-white truncate">{ing.name}</div>
                      <input
                        type="number"
                        value={ing.amount_ml}
                        onChange={(e) => updateAmount(idx, parseFloat(e.target.value) || 0)}
                        className="w-16 px-2 py-1 bg-[#0a0a0b] border border-[#2e2e31] rounded text-sm text-white text-center focus:outline-none focus:border-amber-500/50"
                      />
                      <span className="text-xs text-zinc-500 w-5">ml</span>
                      <span className="text-sm font-mono text-amber-400 w-20 text-right">
                        AED {ing.cost.toFixed(2)}
                      </span>
                      <button onClick={() => removeIngredient(idx)} className="text-zinc-600 hover:text-rose-400 transition-colors p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Pricing panel */}
          <div className="bg-[#111113] rounded-xl border border-[#1e1e21] p-6 h-fit sticky top-6">
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-6">Pricing</h2>

            <div className="mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-zinc-400">Target Pour Cost</span>
                <span className="text-amber-400 font-semibold">{target_margin}%</span>
              </div>
              <input
                type="range" min="5" max="50" value={target_margin}
                onChange={(e) => setTargetMargin(parseInt(e.target.value))}
                className="w-full accent-amber-500"
              />
              <div className="text-xs text-zinc-600 mt-1">Lower % = higher bar margin</div>
            </div>

            <div className="space-y-3 mb-6 pb-6 border-b border-[#1e1e21]">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Total COGS</span>
                <span className="font-mono text-white">AED {total_cost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Multiplier</span>
                <span className="font-mono text-zinc-300">
                  {target_margin > 0 ? (100 / target_margin).toFixed(2) : '—'}x
                </span>
              </div>
            </div>

            <div className="mb-6">
              <div className="text-xs text-zinc-500 mb-1 uppercase tracking-wider">Suggested Price</div>
              <div className="text-4xl font-bold text-white mb-4">
                {total_cost > 0 ? `AED ${suggested_price.toFixed(2)}` : '—'}
              </div>
              <button
                onClick={copyPrice}
                disabled={total_cost === 0}
                className={`w-full px-4 py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
                  copied
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : total_cost === 0
                    ? 'bg-[#1a1a1d] text-zinc-600 cursor-not-allowed'
                    : 'bg-gradient-to-r from-amber-500 to-amber-600 text-black hover:from-amber-400 hover:to-amber-500'
                }`}
              >
                {copied ? <><Check className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy Price</>}
              </button>
            </div>

            {total_cost > 0 && (
              <div className="bg-[#0a0a0b] rounded-lg p-3 space-y-2">
                <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Quick Reference</div>
                {[20, 25, 30, 35].map((pct) => (
                  <div key={pct} className="flex justify-between text-xs">
                    <span className="text-zinc-500">{pct}% pour cost</span>
                    <span className={`font-mono ${pct === target_margin ? 'text-amber-400 font-semibold' : 'text-zinc-300'}`}>
                      AED {(total_cost / (pct / 100)).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Save Recipe Modal */}
      {show_save_modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowSaveModal(false)} />
          <div className="relative w-full max-w-md bg-[#111113] border border-[#2e2e31] rounded-xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">Save as Recipe</h2>
              <button onClick={() => setShowSaveModal(false)} className="text-zinc-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">
                  Recipe Name
                </label>
                <input
                  type="text"
                  value={recipe_name}
                  onChange={(e) => setRecipeName(e.target.value)}
                  placeholder="e.g. Spicy Margarita"
                  className="w-full px-4 py-2.5 bg-[#1a1a1d] border border-[#2e2e31] rounded-lg text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-amber-500/50"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">
                  Selling Price (AED)
                </label>
                <input
                  type="number"
                  value={selling_price}
                  onChange={(e) => setSellingPrice(e.target.value)}
                  placeholder={`Suggested: ${suggested_price.toFixed(2)}`}
                  className="w-full px-4 py-2.5 bg-[#1a1a1d] border border-[#2e2e31] rounded-lg text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-amber-500/50"
                />
                <div className="text-xs text-zinc-600 mt-1">Leave blank to use suggested price</div>
              </div>

              {/* Summary */}
              <div className="bg-[#0a0a0b] rounded-lg p-3 space-y-1">
                <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Recipe Summary</div>
                {selected.map((ing, idx) => (
                  <div key={idx} className="flex justify-between text-xs">
                    <span className="text-zinc-400">{ing.name}</span>
                    <span className="text-zinc-500">{ing.amount_ml}ml</span>
                  </div>
                ))}
                <div className="border-t border-[#1e1e21] pt-2 mt-2 flex justify-between text-xs">
                  <span className="text-zinc-400">COGS</span>
                  <span className="text-amber-400 font-mono">AED {total_cost.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowSaveModal(false)}
                  className="flex-1 px-4 py-2.5 bg-[#1a1a1d] text-zinc-300 rounded-lg text-sm font-medium hover:bg-[#2a2a2d] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveRecipe}
                  disabled={!recipe_name.trim() || saving}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-black rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:from-amber-400 hover:to-amber-500 transition-all"
                >
                  {saving ? 'Saving...' : 'Save Recipe'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OpenItemCalculator;
