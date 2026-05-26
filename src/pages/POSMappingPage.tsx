import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import {
  Link2,
  Check,
  X,
  Search,
  Filter,
  Wine,
  UtensilsCrossed,
  AlertCircle,
  ChevronDown,
  Loader2,
  CheckCircle2,
  XCircle,
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

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    // Fetch unique POS items with aggregates
    const { data: rawItems } = await supabase
      .from('pos_sales_raw')
      .select('item_name, item_number, qty_sold, gross_sales, outlet_name');

    // Fetch recipes
    const { data: recipeData } = await supabase
      .from('recipes')
      .select('id, name, category, outlet_id');

    // Fetch existing mappings
    const { data: mappingData } = await supabase
      .from('recipe_pos_mappings')
      .select('*');

    // Aggregate POS items
    const itemMap = new Map<string, POSItem>();
    if (rawItems) {
      for (const row of rawItems) {
        const key = row.item_name;
        if (!itemMap.has(key)) {
          itemMap.set(key, {
            item_name: row.item_name,
            item_number: row.item_number || '',
            total_qty: 0,
            total_sales: 0,
            outlets: [],
          });
        }
        const item = itemMap.get(key)!;
        item.total_qty += row.qty_sold || 0;
        item.total_sales += row.gross_sales || 0;
        if (row.outlet_name && !item.outlets.includes(row.outlet_name)) {
          item.outlets.push(row.outlet_name);
        }
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
    const recipe = recipes.find((r) => r.id === recipeId);
    return recipe ? recipe.name : 'Unknown';
  }

  async function saveMapping(
    posItem: POSItem,
    recipeId: string | null,
    isBeverage: boolean
  ) {
    setSavingItem(posItem.item_name);

    const existing = getMappingForItem(posItem.item_name);

    if (existing) {
      await supabase
        .from('recipe_pos_mappings')
        .update({
          recipe_id: recipeId,
          is_beverage: isBeverage,
          is_verified: true,
        })
        .eq('id', existing.id);
    } else {
      await supabase.from('recipe_pos_mappings').insert({
        recipe_id: recipeId,
        pos_item_name: posItem.item_name,
        pos_item_number: posItem.item_number,
        is_beverage: isBeverage,
        is_verified: true,
      });
    }

    // Refresh mappings
    const { data: mappingData } = await supabase
      .from('recipe_pos_mappings')
      .select('*');
    setMappings(mappingData || []);

    setSavingItem(null);
    setRecipeDropdown(null);

    setSuccessMessage(`${posItem.item_name} mapped successfully`);
    setTimeout(() => setSuccessMessage(null), 2000);
  }

  async function markAsFood(posItem: POSItem) {
    await saveMapping(posItem, null, false);
  }

  async function markAsBeverage(posItem: POSItem, recipeId: string) {
    await saveMapping(posItem, recipeId, true);
  }

  const filteredItems = useMemo(() => {
    let items = posItems;

    // Filter by search
    if (searchTerm) {
      items = items.filter((item) =>
        item.item_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by tab
    switch (activeTab) {
      case 'unmapped':
        items = items.filter((item) => !getMappingForItem(item.item_name));
        break;
      case 'beverages':
        items = items.filter((item) => {
          const mapping = getMappingForItem(item.item_name);
          return mapping?.is_beverage === true;
        });
        break;
      case 'food':
        items = items.filter((item) => {
          const mapping = getMappingForItem(item.item_name);
          return mapping && !mapping.is_beverage;
        });
        break;
    }

    return items;
  }, [posItems, searchTerm, activeTab, mappings]);

  const stats = useMemo(() => {
    const total = posItems.length;
    const mapped = posItems.filter((i) => getMappingForItem(i.item_name)).length;
    const beverages = posItems.filter((i) => getMappingForItem(i.item_name)?.is_beverage).length;
    const food = posItems.filter((i) => {
      const m = getMappingForItem(i.item_name);
      return m && !m.is_beverage;
    }).length;
    const unmapped = total - mapped;
    return { total, mapped, beverages, food, unmapped };
  }, [posItems, mappings]);

  const filteredRecipes = useMemo(() => {
    if (!recipeSearch) return recipes;
    return recipes.filter((r) =>
      r.name.toLowerCase().includes(recipeSearch.toLowerCase())
    );
  }, [recipes, recipeSearch]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 text-champagne-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold text-white">POS Item Mapping</h1>
        <p className="text-zinc-400 mt-1 font-sans text-sm">
          Map Avero POS items to BevCore recipes. Mark non-beverage items as food to exclude from pour cost calculations.
        </p>
      </div>

      {/* Success toast */}
      {successMessage && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-sans animate-fade-in shadow-lg">
          <CheckCircle2 className="h-4 w-4" />
          {successMessage}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Items', value: stats.total, color: 'text-white' },
          { label: 'Unmapped', value: stats.unmapped, color: 'text-amber-400' },
          { label: 'Beverages', value: stats.beverages, color: 'text-champagne-400' },
          { label: 'Food', value: stats.food, color: 'text-zinc-400' },
          {
            label: 'Progress',
            value: stats.total > 0 ? `${Math.round((stats.mapped / stats.total) * 100)}%` : '0%',
            color: 'text-emerald-400',
          },
        ].map((stat) => (
          <div key={stat.label} className="kpi-card">
            <p className="text-xs font-sans text-zinc-500 uppercase tracking-wider">{stat.label}</p>
            <p className={`text-2xl font-semibold mt-1 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filter Tabs + Search */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div className="flex gap-2">
          {[
            { key: 'unmapped' as FilterTab, label: `Unmapped (${stats.unmapped})` },
            { key: 'beverages' as FilterTab, label: `Beverages (${stats.beverages})` },
            { key: 'food' as FilterTab, label: `Food (${stats.food})` },
            { key: 'all' as FilterTab, label: `All (${stats.total})` },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-xl text-sm font-sans font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-champagne-500/20 text-champagne-400 border border-champagne-500/30'
                  : 'bg-[#111113] text-zinc-400 border border-[#2a2a2d] hover:text-white hover:border-zinc-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full lg:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search items..."
            className="luxury-input pl-10 py-2.5 text-sm"
          />
        </div>
      </div>

      {/* Items Table */}
      <div className="luxury-card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#2a2a2d]">
                <th className="text-left px-6 py-4 text-xs font-sans font-medium text-zinc-500 uppercase tracking-wider">
                  POS Item
                </th>
                <th className="text-left px-6 py-4 text-xs font-sans font-medium text-zinc-500 uppercase tracking-wider">
                  Outlets
                </th>
                <th className="text-right px-6 py-4 text-xs font-sans font-medium text-zinc-500 uppercase tracking-wider">
                  Qty Sold
                </th>
                <th className="text-right px-6 py-4 text-xs font-sans font-medium text-zinc-500 uppercase tracking-wider">
                  Revenue
                </th>
                <th className="text-left px-6 py-4 text-xs font-sans font-medium text-zinc-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-right px-6 py-4 text-xs font-sans font-medium text-zinc-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e1e21]">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <CheckCircle2 className="h-10 w-10 text-emerald-500/40" />
                      <p className="text-zinc-400 font-sans text-sm">
                        {activeTab === 'unmapped'
                          ? 'All items mapped!'
                          : 'No items found'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const mapping = getMappingForItem(item.item_name);
                  const isSaving = savingItem === item.item_name;
                  const isDropdownOpen = recipeDropdown === item.item_name;

                  return (
                    <tr
                      key={item.item_name}
                      className="hover:bg-[#1a1a1d]/50 transition-colors"
                    >
                      {/* Item Name */}
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-sans font-medium text-white">
                            {item.item_name}
                          </p>
                          {item.item_number && (
                            <p className="text-xs font-sans text-zinc-500 mt-0.5">
                              #{item.item_number}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Outlets */}
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {item.outlets.map((outlet) => (
                            <span
                              key={outlet}
                              className="px-2 py-0.5 rounded-md bg-[#1a1a1d] border border-[#2e2e31] text-xs font-sans text-zinc-400"
                            >
                              {outlet}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Qty */}
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-sans text-zinc-300">
                          {item.total_qty.toLocaleString()}
                        </span>
                      </td>

                      {/* Revenue */}
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-sans text-zinc-300">
                          AED {item.total_sales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        {!mapping && (
                          <span className="status-badge bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            Unmapped
                          </span>
                        )}
                        {mapping?.is_beverage && (
                          <span className="status-badge status-badge-success flex items-center gap-1.5 w-fit">
                            <Wine className="h-3 w-3" />
                            {mapping.recipe_id ? getRecipeName(mapping.recipe_id) : 'Beverage'}
                          </span>
                        )}
                        {mapping && !mapping.is_beverage && (
                          <span className="status-badge bg-zinc-500/10 text-zinc-400 border border-zinc-500/20 flex items-center gap-1.5 w-fit">
                            <UtensilsCrossed className="h-3 w-3" />
                            Food
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2 relative">
                          {isSaving ? (
                            <Loader2 className="h-4 w-4 text-champagne-500 animate-spin" />
                          ) : (
                            <>
                              {/* Map to Recipe Button */}
                              <div className="relative">
                                <button
                                  onClick={() => {
                                    setRecipeDropdown(isDropdownOpen ? null : item.item_name);
                                    setRecipeSearch('');
                                  }}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-sans font-medium bg-champagne-500/10 text-champagne-400 border border-champagne-500/20 hover:bg-champagne-500/20 transition-all"
                                >
                                  <Link2 className="h-3 w-3" />
                                  {mapping?.is_beverage ? 'Remap' : 'Map Recipe'}
                                </button>

                                {/* Recipe Dropdown */}
                                {isDropdownOpen && (
                                  <div className="absolute right-0 top-full mt-2 w-72 rounded-xl bg-[#1a1a1d] border border-[#2e2e31] shadow-2xl z-50 overflow-hidden">
                                    <div className="p-3 border-b border-[#2e2e31]">
                                      <input
                                        type="text"
                                        value={recipeSearch}
                                        onChange={(e) => setRecipeSearch(e.target.value)}
                                        placeholder="Search recipes..."
                                        className="w-full px-3 py-2 rounded-lg bg-[#111113] border border-[#2e2e31] text-white text-sm font-sans placeholder-zinc-500 focus:outline-none focus:border-champagne-500/50"
                                        autoFocus
                                      />
                                    </div>
                                    <div className="max-h-48 overflow-y-auto">
                                      {filteredRecipes.length === 0 ? (
                                        <div className="px-4 py-3 text-xs font-sans text-zinc-500">
                                          No recipes found
                                        </div>
                                      ) : (
                                        filteredRecipes.map((recipe) => (
                                          <button
                                            key={recipe.id}
                                            onClick={() => markAsBeverage(item, recipe.id)}
                                            className="w-full px-4 py-2.5 text-left hover:bg-[#2a2a2d] transition-colors flex items-center justify-between"
                                          >
                                            <div>
                                              <p className="text-sm font-sans text-white">
                                                {recipe.name}
                                              </p>
                                              <p className="text-xs font-sans text-zinc-500">
                                                {recipe.category}
                                              </p>
                                            </div>
                                            <Wine className="h-3.5 w-3.5 text-champagne-500/40" />
                                          </button>
                                        ))
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Mark as Food Button */}
                              <button
                                onClick={() => markAsFood(item)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-sans font-medium transition-all ${
                                  mapping && !mapping.is_beverage
                                    ? 'bg-zinc-500/20 text-zinc-300 border border-zinc-500/30'
                                    : 'bg-[#1a1a1d] text-zinc-400 border border-[#2e2e31] hover:text-zinc-300 hover:border-zinc-600'
                                }`}
                              >
                                <UtensilsCrossed className="h-3 w-3" />
                                Food
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer info */}
      <div className="text-center text-xs font-sans text-zinc-600">
        {stats.mapped} of {stats.total} items mapped • {stats.beverages} beverages • {stats.food} food items
      </div>

      {/* Click outside to close dropdown */}
      {recipeDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setRecipeDropdown(null)}
        />
      )}
    </div>
  );
}
