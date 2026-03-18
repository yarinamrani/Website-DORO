#!/usr/bin/env node

/**
 * rescan-invoices.mjs — סריקת חשבוניות עם Gemini 2.5 Flash ושמירה ב-Supabase
 *
 * Usage: node scripts/rescan-invoices.mjs "./imported-data/restaurant-invoices/חשבוניות/"
 */

import { readFileSync, readdirSync, statSync, writeFileSync } from 'fs';
import { resolve, join, extname } from 'path';

// Load .env
try {
  const envPath = resolve(import.meta.dirname || '.', '..', '.env');
  const content = readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const t = line.trim();
    if (t && t.indexOf('=') > 0 && t[0] !== '#') {
      const k = t.slice(0, t.indexOf('=')).trim();
      const v = t.slice(t.indexOf('=') + 1).trim();
      if (process.env[k] === undefined) process.env[k] = v;
    }
  }
} catch {}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

if (!GEMINI_API_KEY || !SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing env vars: GEMINI_API_KEY, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const MIME_MAP = {
  '.pdf': 'application/pdf', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.png': 'image/png', '.webp': 'image/webp', '.tiff': 'image/tiff', '.tif': 'image/tiff',
};

const PROMPT = `אתה מערכת לחילוץ נתונים מחשבוניות של מסעדה.
נתח את החשבונית המצורפת והחזר אובייקט JSON **בלבד** (בלי markdown, בלי קידומת).

המבנה הנדרש:
{
  "supplier_name": "שם הספק",
  "invoice_number": "מספר חשבונית",
  "invoice_date": "YYYY-MM-DD",
  "total_amount": 0.00,
  "vat_amount": 0.00,
  "amount_before_vat": 0.00,
  "items": [
    { "product_name": "שם המוצר", "quantity": 1, "unit_price": 0.00 }
  ],
  "status": "received"
}

הנחיות:
- כל הסכומים כמספרים (לא מחרוזות).
- תאריך בפורמט YYYY-MM-DD.
- אם שדה לא ניתן לזיהוי, השתמש ב-null.
- אם אין פירוט פריטים, החזר מערך items ריק.
- status תמיד "received".
- החזר JSON בלבד, ללא הסברים נוספים.
- חשוב מאוד: total_amount חייב להכיל את הסכום הכולל כולל מע"מ. חפש "סה"כ", "סך הכל", "לתשלום", "Total", "Grand Total". אם לא מצאת, חשב מסכום הפריטים.
- אם יש פריטים, unit_price = מחיר ליחידה. אם כתוב רק סכום כולל לפריט, חלק בכמות.`;

// Scan invoice with Gemini
async function scanInvoice(filePath) {
  const ext = extname(filePath).toLowerCase();
  const mimeType = MIME_MAP[ext];
  if (!mimeType) throw new Error('Unsupported: ' + ext);

  const base64Data = readFileSync(filePath).toString('base64');

  // Retry logic for rate limits
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [
          { inline_data: { mime_type: mimeType, data: base64Data } },
          { text: PROMPT },
        ]}],
        generationConfig: { temperature: 0.1, maxOutputTokens: 4096 },
      }),
    });

    if (response.status === 429) {
      const wait = (attempt + 1) * 15;
      console.log(`   Rate limited, waiting ${wait}s...`);
      await new Promise(r => setTimeout(r, wait * 1000));
      continue;
    }

    if (!response.ok) throw new Error('Gemini error: ' + response.status);

    const result = await response.json();
    const rawText = result?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) throw new Error('No content from Gemini');

    let jsonStr = rawText.trim();
    if (jsonStr.startsWith('```')) jsonStr = jsonStr.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
    const data = JSON.parse(jsonStr);

    // Calculate total from items if missing
    if ((!data.total_amount || data.total_amount === 0) && data.items?.length > 0) {
      data.total_amount = data.items.reduce((s, it) => s + ((it.quantity || 1) * (it.unit_price || 0)), 0);
    }

    // Ensure total_amount is a number
    if (typeof data.total_amount === 'string') {
      data.total_amount = parseFloat(data.total_amount) || 0;
    }

    return data;
  }
  throw new Error('Rate limited after 4 retries');
}

// Supabase helper
async function supa(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': options.prefer || 'return=representation',
      ...options.headers,
    },
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// Process one invoice
async function processInvoice(filePath) {
  const data = await scanInvoice(filePath);
  if (!data.supplier_name || !data.invoice_number) return null;

  // Upsert supplier
  const existing = await supa(`suppliers?name=eq.${encodeURIComponent(data.supplier_name)}&select=id&limit=1`);
  const supplierId = existing?.length
    ? existing[0].id
    : (await supa('suppliers', { method: 'POST', body: JSON.stringify({ name: data.supplier_name }) }))[0].id;

  // Calculate total
  let totalAmount = Number(data.total_amount) || 0;
  if (totalAmount === 0 && data.items?.length) {
    totalAmount = data.items.reduce((s, it) => s + ((it.quantity || 1) * (it.unit_price || 0)), 0);
  }

  const row = {
    supplier_id: supplierId,
    invoice_number: data.invoice_number,
    invoice_date: data.invoice_date || new Date().toISOString().slice(0, 10),
    total_amount: totalAmount,
    status: data.status || 'received',
    notes: data.vat_amount ? `VAT: ${data.vat_amount} | Before: ${data.amount_before_vat || ''}` : null,
  };

  // Upsert invoice
  const existingInv = await supa(
    `invoices?invoice_number=eq.${encodeURIComponent(data.invoice_number)}&supplier_id=eq.${supplierId}&select=id&limit=1`
  );
  let invoiceId;

  if (existingInv?.length) {
    invoiceId = existingInv[0].id;
    await supa(`invoices?id=eq.${invoiceId}`, { method: 'PATCH', body: JSON.stringify(row) });
  } else {
    invoiceId = (await supa('invoices', { method: 'POST', body: JSON.stringify(row) }))[0].id;
  }

  // Upsert items
  if (data.items?.length) {
    await supa(`invoice_items?invoice_id=eq.${invoiceId}`, { method: 'DELETE', prefer: 'return=minimal' }).catch(() => {});
    await supa('invoice_items', {
      method: 'POST',
      body: JSON.stringify(data.items.map(it => ({
        invoice_id: invoiceId,
        product_name: it.product_name || 'unknown',
        quantity: it.quantity || 1,
        unit_price: it.unit_price || 0,
      }))),
    });
  }

  return { num: data.invoice_number, total: totalAmount, items: data.items?.length || 0, supplier: data.supplier_name };
}

// Collect files recursively
function collectFiles(dir) {
  const files = [];
  function walk(d) {
    for (const entry of readdirSync(d)) {
      const full = join(d, entry);
      const stat = statSync(full);
      if (stat.isDirectory()) walk(full);
      else if (MIME_MAP[extname(entry).toLowerCase()]) files.push(full);
    }
  }
  walk(dir);
  return files.sort();
}

// Main
async function main() {
  const folder = process.argv[2];
  if (!folder) {
    console.error('Usage: node scripts/rescan-invoices.mjs <folder>');
    process.exit(1);
  }

  const files = collectFiles(resolve(folder));
  console.log(`\nScanning ${files.length} files with ${GEMINI_MODEL}...\n`);

  let ok = 0, fail = 0;
  const errors = [];

  for (let i = 0; i < files.length; i++) {
    const shortPath = files[i].split('/חשבוניות/')[1] || files[i];
    console.log(`[${i + 1}/${files.length}] ${shortPath}`);

    try {
      const r = await processInvoice(files[i]);
      if (r) {
        console.log(`  -> ${r.supplier} #${r.num} total:${r.total} items:${r.items}`);
        ok++;
      } else {
        console.log('  -> Skipped (no supplier/number)');
        fail++;
      }
    } catch (err) {
      console.error(`  ERROR: ${err.message}`);
      errors.push({ file: shortPath, error: err.message });
      fail++;
    }

    // Delay between requests to avoid rate limiting
    if (i < files.length - 1) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  console.log(`\n=== Done === OK: ${ok} | Errors: ${fail}`);
  if (errors.length) {
    console.log('\nFailed:');
    errors.forEach(e => console.log(`  ${e.file}: ${e.error}`));
  }
}

main();
