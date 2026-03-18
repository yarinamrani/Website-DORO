#!/usr/bin/env node

/**
 * scan-invoice.mjs — סריקת חשבונית בודדת באמצעות Gemini API
 *
 * Usage:
 *   node scripts/scan-invoice.mjs ./path/to/invoice.pdf
 *   node scripts/scan-invoice.mjs ./path/to/invoice.jpg
 *
 * Or import as module:
 *   import { scanInvoice } from './scan-invoice.mjs';
 *   const data = await scanInvoice('/path/to/file.pdf');
 */

import { readFileSync } from 'fs';
import { extname, resolve } from 'path';

// ─── Load .env manually ────────────────────────────────────────
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

// ─── Constants ─────────────────────────────────────────────────
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

const MIME_MAP = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.tiff': 'image/tiff',
  '.tif': 'image/tiff',
};

const EXTRACTION_PROMPT = `אתה מערכת לחילוץ נתונים מחשבוניות של מסעדה.
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
    {
      "product_name": "שם המוצר",
      "quantity": 1,
      "unit_price": 0.00
    }
  ],
  "status": "received"
}

הנחיות:
- כל הסכומים כמספרים (לא מחרוזות).
- תאריך בפורמט YYYY-MM-DD.
- אם שדה לא ניתן לזיהוי, השתמש ב-null.
- אם אין פירוט פריטים, החזר מערך items ריק.
- status תמיד "received" אלא אם כתוב אחרת.
- החזר JSON בלבד, ללא הסברים נוספים.
- חשוב מאוד: total_amount חייב להכיל את הסכום הכולל של החשבונית כולל מע"מ. חפש שדות כמו "סה"כ", "סך הכל", "לתשלום", "Total", "Grand Total". אם לא מצאת סכום כולל, חשב אותו מסכום הפריטים.
- אם יש פריטים, unit_price חייב להכיל את המחיר ליחידה. אם כתוב רק סכום כולל לפריט, חלק בכמות.`;

// ─── Main scan function ────────────────────────────────────────
export async function scanInvoice(filePath) {
  if (!GEMINI_API_KEY) {
    throw new Error('חסר GEMINI_API_KEY — הגדר משתנה סביבה');
  }

  const absPath = resolve(filePath);
  const ext = extname(absPath).toLowerCase();
  const mimeType = MIME_MAP[ext];

  if (!mimeType) {
    throw new Error(`סוג קובץ לא נתמך: ${ext}  (נתמכים: ${Object.keys(MIME_MAP).join(', ')})`);
  }

  console.log(`📄 סורק חשבונית: ${absPath}`);
  console.log(`   סוג קובץ: ${mimeType}`);

  // Read file as base64
  const fileBuffer = readFileSync(absPath);
  const base64Data = fileBuffer.toString('base64');
  console.log(`   גודל קובץ: ${(fileBuffer.length / 1024).toFixed(1)} KB`);

  // Build Gemini request
  const requestBody = {
    contents: [
      {
        parts: [
          {
            inline_data: {
              mime_type: mimeType,
              data: base64Data,
            },
          },
          {
            text: EXTRACTION_PROMPT,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 4096,
    },
  };

  console.log('   שולח ל-Gemini API...');
  const response = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`שגיאת Gemini API (${response.status}): ${errText}`);
  }

  const result = await response.json();

  // Extract text from response
  const rawText = result?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) {
    throw new Error('Gemini לא החזיר תוכן — ייתכן שהקובץ לא מכיל חשבונית');
  }

  // Parse JSON — strip markdown code fences if present
  let jsonStr = rawText.trim();
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
  }

  let invoiceData;
  try {
    invoiceData = JSON.parse(jsonStr);
  } catch (e) {
    console.error('   תשובת Gemini גולמית:', rawText);
    throw new Error(`לא ניתן לפרסר JSON מתשובת Gemini: ${e.message}`);
  }

  // Calculate total_amount from items if missing
  if ((!invoiceData.total_amount || invoiceData.total_amount === 0) && invoiceData.items && invoiceData.items.length > 0) {
    invoiceData.total_amount = invoiceData.items.reduce(
      (sum, item) => sum + ((item.quantity || 1) * (item.unit_price || 0)), 0
    );
  }

  console.log(`   ✅ חשבונית מספר: ${invoiceData.invoice_number || 'לא זוהה'}`);
  console.log(`   ✅ ספק: ${invoiceData.supplier_name || 'לא זוהה'}`);
  console.log(`   ✅ סכום: ₪${invoiceData.total_amount ?? 'לא זוהה'}`);

  return invoiceData;
}

// ─── CLI entry point ───────────────────────────────────────────
const isMainModule = process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename || '');
if (isMainModule) {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('שימוש: node scripts/scan-invoice.mjs <path-to-invoice>');
    process.exit(1);
  }

  try {
    const data = await scanInvoice(filePath);
    console.log('\n═══ תוצאת סריקה ═══');
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(`\n❌ שגיאה: ${err.message}`);
    process.exit(1);
  }
}
