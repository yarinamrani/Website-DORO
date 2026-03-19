#!/usr/bin/env node

/**
 * drive-upload.mjs — העלאת חשבוניות ל-Google Drive
 *
 * Usage:
 *   node scripts/drive-upload.mjs ./path/to/invoice.pdf "שם הספק"
 *
 * Or import as module:
 *   import { uploadToDrive } from './drive-upload.mjs';
 *   const link = await uploadToDrive('/path/to/file.pdf', 'שם הספק');
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, join, basename, extname } from 'path';

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

// ─── Constants ─────────────────────────────────────────────────
const GMAIL_CREDS_DIR = resolve(import.meta.dirname || '.', '..', 'imported-data', 'restaurant-invoices');
const ROOT_FOLDER_NAME = 'PASEO חשבוניות';

const MIME_MAP = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.tiff': 'image/tiff',
  '.tif': 'image/tiff',
};

// ─── In-memory cache for folder IDs ───────────────────────────
const folderCache = new Map();

// ─── OAuth helpers ─────────────────────────────────────────────
function loadCredentials() {
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

let _cachedAccessToken = null;
let _tokenExpiry = 0;

async function getAccessToken() {
  if (_cachedAccessToken && Date.now() < _tokenExpiry - 60_000) {
    return _cachedAccessToken;
  }

  const { credentials, token } = loadCredentials();
  const clientConfig = credentials.installed || credentials.web;

  if (!clientConfig) {
    throw new Error('credentials.json חייב להכיל "installed" או "web"');
  }

  // Check if current token is still valid
  if (token.access_token && token.expiry_date && token.expiry_date > Date.now() + 60_000) {
    _cachedAccessToken = token.access_token;
    _tokenExpiry = token.expiry_date;
    return _cachedAccessToken;
  }

  // Refresh the token
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

  // Persist updated token
  const tokenPath = join(GMAIL_CREDS_DIR, 'token.json');
  writeFileSync(tokenPath, JSON.stringify(updatedToken, null, 2));

  _cachedAccessToken = updatedToken.access_token;
  _tokenExpiry = updatedToken.expiry_date || (Date.now() + (newToken.expires_in || 3600) * 1000);

  return _cachedAccessToken;
}

// ─── Google Drive API helpers ──────────────────────────────────
async function driveRequest(endpoint, options = {}) {
  const accessToken = await getAccessToken();
  const url = endpoint.startsWith('https://')
    ? endpoint
    : `https://www.googleapis.com/drive/v3/${endpoint}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Drive API (${res.status}): ${errText}`);
  }

  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

/**
 * Find a folder by name inside a parent folder.
 * Returns the folder ID or null.
 */
async function findFolder(name, parentId) {
  const cacheKey = `${parentId || 'root'}/${name}`;
  if (folderCache.has(cacheKey)) {
    return folderCache.get(cacheKey);
  }

  const q = encodeURIComponent(
    `name='${name.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false` +
    (parentId ? ` and '${parentId}' in parents` : '')
  );

  const data = await driveRequest(`files?q=${q}&fields=files(id,name)&spaces=drive`);

  if (data.files && data.files.length > 0) {
    const id = data.files[0].id;
    folderCache.set(cacheKey, id);
    return id;
  }

  return null;
}

/**
 * Create a folder inside a parent folder.
 * Returns the new folder ID.
 */
async function createFolder(name, parentId) {
  const metadata = {
    name,
    mimeType: 'application/vnd.google-apps.folder',
  };
  if (parentId) {
    metadata.parents = [parentId];
  }

  const data = await driveRequest('files', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(metadata),
  });

  const cacheKey = `${parentId || 'root'}/${name}`;
  folderCache.set(cacheKey, data.id);

  return data.id;
}

/**
 * Ensure a folder exists (find or create).
 * Returns the folder ID.
 */
async function ensureFolder(name, parentId) {
  const existing = await findFolder(name, parentId);
  if (existing) return existing;

  console.log(`   תיקייה חדשה: "${name}"`);
  return createFolder(name, parentId);
}

/**
 * Check if a file with exact name already exists in a folder.
 * Returns the file ID or null.
 */
async function findFile(name, parentId) {
  const q = encodeURIComponent(
    `name='${name.replace(/'/g, "\\'")}' and '${parentId}' in parents and trashed=false`
  );

  const data = await driveRequest(`files?q=${q}&fields=files(id,name)&spaces=drive`);

  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }

  return null;
}

/**
 * Upload a file to Google Drive using multipart upload.
 * Returns { id, webViewLink }.
 */
async function uploadFile(filePath, parentId) {
  const accessToken = await getAccessToken();
  const fileName = basename(filePath);
  const ext = extname(filePath).toLowerCase();
  const mimeType = MIME_MAP[ext] || 'application/octet-stream';

  // Check for duplicates
  const existingId = await findFile(fileName, parentId);
  if (existingId) {
    console.log(`   קובץ כבר קיים ב-Drive: ${fileName}`);
    const meta = await driveRequest(`files/${existingId}?fields=id,webViewLink`);
    return { id: meta.id, webViewLink: meta.webViewLink };
  }

  const fileBuffer = readFileSync(filePath);

  // Use multipart upload
  const metadata = JSON.stringify({
    name: fileName,
    parents: [parentId],
  });

  const boundary = '---invoice_upload_boundary_' + Date.now();
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartBody = Buffer.concat([
    Buffer.from(
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      metadata +
      delimiter +
      `Content-Type: ${mimeType}\r\n` +
      'Content-Transfer-Encoding: base64\r\n\r\n'
    ),
    Buffer.from(fileBuffer.toString('base64')),
    Buffer.from(closeDelimiter),
  ]);

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
        'Content-Length': String(multipartBody.length),
      },
      body: multipartBody,
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`שגיאת העלאה ל-Drive (${res.status}): ${errText}`);
  }

  return res.json();
}

// ─── Main export ───────────────────────────────────────────────

/**
 * Upload an invoice file to Google Drive in the correct supplier folder.
 *
 * @param {string} filePath  - Absolute or relative path to the invoice file
 * @param {string} supplierName - Supplier name (used as subfolder name)
 * @returns {Promise<{id: string, webViewLink: string, supplierFolder: string}>}
 */
export async function uploadToDrive(filePath, supplierName) {
  const absPath = resolve(filePath);

  if (!existsSync(absPath)) {
    throw new Error(`קובץ לא נמצא: ${absPath}`);
  }

  const cleanSupplier = (supplierName || 'לא ידוע').trim();

  console.log(`   העלאה ל-Drive: ${basename(absPath)} -> ${ROOT_FOLDER_NAME}/${cleanSupplier}`);

  // Ensure root folder
  const rootFolderId = await ensureFolder(ROOT_FOLDER_NAME, null);

  // Ensure supplier subfolder
  const supplierFolderId = await ensureFolder(cleanSupplier, rootFolderId);

  // Upload the file
  const result = await uploadFile(absPath, supplierFolderId);

  console.log(`   קישור: ${result.webViewLink || 'לא זמין'}`);

  return {
    id: result.id,
    webViewLink: result.webViewLink,
    supplierFolder: cleanSupplier,
  };
}

// ─── CLI entry point ───────────────────────────────────────────
const isMainModule = process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename || '');
if (isMainModule) {
  const filePath = process.argv[2];
  const supplierName = process.argv[3];

  if (!filePath || !supplierName) {
    console.error('שימוש: node scripts/drive-upload.mjs <path-to-file> <supplier-name>');
    console.error('דוגמה: node scripts/drive-upload.mjs ./invoice.pdf "שטראוס"');
    process.exit(1);
  }

  try {
    const result = await uploadToDrive(filePath, supplierName);
    console.log('\n--- תוצאה ---');
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error(`\n שגיאה: ${err.message}`);
    process.exit(1);
  }
}
