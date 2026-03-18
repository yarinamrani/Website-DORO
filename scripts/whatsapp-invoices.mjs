#!/usr/bin/env node

/**
 * whatsapp-invoices.mjs — האזנה לחשבוניות מקבוצת WhatsApp
 *
 * Usage:
 *   GEMINI_API_KEY=xxx node scripts/whatsapp-invoices.mjs
 *
 * Environment variables:
 *   WHATSAPP_GROUP_NAME - שם הקבוצה להאזנה (ברירת מחדל: "חשבוניות PASEO")
 *   GEMINI_API_KEY      - מפתח Gemini API
 *
 * Flow:
 *   1. מתחבר ל-WhatsApp Web
 *   2. מאזין להודעות בקבוצה שהוגדרה
 *   3. כשמתקבלת תמונה/מסמך:
 *      a. מוריד את המדיה
 *      b. סורק עם Gemini (scan-invoice.mjs)
 *      c. שומר ב-Supabase
 *      d. מעלה ל-Google Drive
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, join, extname } from 'path';
import pkg from 'whatsapp-web.js';
const { Client, LocalAuth, MessageMedia } = pkg;
import qrcode from 'qrcode-terminal';
import { scanInvoice } from './scan-invoice.mjs';
import { uploadToDrive } from './drive-upload.mjs';

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
const WHATSAPP_GROUP_NAME = process.env.WHATSAPP_GROUP_NAME || 'חשבוניות PASEO';
const DOWNLOADS_DIR = resolve(import.meta.dirname || '.', '..', 'tmp', 'whatsapp-downloads');
const AUTH_DIR = resolve(import.meta.dirname || '.', '..', '.wwebjs_auth');

const VALID_EXTENSIONS = new Set(['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.tiff', '.tif']);
const VALID_MIME_PREFIXES = ['image/', 'application/pdf'];

if (!process.env.GEMINI_API_KEY) {
  console.error('חסר GEMINI_API_KEY');
  process.exit(1);
}
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('חסרים פרטי Supabase ב-.env');
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

  const existing = await supabaseRequest(
    `suppliers?name=eq.${encodeURIComponent(name)}&select=id,name&limit=1`
  );

  if (existing && existing.length > 0) {
    console.log(`   ספק קיים: ${name}`);
    return existing[0].id;
  }

  const inserted = await supabaseRequest('suppliers', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });

  console.log(`   ספק חדש נוצר: ${name}`);
  return inserted[0].id;
}

async function upsertInvoice(invoiceData, supplierId) {
  const invoiceNumber = invoiceData.invoice_number;
  if (!invoiceNumber) {
    console.warn('   חשבונית ללא מספר - מדלג');
    return null;
  }

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
      ? `מע"מ: ${invoiceData.vat_amount} | לפני מע"מ: ${invoiceData.amount_before_vat || ''} | מקור: WhatsApp`
      : 'מקור: WhatsApp',
  };

  let invoiceId;

  if (existing && existing.length > 0) {
    invoiceId = existing[0].id;
    await supabaseRequest(`invoices?id=eq.${invoiceId}`, {
      method: 'PATCH',
      body: JSON.stringify(invoiceRow),
    });
    console.log(`   חשבונית ${invoiceNumber} עודכנה`);
  } else {
    const inserted = await supabaseRequest('invoices', {
      method: 'POST',
      body: JSON.stringify(invoiceRow),
    });
    invoiceId = inserted[0].id;
    console.log(`   חשבונית ${invoiceNumber} נוצרה`);
  }

  // Insert items
  if (invoiceData.items && invoiceData.items.length > 0) {
    await supabaseRequest(`invoice_items?invoice_id=eq.${invoiceId}`, {
      method: 'DELETE',
      prefer: 'return=minimal',
    }).catch(() => { /* ignore */ });

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
    console.log(`   ${items.length} פריטים נשמרו`);
  }

  return invoiceId;
}

// ─── Media processing ──────────────────────────────────────────
function isInvoiceMedia(message) {
  if (!message.hasMedia) return false;

  const mime = message._data?.mimetype || '';
  if (VALID_MIME_PREFIXES.some((p) => mime.startsWith(p))) return true;

  // Check filename extension for documents
  const filename = message._data?.filename || '';
  if (filename) {
    const ext = extname(filename).toLowerCase();
    return VALID_EXTENSIONS.has(ext);
  }

  return false;
}

async function processInvoiceMessage(message) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  let filePath = null;

  try {
    console.log('\n--- הודעה חדשה עם מדיה ---');
    console.log(`   זמן: ${new Date().toLocaleString('he-IL')}`);
    console.log(`   שולח: ${message._data?.notifyName || 'לא ידוע'}`);

    // Download media
    const media = await message.downloadMedia();
    if (!media) {
      console.log('   לא ניתן להוריד את המדיה - מדלג');
      return;
    }

    // Determine file extension
    const mimeToExt = {
      'application/pdf': '.pdf',
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'image/tiff': '.tiff',
    };

    const ext = mimeToExt[media.mimetype] || '.jpg';
    const originalFilename = message._data?.filename || `whatsapp_${timestamp}${ext}`;
    const safeFilename = originalFilename.replace(/[^a-zA-Z0-9._\u0590-\u05FF-]/g, '_');

    mkdirSync(DOWNLOADS_DIR, { recursive: true });
    filePath = join(DOWNLOADS_DIR, `${timestamp}_${safeFilename}`);

    const buffer = Buffer.from(media.data, 'base64');
    writeFileSync(filePath, buffer);
    console.log(`   קובץ נשמר: ${filePath} (${(buffer.length / 1024).toFixed(1)} KB)`);

    // Scan with Gemini
    console.log('   סורק עם Gemini...');
    const invoiceData = await scanInvoice(filePath);

    if (!invoiceData || !invoiceData.supplier_name) {
      console.log('   לא זוהתה חשבונית בקובץ - מדלג');
      return;
    }

    // Save to Supabase
    console.log('   שומר ב-Supabase...');
    const supplierId = await upsertSupplier(invoiceData.supplier_name);
    if (supplierId) {
      await upsertInvoice(invoiceData, supplierId);
    }

    // Upload to Google Drive
    console.log('   מעלה ל-Google Drive...');
    try {
      const driveResult = await uploadToDrive(filePath, invoiceData.supplier_name);
      console.log(`   הועלה ל-Drive: ${driveResult.webViewLink || 'הצלחה'}`);
    } catch (driveErr) {
      console.error(`   שגיאת Drive (לא קריטית): ${driveErr.message}`);
    }

    console.log(`   עיבוד הושלם - ספק: ${invoiceData.supplier_name}, חשבונית: ${invoiceData.invoice_number || 'לא זוהה'}`);

  } catch (err) {
    console.error(`   שגיאה בעיבוד הודעה: ${err.message}`);
  }
}

// ─── WhatsApp client ───────────────────────────────────────────
async function main() {
  console.log('=======================================');
  console.log('   מאזין לחשבוניות WhatsApp - PASEO');
  console.log('=======================================');
  console.log(`   קבוצת יעד: "${WHATSAPP_GROUP_NAME}"`);
  console.log('');

  mkdirSync(AUTH_DIR, { recursive: true });

  const client = new Client({
    authStrategy: new LocalAuth({
      dataPath: AUTH_DIR,
    }),
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--disable-gpu',
      ],
    },
  });

  // QR code display
  client.on('qr', (qr) => {
    console.log('\n--- סרוק את קוד ה-QR עם WhatsApp ---\n');
    qrcode.generate(qr, { small: true });
    console.log('\nמחכה לסריקת QR...\n');
  });

  client.on('authenticated', () => {
    console.log('אימות הצליח');
  });

  client.on('auth_failure', (msg) => {
    console.error(`שגיאת אימות: ${msg}`);
    console.error('מחק את תיקיית .wwebjs_auth/ ונסה שוב');
  });

  client.on('ready', () => {
    console.log('\n--- WhatsApp מוכן ---');
    console.log(`מאזין להודעות בקבוצה: "${WHATSAPP_GROUP_NAME}"`);
    console.log(`זמן התחלה: ${new Date().toLocaleString('he-IL')}`);
    console.log('');
  });

  client.on('disconnected', (reason) => {
    console.log(`WhatsApp התנתק: ${reason}`);
    console.log('מנסה להתחבר מחדש...');
    client.initialize().catch((err) => {
      console.error(`שגיאת התחברות מחדש: ${err.message}`);
      process.exit(1);
    });
  });

  // Listen for messages
  client.on('message_create', async (message) => {
    try {
      // Only process group messages
      const chat = await message.getChat();
      if (!chat.isGroup) return;

      // Check if this is the target group
      if (chat.name !== WHATSAPP_GROUP_NAME) return;

      // Check if this message has invoice-like media
      if (!isInvoiceMedia(message)) return;

      await processInvoiceMessage(message);
    } catch (err) {
      console.error(`שגיאה בטיפול בהודעה: ${err.message}`);
    }
  });

  // Graceful shutdown
  const shutdown = async () => {
    console.log('\nמכבה את WhatsApp...');
    try {
      await client.destroy();
    } catch { /* ignore */ }
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Initialize
  console.log('מאתחל WhatsApp Web...');
  console.log('(בפעם הראשונה יוצג קוד QR לסריקה)\n');

  try {
    await client.initialize();
  } catch (err) {
    console.error(`שגיאת אתחול WhatsApp: ${err.message}`);
    console.error('ודא שהותקן: npm install whatsapp-web.js qrcode-terminal');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(`שגיאה כללית: ${err.message}`);
  process.exit(1);
});
