#!/usr/bin/env node
/**
 * Classifies each invoice as belonging to "גג על הים" or "אסייתי"
 * by reading the PDF and asking Gemini who the customer is.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { google } from 'googleapis';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const INVOICES_PATH = path.join(ROOT, 'public', 'data', 'invoices.json');

// Load env
const envLines = fs.readFileSync(path.join(ROOT, '.env'), 'utf-8').split('\n');
let GEMINI_KEY = '';
for (const l of envLines) {
  const m = l.match(/^GEMINI_API_KEY=(.+)/);
  if (m) GEMINI_KEY = m[1].trim();
}

// Auth
const creds = JSON.parse(fs.readFileSync(path.join(__dirname, 'credentials.json'), 'utf-8'));
const token = JSON.parse(fs.readFileSync(path.join(__dirname, 'token.json'), 'utf-8'));
const k = creds.installed || creds.web;
const oauth2 = new google.auth.OAuth2(k.client_id, k.client_secret, 'http://localhost:3333');
oauth2.setCredentials(token);
const gmail = google.gmail({ version: 'v1', auth: oauth2 });

async function getPdf(msgId) {
  try {
    const msg = await gmail.users.messages.get({ userId: 'me', id: msgId });
    const parts = msg.data.payload?.parts || [];
    for (const p of parts) {
      if (p.filename && p.filename.toLowerCase().endsWith('.pdf') && p.body?.attachmentId) {
        const att = await gmail.users.messages.attachments.get({
          userId: 'me', messageId: msgId, id: p.body.attachmentId
        });
        return att.data.data.replace(/-/g, '+').replace(/_/g, '/');
      }
    }
  } catch (e) { /* skip */ }
  return null;
}

async function askGemini(pdf) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [
        { inline_data: { mime_type: 'application/pdf', data: pdf } },
        { text: `בחשבונית הזו, מי הלקוח? (השדה "לכבוד" או "עבור" או "שם הלקוח")

ענה רק אחת מהאפשרויות הבאות:
- "גג על הים" - אם כתוב גג על הים, פסאו, Paseo
- "אסייתי" - אם כתוב אסייתי, אומינו, Omino, Umino
- "לא ברור" - אם לא ניתן לקבוע

תשובה במילה אחת בלבד.` }
      ]}],
      generationConfig: { temperature: 0, maxOutputTokens: 50, thinkingConfig: { thinkingBudget: 0 } }
    })
  });
  const data = await res.json();
  const text = (data.candidates?.[0]?.content?.parts?.[0]?.text || '').trim();
  if (text.includes('אסייתי') || text.includes('אומינו')) return 'אסייתי';
  if (text.includes('גג על הים') || text.includes('פסאו')) return 'גג על הים';
  return 'לא ברור';
}

function classifyFromMeta(inv) {
  const all = ((inv.subject || '') + ' ' + (inv.from_email || '')).toLowerCase();
  if (all.includes('אומינו') || all.includes('אסייתי')) return 'אסייתי';
  if (all.includes('פסאו') || all.includes('גג על הים')) return 'גג על הים';
  return null;
}

async function main() {
  const data = JSON.parse(fs.readFileSync(INVOICES_PATH, 'utf-8'));
  let fromMeta = 0, fromPdf = 0, noPdf = 0, failed = 0;

  for (let i = 0; i < data.invoices.length; i++) {
    const inv = data.invoices[i];
    
    // Skip if already classified
    if (inv.business) continue;

    // Try metadata first
    const metaResult = classifyFromMeta(inv);
    if (metaResult) {
      inv.business = metaResult;
      fromMeta++;
      console.log(`[${i+1}/${data.invoices.length}] ${inv.supplier} | ${metaResult} (מטא)`);
      continue;
    }

    // Skip bizibox
    if (inv.from_email && inv.from_email.includes('biziboxcpa.com')) {
      inv.business = 'לא ברור';
      continue;
    }

    // Try PDF
    const pdf = await getPdf(inv.id);
    if (!pdf) {
      inv.business = 'לא ברור';
      noPdf++;
      console.log(`[${i+1}/${data.invoices.length}] ${inv.supplier} | no PDF`);
      continue;
    }

    try {
      const result = await askGemini(pdf);
      inv.business = result;
      fromPdf++;
      console.log(`[${i+1}/${data.invoices.length}] ${inv.supplier} | ${result} (PDF)`);
    } catch (e) {
      inv.business = 'לא ברור';
      failed++;
      console.log(`[${i+1}/${data.invoices.length}] ${inv.supplier} | ERROR`);
    }

    // Rate limit
    await new Promise(r => setTimeout(r, 2000));

    // Save every 10
    if (fromPdf % 10 === 0) {
      fs.writeFileSync(INVOICES_PATH, JSON.stringify(data, null, 2));
      console.log('  (saved)');
    }
  }

  fs.writeFileSync(INVOICES_PATH, JSON.stringify(data, null, 2));
  console.log('\n=== Summary ===');
  console.log('From metadata:', fromMeta);
  console.log('From PDF:', fromPdf);
  console.log('No PDF:', noPdf);
  console.log('Failed:', failed);

  // Count results
  const counts = {};
  for (const inv of data.invoices) {
    counts[inv.business || 'לא ברור'] = (counts[inv.business || 'לא ברור'] || 0) + 1;
  }
  console.log('\nResults:');
  for (const [k, v] of Object.entries(counts)) console.log(`  ${k}: ${v}`);
}

main().catch(e => { console.error(e); process.exit(1); });
