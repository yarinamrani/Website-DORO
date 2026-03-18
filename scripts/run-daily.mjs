#!/usr/bin/env node

/**
 * run-daily.mjs — הרצה יומית של כל מערכת החשבוניות
 *
 * Usage:
 *   node scripts/run-daily.mjs           # הרצה חד-פעמית
 *   node scripts/run-daily.mjs --watch   # הרצה מתמשכת כל 30 דקות
 *
 * Flow:
 *   1. סנכרון חשבוניות מ-Gmail (scan + Supabase)
 *   2. העלאת חשבוניות חדשות ל-Google Drive
 *   3. הדפסת סיכום בעברית
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'fs';
import { resolve, join, extname, basename } from 'path';
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
const GMAIL_CREDS_DIR = resolve(import.meta.dirname || '.', '..', 'imported-data', 'restaurant-invoices');
const DOWNLOADS_DIR = resolve(import.meta.dirname || '.', '..', 'tmp', 'invoice-downloads');
const STATE_FILE = resolve(import.meta.dirname || '.', '..', 'tmp', 'run-daily-state.json');

const WATCH_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
const VALID_EXTENSIONS = new Set(['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.tiff', '.tif']);

// ─── State management (idempotency) ───────────────────────────
function loadState() {
  try {
    if (existsSync(STATE_FILE)) {
      return JSON.parse(readFileSync(STATE_FILE, 'utf-8'));
    }
  } catch { /* ignore corrupt state */ }
  return { processedEmails: [], uploadedFiles: [], lastRun: null };
}

function saveState(state) {
  const dir = resolve(STATE_FILE, '..');
  mkdirSync(dir, { recursive: true });
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
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
  if (!invoiceNumber) return null;

  const existing = await supabaseRequest(
    `invoices?invoice_number=eq.${encodeURIComponent(invoiceNumber)}&supplier_id=eq.${supplierId}&select=id&limit=1`
  );

  // Calculate total from items if not available
  let totalAmount = invoiceData.total_amount || 0;
  if (totalAmount === 0 && invoiceData.items && invoiceData.items.length > 0) {
    totalAmount = invoiceData.items.reduce(
      (sum, item) => sum + ((item.quantity || 1) * (item.unit_price || 0)), 0
    );
  }

  const invoiceRow = {
    supplier_id: supplierId,
    invoice_number: invoiceNumber,
    invoice_date: invoiceData.invoice_date || new Date().toISOString().slice(0, 10),
    total_amount: totalAmount,
    status: invoiceData.status || 'received',
    notes: invoiceData.vat_amount
      ? `מע"מ: ${invoiceData.vat_amount} | לפני מע"מ: ${invoiceData.amount_before_vat || ''}`
      : null,
  };

  if (existing && existing.length > 0) {
    const invoiceId = existing[0].id;
    await supabaseRequest(`invoices?id=eq.${invoiceId}`, {
      method: 'PATCH',
      body: JSON.stringify(invoiceRow),
    });
    return invoiceId;
  }

  const inserted = await supabaseRequest('invoices', {
    method: 'POST',
    body: JSON.stringify(invoiceRow),
  });

  const invoiceId = inserted[0].id;

  // Insert items
  if (invoiceData.items && invoiceData.items.length > 0) {
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
  }

  return invoiceId;
}

// ─── Gmail helpers ─────────────────────────────────────────────
function loadGmailCredentials() {
  const credPath = join(GMAIL_CREDS_DIR, 'credentials.json');
  const tokenPath = join(GMAIL_CREDS_DIR, 'token.json');

  if (!existsSync(credPath) || !existsSync(tokenPath)) {
    return null;
  }

  const credentials = JSON.parse(readFileSync(credPath, 'utf-8'));
  const token = JSON.parse(readFileSync(tokenPath, 'utf-8'));
  return { credentials, token };
}

async function refreshAccessToken(credentials, token) {
  const clientConfig = credentials.installed || credentials.web;

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

function getAttachments(message) {
  const attachments = [];

  function walkParts(parts) {
    if (!parts) return;
    for (const part of parts) {
      if (part.filename && part.body?.attachmentId) {
        const ext = extname(part.filename).toLowerCase();
        if (VALID_EXTENSIONS.has(ext)) {
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
  if (message.payload?.filename && message.payload?.body?.attachmentId) {
    const ext = extname(message.payload.filename).toLowerCase();
    if (VALID_EXTENSIONS.has(ext)) {
      attachments.push({
        filename: message.payload.filename,
        attachmentId: message.payload.body.attachmentId,
        mimeType: message.payload.mimeType,
      });
    }
  }

  return attachments;
}

async function downloadAttachment(accessToken, messageId, attachmentId, filename) {
  const data = await gmailRequest(
    accessToken,
    `messages/${messageId}/attachments/${attachmentId}`
  );

  const base64 = data.data.replace(/-/g, '+').replace(/_/g, '/');
  const buffer = Buffer.from(base64, 'base64');

  mkdirSync(DOWNLOADS_DIR, { recursive: true });
  const filePath = join(DOWNLOADS_DIR, `${messageId}_${filename}`);
  writeFileSync(filePath, buffer);

  return filePath;
}

// ─── Step 1: Gmail sync ────────────────────────────────────────
async function syncGmail(state, stats) {
  console.log('\n--- שלב 1: סנכרון Gmail ---\n');

  const gmailCreds = loadGmailCredentials();
  if (!gmailCreds) {
    console.log('   אין הרשאות Gmail (credentials.json/token.json) - מדלג');
    return;
  }

  let accessToken;
  try {
    const { credentials, token } = gmailCreds;
    if (token.access_token && token.expiry_date && token.expiry_date > Date.now()) {
      accessToken = token.access_token;
    } else {
      accessToken = await refreshAccessToken(credentials, token);
    }
    console.log('   התחברות ל-Gmail הצליחה');
  } catch (err) {
    console.error(`   שגיאת Gmail: ${err.message}`);
    stats.errors++;
    return;
  }

  // Search for invoice emails
  const query = encodeURIComponent(
    'has:attachment (חשבונית OR חשבון OR invoice OR הודעת חיוב) newer_than:30d'
  );
  let messages;
  try {
    const data = await gmailRequest(accessToken, `messages?q=${query}&maxResults=50`);
    messages = data.messages || [];
  } catch (err) {
    console.error(`   שגיאת חיפוש Gmail: ${err.message}`);
    stats.errors++;
    return;
  }

  console.log(`   נמצאו ${messages.length} אימיילים`);

  // Filter out already processed
  const newMessages = messages.filter((m) => !state.processedEmails.includes(m.id));
  console.log(`   ${newMessages.length} אימיילים חדשים לעיבוד`);

  for (const msg of newMessages) {
    try {
      const details = await gmailRequest(accessToken, `messages/${msg.id}?format=full`);
      const subjectHeader = details.payload?.headers?.find(
        (h) => h.name.toLowerCase() === 'subject'
      );
      console.log(`\n   אימייל: ${subjectHeader?.value || '(ללא נושא)'}`);

      const attachments = getAttachments(details);
      if (attachments.length === 0) {
        state.processedEmails.push(msg.id);
        continue;
      }

      for (const att of attachments) {
        try {
          console.log(`   מוריד: ${att.filename}`);
          const filePath = await downloadAttachment(
            accessToken, msg.id, att.attachmentId, att.filename
          );

          // Scan with Gemini
          const invoiceData = await scanInvoice(filePath);

          // Save to Supabase
          const supplierId = await upsertSupplier(invoiceData.supplier_name);
          if (supplierId) {
            await upsertInvoice(invoiceData, supplierId);
            stats.invoicesProcessed++;

            // Upload to Drive
            try {
              await uploadToDrive(filePath, invoiceData.supplier_name);
              stats.driveUploads++;
            } catch (driveErr) {
              console.error(`   שגיאת Drive: ${driveErr.message}`);
            }
          }
        } catch (attErr) {
          console.error(`   שגיאה ב-${att.filename}: ${attErr.message}`);
          stats.errors++;
        }
      }

      state.processedEmails.push(msg.id);
    } catch (msgErr) {
      console.error(`   שגיאה באימייל ${msg.id}: ${msgErr.message}`);
      stats.errors++;
    }
  }

  // Keep state lean — only remember last 500 emails
  if (state.processedEmails.length > 500) {
    state.processedEmails = state.processedEmails.slice(-500);
  }
}

// ─── Step 2: Upload pending files to Drive ─────────────────────
async function uploadPendingToDrive(state, stats) {
  console.log('\n--- שלב 2: העלאת קבצים ל-Google Drive ---\n');

  if (!existsSync(DOWNLOADS_DIR)) {
    console.log('   אין תיקיית הורדות - מדלג');
    return;
  }

  const files = readdirSync(DOWNLOADS_DIR).filter((f) => {
    const ext = extname(f).toLowerCase();
    return VALID_EXTENSIONS.has(ext);
  });

  // Filter out already uploaded
  const newFiles = files.filter((f) => !state.uploadedFiles.includes(f));
  console.log(`   ${newFiles.length} קבצים חדשים להעלאה`);

  for (const file of newFiles) {
    const filePath = join(DOWNLOADS_DIR, file);
    try {
      // Try to determine supplier from filename or scan
      // Files from Gmail are named: messageId_filename.pdf
      // We need to scan them to get the supplier name
      console.log(`   מעבד: ${file}`);
      const invoiceData = await scanInvoice(filePath);
      const supplier = invoiceData?.supplier_name || 'לא ידוע';

      await uploadToDrive(filePath, supplier);
      state.uploadedFiles.push(file);
      stats.driveUploads++;
    } catch (err) {
      console.error(`   שגיאה בהעלאת ${file}: ${err.message}`);
      stats.errors++;
    }
  }

  // Keep state lean
  if (state.uploadedFiles.length > 1000) {
    state.uploadedFiles = state.uploadedFiles.slice(-1000);
  }
}

// ─── Run once ──────────────────────────────────────────────────
async function runOnce() {
  const startTime = Date.now();
  const state = loadState();
  const stats = { invoicesProcessed: 0, driveUploads: 0, errors: 0 };

  console.log('=======================================');
  console.log('   הרצה יומית - מערכת חשבוניות PASEO');
  console.log('=======================================');
  console.log(`   זמן התחלה: ${new Date().toLocaleString('he-IL')}`);
  console.log(`   הרצה אחרונה: ${state.lastRun || 'ראשונה'}`);

  // Validate config
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('\n   חסרים פרטי Supabase ב-.env - עוצר');
    return stats;
  }
  if (!process.env.GEMINI_API_KEY) {
    console.error('\n   חסר GEMINI_API_KEY - עוצר');
    return stats;
  }

  // Step 1: Gmail sync
  try {
    await syncGmail(state, stats);
  } catch (err) {
    console.error(`   שגיאה כללית ב-Gmail: ${err.message}`);
    stats.errors++;
  }

  // Step 2: Upload pending files to Drive
  // Skip re-scanning files that were already uploaded in step 1
  // Only upload files that exist in downloads but weren't uploaded yet
  try {
    // Note: files uploaded in step 1 were already added to state,
    // so uploadPendingToDrive will only process truly pending files
    await uploadPendingToDrive(state, stats);
  } catch (err) {
    console.error(`   שגיאה כללית ב-Drive: ${err.message}`);
    stats.errors++;
  }

  // Save state
  state.lastRun = new Date().toISOString();
  saveState(state);

  // Summary
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n=======================================');
  console.log('   סיכום הרצה');
  console.log('=======================================');
  console.log(`   חשבוניות שעובדו:  ${stats.invoicesProcessed}`);
  console.log(`   הועלו ל-Drive:    ${stats.driveUploads}`);
  console.log(`   שגיאות:           ${stats.errors}`);
  console.log(`   זמן ריצה:         ${elapsed} שניות`);
  console.log(`   סיום:             ${new Date().toLocaleString('he-IL')}`);
  console.log('=======================================\n');

  return stats;
}

// ─── Main ──────────────────────────────────────────────────────
async function main() {
  const watchMode = process.argv.includes('--watch');

  if (watchMode) {
    console.log('מצב מעקב - יריץ כל 30 דקות\n');
    console.log('לעצירה: Ctrl+C\n');

    // Run immediately
    await runOnce();

    // Then run every 30 minutes
    const intervalId = setInterval(async () => {
      try {
        await runOnce();
      } catch (err) {
        console.error(`שגיאה בהרצה מחזורית: ${err.message}`);
      }
    }, WATCH_INTERVAL_MS);

    // Graceful shutdown
    const shutdown = () => {
      console.log('\nעוצר מצב מעקב...');
      clearInterval(intervalId);
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

  } else {
    // Single run
    const stats = await runOnce();
    process.exit(stats.errors > 0 ? 1 : 0);
  }
}

main().catch((err) => {
  console.error(`שגיאה כללית: ${err.message}`);
  process.exit(1);
});
