import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, Copy, Check } from 'lucide-react';

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
  const [selected, setSelected] = useState<SelectedIngredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [target_margin, setTarget_margin] = useState(35); // 35% pour cost
  const [copied, setCopied] = useState(false);

  // Load ingredients
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('ingredients')
        .select('id, name, cost_per_ml, category')
        .order('name');
      setIngredients(data || []);
      setLoading(false);
    };
    load();
  }, []);

  const addIngredient = (ing: Ingredient) => {
    const cost = ing.cost_per_ml * 30; // default 30ml pour
    setSelected([
      ...selected,
      {
        ingredient_id: ing.id,
        name: ing.name,
        amount_ml: 30,
        cost: cost,
      },
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
  const suggested_price = total_cost / (target_margin / 100);
  const actual_margin = (total_cost / suggested_price) * 100;

  const copyPrice = () => {
    navigator.clipboard.writeText(suggested_price.toFixed(2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <div className="p-6 text-gray-600">Loading ingredients...</div>;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Open Item Calculator</h1>

        <div className="grid grid-cols-3 gap-6">
          {/* Left: Ingredient picker */}
          <div className="col-span-2">
            <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
              <h2 className="font-semibold text-lg mb-4">Select Ingredients</h2>
              <div className="max-h-96 overflow-y-auto">
                <div className="grid grid-cols-2 gap-2">
                  {ingredients.map((ing) => (
                    <button
                      key={ing.id}
                      onClick={() => addIngredient(ing)}
                      className="text-left p-2 rounded border border-gray-200 hover:bg-blue-50 hover:border-blue-300 transition text-sm"
                    >
                      <div className="font-medium">{ing.name}</div>
                      <div className="text-xs text-gray-600">
                        AED {ing.cost_per_ml.toFixed(4)}/ml
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Selected ingredients */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h2 className="font-semibold text-lg mb-4">Cocktail Recipe</h2>
              {selected.length === 0 ? (
                <p className="text-gray-500">Click ingredients to add them</p>
              ) : (
                <div className="space-y-3">
                  {selected.map((ing, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                      <div className="flex-1">
                        <div className="font-medium">{ing.name}</div>
                      </div>
                      <input
                        type="number"
                        value={ing.amount_ml}
                        onChange={(e) => updateAmount(idx, parseFloat(e.target.value) || 0)}
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                      <span className="text-sm text-gray-600 w-8">ml</span>
                      <span className="font-mono w-16 text-right">
                        AED {ing.cost.toFixed(2)}
                      </span>
                      <button
                        onClick={() => removeIngredient(idx)}
                        className="text-red-600 hover:bg-red-50 p-1 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Pricing summary */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 h-fit sticky top-6">
            <h2 className="font-semibold text-lg mb-6">Pricing</h2>

            {/* Margin slider */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">
                Target Pour Cost: {target_margin}%
              </label>
              <input
                type="range"
                min="20"
                max="50"
                value={target_margin}
                onChange={(e) => setTarget_margin(parseInt(e.target.value))}
                className="w-full"
              />
              <div className="text-xs text-gray-600 mt-2">
                (Lower % = higher margin for bar)
              </div>
            </div>

            {/* Cost breakdown */}
            <div className="space-y-3 mb-6 pb-6 border-b border-gray-200">
              <div className="flex justify-between">
                <span className="text-gray-600">Total COGS:</span>
                <span className="font-mono font-semibold">
                  AED {total_cost.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Pour Cost %:</span>
                <span className="font-mono">{actual_margin.toFixed(1)}%</span>
              </div>
            </div>

            {/* Suggested price */}
            <div className="mb-6">
              <div className="text-sm text-gray-600 mb-2">Suggested Price</div>
              <div className="text-4xl font-bold mb-4">
                AED {suggested_price.toFixed(2)}
              </div>
              <button
                onClick={copyPrice}
                className={`w-full px-4 py-2 rounded font-semibold flex items-center justify-center gap-2 transition ${
                  copied
                    ? 'bg-green-100 text-green-700'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" /> Copy Price
                  </>
                )}
              </button>
            </div>

            {/* Quick reference */}
            <div className="bg-gray-50 p-3 rounded text-xs space-y-1">
              <div className="font-semibold mb-2">Quick Reference</div>
              <div className="flex justify-between">
                <span>20% pour cost:</span>
                <span className="font-mono">AED {(total_cost / 0.2).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>25% pour cost:</span>
                <span className="font-mono">AED {(total_cost / 0.25).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>30% pour cost:</span>
                <span className="font-mono">AED {(total_cost / 0.3).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OpenItemCalculator;
