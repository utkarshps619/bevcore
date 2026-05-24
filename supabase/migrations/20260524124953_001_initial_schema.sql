/*
  # BevCore Initial Schema

  1. New Tables
    - `outlets`: hospitality outlets (bars, restaurants)
      - `id` (uuid, primary key)
      - `name` (text)
      - `type` (text)
      - `created_at` (timestamp)
    - `inventory_items`: beverage inventory
      - `id` (uuid, primary key)
      - `outlet_id` (uuid, foreign key)
      - `name` (text)
      - `category` (text)
      - `quantity` (numeric)
      - `unit` (text)
      - `par_level` (numeric)
      - `cost_per_unit` (numeric)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    - `shift_notes`: shift reports and logs
      - `id` (uuid, primary key)
      - `outlet_id` (uuid, foreign key)
      - `shift_date` (date)
      - `shift_type` (text)
      - `staff_notes` (text)
      - `service_summary` (text)
      - `incidents` (text)
      - `created_by` (uuid, references auth.users)
      - `created_at` (timestamp)
    - `recipes`: cocktail and beverage recipes
      - `id` (uuid, primary key)
      - `outlet_id` (uuid, foreign key)
      - `name` (text)
      - `category` (text)
      - `ingredients` (jsonb)
      - `preparation` (text)
      - `glassware` (text)
      - `garnish` (text)
      - `selling_price` (numeric)
      - `cost` (numeric)
      - `created_at` (timestamp)
    - `user_outlets`: user-outlet assignments
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `outlet_id` (uuid, foreign key)
      - `role` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Policies restrict access to users assigned to outlets
*/

-- Outlets table
CREATE TABLE IF NOT EXISTS outlets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'bar',
  created_at timestamptz DEFAULT now()
);

-- Inventory items table
CREATE TABLE IF NOT EXISTS inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id uuid NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'spirits',
  quantity numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'bottle',
  par_level numeric NOT NULL DEFAULT 10,
  cost_per_unit numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Shift notes table
CREATE TABLE IF NOT EXISTS shift_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id uuid NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  shift_date date NOT NULL DEFAULT CURRENT_DATE,
  shift_type text NOT NULL DEFAULT 'evening',
  staff_notes text DEFAULT '',
  service_summary text DEFAULT '',
  incidents text DEFAULT '',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Recipes table
CREATE TABLE IF NOT EXISTS recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id uuid NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'cocktail',
  ingredients jsonb NOT NULL DEFAULT '[]',
  preparation text DEFAULT '',
  glassware text DEFAULT '',
  garnish text DEFAULT '',
  selling_price numeric NOT NULL DEFAULT 0,
  cost numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- User outlets junction table
CREATE TABLE IF NOT EXISTS user_outlets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  outlet_id uuid NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'staff',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, outlet_id)
);

-- Enable RLS
ALTER TABLE outlets ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_outlets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for outlets
CREATE POLICY "Users can view assigned outlets"
  ON outlets FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_outlets
      WHERE user_outlets.outlet_id = outlets.id
      AND user_outlets.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view outlet inventory"
  ON inventory_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_outlets
      WHERE user_outlets.outlet_id = inventory_items.outlet_id
      AND user_outlets.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert outlet inventory"
  ON inventory_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_outlets
      WHERE user_outlets.outlet_id = inventory_items.outlet_id
      AND user_outlets.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update outlet inventory"
  ON inventory_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_outlets
      WHERE user_outlets.outlet_id = inventory_items.outlet_id
      AND user_outlets.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_outlets
      WHERE user_outlets.outlet_id = inventory_items.outlet_id
      AND user_outlets.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete outlet inventory"
  ON inventory_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_outlets
      WHERE user_outlets.outlet_id = inventory_items.outlet_id
      AND user_outlets.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view outlet shift notes"
  ON shift_notes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_outlets
      WHERE user_outlets.outlet_id = shift_notes.outlet_id
      AND user_outlets.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert outlet shift notes"
  ON shift_notes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_outlets
      WHERE user_outlets.outlet_id = shift_notes.outlet_id
      AND user_outlets.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update outlet shift notes"
  ON shift_notes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_outlets
      WHERE user_outlets.outlet_id = shift_notes.outlet_id
      AND user_outlets.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_outlets
      WHERE user_outlets.outlet_id = shift_notes.outlet_id
      AND user_outlets.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view outlet recipes"
  ON recipes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_outlets
      WHERE user_outlets.outlet_id = recipes.outlet_id
      AND user_outlets.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert outlet recipes"
  ON recipes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_outlets
      WHERE user_outlets.outlet_id = recipes.outlet_id
      AND user_outlets.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update outlet recipes"
  ON recipes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_outlets
      WHERE user_outlets.outlet_id = recipes.outlet_id
      AND user_outlets.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_outlets
      WHERE user_outlets.outlet_id = recipes.outlet_id
      AND user_outlets.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete outlet recipes"
  ON recipes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_outlets
      WHERE user_outlets.outlet_id = recipes.outlet_id
      AND user_outlets.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view own outlet assignments"
  ON user_outlets FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own outlet assignments"
  ON user_outlets FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);