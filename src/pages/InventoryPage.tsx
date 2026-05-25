import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useUserOutlets } from '../hooks/useOutlets';
import type { InventoryItem, StockStatus } from '../types';
import { Package, Plus, Search, CreditCard as Edit2, Trash2, X, AlertTriangle, ChevronDown } from 'lucide-react';

const categories = [
  'spirits',
  'wine',
  'beer',
  'mixers',
  'garnishes',
  'glassware',
  'other',
];

const units = ['bottle', 'case', 'liter', 'ml', 'gallon', 'unit', 'box'];

function getStockStatus(item: InventoryItem): StockStatus {
  const percentage = (item.quantity / item.par_level) * 100;
  if (percentage <= 10) return 'out-of-stock';
  if (percentage <= 50) return 'low-stock';
  return 'in-stock';
}

interface InventoryModalProps {
  item: InventoryItem | null;
  outlets: { id: string; name: string }[];
  onSave: (data: Partial<InventoryItem>) => Promise<void>;
  onClose: () => void;
}

function InventoryModal({ item, outlets, onSave, onClose }: InventoryModalProps) {
  const [formData, setFormData] = useState({
    outlet_id: item?.outlet_id || outlets[0]?.id || '',
    name: item?.name || '',
    category: item?.category || 'spirits',
    quantity: item?.quantity || 0,
    unit: item?.unit || 'bottle',
    par_level: item?.par_level || 10,
    cost_per_unit: item?.cost_per_unit || 0,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await onSave(formData);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg luxury-card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">
            {item ? 'Edit Item' : 'Add New Item'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-[#1a1a1d] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {outlets.length > 1 && (
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Outlet</label>
              <select
                value={formData.outlet_id}
                onChange={(e) => setFormData({ ...formData, outlet_id: e.target.value })}
                className="luxury-input"
              >
                {outlets.map((outlet) => (
                  <option key={outlet.id} value={outlet.id}>
                    {outlet.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Item Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="luxury-input"
              placeholder="e.g. Grey Goose Vodka"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
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
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Unit</label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="luxury-input"
              >
                {units.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Quantity</label>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                className="luxury-input"
                min="0"
                step="0.01"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Par Level</label>
              <input
                type="number"
                value={formData.par_level}
                onChange={(e) => setFormData({ ...formData, par_level: Number(e.target.value) })}
                className="luxury-input"
                min="0"
                step="0.01"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Cost/Unit (AED)</label>
              <input
                type="number"
                value={formData.cost_per_unit}
                onChange={(e) =>
                  setFormData({ ...formData, cost_per_unit: Number(e.target.value) })
                }
                className="luxury-input"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="luxury-button-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="luxury-button">
              {loading ? 'Saving...' : item ? 'Update Item' : 'Add Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function InventoryPage() {
  const { outlets } = useUserOutlets();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedOutlet, setSelectedOutlet] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<StockStatus | 'all'>('all');
  const [modalItem, setModalItem] = useState<InventoryItem | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const fetchInventory = useCallback(async () => {
    if (outlets.length === 0) {
      setInventory([]);
      setLoading(false);
      return;
    }

    const outletIds = outlets.map((o) => o.id);
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .in('outlet_id', outletIds)
      .order('name');

    if (!error && data) {
      setInventory(data);
    }
    setLoading(false);
  }, [outlets]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const handleSave = async (data: Partial<InventoryItem>) => {
    if (modalItem) {
      const { error } = await supabase
        .from('inventory_items')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', modalItem.id);
      if (!error) {
        await fetchInventory();
        setShowModal(false);
        setModalItem(null);
      }
    } else {
      const { error } = await supabase.from('inventory_items').insert(data);
      if (!error) {
        await fetchInventory();
        setShowModal(false);
      }
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('inventory_items').delete().eq('id', id);
    if (!error) {
      await fetchInventory();
      setShowDeleteConfirm(null);
    }
  };

  const filteredInventory = inventory.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesOutlet = selectedOutlet === 'all' || item.outlet_id === selectedOutlet;
    const matchesStatus = statusFilter === 'all' || getStockStatus(item) === statusFilter;
    return matchesSearch && matchesCategory && matchesOutlet && matchesStatus;
  });

  const lowStockCount = inventory.filter((i) => getStockStatus(i) === 'low-stock').length;
  const outOfStockCount = inventory.filter((i) => getStockStatus(i) === 'out-of-stock').length;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Inventory Management</h1>
          <p className="text-zinc-400 mt-1">Track and manage your beverage inventory</p>
        </div>
        <button
          onClick={() => {
            setModalItem(null);
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-black font-semibold hover:from-amber-400 hover:to-amber-500 transition-all"
        >
          <Plus className="h-5 w-5" />
          Add Item
        </button>
      </div>

      {/* Stats bar */}
      {inventory.length > 0 && (
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#111113] border border-[#1e1e21]">
            <Package className="h-4 w-4 text-zinc-400" />
            <span className="text-sm text-zinc-400">{inventory.length} total items</span>
          </div>
          {lowStockCount > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <span className="text-sm text-amber-400">{lowStockCount} low stock</span>
            </div>
          )}
          {outOfStockCount > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
              <AlertTriangle className="h-4 w-4 text-rose-400" />
              <span className="text-sm text-rose-400">{outOfStockCount} out of stock</span>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="luxury-input pl-12"
            placeholder="Search items..."
          />
        </div>
        <div className="flex gap-3">
          {outlets.length > 1 && (
            <select
              value={selectedOutlet}
              onChange={(e) => setSelectedOutlet(e.target.value)}
              className="luxury-input w-auto min-w-[140px]"
            >
              <option value="all">All Outlets</option>
              {outlets.map((outlet) => (
                <option key={outlet.id} value={outlet.id}>
                  {outlet.name}
                </option>
              ))}
            </select>
          )}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="luxury-input w-auto min-w-[140px]"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StockStatus | 'all')}
            className="luxury-input w-auto min-w-[140px]"
          >
            <option value="all">All Status</option>
            <option value="in-stock">In Stock</option>
            <option value="low-stock">Low Stock</option>
            <option value="out-of-stock">Out of Stock</option>
          </select>
        </div>
      </div>

      {/* Inventory table */}
      <div className="luxury-card overflow-hidden">
        {loading ? (
          <div className="text-center py-12">
            <div className="h-8 w-8 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mx-auto" />
          </div>
        ) : filteredInventory.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1e1e21]">
                  <th className="text-left px-6 py-4 text-sm font-medium text-zinc-400">
                    Item Name
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-zinc-400">
                    Category
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-zinc-400">
                    Quantity
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-zinc-400">Par Level</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-zinc-400">Status</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-zinc-400">Cost/Unit</th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-zinc-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredInventory.map((item) => {
                  const status = getStockStatus(item);
                  const statusStyles: Record<StockStatus, string> = {
                    'in-stock': 'status-badge-success',
                    'low-stock': 'status-badge-warning',
                    'out-of-stock': 'status-badge-error',
                  };

                  return (
                    <tr
                      key={item.id}
                      className="border-b border-[#1e1e21] last:border-0 hover:bg-[#0a0a0b]/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-white">{item.name}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-zinc-400 capitalize">{item.category}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-white">
                          {item.quantity} {item.unit}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-zinc-400">
                          {item.par_level} {item.unit}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`status-badge ${statusStyles[status]}`}>
                          {status === 'in-stock'
                            ? 'In Stock'
                            : status === 'low-stock'
                              ? 'Low Stock'
                              : 'Out of Stock'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-white">
                          `AED ${item.cost_per_unit.toFixed(2)}`
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setModalItem(item);
                              setShowModal(true);
                            }}
                            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-[#1a1a1d] transition-colors"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          {showDeleteConfirm === item.id ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleDelete(item.id)}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setShowDeleteConfirm(null)}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-500/10 text-zinc-400 hover:bg-zinc-500/20 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setShowDeleteConfirm(item.id)}
                              className="p-2 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-400">
              {inventory.length === 0 ? 'No inventory items yet' : 'No items match your filters'}
            </p>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <InventoryModal
          item={modalItem}
          outlets={outlets}
          onSave={handleSave}
          onClose={() => {
            setShowModal(false);
            setModalItem(null);
          }}
        />
      )}
    </div>
  );
}
