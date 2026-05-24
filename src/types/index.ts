export interface Outlet {
  id: string;
  name: string;
  type: string;
  created_at: string;
}

export interface InventoryItem {
  id: string;
  outlet_id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  par_level: number;
  cost_per_unit: number;
  created_at: string;
  updated_at: string;
}

export interface ShiftNote {
  id: string;
  outlet_id: string;
  shift_date: string;
  shift_type: 'morning' | 'afternoon' | 'evening' | 'night';
  staff_notes: string;
  service_summary: string;
  incidents: string;
  created_by: string | null;
  created_at: string;
}

export interface Recipe {
  id: string;
  outlet_id: string;
  name: string;
  category: string;
  ingredients: { name: string; amount: string }[];
  preparation: string;
  glassware: string;
  garnish: string;
  selling_price: number;
  cost: number;
  created_at: string;
}

export interface UserOutlet {
  id: string;
  user_id: string;
  outlet_id: string;
  role: string;
  created_at: string;
}

export type StockStatus = 'in-stock' | 'low-stock' | 'out-of-stock';
