import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import {
  Link2,
  Search,
  Wine,
  UtensilsCrossed,
  Loader2,
  CheckCircle2,
  Zap,
  CheckSquare,
  Square,
  MinusSquare,
} from 'lucide-react';

interface POSItem {
  item_name: string;
  item_number: string;
  total_qty: number;
  total_sales: number;
  outlets: string[];
}

interface Recipe {
  id: string;
  name: string;
  category: string;
  outlet_id: string;
}

interface Mapping {
  id: string;
  recipe_id: string | null;
  pos_item_name: string;
  pos_item_number: string;
  is_beverage: boolean;
  is_verified: boolean;
}

type FilterTab = 'unmapped' | 'beverages' | 'food' | 'all';

const FOOD_KEYWORDS = [
  'steak', 'burger', 'fries', 'salad', 'soup', 'chicken', 'beef', 'lamb',
  'fish', 'salmon', 'shrimp', 'prawn', 'lobster', 'crab', 'oyster',
  'pasta', 'pizza', 'risotto', 'rice', 'noodle', 'bread', 'toast',
  'egg', 'omelette', 'pancake', 'waffle', 'french toast',
  'sandwich', 'wrap', 'panini', 'club', 'blt',
  'nachos', 'hummus', 'guacamole', 'bruschetta', 'calamari',
  'dessert', 'cake', 'ice cream', 'sorbet', 'cheesecake', 'brownie', 'tiramisu',
  'truffle', 'foie gras', 'tartare', 'carpaccio', 'ceviche',
  'wagyu', 'ribeye', 'tenderloin', 'sirloin', 'filet', 'chop',
  'mac & cheese', 'mac and cheese', 'caesar', 'wedge',
  'sliders', 'wings', 'spring roll', 'dim sum', 'dumpling',
  'benedict', 'shakshuka', 'shakshouka', 'granola', 'porridge', 'muesli',
  'fruit', 'berry', 'acai', 'yogurt',
  'cheese', 'charcuterie', 'platter',
  'kids', 'child', 'junior',
  'buckaroo', 'angus', 'rack',
  'mezze', 'fattoush', 'tabbouleh', 'kibbeh',
  'supplement', 'side', 'extra', 'add on', 'add-on',
  'ird25', 'ird ',
];

const FOOD_EXACT = [
  'food', 'open misc', 'cover charge', 'service charge',
  'corkage', 'valet', 'parking', 'cigar', 'cigarette',
  'merchandise', 'gift card', 'voucher',
  'breakfast', 'main courses', 'starters', 'sides', 'desserts',
  'snacks/sandwich', 'snacks', 'international breakfast',
];

function isLikelyFood(itemName: string): boolean {
  const lower = itemName.toLowerCase();
  if (FOOD_EXACT.some(f => lower === f)) return true;
  if (FOOD_KEYWORDS.some(kw => lower.includes(kw))) return true;
  if (lower.startsWith('packages(')) return true;
  return false;
}

export function POSMappingPage() {
  const [posItems, setPosItems] = useState<POSItem[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('unmapped');
  const [savingItem, setSavingItem] = useState<string | null>(null);
  const [recipeDropdown, setRecipeDropdown] = useState<string | null>(null);
  const [recipeSearch, setRecipeSearch] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [autoProcessing, setAutoProcessing] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const { data: rawItems } = await supabase
      .from('pos_sales_raw')
      .select('item_name, item_number, qty_sold, gross_sales, outlet_name');
    const { data: recipeData } = await supabase
      .from('recipes')
      .select('id, name, category, outlet_id');
    const { data: mappingData } = await supabase
      .from('recipe_pos_mappings')
      .select('*');

    const itemMap = new Map<string, POSItem>();
    if (rawItems) {
      for (const row of rawItems) {
        const key = row.item_name;
        if (!itemMap.has(key)) {
          itemMap.set(key, { item_name: row.item_name, item_number: row.item_number || '', total_qty: 0, total_sales: 0, outlets: [] });
        }
        const item = itemMap.get(key)!;
        item.total_qty += row.qty_sold || 0;
        item.total_sales += row.gross_sales || 0;
        if (row.outlet_name && !item.outlets.includes(row.outlet_name)) item.outlets.push(row.outlet_name);
      }
    }
    setPosItems(Array.from(itemMap.values()).sort((a, b) => b.total_sales - a.total_sales));
    setRecipes(recipeData || []);
    setMappings(mappingData || []);
    setLoading(false);
  }

  function getMappingForItem(itemName: string): Mapping | undefined {
    return mappings.find((m) => m.pos_item_name === itemName);
  }

  function getRecipeName(recipeId: string): string {
    return recipes.find((r) => r.id === recipeId)?.name || 'Unknown';
  }

  async function saveMapping(posItem: POSItem, recipeId: string | null, isBeverage: boolean) {
    const existing = getMappingForItem(posItem.item_name);
    if (existing) {
      await supabase.from('recipe_pos_mappings').update({ recipe_id: recipeId, is_beverage: isBeverage, is_verified: true }).eq('id', existing.id);
    } else {
      await supabase.from('recipe_pos_mappings').insert({ recipe_id: recipeId, pos_item_name: posItem.item_name, pos_item_number: posItem.item_number, is_beverage: isBeverage, is_verified: true });
    }
  }

  async function refreshMappings() {
    const { data } = await supabase.from('recipe_pos_mappings').select('*');
    setMappings(data || []);
  }

  function showSuccess(msg: string) {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 2500);
  }

  async function markSingleAsFood(posItem: POSItem) {
    setSavingItem(posItem.item_name);
    await saveMapping(posItem, null, false);
    await refreshMappings();
    setSavingItem(null);
    showSuccess(`${posItem.item_name} → Food`);
  }

  async function markSingleAsBeverage(posItem: POSItem, recipeId: string) {
    setSavingItem(posItem.item_name);
    await saveMapping(posItem, recipeId, true);
    await refreshMappings();
    setSavingItem(null);
    setRecipeDropdown(null);
    showSuccess(`${posItem.item_name} → Beverage`);
  }

  async function bulkMarkAsFood() {
    if (selectedItems.size === 0) return;
    setBulkProcessing(true);
    const items = posItems.filter((i) => selectedItems.has(i.item_name));
    for (const item of items) await saveMapping(item, null, false);
    await refreshMappings();
    setSelectedItems(new Set());
    setBulkProcessing(false);
    showSuccess(`${items.length} items → Food`);
  }

  async function bulkMarkAsBeverage() {
    if (selectedItems.size === 0) return;
    setBulkProcessing(true);
    const items = posItems.filter((i) => selectedItems.has(i.item_name));
    for (const item of items) await saveMapping(item, null, true);
    await refreshMappings();
    setSelectedItems(new Set());
    setBulkProcessing(false);
    showSuccess(`${items.length} items → Beverage`);
  }

  async function autoCategorizeFoodItems() {
    setAutoProcessing(true);
    let count = 0;
    const unmapped = posItems.filter((i) => !getMappingForItem(i.item_name));
    for (const item of unmapped) {
      if (isLikelyFood(item.item_name)) {
        await saveMapping(item, null, false);
        count++;
      }
    }
    await refreshMappings();
    setAutoProcessing(false);
    showSuccess(`Auto-categorized ${count} food items`);
  }

  function toggleItem(itemName: string) {
    const next = new Set(selectedItems);
    next.has(itemName) ? next.delete(itemName) : next.add(itemName);
    setSelectedItems(next);
  }

  function toggleAll() {
    selectedItems.size === filteredItems.length
      ? setSelectedItems(new Set())
      : setSelectedItems(new Set(filteredItems.map((i) => i.item_name)));
  }

  const filteredItems = useMemo(() => {
    let items = posItems;
    if (searchTerm) items = items.filter((i) => i.item_name.toLowerCase().includes(searchTerm.toLowerCase()));
    switch (activeTab) {
      case 'unmapped': items = items.filter((i) => !getMappingForItem(i.item_name)); break;
      case 'beverages': items = items.filter((i) => getMappingForItem(i.item_name)?.is_beverage === true); break;
      case 'food': items = items.filter((i) => { const m = getMappingForItem(i.item_name); return m && !m.is_beverage; }); break;
    }
    return items;
  }, [posItems, searchTerm, activeTab, mappings]);

  const stats = useMemo(() => {
    const total = posItems.length;
    const mapped = posItems.filter((i) => getMappingForItem(i.item_name)).length;
    const beverages = posItems.filter((i) => getMappingForItem(i.item_name)?.is_beverage).length;
    const food = posItems.filter((i) => { const m = getMappingForItem(i.item_name); return m && !m.is_beverage; }).length;
    return { total, mapped, beverages, food, unmapped: total - mapped };
  }, [posItems, mappings]);

  const filteredRecipes = useMemo(() => {
    if (!recipeSearch) return recipes;
    return recipes.filter((r) => r.name.toLowerCase().includes(recipeSearch.toLowerCase()));
  }, [recipes, recipeSearch]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 text-champagne-500 animate-spin" />
    </div>
  );

  const allSelected = filteredItems.length > 0 && selectedItems.size === filteredItems.length;
  const someSelected = selectedItems.size > 0 && selectedItems.size < filteredItems.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-white">POS Item Mapping</h1>
          <p className="text-zinc-400 mt-1 font-sans text-sm">Map Avero POS items to BevCore recipes. Mark non-beverages as food to exclude from pour cost.</p>
        </div>
        {stats.unmapped > 0 && (
          <button onClick={autoCategorizeFoodItems} disabled={autoProcessing}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-champagne-500 to-champagne-600 text-black font-sans font-semibold text-sm hover:from-champagne-400 hover:to-champagne-500 transition-all disabled:opacity-50 shadow-lg shadow-champagne-900/20">
            {autoProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            {autoProcessing ? 'Processing...' : 'Auto-Detect Food Items'}
          </button>
        )}
      </div>

      {successMessage && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-sans shadow-lg">
          <CheckCircle2 className="h-4 w-4" />{successMessage}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Items', value: stats.total, color: 'text-white' },
          { label: 'Unmapped', value: stats.unmapped, color: 'text-amber-400' },
          { label: 'Beverages', value: stats.beverages, color: 'text-champagne-400' },
          { label: 'Food', value: stats.food, color: 'text-zinc-400' },
          { label: 'Progress', value: stats.total > 0 ? `${Math.round((stats.mapped / stats.total) * 100)}%` : '0%', color: 'text-emerald-400' },
        ].map((s) => (
          <div key={s.label} className="kpi-card">
            <p className="text-xs font-sans text-zinc-500 uppercase tracking-wider">{s.label}</p>
            <p className={`text-2xl font-semibold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {([
            { key: 'unmapped', label: `Unmapped (${stats.unmapped})` },
            { key: 'beverages', label: `Beverages (${stats.beverages})` },
            { key: 'food', label: `Food (${stats.food})` },
            { key: 'all', label: `All (${stats.total})` },
          ] as { key: FilterTab; label: string }[]).map((tab) => (
            <button key={tab.key} onClick={() => { setActiveTab(tab.key); setSelectedItems(new Set()); }}
              className={`px-4 py-2 rounded-xl text-sm font-sans font-medium transition-all ${activeTab === tab.key ? 'bg-champagne-500/20 text-champagne-400 border border-champagne-500/30' : 'bg-[#111113] text-zinc-400 border border-[#2a2a2d] hover:text-white hover:border-zinc-600'}`}>
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative w-full lg:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search items..." className="luxury-input pl-10 py-2.5 text-sm" />
        </div>
      </div>

      {selectedItems.size > 0 && (
        <div className="flex items-center gap-4 px-4 py-3 rounded-xl bg-champagne-500/5 border border-champagne-500/20">
          <span className="text-sm font-sans text-champagne-400 font-medium">{selectedItems.size} selected</span>
          <div className="flex gap-2">
            <button onClick={bulkMarkAsFood} disabled={bulkProcessing}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-sans font-medium bg-zinc-500/10 text-zinc-300 border border-zinc-500/20 hover:bg-zinc-500/20 transition-all disabled:opacity-50">
              {bulkProcessing ? <Loader2 className="h-3 w-3 animate-spin" /> : <UtensilsCrossed className="h-3 w-3" />} Mark as Food
            </button>
            <button onClick={bulkMarkAsBeverage} disabled={bulkProcessing}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-sans font-medium bg-champagne-500/10 text-champagne-400 border border-champagne-500/20 hover:bg-champagne-500/20 transition-all disabled:opacity-50">
              {bulkProcessing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wine className="h-3 w-3" />} Mark as Beverage
            </button>
            <button onClick={() => setSelectedItems(new Set())} className="px-3 py-2 rounded-lg text-xs font-sans text-zinc-500 hover:text-zinc-300 transition-all">Clear</button>
          </div>
        </div>
      )}

      <div className="luxury-card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#2a2a2d]">
                <th className="text-left px-4 py-4 w-10">
                  <button onClick={toggleAll} className="text-zinc-500 hover:text-white transition-colors">
                    {allSelected ? <CheckSquare className="h-4 w-4 text-champagne-400" /> : someSelected ? <MinusSquare className="h-4 w-4 text-champagne-400" /> : <Square className="h-4 w-4" />}
                  </button>
                </th>
                <th className="text-left px-4 py-4 text-xs font-sans font-medium text-zinc-500 uppercase tracking-wider">POS Item</th>
                <th className="text-left px-4 py-4 text-xs font-sans font-medium text-zinc-500 uppercase tracking-wider">Outlets</th>
                <th className="text-right px-4 py-4 text-xs font-sans font-medium text-zinc-500 uppercase tracking-wider">Qty Sold</th>
                <th className="text-right px-4 py-4 text-xs font-sans font-medium text-zinc-500 uppercase tracking-wider">Revenue</th>
                <th className="text-left px-4 py-4 text-xs font-sans font-medium text-zinc-500 uppercase tracking-wider">Status</th>
                <th className="text-right px-4 py-4 text-xs font-sans font-medium text-zinc-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e1e21]">
              {filteredItems.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <CheckCircle2 className="h-10 w-10 text-emerald-500/40" />
                    <p className="text-zinc-400 font-sans text-sm">{activeTab === 'unmapped' ? 'All items mapped!' : 'No items found'}</p>
                  </div>
                </td></tr>
              ) : filteredItems.map((item) => {
                const mapping = getMappingForItem(item.item_name);
                const isSaving = savingItem === item.item_name;
                const isDropdownOpen = recipeDropdown === item.item_name;
                const isSelected = selectedItems.has(item.item_name);

                return (
                  <tr key={item.item_name} className={`transition-colors ${isSelected ? 'bg-champagne-500/5' : 'hover:bg-[#1a1a1d]/50'}`}>
                    <td className="px-4 py-4">
                      <button onClick={() => toggleItem(item.item_name)} className="text-zinc-500 hover:text-white transition-colors">
                        {isSelected ? <CheckSquare className="h-4 w-4 text-champagne-400" /> : <Square className="h-4 w-4" />}
                      </button>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm font-sans font-medium text-white">{item.item_name}</p>
                      {item.item_number && item.item_number !== 'EMPTY' && <p className="text-xs font-sans text-zinc-500 mt-0.5">#{item.item_number}</p>}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-1">
                        {item.outlets.map((o) => <span key={o} className="px-2 py-0.5 rounded-md bg-[#1a1a1d] border border-[#2e2e31] text-xs font-sans text-zinc-400">{o}</span>)}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right"><span className="text-sm font-sans text-zinc-300">{item.total_qty.toLocaleString()}</span></td>
                    <td className="px-4 py-4 text-right"><span className="text-sm font-sans text-zinc-300">AED {item.total_sales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></td>
                    <td className="px-4 py-4">
                      {!mapping && <span className="status-badge bg-amber-500/10 text-amber-400 border border-amber-500/20">Unmapped</span>}
                      {mapping?.is_beverage && <span className="status-badge status-badge-success flex items-center gap-1.5 w-fit"><Wine className="h-3 w-3" />{mapping.recipe_id ? getRecipeName(mapping.recipe_id) : 'Beverage'}</span>}
                      {mapping && !mapping.is_beverage && <span className="status-badge bg-zinc-500/10 text-zinc-400 border border-zinc-500/20 flex items-center gap-1.5 w-fit"><UtensilsCrossed className="h-3 w-3" />Food</span>}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-2 relative">
                        {isSaving ? <Loader2 className="h-4 w-4 text-champagne-500 animate-spin" /> : (
                          <>
                            <div className="relative">
                              <button onClick={() => { setRecipeDropdown(isDropdownOpen ? null : item.item_name); setRecipeSearch(''); }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-sans font-medium bg-champagne-500/10 text-champagne-400 border border-champagne-500/20 hover:bg-champagne-500/20 transition-all">
                                <Link2 className="h-3 w-3" />{mapping?.is_beverage ? 'Remap' : 'Map'}
                              </button>
                              {isDropdownOpen && (
                                <div className="absolute right-0 top-full mt-2 w-72 rounded-xl bg-[#1a1a1d] border border-[#2e2e31] shadow-2xl z-50 overflow-hidden">
                                  <div className="p-3 border-b border-[#2e2e31]">
                                    <input type="text" value={recipeSearch} onChange={(e) => setRecipeSearch(e.target.value)} placeholder="Search recipes..."
                                      className="w-full px-3 py-2 rounded-lg bg-[#111113] border border-[#2e2e31] text-white text-sm font-sans placeholder-zinc-500 focus:outline-none focus:border-champagne-500/50" autoFocus />
                                  </div>
                                  <div className="max-h-48 overflow-y-auto">
                                    {filteredRecipes.length === 0 ? <div className="px-4 py-3 text-xs font-sans text-zinc-500">No recipes found</div> :
                                      filteredRecipes.map((recipe) => (
                                        <button key={recipe.id} onClick={() => markSingleAsBeverage(item, recipe.id)}
                                          className="w-full px-4 py-2.5 text-left hover:bg-[#2a2a2d] transition-colors flex items-center justify-between">
                                          <div>
                                            <p className="text-sm font-sans text-white">{recipe.name}</p>
                                            <p className="text-xs font-sans text-zinc-500">{recipe.category}</p>
                                          </div>
                                          <Wine className="h-3.5 w-3.5 text-champagne-500/40" />
                                        </button>
                                      ))
                                    }
                                  </div>
                                </div>
                              )}
                            </div>
                            <button onClick={() => markSingleAsFood(item)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-sans font-medium transition-all ${mapping && !mapping.is_beverage ? 'bg-zinc-500/20 text-zinc-300 border border-zinc-500/30' : 'bg-[#1a1a1d] text-zinc-400 border border-[#2e2e31] hover:text-zinc-300 hover:border-zinc-600'}`}>
                              <UtensilsCrossed className="h-3 w-3" />Food
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-center text-xs font-sans text-zinc-600">
        {stats.mapped} of {stats.total} items mapped &bull; {stats.beverages} beverages &bull; {stats.food} food items
      </div>

      {recipeDropdown && <div className="fixed inset-0 z-40" onClick={() => setRecipeDropdown(null)} />}
    </div>
  );
}
