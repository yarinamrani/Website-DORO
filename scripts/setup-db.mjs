#!/usr/bin/env node

/**
 * One-time database setup script for DORO Invoice Tracker.
 *
 * Usage:
 *   node scripts/setup-db.mjs
 *
 * Requires SUPABASE_ACCESS_TOKEN environment variable or pass as argument:
 *   SUPABASE_ACCESS_TOKEN=sbp_xxx node scripts/setup-db.mjs
 */

const PROJECT_REF = 'vzeowbriddhvhpishmhn';
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN || process.argv[2];

if (!ACCESS_TOKEN) {
  console.error('❌ Missing access token!');
  console.error('');
  console.error('Usage:');
  console.error('  SUPABASE_ACCESS_TOKEN=sbp_xxx node scripts/setup-db.mjs');
  console.error('  or: node scripts/setup-db.mjs sbp_xxx');
  console.error('');
  console.error('Get your token at: https://supabase.com/dashboard/account/tokens');
  process.exit(1);
}

const SQL = `
-- Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  invoice_date DATE NOT NULL,
  received_date DATE DEFAULT CURRENT_DATE,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'checked', 'disputed', 'paid')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Invoice Items
CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  sku TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  category TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Price History
CREATE TABLE IF NOT EXISTS price_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  sku TEXT,
  old_price DECIMAL(10,2),
  new_price DECIMAL(10,2) NOT NULL,
  price_change_percent DECIMAL(5,2),
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  recorded_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_invoices_supplier ON invoices(supplier_id);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date DESC);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_price_history_supplier ON price_history(supplier_id);
CREATE INDEX IF NOT EXISTS idx_price_history_product ON price_history(product_name, supplier_id);

-- Enable RLS
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all on suppliers') THEN
    CREATE POLICY "Allow all on suppliers" ON suppliers FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all on invoices') THEN
    CREATE POLICY "Allow all on invoices" ON invoices FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all on invoice_items') THEN
    CREATE POLICY "Allow all on invoice_items" ON invoice_items FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all on price_history') THEN
    CREATE POLICY "Allow all on price_history" ON price_history FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
`;

async function run() {
  console.log('🔧 Setting up DORO Invoice Tracker database...\n');

  const url = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: SQL }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`❌ Failed (${res.status}): ${text}`);
    process.exit(1);
  }

  const result = await res.json();

  if (result.error) {
    console.error('❌ SQL Error:', result.error);
    process.exit(1);
  }

  console.log('✅ Database tables created successfully!');
  console.log('');
  console.log('   📦 suppliers      - ניהול ספקים');
  console.log('   📄 invoices       - חשבוניות');
  console.log('   📋 invoice_items  - פריטים בחשבונית');
  console.log('   📊 price_history  - מעקב שינויי מחירים');
  console.log('');
  console.log('🎉 Ready! Open your app and go to /invoices');
}

run().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
