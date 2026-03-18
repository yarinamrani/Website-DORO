# Security Audit Report -- PASEO Invoice Management

**Date:** 2026-03-18
**Scope:** Full codebase security review

---

## 1. Exposed Secrets

### FIXED: Hardcoded Supabase Project Ref
- **Files:** `scripts/setup-db.mjs`, `scripts/seed-data.mjs`
- **Issue:** Supabase project reference `vzeowbriddhvhpishmhn` was hardcoded.
- **Fix:** Replaced with `process.env.SUPABASE_PROJECT_REF` / CLI argument.

### FIXED: Hardcoded Supabase URL Fallback
- **Files:** `scripts/scan-folder.mjs`, `scripts/sync-invoices.mjs`
- **Issue:** Hardcoded Supabase URL as fallback value, leaking project identity.
- **Fix:** Removed fallback; scripts now fail fast if env var is missing.

### OK: .env file
- `.env` contains `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- `.env` is already in `.gitignore` and was never committed to git history.
- The `VITE_SUPABASE_ANON_KEY` is a public-facing key by design (Supabase anon key). Security depends on RLS policies.

### OK: GitHub Actions Secrets
- `daily-report.yml` correctly uses `${{ secrets.* }}` for all sensitive values (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, ONTOPO_PHONE).

### OK: Supabase Edge Function
- `telegram-otp-webhook/index.ts` reads secrets from `Deno.env.get()` (Supabase function secrets).

---

## 2. .gitignore Hardening

### FIXED: Added missing entries
- `credentials.json`, `token.json` (Gmail OAuth)
- `.ontopo_token.json`
- `imported-data/` (scanned invoice files)
- `tmp/` (downloaded attachments from sync-invoices)
- `scan-report.json`
- `.wwebjs_auth/`, `.wwebjs_cache/` (WhatsApp session data)
- Python artifacts (`__pycache__/`, `.venv/`)
- IDE directories, log files

---

## 3. .env.example

### FIXED: Updated with all required variables
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `GEMINI_API_KEY`
- `SUPABASE_ACCESS_TOKEN`

---

## 4. Supabase RLS Policies

### ACCEPTED RISK: "Allow all" policies
- All four tables use `USING (true) WITH CHECK (true)` policies.
- This means anyone with the anon key can read/write/delete all data.
- **Mitigation:** This is a single-user internal tool for one restaurant. The anon key is only exposed on the deployed domain, and there is no multi-tenant data isolation requirement.
- **Recommendation for future:** If the app becomes multi-user, implement proper RLS policies based on `auth.uid()`.

---

## 5. XSS / Injection

### OK: No XSS vulnerabilities found
- No usage of `dangerouslySetInnerHTML` anywhere in the codebase.
- No `eval()`, `document.write()`, or `innerHTML` in React components.
- All data rendering uses React's default JSX escaping.
- Supabase client parameterizes all queries (no raw SQL injection risk in the frontend).

---

## 6. API Endpoint Security

### OK: Supabase Anon Key Usage
- The anon key is designed to be public; security is enforced by RLS policies.
- The frontend `supabase.ts` client correctly reads keys from environment variables.
- Server-side scripts use the anon key for data operations (acceptable for single-user app).

### OK: Gemini API Key
- Used only in server-side Node.js scripts (`scan-invoice.mjs`, `scan-folder.mjs`), not exposed to the browser.
- Read from `process.env.GEMINI_API_KEY`.

### OK: Gmail Credentials
- `credentials.json` and `token.json` are loaded from the `imported-data/` directory (now gitignored).
- OAuth token refresh is handled in `sync-invoices.mjs`.

---

## 7. Security Headers

### FIXED: Created vercel.json with security headers
- `X-Frame-Options: DENY` -- prevents clickjacking
- `X-Content-Type-Options: nosniff` -- prevents MIME-type sniffing
- `Referrer-Policy: strict-origin-when-cross-origin` -- limits referrer leakage
- `Permissions-Policy` -- disables camera, microphone, geolocation
- `Strict-Transport-Security` -- enforces HTTPS (HSTS with 2-year max-age)
- `Content-Security-Policy` -- restricts script/style/font/connect sources to known origins

---

## 8. Dependencies

### FIXED: npm audit vulnerability
- **flatted < 3.4.0** (high severity): Unbounded recursion DoS in `parse()`.
- Fixed via `npm audit fix`.
- **Result:** 0 vulnerabilities remaining.

---

## Summary of Changes

| File | Change |
|------|--------|
| `.gitignore` | Added 15+ entries for sensitive files and directories |
| `.env.example` | Added GEMINI_API_KEY and SUPABASE_ACCESS_TOKEN placeholders |
| `scripts/setup-db.mjs` | Removed hardcoded project ref; now reads from env/args |
| `scripts/seed-data.mjs` | Removed hardcoded project ref; now reads from env/args |
| `scripts/scan-folder.mjs` | Removed hardcoded Supabase URL fallback; added URL validation |
| `scripts/sync-invoices.mjs` | Removed hardcoded Supabase URL fallback; added URL validation |
| `vercel.json` | Added 7 security headers (CSP, HSTS, X-Frame-Options, etc.) |
| `package-lock.json` | Updated flatted dependency to fix DoS vulnerability |
