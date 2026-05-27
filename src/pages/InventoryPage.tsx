import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useUserOutlets } from '../hooks/useOutlets';
import {
  Package, Search, X, AlertTriangle, RefreshCw,
  ClipboardList, TrendingDown, ChevronUp, ChevronDown,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

type ActiveTab  = 'stock' | 'transactions';
type StockState = 'ok' | 'low' | 'critical' | 'no-opening';

interface StockRow {
  id: string;
  outlet_id: string;
  ingredient_id: string;
  on_hand_ml: number;
  opening_stock_ml: number;
  last_updated: string;
  ingredients: { id: string; name: string; category: string; bottle_size: number; cost_per_ml: number } | null;
  outlets: { id: string; name: string } | null;
}

interface TxRow {
  id: string;
  transaction_type: string;
  quantity_ml: number;
  sale_date: string | null;
  created_at: string;
  notes: string | null;
  ingredients: { name: string } | null;
  outlets: { name: string } | null;
}

interface IngredientForOpening {
  id: string;
  name: string;
  category: string;
  bottle_size: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function stockState(row: StockRow): StockState {
  if (!row.opening_stock_ml || row.opening_stock_ml === 0) return 'no-opening';
  if (row.on_hand_ml <= 0) return 'critical';
  const pct = row.on_hand_ml / row.opening_stock_ml;
  if (pct < 0.2) return 'low';
  return 'ok';
}

function toBottles(ml: number, bottleSize: number, showSign = false): string {
  const bs = bottleSize > 0 ? bottleSize : 750;
  const btl = ml / bs;
  const sign = showSign && ml > 0 ? '+' : '';
  if (Math.abs(btl) < 0.01) return `0 btl`;
  return `${sign}${btl.toFixed(2)} btl`;
}

const TX_LABEL: Record<string, { label: string; cls: string }> = {
  sale_deduction:           { label: 'Sale',          cls: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
  opening_stock:            { label: 'Opening Stock', cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  manual_adjustment:        { label: 'Adjustment',    cls: 'bg-sky-500/10 text-sky-400 border-sky-500/20' },
  physical_count_adjustment:{ label: 'Count Adj.',    cls: 'bg-violet-500/10 text-violet-400 border-violet-500/20' },
  wastage:                  { label: 'Wastage',       cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  transfer_in:              { label: 'Transfer In',   cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  transfer_out:             { label: 'Transfer Out',  cls: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
};

const STATUS_CONFIG = {
  ok:          { label: 'In Stock',   cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  low:         { label: 'Low',        cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  critical:    { label: 'Critical',   cls: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
  'no-opening':{ label: 'Set Opening',cls: 'bg-zinc-800/50 text-zinc-500 border-zinc-700/50' },
};

// ─── Opening Stock Panel ──────────────────────────────────────────────────────

interface OpeningStockPanelProps {
  outlets: { id: string; name: string }[];
  stockRows: StockRow[];
  onClose: () => void;
  onSaved: () => void;
}

function OpeningStockPanel({ outlets, stockRows, onClose, onSaved }: OpeningStockPanelProps) {
  const [selectedOutlet, setSelectedOutlet] = useState(outlets[0]?.id || '');
  const [allIngredients, setAllIngredients] = useState<IngredientForOpening[]>([]);
  const [bottleInputs, setBottleInputs] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [loadingIngredients, setLoadingIngredients] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  // Fetch all ingredients once
  useEffect(() => {
    supabase
      .from('ingredients')
      .select('id, name, category, bottle_size')
      .order('name')
      .then(({ data }) => {
        if (data) setAllIngredients(data);
        setLoadingIngredients(false);
      });
  }, []);

  // Pre-fill inputs from existing stock rows when outlet or ingredients change
  useEffect(() => {
    const inputs: Record<string, string> = {};
    stockRows
      .filter(r => r.outlet_id === selectedOutlet && r.opening_stock_ml > 0)
      .forEach(r => {
        const bs = r.ingredients?.bottle_size || 750;
        inputs[r.ingredient_id] = (r.opening_stock_ml / bs).toFixed(2);
      });
    setBottleInputs(inputs);
  }, [selectedOutlet, stockRows]);

  const trackedIds = new Set(
    stockRows.filter(r => r.outlet_id === selectedOutlet).map(r => r.ingredient_id)
  );

  const displayed = allIngredients.filter(ing => {
    const matchSearch = ing.name.toLowerCase().includes(searchQuery.toLowerCase());
    const isTracked = trackedIds.has(ing.id);
    return matchSearch && (showAll || isTracked || searchQuery.length >= 2);
  });

  const changedCount = Object.values(bottleInputs).filter(v => v !== '' && Number(v) >= 0).length;

  const handleSave = async () => {
    setSaving(true);
    let count = 0;
    const entries = Object.entries(bottleInputs).filter(([, v]) => v !== '' && Number(v) >= 0);
    for (const [ingId, bottles] of entries) {
      const ing = allIngredients.find(i => i.id === ingId);
      const bs = ing?.bottle_size || 750;
      await supabase.rpc('set_opening_stock', {
        p_outlet_id: selectedOutlet,
        p_ingredient_id: ingId,
        p_bottles: Number(bottles),
        p_bottle_size: bs,
      });
      count++;
    }
    setSavedCount(count);
    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl luxury-card max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between mb-5 shrink-0">
          <div>
            <h2 className="text-xl font-semibold text-white">Opening Stock</h2>
            <p className="text-sm text-zinc-500 mt-0.5">Enter current bottle counts per ingredient</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-[#1a1a1d] transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Outlet selector */}
        {outlets.length > 1 && (
          <select
            value={selectedOutlet}
            onChange={e => setSelectedOutlet(e.target.value)}
            className="luxury-input mb-4 shrink-0"
          >
            {outlets.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        )}

        {/* Search + toggle */}
        <div className="flex gap-3 mb-4 shrink-0">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search ingredients..."
              className="luxury-input pl-10 text-sm"
            />
          </div>
          <button
            onClick={() => setShowAll(!showAll)}
            className={`px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
              showAll
                ? 'border-amber-500/50 text-amber-400 bg-amber-500/10'
                : 'border-[#2e2e31] text-zinc-400 hover:text-white'
            }`}
          >
            {showAll ? 'Tracked Only' : 'Show All'}
          </button>
        </div>

        {/* Ingredient list */}
        <div className="flex-1 overflow-y-auto space-y-2 min-h-0 pr-1">
          {loadingIngredients ? (
            <div className="flex justify-center py-10">
              <div className="h-6 w-6 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
            </div>
          ) : displayed.length === 0 ? (
            <p className="text-center text-zinc-500 py-10 text-sm">
              {searchQuery
                ? 'No ingredients match your search.'
                : 'No tracked ingredients for this outlet yet. Click "Show All" or search to add opening stock.'}
            </p>
          ) : (
            displayed.map(ing => (
              <div key={ing.id} className="flex items-center gap-4 py-3 px-4 rounded-xl bg-[#0a0a0b] border border-[#1e1e21] hover:border-[#2e2e31] transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{ing.name}</p>
                  <p className="text-xs text-zinc-500">{ing.category} · {ing.bottle_size || 750}ml bottle</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <input
                    type="number"
                    value={bottleInputs[ing.id] ?? ''}
                    onChange={e => setBottleInputs(prev => ({ ...prev, [ing.id]: e.target.value }))}
                    placeholder="0"
                    className="luxury-input w-24 text-right text-sm"
                    min="0"
                    step="0.25"
                  />
                  <span className="text-xs text-zinc-500 w-5">btl</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 mt-4 border-t border-[#1e1e21] shrink-0">
          <p className="text-xs text-zinc-500">
            {changedCount > 0 ? `${changedCount} ingredient${changedCount === 1 ? '' : 's'} ready to save` : 'Enter bottle counts above'}
          </p>
          <div className="flex gap-3">
            <button onClick={onClose} className="luxury-button-secondary">Cancel</button>
            <button
              onClick={handleSave}
              disabled={saving || changedCount === 0}
              className="luxury-button disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Opening Stock'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function InventoryPage() {
  const { outlets } = useUserOutlets();
  const [activeTab, setActiveTab]           = useState<ActiveTab>('stock');
  const [stockRows, setStockRows]           = useState<StockRow[]>([]);
  const [transactions, setTransactions]     = useState<TxRow[]>([]);
  const [loading, setLoading]               = useState(true);
  const [searchQuery, setSearchQuery]       = useState('');
  const [selectedOutlet, setSelectedOutlet] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [statusFilter, setStatusFilter]     = useState<StockState | 'all'>('all');
  const [showOpeningPanel, setShowOpeningPanel] = useState(false);
  const [processingSales, setProcessingSales]   = useState(false);
  const [lastProcessResult, setLastProcessResult] = useState<string | null>(null);
  const [sortField, setSortField]           = useState<'name' | 'on_hand' | 'sold'>('name');
  const [sortDir, setSortDir]               = useState<'asc' | 'desc'>('asc');

  // ── Fetch stock
  const fetchStock = useCallback(async () => {
    if (outlets.length === 0) { setLoading(false); return; }
    const ids = outlets.map(o => o.id);
    const { data } = await supabase
      .from('inventory_stock')
      .select('*, ingredients(id, name, category, bottle_size, cost_per_ml), outlets(id, name)')
      .in('outlet_id', ids);
    if (data) setStockRows(data as StockRow[]);
    setLoading(false);
  }, [outlets]);

  // ── Fetch transactions
  const fetchTransactions = useCallback(async () => {
    if (outlets.length === 0) return;
    const ids = outlets.map(o => o.id);
    const { data } = await supabase
      .from('inventory_transactions')
      .select('*, ingredients(name), outlets(name)')
      .in('outlet_id', ids)
      .order('created_at', { ascending: false })
      .limit(300);
    if (data) setTransactions(data as TxRow[]);
  }, [outlets]);

  useEffect(() => { fetchStock(); }, [fetchStock]);
  useEffect(() => {
    if (activeTab === 'transactions') fetchTransactions();
  }, [activeTab, fetchTransactions]);

  // ── Process new sales
  const processSales = async () => {
    setProcessingSales(true);
    setLastProcessResult(null);
    const { data, error } = await supabase.rpc('process_daily_sales');
    if (!error && data?.[0]) {
      const r = data[0];
      if (r.processed_rows === 0) {
        setLastProcessResult('No new sales to process.');
      } else {
        setLastProcessResult(`${r.processed_rows} rows processed · ${r.deductions_made} deductions made`);
      }
    }
    await fetchStock();
    setProcessingSales(false);
  };

  // ── Filter + sort
  const filtered = stockRows.filter(row => {
    const name = (row.ingredients?.name ?? '').toLowerCase();
    const matchSearch   = name.includes(searchQuery.toLowerCase());
    const matchOutlet   = selectedOutlet === 'all' || row.outlet_id === selectedOutlet;
    const matchCategory = selectedCategory === 'all' || (row.ingredients?.category ?? '') === selectedCategory;
    const matchStatus   = statusFilter === 'all' || stockState(row) === statusFilter;
    return matchSearch && matchOutlet && matchCategory && matchStatus;
  }).sort((a, b) => {
    let cmp = 0;
    if (sortField === 'name')    cmp = (a.ingredients?.name ?? '').localeCompare(b.ingredients?.name ?? '');
    if (sortField === 'on_hand') cmp = a.on_hand_ml - b.on_hand_ml;
    if (sortField === 'sold')    cmp = (a.opening_stock_ml - a.on_hand_ml) - (b.opening_stock_ml - b.on_hand_ml);
    return sortDir === 'asc' ? cmp : -cmp;
  });

  // ── Sort toggle helper
  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const SortIcon = ({ field }: { field: typeof sortField }) =>
    sortField === field
      ? (sortDir === 'asc' ? <ChevronUp className="h-3 w-3 ml-1 inline" /> : <ChevronDown className="h-3 w-3 ml-1 inline" />)
      : null;

  // ── Summary stats
  const criticalCount  = stockRows.filter(r => stockState(r) === 'critical').length;
  const lowCount       = stockRows.filter(r => stockState(r) === 'low').length;
  const noOpeningCount = stockRows.filter(r => stockState(r) === 'no-opening').length;
  const totalValue     = stockRows.reduce((s, r) => s + Math.max(0, r.on_hand_ml) * (r.ingredients?.cost_per_ml ?? 0), 0);
  const uniqueCategories = [...new Set(stockRows.map(r => r.ingredients?.category).filter(Boolean))].sort() as string[];

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Inventory</h1>
          <p className="text-zinc-400 mt-1">Theoretical stock based on POS deductions</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={processSales}
            disabled={processingSales}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#2e2e31] text-sm text-zinc-300 hover:text-white hover:border-zinc-500 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${processingSales ? 'animate-spin' : ''}`} />
            {processingSales ? 'Processing...' : 'Process Sales'}
          </button>
          <button
            onClick={() => setShowOpeningPanel(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-black font-semibold hover:from-amber-400 hover:to-amber-500 transition-all"
          >
            <ClipboardList className="h-4 w-4" />
            Opening Stock
          </button>
        </div>
      </div>

      {/* ── Stats bar ── */}
      <div className="flex flex-wrap gap-3">
        <div className="px-4 py-2 rounded-xl bg-[#111113] border border-[#1e1e21] flex items-center gap-2">
          <Package className="h-4 w-4 text-zinc-400" />
          <span className="text-sm text-zinc-400">{stockRows.length} ingredients tracked</span>
        </div>
        {totalValue > 0 && (
          <div className="px-4 py-2 rounded-xl bg-[#111113] border border-[#1e1e21] flex items-center gap-2">
            <span className="text-sm text-zinc-400">Est. stock value</span>
            <span className="text-sm font-semibold text-white">AED {totalValue.toFixed(0)}</span>
          </div>
        )}
        {criticalCount > 0 && (
          <div className="px-4 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-400" />
            <span className="text-sm text-rose-400">{criticalCount} critical</span>
          </div>
        )}
        {lowCount > 0 && (
          <div className="px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-amber-400" />
            <span className="text-sm text-amber-400">{lowCount} low stock</span>
          </div>
        )}
        {noOpeningCount > 0 && (
          <button
            onClick={() => setShowOpeningPanel(true)}
            className="px-4 py-2 rounded-xl bg-zinc-800/50 border border-zinc-700/50 flex items-center gap-2 hover:border-amber-500/30 transition-colors"
          >
            <span className="text-sm text-zinc-500">{noOpeningCount} need opening stock →</span>
          </button>
        )}
        {lastProcessResult && (
          <div className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <span className="text-sm text-emerald-400">{lastProcessResult}</span>
          </div>
        )}
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 p-1 rounded-xl bg-[#0a0a0b] border border-[#1e1e21] w-fit">
        {(['stock', 'transactions'] as ActiveTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab ? 'bg-[#1a1a1d] text-white' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {tab === 'stock' ? 'Live Stock' : 'Transactions'}
          </button>
        ))}
      </div>

      {/* ── Live Stock tab ── */}
      {activeTab === 'stock' && (
        <>
          {/* Filters */}
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="luxury-input pl-12"
                placeholder="Search ingredients..."
              />
            </div>
            <div className="flex gap-3 flex-wrap">
              {outlets.length > 1 && (
                <select value={selectedOutlet} onChange={e => setSelectedOutlet(e.target.value)} className="luxury-input w-auto min-w-[140px]">
                  <option value="all">All Outlets</option>
                  {outlets.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              )}
              <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="luxury-input w-auto min-w-[150px]">
                <option value="all">All Categories</option>
                {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as StockState | 'all')} className="luxury-input w-auto min-w-[150px]">
                <option value="all">All Status</option>
                <option value="ok">In Stock</option>
                <option value="low">Low Stock</option>
                <option value="critical">Critical</option>
                <option value="no-opening">No Opening Stock</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="luxury-card overflow-hidden">
            {loading ? (
              <div className="text-center py-12">
                <div className="h-8 w-8 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mx-auto" />
              </div>
            ) : filtered.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#1e1e21]">
                      <th
                        onClick={() => toggleSort('name')}
                        className="text-left px-6 py-4 text-xs font-medium text-zinc-400 uppercase tracking-wide cursor-pointer hover:text-white transition-colors select-none"
                      >
                        Ingredient <SortIcon field="name" />
                      </th>
                      <th className="text-left px-6 py-4 text-xs font-medium text-zinc-400 uppercase tracking-wide">Outlet</th>
                      <th className="text-right px-6 py-4 text-xs font-medium text-zinc-400 uppercase tracking-wide">Opening</th>
                      <th
                        onClick={() => toggleSort('sold')}
                        className="text-right px-6 py-4 text-xs font-medium text-zinc-400 uppercase tracking-wide cursor-pointer hover:text-white transition-colors select-none"
                      >
                        Sold <SortIcon field="sold" />
                      </th>
                      <th
                        onClick={() => toggleSort('on_hand')}
                        className="text-right px-6 py-4 text-xs font-medium text-zinc-400 uppercase tracking-wide cursor-pointer hover:text-white transition-colors select-none"
                      >
                        On Hand <SortIcon field="on_hand" />
                      </th>
                      <th className="text-right px-6 py-4 text-xs font-medium text-zinc-400 uppercase tracking-wide">Value</th>
                      <th className="text-center px-6 py-4 text-xs font-medium text-zinc-400 uppercase tracking-wide">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(row => {
                      const state    = stockState(row);
                      const bs       = row.ingredients?.bottle_size || 750;
                      const soldMl   = row.opening_stock_ml - row.on_hand_ml;
                      const valueAed = Math.max(0, row.on_hand_ml) * (row.ingredients?.cost_per_ml ?? 0);

                      return (
                        <tr key={row.id} className="border-b border-[#1e1e21] last:border-0 hover:bg-[#0a0a0b]/60 transition-colors">
                          <td className="px-6 py-4">
                            <p className="text-sm font-medium text-white">{row.ingredients?.name ?? '—'}</p>
                            <p className="text-xs text-zinc-500 mt-0.5">{row.ingredients?.category}</p>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-zinc-400">{row.outlets?.name ?? '—'}</span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="text-sm text-zinc-400">
                              {row.opening_stock_ml > 0 ? toBottles(row.opening_stock_ml, bs) : <span className="text-zinc-600">—</span>}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="text-sm text-zinc-300">
                              {soldMl > 0 ? toBottles(soldMl, bs) : <span className="text-zinc-600">—</span>}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className={`text-sm font-semibold ${row.on_hand_ml > 0 ? 'text-white' : 'text-rose-400'}`}>
                              {toBottles(row.on_hand_ml, bs)}
                            </span>
                            <p className="text-xs text-zinc-600 mt-0.5">{Math.round(row.on_hand_ml)}ml</p>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="text-sm text-zinc-300">
                              {valueAed > 0.5 ? `AED ${valueAed.toFixed(0)}` : <span className="text-zinc-600">—</span>}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex justify-center">
                              <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${STATUS_CONFIG[state].cls}`}>
                                {STATUS_CONFIG[state].label}
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-16">
                <Package className="h-12 w-12 text-zinc-600 mx-auto mb-3" />
                <p className="text-zinc-400 mb-2">
                  {stockRows.length === 0 ? 'No stock data yet.' : 'No items match your filters.'}
                </p>
                {stockRows.length === 0 && (
                  <p className="text-sm text-zinc-600">
                    Sales have been imported — click <span className="text-zinc-400">Process Sales</span> to populate stock.
                  </p>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Transactions tab ── */}
      {activeTab === 'transactions' && (
        <div className="luxury-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1e1e21]">
                  <th className="text-left px-6 py-4 text-xs font-medium text-zinc-400 uppercase tracking-wide">Date</th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-zinc-400 uppercase tracking-wide">Ingredient</th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-zinc-400 uppercase tracking-wide">Outlet</th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-zinc-400 uppercase tracking-wide">Type</th>
                  <th className="text-right px-6 py-4 text-xs font-medium text-zinc-400 uppercase tracking-wide">Qty (ml)</th>
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-zinc-500 text-sm">No transactions yet.</td>
                  </tr>
                ) : transactions.map(tx => {
                  const cfg = TX_LABEL[tx.transaction_type] ?? { label: tx.transaction_type, cls: 'bg-zinc-800/50 text-zinc-400 border-zinc-700/50' };
                  return (
                    <tr key={tx.id} className="border-b border-[#1e1e21] last:border-0 hover:bg-[#0a0a0b]/50 transition-colors">
                      <td className="px-6 py-3">
                        <span className="text-sm text-zinc-400">{tx.sale_date ?? tx.created_at?.slice(0, 10)}</span>
                      </td>
                      <td className="px-6 py-3">
                        <span className="text-sm text-white">{tx.ingredients?.name ?? '—'}</span>
                      </td>
                      <td className="px-6 py-3">
                        <span className="text-sm text-zinc-400">{tx.outlets?.name ?? '—'}</span>
                      </td>
                      <td className="px-6 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-md border ${cfg.cls}`}>{cfg.label}</span>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <span className={`text-sm font-medium tabular-nums ${tx.quantity_ml >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {tx.quantity_ml >= 0 ? '+' : ''}{tx.quantity_ml.toFixed(0)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Opening Stock Panel ── */}
      {showOpeningPanel && (
        <OpeningStockPanel
          outlets={outlets}
          stockRows={stockRows}
          onClose={() => setShowOpeningPanel(false)}
          onSaved={fetchStock}
        />
      )}
    </div>
  );
}
