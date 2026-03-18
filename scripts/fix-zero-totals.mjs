#!/usr/bin/env node

/**
 * fix-zero-totals.mjs — תיקון חשבוניות עם סכום 0
 *
 * Usage: node scripts/fix-zero-totals.mjs
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

// Load .env
const envPath = resolve(import.meta.dirname || '.', '..', '.env');
const envContent = readFileSync(envPath, 'utf-8');
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  const val = trimmed.slice(eqIdx + 1).trim();
  if (!process.env[key]) process.env[key] = val;
}

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function main() {
  console.log('Fetching invoices with items...\n');

  const { data: invoices, error } = await supabase
    .from('invoices')
    .select('id, invoice_number, total_amount, items:invoice_items(quantity, unit_price, total_price)');

  if (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }

  console.log('Total invoices:', invoices.length);

  let fixed = 0;
  const stillZero = [];

  for (const inv of invoices) {
    const currentTotal = Number(inv.total_amount) || 0;

    if (currentTotal === 0 && inv.items && inv.items.length > 0) {
      const total = inv.items.reduce((s, it) => {
        return s + (Number(it.total_price) || (Number(it.quantity) * Number(it.unit_price)));
      }, 0);

      if (total > 0) {
        const { error: updateErr } = await supabase
          .from('invoices')
          .update({ total_amount: total })
          .eq('id', inv.id);

        if (updateErr) {
          console.error('  Error updating #' + inv.invoice_number + ':', updateErr.message);
        } else {
          console.log('  Fixed #' + inv.invoice_number + ' -> ' + total);
          fixed++;
        }
      } else {
        stillZero.push(inv.invoice_number);
      }
    } else if (currentTotal === 0) {
      stillZero.push(inv.invoice_number);
    }
  }

  console.log('\n=== Summary ===');
  console.log('Fixed:', fixed);
  console.log('Already had totals:', invoices.length - fixed - stillZero.length);

  if (stillZero.length > 0) {
    console.log('Still 0 (no items in DB):', stillZero.length);
    console.log('  Invoices:', stillZero.map(n => '#' + n).join(', '));
    console.log('\nThese invoices have no items - need to re-scan from original files.');
  }
}

main();
