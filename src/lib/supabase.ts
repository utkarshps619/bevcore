import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      outlets: {
        Row: {
          id: string;
          name: string;
          type: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          type?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          type?: string;
          created_at?: string;
        };
      };
      inventory_items: {
        Row: {
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
        };
        Insert: {
          id?: string;
          outlet_id: string;
          name: string;
          category?: string;
          quantity?: number;
          unit?: string;
          par_level?: number;
          cost_per_unit?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          outlet_id?: string;
          name?: string;
          category?: string;
          quantity?: number;
          unit?: string;
          par_level?: number;
          cost_per_unit?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      shift_notes: {
        Row: {
          id: string;
          outlet_id: string;
          shift_date: string;
          shift_type: string;
          staff_notes: string;
          service_summary: string;
          incidents: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          outlet_id: string;
          shift_date?: string;
          shift_type?: string;
          staff_notes?: string;
          service_summary?: string;
          incidents?: string;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          outlet_id?: string;
          shift_date?: string;
          shift_type?: string;
          staff_notes?: string;
          service_summary?: string;
          incidents?: string;
          created_by?: string | null;
          created_at?: string;
        };
      };
      recipes: {
        Row: {
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
        };
        Insert: {
          id?: string;
          outlet_id: string;
          name: string;
          category?: string;
          ingredients?: { name: string; amount: string }[];
          preparation?: string;
          glassware?: string;
          garnish?: string;
          selling_price?: number;
          cost?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          outlet_id?: string;
          name?: string;
          category?: string;
          ingredients?: { name: string; amount: string }[];
          preparation?: string;
          glassware?: string;
          garnish?: string;
          selling_price?: number;
          cost?: number;
          created_at?: string;
        };
      };
      user_outlets: {
        Row: {
          id: string;
          user_id: string;
          outlet_id: string;
          role: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          outlet_id: string;
          role?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          outlet_id?: string;
          role?: string;
          created_at?: string;
        };
      };
    };
  };
};
