#!/usr/bin/env node

/**
 * sync-invoices.mjs — סנכרון חשבוניות מ-Gmail ← Gemini ← Supabase
 *
 * Usage:
 *   GEMINI_API_KEY=xxx node scripts/sync-invoices.mjs
 *
 * Flow:
 *   1. סורק Gmail לאימיילים עם חשבוניות חדשות
 *   2. מוריד קבצי PDF/תמונות מצורפים
 *   3. שולח כל קובץ ל-Gemini לניתוח
 *   4. מכניס/מעדכן נתונים ב-Supabase (suppliers + invoices + invoice_items)
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
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
const GMAIL_CREDS_DIR = resolve(import.meta.dirname || '.', '..', 'imported-data', 'restaurant-invoices');
const DOWNLOADS_DIR = resolve(import.meta.dirname || '.', '..', 'tmp', 'invoice-downloads');

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

// ─── Gmail helpers ─────────────────────────────────────────────
function loadGmailCredentials() {
  const credPath = join(GMAIL_CREDS_DIR, 'credentials.json');
  const tokenPath = join(GMAIL_CREDS_DIR, 'token.json');

  if (!existsSync(credPath)) {
    throw new Error(`לא נמצא קובץ credentials.json ב-${GMAIL_CREDS_DIR}`);
  }
  if (!existsSync(tokenPath)) {
    throw new Error(`לא נמצא קובץ token.json ב-${GMAIL_CREDS_DIR}`);
  }

  const credentials = JSON.parse(readFileSync(credPath, 'utf-8'));
  const token = JSON.parse(readFileSync(tokenPath, 'utf-8'));

  return { credentials, token };
}

async function refreshAccessToken(credentials, token) {
  const clientConfig = credentials.installed || credentials.web;
  if (!clientConfig) {
    throw new Error('credentials.json חייב להכיל "installed" או "web"');
  }

  const params = new URLSearchParams({
    client_id: clientConfig.client_id,
    client_secret: clientConfig.client_secret,
    refresh_token: token.refresh_token,
    grant_type: 'refresh_token',
  });

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`שגיאת רענון טוקן: ${errText}`);
  }

  const newToken = await res.json();
  // Save updated token
  const updatedToken = { ...token, ...newToken };
  const tokenPath = join(GMAIL_CREDS_DIR, 'token.json');
  writeFileSync(tokenPath, JSON.stringify(updatedToken, null, 2));

  return updatedToken.access_token;
}

async function gmailRequest(accessToken, endpoint) {
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/${endpoint}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gmail API (${res.status}): ${errText}`);
  }

  return res.json();
}

async function searchInvoiceEmails(accessToken) {
  // Search for emails with invoices — common Hebrew terms
  const query = encodeURIComponent(
    'has:attachment (חשבונית OR חשבון OR invoice OR הודעת חיוב) newer_than:30d'
  );
  const data = await gmailRequest(accessToken, `messages?q=${query}&maxResults=50`);
  return data.messages || [];
}

async function getMessageDetails(accessToken, messageId) {
  return gmailRequest(accessToken, `messages/${messageId}?format=full`);
}

async function downloadAttachment(accessToken, messageId, attachmentId, filename) {
  const data = await gmailRequest(
    accessToken,
    `messages/${messageId}/attachments/${attachmentId}`
  );

  // Gmail returns URL-safe base64
  const base64 = data.data.replace(/-/g, '+').replace(/_/g, '/');
  const buffer = Buffer.from(base64, 'base64');

  mkdirSync(DOWNLOADS_DIR, { recursive: true });
  const filePath = join(DOWNLOADS_DIR, `${messageId}_${filename}`);
  writeFileSync(filePath, buffer);

  return filePath;
}

function getAttachments(message) {
  const attachments = [];
  const validExts = ['.pdf', '.jpg', '.jpeg', '.png', '.tiff', '.tif', '.webp'];

  function walkParts(parts) {
    if (!parts) return;
    for (const part of parts) {
      if (part.filename && part.body?.attachmentId) {
        const ext = extname(part.filename).toLowerCase();
        if (validExts.includes(ext)) {
          attachments.push({
            filename: part.filename,
            attachmentId: part.body.attachmentId,
            mimeType: part.mimeType,
          });
        }
      }
      if (part.parts) walkParts(part.parts);
    }
  }

  walkParts(message.payload?.parts);
  // Also check top-level body
  if (message.payload?.filename && message.payload?.body?.attachmentId) {
    const ext = extname(message.payload.filename).toLowerCase();
    if (validExts.includes(ext)) {
      attachments.push({
        filename: message.payload.filename,
        attachmentId: message.payload.body.attachmentId,
        mimeType: message.payload.mimeType,
      });
    }
  }

  return attachments;
}

// ─── Main orchestrator ─────────────────────────────────────────
async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('   סנכרון חשבוניות — PASEO');
  console.log('═══════════════════════════════════════════\n');

  // Step 1: Load Gmail credentials and get access token
  console.log('🔑 טוען הרשאות Gmail...');
  let accessToken;
  try {
    const { credentials, token } = loadGmailCredentials();

    if (token.access_token && token.expiry_date && token.expiry_date > Date.now()) {
      accessToken = token.access_token;
      console.log('   ✅ טוקן קיים בתוקף');
    } else {
      console.log('   🔄 מרענן טוקן...');
      accessToken = await refreshAccessToken(credentials, token);
      console.log('   ✅ טוקן חודש בהצלחה');
    }
  } catch (err) {
    console.error(`\n❌ שגיאת Gmail: ${err.message}`);
    console.error('ודא שקיימים credentials.json ו-token.json ב-imported-data/restaurant-invoices/');
    process.exit(1);
  }

  // Step 2: Search for invoice emails
  console.log('\n📧 מחפש אימיילים עם חשבוניות...');
  const messages = await searchInvoiceEmails(accessToken);
  console.log(`   נמצאו ${messages.length} אימיילים`);

  if (messages.length === 0) {
    console.log('\n✅ אין חשבוניות חדשות. סיום.');
    return;
  }

  // Step 3: Process each email
  let processed = 0;
  let errors = 0;

  for (const msg of messages) {
    try {
      console.log(`\n─── אימייל ${msg.id} ───`);
      const details = await getMessageDetails(accessToken, msg.id);

      // Get subject
      const subjectHeader = details.payload?.headers?.find(
        (h) => h.name.toLowerCase() === 'subject'
      );
      console.log(`   נושא: ${subjectHeader?.value || '(ללא נושא)'}`);

      // Find attachments
      const attachments = getAttachments(details);
      if (attachments.length === 0) {
        console.log('   ⏭️ אין קבצים מצורפים מתאימים');
        continue;
      }

      console.log(`   📎 ${attachments.length} קבצים מצורפים`);

      for (const att of attachments) {
        try {
          console.log(`\n   📥 מוריד: ${att.filename}`);
          const filePath = await downloadAttachment(
            accessToken, msg.id, att.attachmentId, att.filename
          );

          // Step 4: Scan with Gemini
          const invoiceData = await scanInvoice(filePath);

          // Step 5: Upsert to Supabase
          console.log('   💾 שומר ב-Supabase...');
          const supplierId = await upsertSupplier(invoiceData.supplier_name);
          if (supplierId) {
            await upsertInvoice(invoiceData, supplierId);
          } else {
            console.warn('   ⚠️ לא ניתן לזהות ספק — מדלג');
          }

          processed++;
        } catch (attErr) {
          console.error(`   ❌ שגיאה בעיבוד ${att.filename}: ${attErr.message}`);
          errors++;
        }
      }
    } catch (msgErr) {
      console.error(`   ❌ שגיאה באימייל ${msg.id}: ${msgErr.message}`);
      errors++;
    }
  }

  // Summary
  console.log('\n═══════════════════════════════════════════');
  console.log(`   סיכום:`);
  console.log(`   ✅ עובדו בהצלחה: ${processed}`);
  console.log(`   ❌ שגיאות: ${errors}`);
  console.log('═══════════════════════════════════════════\n');
}

main().catch((err) => {
  console.error(`\n❌ שגיאה כללית: ${err.message}`);
  process.exit(1);
});
