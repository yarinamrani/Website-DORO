#!/usr/bin/env node

/**
 * scan-folder.mjs — סריקת תיקיית חשבוניות והכנסה ל-Supabase
 *
 * Usage:
 *   GEMINI_API_KEY=xxx node scripts/scan-folder.mjs ./path/to/invoices/
 *
 * סורק את כל קבצי PDF/JPG/PNG בתיקייה, מנתח עם Gemini,
 * ומכניס את הנתונים ל-Supabase.
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { resolve, join, extname } from 'path';
import { scanInvoice } from './scan-invoice.mjs';

// ─── Load .env ─────────────────────────────────────────────────
function loadEnv() {
  try {
    const envPath = resolve(import.meta.dirname || '.', '..', '.env');
    const content = readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  } catch { /* .env is optional */ }
}
loadEnv();

// ─── Config ────────────────────────────────────────────────────
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const VALID_EXTENSIONS = new Set(['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.tiff', '.tif']);

if (!process.env.GEMINI_API_KEY) {
  console.error('❌ חסר GEMINI_API_KEY');
  process.exit(1);
}
if (!SUPABASE_URL) {
  console.error('❌ חסר VITE_SUPABASE_URL ב-.env');
  process.exit(1);
}
if (!SUPABASE_KEY) {
  console.error('❌ חסר VITE_SUPABASE_ANON_KEY ב-.env');
  process.exit(1);
}

// ─── Supabase helpers ──────────────────────────────────────────
async function supabaseRequest(path, options = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': options.prefer || 'return=representation',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase ${options.method || 'GET'} ${path} (${res.status}): ${text}`);
  }

  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function upsertSupplier(name) {
  if (!name) return null;

  // Check if supplier exists
  const existing = await supabaseRequest(
    `suppliers?name=eq.${encodeURIComponent(name)}&select=id,name&limit=1`
  );

  if (existing && existing.length > 0) {
    console.log(`   ✅ ספק קיים: ${name}`);
    return existing[0].id;
  }

  // Insert new supplier
  const inserted = await supabaseRequest('suppliers', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });

  console.log(`   ✨ ספק חדש נוצר: ${name}`);
  return inserted[0].id;
}

async function upsertInvoice(invoiceData, supplierId) {
  const invoiceNumber = invoiceData.invoice_number;
  if (!invoiceNumber) {
    console.warn('   ⚠️ חשבונית ללא מספר — מדלג');
    return null;
  }

  // Check if invoice already exists
  const existing = await supabaseRequest(
    `invoices?invoice_number=eq.${encodeURIComponent(invoiceNumber)}&supplier_id=eq.${supplierId}&select=id&limit=1`
  );

  const invoiceRow = {
    supplier_id: supplierId,
    invoice_number: invoiceNumber,
    invoice_date: invoiceData.invoice_date || new Date().toISOString().slice(0, 10),
    total_amount: invoiceData.total_amount || 0,
    status: invoiceData.status || 'received',
    notes: invoiceData.vat_amount
      ? `מע"מ: ₪${invoiceData.vat_amount} | לפני מע"מ: ₪${invoiceData.amount_before_vat || ''}`
      : null,
  };

  let invoiceId;

  if (existing && existing.length > 0) {
    invoiceId = existing[0].id;
    await supabaseRequest(`invoices?id=eq.${invoiceId}`, {
      method: 'PATCH',
      body: JSON.stringify(invoiceRow),
    });
    console.log(`   🔄 חשבונית ${invoiceNumber} עודכנה`);
  } else {
    const inserted = await supabaseRequest('invoices', {
      method: 'POST',
      body: JSON.stringify(invoiceRow),
    });
    invoiceId = inserted[0].id;
    console.log(`   ✨ חשבונית ${invoiceNumber} נוצרה`);
  }

  // Insert items
  if (invoiceData.items && invoiceData.items.length > 0) {
    // Delete existing items first
    await supabaseRequest(`invoice_items?invoice_id=eq.${invoiceId}`, {
      method: 'DELETE',
      prefer: 'return=minimal',
    }).catch(() => { /* ignore if none exist */ });

    const items = invoiceData.items.map((item) => ({
      invoice_id: invoiceId,
      product_name: item.product_name || item.name || 'פריט לא ידוע',
      quantity: item.quantity || 1,
      unit_price: item.unit_price || 0,
    }));

    await supabaseRequest('invoice_items', {
      method: 'POST',
      body: JSON.stringify(items),
    });
    console.log(`   📦 ${items.length} פריטים נשמרו`);
  }

  return invoiceId;
}

// ─── Collect files recursively ─────────────────────────────────
function collectFiles(dir) {
  const files = [];

  function walk(currentDir) {
    const entries = readdirSync(currentDir);
    for (const entry of entries) {
      const fullPath = join(currentDir, entry);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        walk(fullPath);
      } else if (stat.isFile()) {
        const ext = extname(entry).toLowerCase();
        if (VALID_EXTENSIONS.has(ext)) {
          files.push(fullPath);
        }
      }
    }
  }

  walk(dir);
  return files.sort();
}

// ─── Main ──────────────────────────────────────────────────────
async function main() {
  const folderPath = process.argv[2];
  if (!folderPath) {
    console.error('שימוש: node scripts/scan-folder.mjs <path-to-folder>');
    console.error('דוגמה: node scripts/scan-folder.mjs ./imported-data/restaurant-invoices/');
    process.exit(1);
  }

  const absFolder = resolve(folderPath);
  console.log('═══════════════════════════════════════════');
  console.log('   סריקת תיקיית חשבוניות — PASEO');
  console.log('═══════════════════════════════════════════');
  console.log(`\n📁 תיקייה: ${absFolder}\n`);

  // Collect all valid files
  const files = collectFiles(absFolder);
  console.log(`📊 נמצאו ${files.length} קבצים לסריקה\n`);

  if (files.length === 0) {
    console.log('אין קבצי חשבוניות בתיקייה. סיום.');
    return;
  }

  let processed = 0;
  let errors = 0;
  const results = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    console.log(`\n─── [${i + 1}/${files.length}] ${file} ───`);

    try {
      // Scan with Gemini
      const invoiceData = await scanInvoice(file);
      results.push({ file, data: invoiceData, status: 'ok' });

      // Upsert to Supabase
      console.log('   💾 שומר ב-Supabase...');
      const supplierId = await upsertSupplier(invoiceData.supplier_name);

      if (supplierId) {
        await upsertInvoice(invoiceData, supplierId);
        processed++;
      } else {
        console.warn('   ⚠️ לא ניתן לזהות ספק — מדלג על שמירה');
        errors++;
      }
    } catch (err) {
      console.error(`   ❌ שגיאה: ${err.message}`);
      results.push({ file, error: err.message, status: 'error' });
      errors++;
    }

    // Small delay to avoid rate limiting
    if (i < files.length - 1) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  // ─── Summary ───────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════');
  console.log('   סיכום סריקה');
  console.log('═══════════════════════════════════════════');
  console.log(`   סה"כ קבצים: ${files.length}`);
  console.log(`   ✅ הצלחות: ${processed}`);
  console.log(`   ❌ שגיאות: ${errors}`);

  if (errors > 0) {
    console.log('\n   קבצים שנכשלו:');
    for (const r of results) {
      if (r.status === 'error') {
        console.log(`     ❌ ${r.file}: ${r.error}`);
      }
    }
  }

  console.log('\n═══════════════════════════════════════════\n');

  // Write results to JSON for reference
  const reportPath = resolve(absFolder, 'scan-report.json');
  const report = results.map((r) => ({
    file: r.file,
    status: r.status,
    supplier: r.data?.supplier_name || null,
    invoice_number: r.data?.invoice_number || null,
    total: r.data?.total_amount || null,
    error: r.error || null,
  }));
  writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`📋 דו"ח סריקה נשמר: ${reportPath}`);
}

main().catch((err) => {
  console.error(`\n❌ שגיאה כללית: ${err.message}`);
  process.exit(1);
});
