#!/usr/bin/env node
/**
 * extract-products.mjs
 *
 * Downloads PDF attachments from Gmail invoices and uses Gemini 2.5 Flash
 * to extract product-level line items (name, quantity, unit, unit price, total).
 * Saves results to public/data/products.json.
 * Then analyzes price changes and generates public/data/price-alerts.json.
 *
 * Usage: node scripts/extract-products.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { google } from 'googleapis';
import http from 'http';
import { exec } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

// ── Config ──────────────────────────────────────────────────────────────────

const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');
const TOKEN_PATH = path.join(__dirname, 'token.json');
const INVOICES_PATH = path.join(PROJECT_ROOT, 'public', 'data', 'invoices.json');
const PRODUCTS_PATH = path.join(PROJECT_ROOT, 'public', 'data', 'products.json');
const ALERTS_PATH = path.join(PROJECT_ROOT, 'public', 'data', 'price-alerts.json');
const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
const SAVE_EVERY = 5;
const GEMINI_DELAY_MS = 3000;

// ── Load .env ───────────────────────────────────────────────────────────────

function loadEnv() {
  const envPath = path.join(PROJECT_ROOT, '.env');
  if (!fs.existsSync(envPath)) {
    console.error('ERROR: .env file not found at', envPath);
    process.exit(1);
  }
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnv();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error('ERROR: GEMINI_API_KEY not found in .env');
  process.exit(1);
}

// ── OAuth2 helpers ──────────────────────────────────────────────────────────

async function authorize() {
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    console.error('ERROR: credentials.json not found at', CREDENTIALS_PATH);
    process.exit(1);
  }

  const content = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf-8'));
  const { client_id, client_secret, redirect_uris } =
    content.installed || content.web;

  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    'http://localhost:3333'
  );

  // Check for existing token
  if (fs.existsSync(TOKEN_PATH)) {
    const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf-8'));
    oAuth2Client.setCredentials(token);

    // Refresh if expired
    if (token.expiry_date && token.expiry_date < Date.now()) {
      try {
        const { credentials } = await oAuth2Client.refreshAccessToken();
        oAuth2Client.setCredentials(credentials);
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(credentials, null, 2));
        console.log('Token refreshed.');
      } catch {
        console.log('Token expired, re-authorizing...');
        return getNewToken(oAuth2Client);
      }
    }

    return oAuth2Client;
  }

  return getNewToken(oAuth2Client);
}

function getNewToken(oAuth2Client) {
  return new Promise((resolve, reject) => {
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
    });

    const server = http.createServer(async (req, res) => {
      try {
        const url = new URL(req.url, 'http://localhost:3333');
        const code = url.searchParams.get('code');
        if (!code) {
          res.writeHead(400);
          res.end('No code found');
          return;
        }

        const { tokens } = await oAuth2Client.getToken(code);
        oAuth2Client.setCredentials(tokens);
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<h1>Authorization successful!</h1><p>You can close this window.</p>');
        server.close();
        console.log('Token saved to', TOKEN_PATH);
        resolve(oAuth2Client);
      } catch (err) {
        res.writeHead(500);
        res.end('Error: ' + err.message);
        reject(err);
      }
    });

    server.listen(3333, () => {
      console.log('\nOpening browser for authorization...');
      console.log('If it does not open, visit:', authUrl, '\n');
      const cmd =
        process.platform === 'darwin'
          ? 'open'
          : process.platform === 'win32'
            ? 'start'
            : 'xdg-open';
      exec(`${cmd} "${authUrl}"`);
    });
  });
}

// ── Gmail helpers ───────────────────────────────────────────────────────────

async function getMessageParts(gmail, messageId) {
  const res = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'full',
  });
  return res.data;
}

function findPdfAttachments(payload) {
  const attachments = [];

  function walk(part) {
    if (
      part.filename &&
      part.filename.toLowerCase().endsWith('.pdf') &&
      part.body?.attachmentId
    ) {
      attachments.push({
        filename: part.filename,
        attachmentId: part.body.attachmentId,
      });
    }
    if (part.parts) {
      part.parts.forEach(walk);
    }
  }

  walk(payload);
  return attachments;
}

async function downloadAttachment(gmail, messageId, attachmentId) {
  const res = await gmail.users.messages.attachments.get({
    userId: 'me',
    id: attachmentId,
    messageId: messageId,
  });
  // Gmail returns base64url, convert to standard base64
  const base64url = res.data.data;
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  return base64;
}

// ── Gemini helper ───────────────────────────────────────────────────────────

async function extractProductsFromPdf(pdfBase64) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  const body = {
    contents: [
      {
        parts: [
          {
            inline_data: {
              mime_type: 'application/pdf',
              data: pdfBase64,
            },
          },
          {
            text: `זהו קובץ PDF של חשבונית/קבלה בעברית. חלץ את כל שורות הפריטים/מוצרים מהחשבונית.

עבור כל פריט, חלץ:
- name: שם המוצר בדיוק כפי שמופיע בחשבונית
- quantity: כמות (מספר)
- unit: יחידת מידה (ק"ג, יחידה, בקבוק, קרטון, ליטר, חבילה וכו')
- total: סה"כ שורה לפני מע"מ - הסכום הסופי של השורה (מספר)

חשוב מאוד לגבי המחיר:
- קח את הסכום הסופי של כל שורה (total) - זה הסכום אחרי כל ההנחות
- אם יש עמודות "מחיר מחירון" ו"מחיר נטו" או "סה"כ" - תמיד קח את הסה"כ/נטו הסופי של השורה, לא את מחיר המחירון
- unit_price יחושב אוטומטית מ-total חלקי quantity, אין צורך לחלץ אותו

החזר רק JSON בפורמט הבא, בלי שום טקסט נוסף:
{"items": [{"name": "שם מוצר", "quantity": 1, "unit": "יחידה", "total": 10.00}]}

חשוב:
- חלץ את כל שורות הפריטים, לא רק את הסה"כ
- מחירים לפני מע"מ
- total הוא הסכום הסופי של השורה אחרי הנחות
- אם אין פריטים מפורטים, החזר: {"items": []}
- הכמות חייבת להיות מספר (לא טקסט)
- אם יחידת המידה לא מצוינת, רשום "יחידה"
- אל תכלול שורות של מע"מ, סה"כ כללי, או הנחות כלליות`,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0,
      maxOutputTokens: 8192,
      thinkingConfig: {
        thinkingBudget: 0,
      },
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

  // Strip markdown code block wrappers if present
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  cleaned = cleaned.trim();

  let items = null;
  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed.items)) items = parsed.items;
    else if (Array.isArray(parsed)) items = parsed;
  } catch {
    // Try to find JSON object with items array
    const jsonMatch = cleaned.match(/\{[\s\S]*"items"\s*:\s*\[[\s\S]*\]\s*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed.items)) items = parsed.items;
      } catch { /* fall through */ }
    }
  }

  if (!items) {
    console.warn('  Could not parse Gemini response:', cleaned.substring(0, 200));
    return [];
  }

  // Calculate unit_price from total / quantity (most reliable)
  for (const item of items) {
    if (item.total && item.quantity && item.quantity > 0) {
      item.unit_price = Math.round((item.total / item.quantity) * 100) / 100;
    } else if (!item.unit_price) {
      item.unit_price = item.total || 0;
    }
  }

  return items;
}

// ── Product name normalization ──────────────────────────────────────────────

function normalizeProductName(name) {
  if (!name) return '';
  let n = name.trim();
  // Collapse multiple spaces
  n = n.replace(/\s+/g, ' ');
  // Remove leading/trailing quotes and dashes
  n = n.replace(/^["'\-–—]+/, '').replace(/["'\-–—]+$/, '');
  // Standardize common Hebrew terms
  n = n.replace(/מ"ל/g, 'מל');
  n = n.replace(/ק"ג/g, 'קג');
  n = n.replace(/ל'/g, 'ליטר');
  // Lowercase any Latin characters
  n = n.replace(/[A-Z]/g, (c) => c.toLowerCase());
  // Remove extra spaces again
  n = n.replace(/\s+/g, ' ').trim();
  return n;
}

function productSimilarity(a, b) {
  const na = normalizeProductName(a);
  const nb = normalizeProductName(b);
  if (na === nb) return 1.0;

  // Check if one contains the other
  if (na.includes(nb) || nb.includes(na)) return 0.9;

  // Token-based similarity
  const tokensA = new Set(na.split(' '));
  const tokensB = new Set(nb.split(' '));
  const intersection = [...tokensA].filter((t) => tokensB.has(t));
  const union = new Set([...tokensA, ...tokensB]);
  const jaccard = intersection.length / union.size;

  return jaccard;
}

// ── Price alerts generation ─────────────────────────────────────────────────

function generatePriceAlerts(productsData) {
  console.log('\n=== Generating Price Alerts ===\n');

  // Build price history: group by normalized product name + supplier
  const priceHistory = {};

  for (const invoice of productsData.products) {
    const supplier = invoice.supplier;
    const date = invoice.date;

    for (const item of invoice.items) {
      if (!item.name || item.unit_price == null || item.unit_price === 0) continue;

      // Try to find an existing key with similar product name from same supplier
      let matchedKey = null;
      const candidateKey = `${normalizeProductName(item.name)}__${supplier}`;

      for (const existingKey of Object.keys(priceHistory)) {
        const [existingProduct, existingSupplier] = existingKey.split('__');
        if (existingSupplier !== supplier) continue;
        const similarity = productSimilarity(item.name, existingProduct);
        if (similarity >= 0.8) {
          matchedKey = existingKey;
          break;
        }
      }

      const key = matchedKey || candidateKey;

      if (!priceHistory[key]) {
        priceHistory[key] = [];
      }

      // Avoid duplicates for same date
      const existing = priceHistory[key].find((e) => e.date === date);
      if (!existing) {
        priceHistory[key].push({
          date,
          price: item.unit_price,
        });
      }
    }
  }

  // Sort each history by date
  for (const key of Object.keys(priceHistory)) {
    priceHistory[key].sort((a, b) => a.date.localeCompare(b.date));
  }

  // Generate alerts for items with price changes
  const alerts = [];

  for (const [key, history] of Object.entries(priceHistory)) {
    if (history.length < 2) continue;

    const previous = history[history.length - 2];
    const current = history[history.length - 1];

    if (previous.price === current.price) continue;

    const [productNorm, supplier] = key.split('__');
    const changePercent =
      ((current.price - previous.price) / previous.price) * 100;

    // Find original product name from the most recent entry
    let originalName = productNorm;
    for (const invoice of productsData.products) {
      if (invoice.supplier !== supplier) continue;
      if (invoice.date !== current.date) continue;
      for (const item of invoice.items) {
        if (normalizeProductName(item.name) === productNorm ||
            productSimilarity(item.name, productNorm) >= 0.8) {
          originalName = item.name;
          break;
        }
      }
    }

    // Filter out noise
    const nameLower = originalName.toLowerCase();
    const normLower = productNorm.toLowerCase();
    const combined = nameLower + ' ' + normLower;

    // Skip non-product lines (deposits, discounts, fees, rounding, VAT, etc.)
    const noisePatterns = [
      /פקדון/, /פיקדון/, /הנחה/, /עיגול/, /מע"מ/, /מעמ/,
      /דמי שירות/, /דמי ניהול/, /דמי משלוח/, /דמי טיפול/,
      /משלוח/, /הובלה/, /freight/i, /delivery/i,
      /deposit/i, /discount/i, /credit/i, /refund/i,
      /עמלה/, /ריבית/, /קנס/, /חיוב נוסף/,
      /תשלום בגין/, /חשמל כללי/, /אנרגיה/,
      /משטח זר/, /ארגז ריק/, /מכל ריק/,
    ];

    if (noisePatterns.some(p => p.test(combined))) continue;

    // Skip tiny amounts (likely rounding or packaging fees)
    if (previous.price < 1 || current.price < 1) continue;

    // Skip extreme changes (>80%) - likely different products/pack sizes
    if (Math.abs(changePercent) > 80) continue;

    // Only alert on meaningful changes (>5%)
    if (Math.abs(changePercent) < 5) continue;

    alerts.push({
      product: originalName,
      supplier,
      previous_price: previous.price,
      current_price: current.price,
      change_percent: Math.round(changePercent * 10) / 10,
      previous_date: previous.date,
      current_date: current.date,
    });
  }

  // Sort alerts by absolute change percent (largest first)
  alerts.sort((a, b) => Math.abs(b.change_percent) - Math.abs(a.change_percent));

  // Format price_history keys to use original product names where possible
  const formattedHistory = {};
  for (const [key, history] of Object.entries(priceHistory)) {
    if (history.length < 2) continue; // Only include items with history
    formattedHistory[key] = history;
  }

  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

  const alertsData = {
    last_updated: timestamp,
    alerts,
    price_history: formattedHistory,
  };

  fs.writeFileSync(ALERTS_PATH, JSON.stringify(alertsData, null, 2) + '\n');
  console.log(`Found ${alerts.length} price change alerts`);
  console.log(`Tracking ${Object.keys(formattedHistory).length} products with price history`);
  console.log(`Saved to ${ALERTS_PATH}`);

  return alertsData;
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Invoice Product Extractor ===\n');

  // Load invoices
  if (!fs.existsSync(INVOICES_PATH)) {
    console.error('ERROR: invoices.json not found at', INVOICES_PATH);
    process.exit(1);
  }

  const invoicesData = JSON.parse(fs.readFileSync(INVOICES_PATH, 'utf-8'));
  const invoices = invoicesData.invoices;

  // Load existing products data (for incremental processing)
  let productsData = { last_sync: '', products: [] };
  if (fs.existsSync(PRODUCTS_PATH)) {
    try {
      productsData = JSON.parse(fs.readFileSync(PRODUCTS_PATH, 'utf-8'));
    } catch {
      console.warn('Warning: Could not parse existing products.json, starting fresh.');
    }
  }

  // Build set of already-processed invoice IDs
  const processedIds = new Set(productsData.products.map((p) => p.invoice_id));

  // Filter invoices: skip bizibox, skip already processed
  const toProcess = invoices.filter(
    (inv) =>
      !processedIds.has(inv.id) &&
      inv.from_email &&
      !inv.from_email.endsWith('@biziboxcpa.com')
  );

  console.log(`Total invoices: ${invoices.length}`);
  console.log(`Already processed: ${processedIds.size}`);
  console.log(`To process: ${toProcess.length}`);
  console.log(`(Skipping @biziboxcpa.com forwarding emails)\n`);

  if (toProcess.length === 0) {
    console.log('Nothing new to process.');
    // Still generate alerts from existing data
    if (productsData.products.length > 0) {
      generatePriceAlerts(productsData);
    }
    return;
  }

  // Authorize Gmail
  const auth = await authorize();
  const gmail = google.gmail({ version: 'v1', auth });

  let processed = 0;
  let extracted = 0;
  let failed = 0;
  let noPdf = 0;

  for (let i = 0; i < toProcess.length; i++) {
    const inv = toProcess[i];
    const progress = `[${i + 1}/${toProcess.length}]`;

    try {
      // Get message
      const message = await getMessageParts(gmail, inv.id);
      const pdfAttachments = findPdfAttachments(message.payload);

      if (pdfAttachments.length === 0) {
        console.log(`${progress} ${inv.supplier} | #${inv.invoice_number} -> no PDF attachment`);
        // Record as processed with empty items so we don't retry
        productsData.products.push({
          invoice_id: inv.id,
          supplier: inv.supplier,
          date: inv.date,
          items: [],
        });
        noPdf++;
        processed++;
        continue;
      }

      // Download first PDF attachment
      const pdfBase64 = await downloadAttachment(
        gmail,
        inv.id,
        pdfAttachments[0].attachmentId
      );

      // Extract products with Gemini
      const items = await extractProductsFromPdf(pdfBase64);

      productsData.products.push({
        invoice_id: inv.id,
        supplier: inv.supplier,
        date: inv.date,
        items: items,
      });

      if (items.length > 0) {
        console.log(
          `${progress} ${inv.supplier} | #${inv.invoice_number} -> ${items.length} items`
        );
        extracted++;
      } else {
        console.log(
          `${progress} ${inv.supplier} | #${inv.invoice_number} -> no items found`
        );
      }

      processed++;

      // Save progress every SAVE_EVERY invoices
      if (processed % SAVE_EVERY === 0) {
        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        productsData.last_sync = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
        fs.writeFileSync(PRODUCTS_PATH, JSON.stringify(productsData, null, 2) + '\n');
        console.log(`  (progress saved - ${processed} processed)\n`);
      }

      // Rate limit between Gemini calls
      if (i < toProcess.length - 1) {
        await new Promise((r) => setTimeout(r, GEMINI_DELAY_MS));
      }
    } catch (err) {
      console.error(
        `${progress} ${inv.supplier} | #${inv.invoice_number} -> ERROR: ${err.message}`
      );
      failed++;
      processed++;
    }
  }

  // Final save
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  productsData.last_sync = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
  fs.writeFileSync(PRODUCTS_PATH, JSON.stringify(productsData, null, 2) + '\n');

  console.log('\n=== Extraction Summary ===');
  console.log(`Processed: ${processed}`);
  console.log(`With items: ${extracted}`);
  console.log(`No PDF:     ${noPdf}`);
  console.log(`Failed:     ${failed}`);
  console.log(`Saved to ${PRODUCTS_PATH}`);

  // Generate price alerts
  generatePriceAlerts(productsData);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
