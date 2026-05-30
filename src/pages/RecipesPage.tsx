import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useUserOutlets } from '../hooks/useOutlets';
import type { Recipe } from '../types';
import { Wine, Plus, Search, X, CreditCard as Edit2, Trash2, DollarSign, RefreshCw, AlertCircle } from 'lucide-react';

const categories = ['cocktail', 'mocktail', 'spirit', 'wine', 'beer', 'other'];

interface RecipeWithCost extends Recipe {
  calculated_cost?: number | null;
  cost_coverage?: number | null;
  uncosted_ingredients?: string[] | null;
}

function coverageFillClass(pct: number | null | undefined): string {
  if (pct == null) return 'bg-zinc-600';
  if (pct >= 90) return 'bg-emerald-500';
  if (pct >= 70) return 'bg-amber-500';
  return 'bg-rose-500';
}

function coverageTextClass(pct: number | null | undefined): string {
  if (pct == null) return 'text-zinc-500';
  if (pct >= 90) return 'text-emerald-400';
  if (pct >= 70) return 'text-amber-400';
  return 'text-rose-400';
}

// ── Typeahead ingredient name input ──────────────────────────────────────────
interface IngredientTypeaheadProps {
  value: string;
  availableIngredients: { id: string; name: string; category: string }[];
  onChange: (name: string) => void;
  placeholder?: string;
}

function IngredientTypeahead({ value, availableIngredients, onChange, placeholder }: IngredientTypeaheadProps) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Keep local query in sync when parent resets
  useEffect(() => { setQuery(value); }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = query.length > 0
    ? availableIngredients
        .filter((i) => i.name.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 8)
    : [];

  const handleSelect = (name: string) => {
    setQuery(name);
    onChange(name);
    setOpen(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    onChange(e.target.value);
    setOpen(true);
  };

  const isMatched = availableIngredients.some(
    (i) => i.name.toLowerCase() === query.toLowerCase()
  );

  return (
    <div ref={ref} className="relative flex-1">
      <input
        type="text"
        value={query}
        onChange={handleChange}
        onFocus={() => query.length > 0 && setOpen(true)}
        className={`luxury-input w-full pr-8 ${
          query && !isMatched ? 'border-amber-500/40' : ''
        }`}
        placeholder={placeholder || 'Search ingredient...'}
        autoComplete="off"
      />
      {/* Match indicator */}
      {query && (
        <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs ${isMatched ? 'text-emerald-400' : 'text-amber-400'}`}>
          {isMatched ? '✓' : '?'}
        </span>
      )}
      {/* Dropdown */}
      {open && filtered.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-[#1a1a1d] border border-[#2e2e31] rounded-xl shadow-xl overflow-hidden">
          {filtered.map((ing) => (
            <button
              key={ing.id}
              type="button"
              onMouseDown={() => handleSelect(ing.name)}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-[#2a2a2d] transition-colors flex items-center justify-between"
            >
              <span className="text-white">{ing.name}</span>
              <span className="text-xs text-zinc-500">{ing.category}</span>
            </button>
          ))}
        </div>
      )}
      {/* No match hint */}
      {open && query.length > 1 && filtered.length === 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-[#1a1a1d] border border-[#2e2e31] rounded-xl shadow-xl px-4 py-3 text-xs text-zinc-500">
          No match — ingredient will be saved but may not cost correctly
        </div>
      )}
    </div>
  );
}

// ── Ingredient list editor ────────────────────────────────────────────────────
interface IngredientInputProps {
  ingredients: { name: string; amount: string }[];
  availableIngredients: { id: string; name: string; category: string }[];
  onChange: (ingredients: { name: string; amount: string }[]) => void;
}

function IngredientInput({ ingredients, availableIngredients, onChange }: IngredientInputProps) {
  const addIngredient = () => onChange([...ingredients, { name: '', amount: '' }]);

  const removeIngredient = (index: number) =>
    onChange(ingredients.filter((_, i) => i !== index));

  const updateIngredient = (index: number, field: 'name' | 'amount', value: string) => {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      {ingredients.map((ingredient, index) => (
        <div key={index} className="flex gap-3 items-start">
          <IngredientTypeahead
            value={ingredient.name}
            availableIngredients={availableIngredients}
            onChange={(name) => updateIngredient(index, 'name', name)}
            placeholder="Search ingredient..."
          />
          <input
            type="text"
            value={ingredient.amount}
            onChange={(e) => updateIngredient(index, 'amount', e.target.value)}
            className="luxury-input w-32"
            placeholder="e.g. 45ml"
          />
          {ingredients.length > 1 && (
            <button
              type="button"
              onClick={() => removeIngredient(index)}
              className="p-3 rounded-xl text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={addIngredient}
        className="w-full py-2.5 rounded-xl border border-dashed border-[#2e2e31] text-sm text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors"
      >
        + Add Ingredient
      </button>
    </div>
  );
}

// ── Recipe Modal ──────────────────────────────────────────────────────────────
interface RecipeModalProps {
  recipe: RecipeWithCost | null;
  outlets: { id: string; name: string }[];
  onSave: (data: Partial<Recipe>) => Promise<void>;
  onClose: () => void;
}

function RecipeModal({ recipe, outlets, onSave, onClose }: RecipeModalProps) {
  const [formData, setFormData] = useState({
    outlet_id: recipe?.outlet_id || outlets[0]?.id || '',
    name: recipe?.name || '',
    category: recipe?.category || 'cocktail',
    ingredients: recipe?.ingredients || [{ name: '', amount: '' }],
    preparation: recipe?.preparation || '',
    glassware: recipe?.glassware || '',
    garnish: recipe?.garnish || '',
    selling_price: recipe?.selling_price || 0,
    cost: recipe?.cost || 0,
  });
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(recipe?.image_url || null);
  const [uploading, setUploading] = useState(false);
  const [availableIngredients, setAvailableIngredients] = useState<{ id: string; name: string; category: string }[]>([]);

  // Load available ingredients for typeahead
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('ingredients')
        .select('id, name, category')
        .order('name');
      setAvailableIngredients(data || []);
    };
    load();
  }, []);

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('recipe-images')
        .upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('recipe-images').getPublicUrl(fileName);
      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const filteredIngredients = formData.ingredients.filter(
      (i) => i.name.trim() !== '' || i.amount.trim() !== ''
    );
    setLoading(true);
    setUploading(true);
    let imageUrl = recipe?.image_url || null;
    if (imageFile) imageUrl = await uploadImage(imageFile);
    setUploading(false);
    await onSave({ ...formData, ingredients: filteredIngredients, image_url: imageUrl });
    setLoading(false);
  };

  const margin =
    formData.selling_price > 0
      ? ((formData.selling_price - formData.cost) / formData.selling_price) * 100
      : 0;

  const unmatchedIngredients = formData.ingredients.filter(
    (i) =>
      i.name.trim() !== '' &&
      !availableIngredients.some((a) => a.name.toLowerCase() === i.name.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl luxury-card my-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">
            {recipe ? 'Edit Recipe' : 'Add New Recipe'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-[#1a1a1d] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {outlets.length > 1 && (
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Outlet</label>
              <select
                value={formData.outlet_id}
                onChange={(e) => setFormData({ ...formData, outlet_id: e.target.value })}
                className="luxury-input"
              >
                {outlets.map((outlet) => (
                  <option key={outlet.id} value={outlet.id}>{outlet.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Recipe Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="luxury-input"
                placeholder="e.g. Old Fashioned"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="luxury-input"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Recipe Photo</label>
            {imagePreview && (
              <div className="mb-3 relative">
                <img src={imagePreview} alt="Recipe preview" className="w-full h-48 object-cover rounded-xl" />
                <button
                  type="button"
                  onClick={() => { setImageFile(null); setImagePreview(null); }}
                  className="absolute top-2 right-2 p-2 rounded-lg bg-black/50 text-white hover:bg-black/70 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            <input type="file" accept="image/*" onChange={handleImageChange} className="luxury-input" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-zinc-300">
                <Wine className="h-4 w-4 inline mr-2" />
                Ingredients
              </label>
              <span className="text-xs text-zinc-500">
                ✓ = matched to DB &nbsp;·&nbsp; ? = unmatched (won't cost)
              </span>
            </div>
            <IngredientInput
              ingredients={formData.ingredients}
              availableIngredients={availableIngredients}
              onChange={(ingredients) => setFormData({ ...formData, ingredients })}
            />
            {/* Unmatched warning */}
            {unmatchedIngredients.length > 0 && (
              <div className="mt-2 flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <AlertCircle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                <div className="text-xs text-amber-400">
                  <span className="font-semibold">Unmatched ingredients won't be costed:</span>{' '}
                  {unmatchedIngredients.map((i) => i.name).join(', ')}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Preparation</label>
            <textarea
              value={formData.preparation}
              onChange={(e) => setFormData({ ...formData, preparation: e.target.value })}
              className="luxury-input min-h-[100px] resize-y"
              placeholder="Step-by-step preparation instructions..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Glassware</label>
              <input
                type="text"
                value={formData.glassware}
                onChange={(e) => setFormData({ ...formData, glassware: e.target.value })}
                className="luxury-input"
                placeholder="e.g. Rocks glass"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Garnish</label>
              <input
                type="text"
                value={formData.garnish}
                onChange={(e) => setFormData({ ...formData, garnish: e.target.value })}
                className="luxury-input"
                placeholder="e.g. Orange peel, cherry"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-[#0a0a0b] border border-[#1e1e21]">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                <DollarSign className="h-4 w-4 inline mr-1" />
                Cost (AED)
              </label>
              <input
                type="number"
                value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: Number(e.target.value) })}
                className="luxury-input"
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Selling Price (AED)</label>
              <input
                type="number"
                value={formData.selling_price}
                onChange={(e) => setFormData({ ...formData, selling_price: Number(e.target.value) })}
                className="luxury-input"
                min="0"
                step="0.01"
              />
            </div>
            {margin > 0 && (
              <div className="col-span-2 text-center py-2">
                <span className="text-sm text-zinc-400">Margin: </span>
                <span className={`text-sm font-semibold ${margin >= 70 ? 'text-emerald-400' : margin >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>
                  {margin.toFixed(1)}%
                </span>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="luxury-button-secondary">Cancel</button>
            <button type="submit" disabled={loading} className="luxury-button">
              {loading ? (uploading ? 'Uploading...' : 'Saving...') : recipe ? 'Update Recipe' : 'Add Recipe'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page (unchanged from original) ──────────────────────────────────────
export function RecipesPage() {
  const { outlets } = useUserOutlets();
  const [recipes, setRecipes] = useState<RecipeWithCost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedOutlet, setSelectedOutlet] = useState<string>('all');
  const [modalRecipe, setModalRecipe] = useState<RecipeWithCost | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [viewRecipe, setViewRecipe] = useState<RecipeWithCost | null>(null);
  const [recalculatingAll, setRecalculatingAll] = useState(false);
  const [recalculatingId, setRecalculatingId] = useState<string | null>(null);

  const fetchRecipes = useCallback(async () => {
    if (outlets.length === 0) { setRecipes([]); setLoading(false); return; }
    const outletIds = outlets.map((o) => o.id);
    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .or(`outlet_id.in.(${outletIds.join(',')}),outlet_id.is.null`)
      .order('name');
    if (!error && data) setRecipes(data as RecipeWithCost[]);
    setLoading(false);
  }, [outlets]);

  useEffect(() => { fetchRecipes(); }, [fetchRecipes]);

  const handleSave = async (data: Partial<Recipe>) => {
    if (modalRecipe) {
      const { error } = await supabase.from('recipes').update(data).eq('id', modalRecipe.id);
      if (!error) {
        await supabase.rpc('calculate_recipe_cost', { p_recipe_id: modalRecipe.id });
        await fetchRecipes();
        setShowModal(false);
        setModalRecipe(null);
      }
    } else {
      const { data: inserted, error } = await supabase.from('recipes').insert(data).select().single();
      if (!error && inserted) {
        await supabase.rpc('calculate_recipe_cost', { p_recipe_id: inserted.id });
        await fetchRecipes();
        setShowModal(false);
      }
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('recipes').delete().eq('id', id);
    if (!error) { await fetchRecipes(); setShowDeleteConfirm(null); }
  };

  const recalculateOne = async (recipeId: string) => {
    setRecalculatingId(recipeId);
    await supabase.rpc('calculate_recipe_cost', { p_recipe_id: recipeId });
    await fetchRecipes();
    if (viewRecipe?.id === recipeId) {
      const updated = recipes.find((r) => r.id === recipeId);
      if (updated) setViewRecipe(updated);
    }
    setRecalculatingId(null);
  };

  const recalculateAll = async () => {
    setRecalculatingAll(true);
    await supabase.rpc('recalculate_all_recipe_costs');
    await fetchRecipes();
    setRecalculatingAll(false);
  };

  const filteredRecipes = recipes.filter((recipe) => {
    const matchesSearch = recipe.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || recipe.category === selectedCategory;
    const matchesOutlet = selectedOutlet === 'all' || recipe.outlet_id === selectedOutlet;
    return matchesSearch && matchesCategory && matchesOutlet;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Recipe Management</h1>
          <p className="text-zinc-400 mt-1">Manage your cocktail and beverage recipes</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={recalculateAll}
            disabled={recalculatingAll}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#2e2e31] text-sm text-zinc-300 hover:text-white hover:border-zinc-500 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${recalculatingAll ? 'animate-spin' : ''}`} />
            {recalculatingAll ? 'Recalculating...' : 'Recalculate All'}
          </button>
          <button
            onClick={() => { setModalRecipe(null); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-black font-semibold hover:from-amber-400 hover:to-amber-500 transition-all"
          >
            <Plus className="h-5 w-5" />
            Add Recipe
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="luxury-input pl-12"
            placeholder="Search recipes..."
          />
        </div>
        <div className="flex gap-3">
          {outlets.length > 1 && (
            <select value={selectedOutlet} onChange={(e) => setSelectedOutlet(e.target.value)} className="luxury-input w-auto min-w-[140px]">
              <option value="all">All Outlets</option>
              {outlets.map((outlet) => (
                <option key={outlet.id} value={outlet.id}>{outlet.name}</option>
              ))}
            </select>
          )}
          <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="luxury-input w-auto min-w-[140px]">
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="h-8 w-8 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mx-auto" />
        </div>
      ) : filteredRecipes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredRecipes.map((recipe) => {
            const effectiveCost = recipe.calculated_cost != null && recipe.calculated_cost > 0 ? recipe.calculated_cost : recipe.cost;
            const margin = recipe.selling_price > 0 ? ((recipe.selling_price - effectiveCost) / recipe.selling_price) * 100 : 0;
            const isRecalculating = recalculatingId === recipe.id;
            const hasUncosted = recipe.uncosted_ingredients && recipe.uncosted_ingredients.length > 0;

            return (
              <div key={recipe.id} className="luxury-card hover:border-[#2e2e31] transition-all group">
                {recipe.image_url && (
                  <div className="mb-4">
                    <img src={recipe.image_url} alt={recipe.name} className="w-full h-48 object-cover rounded-xl" />
                  </div>
                )}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-1">{recipe.name}</h3>
                    <span className="text-xs text-zinc-500 capitalize">{recipe.category}</span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => recalculateOne(recipe.id)} disabled={isRecalculating} className="p-2 rounded-lg text-zinc-400 hover:text-amber-400 hover:bg-amber-500/10 transition-colors" title="Recalculate cost">
                      <RefreshCw className={`h-4 w-4 ${isRecalculating ? 'animate-spin' : ''}`} />
                    </button>
                    <button onClick={() => { setModalRecipe(recipe); setShowModal(true); }} className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-[#1a1a1d] transition-colors">
                      <Edit2 className="h-4 w-4" />
                    </button>
                    {showDeleteConfirm === recipe.id ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleDelete(recipe.id)} className="px-2 py-1 rounded text-xs bg-rose-500/10 text-rose-400">Yes</button>
                        <button onClick={() => setShowDeleteConfirm(null)} className="px-2 py-1 rounded text-xs bg-zinc-500/10 text-zinc-400">No</button>
                      </div>
                    ) : (
                      <button onClick={() => setShowDeleteConfirm(recipe.id)} className="p-2 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {recipe.ingredients.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-zinc-500 uppercase tracking-wide mb-2">Ingredients</p>
                    <div className="flex flex-wrap gap-2">
                      {recipe.ingredients.slice(0, 4).map((ing, idx) => (
                        <span key={idx} className="px-2 py-1 rounded-lg bg-[#1a1a1d] text-xs text-zinc-300">
                          {ing.amount} {ing.name}
                        </span>
                      ))}
                      {recipe.ingredients.length > 4 && (
                        <span className="px-2 py-1 rounded-lg bg-[#1a1a1d] text-xs text-zinc-500">+{recipe.ingredients.length - 4} more</span>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-3 pt-4 border-t border-[#1e1e21]">
                  <div>
                    <div className="flex items-center gap-1 mb-1">
                      <p className="text-xs text-zinc-500">Cost</p>
                      {hasUncosted && <AlertCircle className="h-3 w-3 text-amber-500" title="Some ingredients not costed" />}
                    </div>
                    <p className="text-base font-bold text-white">AED {effectiveCost.toFixed(2)}</p>
                    {recipe.cost_coverage != null && (
                      <div className="mt-1.5 h-1 w-full rounded-full bg-[#1a1a1d] overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${coverageFillClass(recipe.cost_coverage)}`} style={{ width: `${recipe.cost_coverage}%` }} />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Price</p>
                    <p className="text-base font-bold text-white">AED {recipe.selling_price.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Margin</p>
                    <p className={`text-base font-bold ${margin >= 70 ? 'text-emerald-400' : margin >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>
                      {margin.toFixed(0)}%
                    </p>
                  </div>
                </div>

                <button onClick={() => setViewRecipe(recipe)} className="w-full mt-4 py-2.5 rounded-xl border border-[#2e2e31] text-sm text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors">
                  View Full Recipe
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="luxury-card text-center py-16">
          <Wine className="h-16 w-16 text-zinc-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No Recipes Found</h3>
          <p className="text-zinc-400 mb-6">
            {recipes.length === 0 ? 'Create your first recipe to start building your beverage menu.' : 'No recipes match your current filters.'}
          </p>
          {recipes.length === 0 && (
            <button onClick={() => { setModalRecipe(null); setShowModal(true); }} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-black font-semibold hover:from-amber-400 hover:to-amber-500 transition-all">
              <Plus className="h-5 w-5" />
              Add Recipe
            </button>
          )}
        </div>
      )}

      {showModal && (
        <RecipeModal
          recipe={modalRecipe}
          outlets={outlets}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setModalRecipe(null); }}
        />
      )}

      {viewRecipe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setViewRecipe(null)} />
          <div className="relative w-full max-w-lg luxury-card max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white">{viewRecipe.name}</h2>
                <span className="text-sm text-zinc-500 capitalize">{viewRecipe.category}</span>
              </div>
              <button onClick={() => setViewRecipe(null)} className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-[#1a1a1d] transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {viewRecipe.image_url && (
              <div className="mb-6">
                <img src={viewRecipe.image_url} alt={viewRecipe.name} className="w-full h-64 object-cover rounded-xl" />
              </div>
            )}

            {viewRecipe.ingredients.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-zinc-300 mb-3 uppercase tracking-wide">Ingredients</h3>
                <div className="space-y-2">
                  {viewRecipe.ingredients.map((ing, idx) => (
                    <div key={idx} className="flex items-center gap-3 py-2 px-3 rounded-xl bg-[#0a0a0b]">
                      <div className="h-2 w-2 rounded-full bg-amber-400" />
                      <span className="text-sm text-white"><span className="text-amber-400">{ing.amount}</span> {ing.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {viewRecipe.preparation && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-zinc-300 mb-3 uppercase tracking-wide">Preparation</h3>
                <p className="text-sm text-zinc-400 leading-relaxed whitespace-pre-line">{viewRecipe.preparation}</p>
              </div>
            )}

            {(viewRecipe.glassware || viewRecipe.garnish) && (
              <div className="mb-6 grid grid-cols-2 gap-4">
                {viewRecipe.glassware && (
                  <div className="p-4 rounded-xl bg-[#0a0a0b]">
                    <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Glassware</p>
                    <p className="text-sm text-white">{viewRecipe.glassware}</p>
                  </div>
                )}
                {viewRecipe.garnish && (
                  <div className="p-4 rounded-xl bg-[#0a0a0b]">
                    <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Garnish</p>
                    <p className="text-sm text-white">{viewRecipe.garnish}</p>
                  </div>
                )}
              </div>
            )}

            <div className="p-4 rounded-xl bg-[#0a0a0b] space-y-4">
              <div className="flex gap-3">
                <div className="flex-1 text-center">
                  <p className="text-xs text-zinc-500 mb-1">Calc. Cost</p>
                  <p className="text-lg font-bold text-white">AED {(viewRecipe.calculated_cost ?? viewRecipe.cost).toFixed(2)}</p>
                </div>
                <div className="w-px bg-[#1e1e21]" />
                <div className="flex-1 text-center">
                  <p className="text-xs text-zinc-500 mb-1">Price</p>
                  <p className="text-lg font-bold text-white">AED {viewRecipe.selling_price.toFixed(2)}</p>
                </div>
                <div className="w-px bg-[#1e1e21]" />
                <div className="flex-1 text-center">
                  <p className="text-xs text-zinc-500 mb-1">Margin</p>
                  <p className="text-lg font-bold text-emerald-400">
                    {viewRecipe.selling_price > 0
                      ? (((viewRecipe.selling_price - (viewRecipe.calculated_cost ?? viewRecipe.cost)) / viewRecipe.selling_price) * 100).toFixed(0)
                      : '—'}%
                  </p>
                </div>
              </div>

              {viewRecipe.cost_coverage != null && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs text-zinc-500">Ingredient coverage</p>
                    <span className={`text-xs font-medium ${coverageTextClass(viewRecipe.cost_coverage)}`}>{viewRecipe.cost_coverage}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-[#1e1e21] overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${coverageFillClass(viewRecipe.cost_coverage)}`} style={{ width: `${viewRecipe.cost_coverage}%` }} />
                  </div>
                </div>
              )}

              {viewRecipe.uncosted_ingredients && viewRecipe.uncosted_ingredients.length > 0 && (
                <div>
                  <p className="text-xs text-zinc-500 mb-2 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3 text-amber-500" />Not yet costed
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {viewRecipe.uncosted_ingredients.map((name, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400/80 text-xs">{name}</span>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => recalculateOne(viewRecipe.id)}
                disabled={recalculatingId === viewRecipe.id}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-[#2e2e31] text-xs text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${recalculatingId === viewRecipe.id ? 'animate-spin' : ''}`} />
                {recalculatingId === viewRecipe.id ? 'Recalculating...' : 'Recalculate Cost'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
