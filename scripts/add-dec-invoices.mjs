#!/usr/bin/env node
/**
 * Adds December 2025 invoice entries to invoices.json
 * Skips any IDs that already exist.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INVOICES_PATH = path.join(__dirname, '..', 'public', 'data', 'invoices.json');

const newInvoices = [
  {
    id: '19b6fa3d922a5116',
    supplier: 'קולאיוונט בעמ',
    invoice_number: '30168',
    date: '2025-12-30',
    amount: null,
    doc_type: 'קבלה',
    subject: 'קולאיוונט בעמ שלח/ה לך קבלה מספר 30168',
    from_email: 'notifications@invoice4u.co.il',
    status: 'received'
  },
  {
    id: '19b6f9e170aa15f6',
    supplier: 'IPCOM',
    invoice_number: 'SI256021626',
    date: '2025-12-30',
    amount: null,
    doc_type: 'חשבונית',
    subject: '(מסמך ממוחשב) הדפסת חשבונית מרכזת SI256021626 - IPCOM, חוזה',
    from_email: 'invoice@ip-com.co.il',
    status: 'received'
  },
  {
    id: '19b6f9ca1673eb2c',
    supplier: 'IPCOM',
    invoice_number: 'SI256021600',
    date: '2025-12-30',
    amount: null,
    doc_type: 'חשבונית',
    subject: '(מסמך ממוחשב) הדפסת חשבונית מרכזת SI256021600 - IPCOM, חוזה',
    from_email: 'invoice@ip-com.co.il',
    status: 'received'
  },
  {
    id: '19b6c7400760e0f6',
    supplier: 'Hyp / חשבונית+',
    invoice_number: '',
    date: '2025-12-29',
    amount: null,
    doc_type: 'חשבונית',
    subject: 'חשבונית – זאפ גרופ ללקוח 80355354',
    from_email: 'heshbonit@d.co.il',
    status: 'received'
  },
  {
    id: '19b6c411632040bb',
    supplier: 'Hyp / חשבונית+',
    invoice_number: '',
    date: '2025-12-29',
    amount: null,
    doc_type: 'חשבונית',
    subject: 'חשבונית – זאפ גרופ ללקוח 80369942',
    from_email: 'heshbonit@d.co.il',
    status: 'received'
  },
  {
    id: '19b69a5fa59e20bf',
    supplier: 'קוקה קולה',
    invoice_number: '',
    date: '2025-12-29',
    amount: null,
    doc_type: 'חשבונית',
    subject: 'קוקה קולה חשבונית ללקוח-12.2025',
    from_email: 'Invoice@cbccom.com',
    status: 'received'
  },
  {
    id: '19b6436c836aff1a',
    supplier: 'אלפרד שירותי מידע',
    invoice_number: '60004',
    date: '2025-12-28',
    amount: null,
    doc_type: 'חשבונית מס קבלה',
    subject: 'חשבונית מס / קבלה 60004 - אלפרד שירותי מידע בע"מ',
    from_email: 'notify@morning.co',
    status: 'received'
  },
  {
    id: '19b5444228d36e4b',
    supplier: 'קוקה קולה',
    invoice_number: '',
    date: '2025-12-25',
    amount: null,
    doc_type: 'חשבונית',
    subject: 'קוקה קולה חשבונית ללקוח-12.2025',
    from_email: 'Invoice@cbccom.com',
    status: 'received'
  },
  {
    id: '19b450e9bd6ebacb',
    supplier: 'קבוצת בנדיקט',
    invoice_number: '28256',
    date: '2025-12-22',
    amount: null,
    doc_type: 'קבלה',
    subject: 'קבלה - העברה לבנק 28256 מקבוצת בנדיקט בע"מ',
    from_email: 'bakery@benedict.co.il',
    status: 'received'
  },
  {
    id: '19b3081ef3b1c2c8',
    supplier: 'קולאיוונט בעמ',
    invoice_number: '10301',
    date: '2025-12-18',
    amount: null,
    doc_type: 'חשבונית מס',
    subject: 'קולאיוונט בעמ שלח/ה לך חשבונית מס מספר 10301',
    from_email: 'notifications@invoice4u.co.il',
    status: 'received'
  },
  {
    id: '19b3057be670bd56',
    supplier: 'כנם השקעות',
    invoice_number: '833',
    date: '2025-12-18',
    amount: null,
    doc_type: 'חשבונית מס',
    subject: 'Fwd: חשבונית מס 833 ממני כנם השקעות בע"מ גג על הים',
    from_email: 'diklaamrabi2611@gmail.com',
    status: 'received'
  },
  {
    id: '19b3057a637acfb9',
    supplier: 'כנם השקעות',
    invoice_number: '834',
    date: '2025-12-18',
    amount: null,
    doc_type: 'חשבונית מס',
    subject: 'Fwd: חשבונית מס 834 ממני כנם השקעות בע"מ אסייתי',
    from_email: 'diklaamrabi2611@gmail.com',
    status: 'received'
  },
  {
    id: '19b305695cccc5e5',
    supplier: 'כנם השקעות',
    invoice_number: '835',
    date: '2025-12-18',
    amount: null,
    doc_type: 'חשבונית מס',
    subject: 'Fwd: חשבונית מס 835 ממני כנם השקעות בע"מ אסייתי',
    from_email: 'diklaamrabi2611@gmail.com',
    status: 'received'
  },
  {
    id: '19b2cd8092590a61',
    supplier: 'בזק',
    invoice_number: '',
    date: '2025-12-17',
    amount: null,
    doc_type: 'חשבונית',
    subject: 'החשבונית החודשית שלך בבזק energy כאן',
    from_email: 'bezeq_mail@bezeq.co.il',
    status: 'received'
  },
  {
    id: '19b2cd774bc82ff6',
    supplier: 'בזק',
    invoice_number: '',
    date: '2025-12-17',
    amount: null,
    doc_type: 'חשבונית',
    subject: 'החשבונית החודשית שלך בבזק energy כאן',
    from_email: 'bezeq_mail@bezeq.co.il',
    status: 'received'
  },
  {
    id: '19b278f428815fca',
    supplier: 'עודד דניאל BeeComm',
    invoice_number: '147114',
    date: '2025-12-16',
    amount: null,
    doc_type: 'חשבונית מס',
    subject: 'עודד דניאל בע"מ BeeComm  - חשבונית מס  מספר  147114',
    from_email: 'sender@invoice-one.com',
    status: 'received'
  },
  {
    id: '19b2471993fb7bf6',
    supplier: 'Wolt',
    invoice_number: '',
    date: '2025-12-15',
    amount: null,
    doc_type: 'דוח תשלום',
    subject: 'פסאו - Wolt payout report 01/12/2025 - 16/12/2025',
    from_email: 'info@wolt.com',
    status: 'received'
  },
  {
    id: '19b21bb3874cc019',
    supplier: 'Tabit',
    invoice_number: 'RC250034607',
    date: '2025-12-15',
    amount: null,
    doc_type: 'קבלה',
    subject: '(מסמך ממוחשב) הדפסת קבלה - RC250034607, הוראת קבע 15/12/25 11/25',
    from_email: 'billing-il@tabit.cloud',
    status: 'received'
  },
  {
    id: '19b214ffd08bc261',
    supplier: 'קוקה קולה',
    invoice_number: '',
    date: '2025-12-15',
    amount: null,
    doc_type: 'חשבונית',
    subject: 'קוקה קולה חשבונית ללקוח-12.2025',
    from_email: 'Invoice@cbccom.com',
    status: 'received'
  },
  {
    id: '19b0d8dd0bb81b12',
    supplier: 'פעיל שרותי ביוב',
    invoice_number: '34156',
    date: '2025-12-11',
    amount: null,
    doc_type: 'חשבונית מס',
    subject: 'חשבונית מס 34156 מפעיל שרותי ביוב בע"מ',
    from_email: 'pailgrup@gmail.com',
    status: 'received'
  },
  {
    id: '19b0d8ccd3bca50f',
    supplier: 'פעיל שרותי ביוב',
    invoice_number: '34154',
    date: '2025-12-11',
    amount: null,
    doc_type: 'חשבונית מס',
    subject: 'חשבונית מס 34154 מפעיל שרותי ביוב בע"מ',
    from_email: 'pailgrup@gmail.com',
    status: 'received'
  },
  {
    id: '19b0d4f3b738f65d',
    supplier: 'אשכול הארץ',
    invoice_number: '',
    date: '2025-12-11',
    amount: null,
    doc_type: 'חשבונית זיכוי',
    subject: 'חשבונית זיכוי מג.י אשכול הארץ בעמ',
    from_email: 'eshkol.haaretz@gmail.com',
    status: 'received'
  },
  {
    id: '19b0cf5e54543056',
    supplier: 'השקט שלך',
    invoice_number: '',
    date: '2025-12-11',
    amount: null,
    doc_type: 'חשבונית',
    subject: 'Re: חשבונית מהשקט שלך‎ - גג על הים',
    from_email: 'ester@hspension.co.il',
    status: 'received'
  },
  {
    id: '19b0ca3fcd95e149',
    supplier: 'אסייתי בחוף ראשון',
    invoice_number: '50062',
    date: '2025-12-11',
    amount: null,
    doc_type: 'חשבונית מס',
    subject: 'חשבונית מס 50062 - אסייתי בחוף ראשון  בע"מ',
    from_email: 'notify@morning.co',
    status: 'received'
  },
  {
    id: '19b0ca150d15f1be',
    supplier: 'גג על הים',
    invoice_number: '50084',
    date: '2025-12-11',
    amount: null,
    doc_type: 'חשבונית מס',
    subject: 'חשבונית מס 50084 - גג על הים 2022 ראשון  בע"מ',
    from_email: 'notify@morning.co',
    status: 'received'
  },
  {
    id: '19b0c798d1381e83',
    supplier: 'קוקה קולה',
    invoice_number: '',
    date: '2025-12-11',
    amount: null,
    doc_type: 'חשבונית',
    subject: 'קוקה קולה חשבונית ללקוח-12.2025',
    from_email: 'Invoice@cbccom.com',
    status: 'received'
  },
  {
    id: '19b0820340489ff5',
    supplier: 'ניו-וייבז',
    invoice_number: '',
    date: '2025-12-10',
    amount: null,
    doc_type: 'חשבונית מס קבלה',
    subject: 'חשבונית מס קבלה - ניו-וייבז בע"מ',
    from_email: 'no-reply@payplus.co.il',
    status: 'received'
  },
  {
    id: '19afe0f0bb82bc37',
    supplier: 'Tabit',
    invoice_number: 'SI256030113',
    date: '2025-12-08',
    amount: null,
    doc_type: 'חשבונית מס',
    subject: '(מסמך ממוחשב) הדפסת חשבונית מרכזת - SI256030113, חש. מרכזת נוב-25',
    from_email: 'billing-il@tabit.cloud',
    status: 'received'
  }
];

// Read existing
const data = JSON.parse(fs.readFileSync(INVOICES_PATH, 'utf8'));
const existingIds = new Set(data.invoices.map(inv => inv.id));

let added = 0;
let skipped = 0;

for (const inv of newInvoices) {
  if (existingIds.has(inv.id)) {
    console.log(`SKIP (already exists): ${inv.id} - ${inv.supplier}`);
    skipped++;
  } else {
    data.invoices.push(inv);
    existingIds.add(inv.id);
    console.log(`ADDED: ${inv.id} - ${inv.supplier} - ${inv.subject}`);
    added++;
  }
}

// Sort by date descending (newest first)
data.invoices.sort((a, b) => b.date.localeCompare(a.date));

// Update metadata
data.total = data.invoices.length;
data.last_sync = new Date().toISOString().slice(0, 16).replace('T', ' ');

fs.writeFileSync(INVOICES_PATH, JSON.stringify(data, null, 2) + '\n');

console.log(`\nDone: ${added} added, ${skipped} skipped. Total invoices: ${data.total}`);
