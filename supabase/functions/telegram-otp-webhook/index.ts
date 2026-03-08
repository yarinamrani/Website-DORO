// Supabase Edge Function: telegram-otp-webhook
// Receives Telegram webhook messages. When user replies with a 4-digit OTP code,
// completes the Ontopo login, saves tokens, and triggers the GitHub Actions report.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const TELEGRAM_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID")!;
const GITHUB_PAT = Deno.env.get("GITHUB_PAT")!;
const GITHUB_REPO = Deno.env.get("GITHUB_REPO") || "yarinamrani/Website-DORO";
const ONTOPO_PHONE = Deno.env.get("ONTOPO_PHONE") || "+972543332696";

const GRAPHQL_ENDPOINT = "https://top-openapi-legacy.prod-01.ontopo.cz/graphql";

// ─── Telegram Helper ─────────────────────────────────────────────────────────

async function sendTelegram(text: string): Promise<void> {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text,
      parse_mode: "Markdown",
    }),
  });
}

// ─── Supabase Helpers ────────────────────────────────────────────────────────

const supabaseHeaders = {
  apikey: SUPABASE_SERVICE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
  "Content-Type": "application/json",
};

async function supabaseGetState(): Promise<Record<string, string>> {
  const resp = await fetch(
    `${SUPABASE_URL}/rest/v1/ontopo_tokens?select=*&id=eq.1`,
    { headers: supabaseHeaders }
  );
  const rows = await resp.json();
  return rows[0];
}

async function supabaseSaveTokens(data: Record<string, unknown>): Promise<void> {
  await fetch(`${SUPABASE_URL}/rest/v1/ontopo_tokens?id=eq.1`, {
    method: "PATCH",
    headers: { ...supabaseHeaders, Prefer: "return=minimal" },
    body: JSON.stringify(data),
  });
}

// ─── Ontopo GraphQL Helper ───────────────────────────────────────────────────

async function gql(
  query: string,
  variables: Record<string, unknown>,
  token: string
): Promise<Record<string, any>> {
  const resp = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
  });
  const data = await resp.json();
  if (data.errors) {
    throw new Error(`GraphQL: ${data.errors[0].message}`);
  }
  return data.data || data;
}

// ─── Ontopo Login ────────────────────────────────────────────────────────────

async function ontopoLogin(
  anonToken: string,
  code: string
): Promise<{ jwt_token: string; refresh_token: string }> {
  const result = await gql(
    `mutation($i:LoginInput!){login(input:$i){jwt_token refresh_token is_operator}}`,
    { i: { phoneOrEmail: ONTOPO_PHONE, regionCode: "IL", code } },
    anonToken
  );
  return result.login;
}

// ─── Trigger GitHub Actions ──────────────────────────────────────────────────

async function triggerGitHubWorkflow(): Promise<void> {
  const resp = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/daily-report.yml/dispatches`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GITHUB_PAT}`,
        Accept: "application/vnd.github+json",
      },
      body: JSON.stringify({ ref: "main" }),
    }
  );
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`GitHub dispatch failed (${resp.status}): ${text}`);
  }
}

// ─── Main Handler ────────────────────────────────────────────────────────────

serve(async (req) => {
  try {
    const body = await req.json();
    console.log("Received body:", JSON.stringify(body));
    const message = body?.message;
    if (!message?.text) {
      console.log("No message text, ignoring");
      return new Response("ok");
    }

    console.log("Chat ID from message:", message.chat.id, "Expected:", TELEGRAM_CHAT_ID);
    // Only accept messages from the authorized chat
    if (String(message.chat.id) !== TELEGRAM_CHAT_ID) {
      console.log("Chat ID mismatch, ignoring");
      return new Response("ok");
    }

    const code = message.text.trim();
    console.log("Received text:", code);

    // Validate 4-digit OTP
    if (!/^\d{4}$/.test(code)) {
      console.log("Not a 4-digit OTP");
      await sendTelegram("❌ זה לא קוד OTP תקין. שלח 4 ספרות.");
      return new Response("ok");
    }

    // 1. Get state from Supabase
    const state = await supabaseGetState();
    console.log("Supabase state:", JSON.stringify(state));
    if (state.status !== "waiting_for_otp") {
      await sendTelegram("ℹ️ אין צורך בקוד כרגע — הטוקן תקין.");
      return new Response("ok");
    }

    // 2. Complete login with OTP code
    const loginResult = await ontopoLogin(state.anon_token, code);

    // 3. Save new tokens
    await supabaseSaveTokens({
      login_token: loginResult.jwt_token,
      login_refresh: loginResult.refresh_token,
      status: "active",
      anon_token: null,
      saved_at: new Date().toISOString(),
    });

    // 4. Trigger GitHub Actions to generate the report
    await triggerGitHubWorkflow();
    await sendTelegram("✅ טוקן חודש — מריץ דוח...");

  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    await sendTelegram(`❌ Login נכשל: ${errMsg}\nנסה שוב או הכנס ידנית.`);
  }

  return new Response("ok");
});
