/**
 * One-time OAuth setup script.
 * Run with: npm run auth
 *
 * Opens a browser for Spotify login, then asks you to paste the
 * redirect URL from the browser to capture the authorization code.
 */

import 'dotenv/config';
import { createInterface } from 'node:readline';
import { writeFileSync } from 'node:fs';
import { getEnvRequired, getTokensPath } from '../config/loader.js';
import type { SpotifyTokens } from '../config/types.js';

const CLIENT_ID = getEnvRequired('SPOTIFY_CLIENT_ID');
const CLIENT_SECRET = getEnvRequired('SPOTIFY_CLIENT_SECRET');
const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI || 'https://localhost:8888/callback';

const SCOPES = [
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'playlist-read-private',
  'playlist-read-collaborative',
].join(' ');

function buildAuthUrl(): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    scope: SCOPES,
    redirect_uri: REDIRECT_URI,
    show_dialog: 'true',
  });
  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}

async function exchangeCode(code: string): Promise<SpotifyTokens> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
  });

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`,
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed: ${res.status} ${text}`);
  }

  const data = await res.json() as { access_token: string; refresh_token: string; expires_in: number };

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
}

function prompt(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

console.log('\n🎵 DORO Music Scheduler — Spotify Auth Setup\n');
console.log('1. Open this URL in your browser:\n');
console.log(`   ${buildAuthUrl()}\n`);
console.log('2. Log in with the Spotify Premium account for the restaurant');
console.log('3. Accept the permissions');
console.log('4. The browser will redirect to a page that won\'t load (that\'s OK!)');
console.log('5. Copy the FULL URL from the browser address bar and paste it below\n');

const redirectUrl = await prompt('Paste the redirect URL here: ');

try {
  const url = new URL(redirectUrl);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error) {
    console.error(`\n❌ Auth failed: ${error}`);
    process.exit(1);
  }

  if (!code) {
    console.error('\n❌ No authorization code found in the URL. Make sure you copied the full URL.');
    process.exit(1);
  }

  console.log('\nExchanging code for tokens...');
  const tokens = await exchangeCode(code);
  const tokensPath = getTokensPath();
  writeFileSync(tokensPath, JSON.stringify(tokens, null, 2));

  console.log(`\n✅ Tokens saved to ${tokensPath}`);
  console.log('   You can now run: npm run dev\n');
} catch (err) {
  if (err instanceof TypeError && (err as Error).message.includes('Invalid URL')) {
    console.error('\n❌ Invalid URL. Make sure you copied the full URL from the browser address bar.');
  } else {
    console.error('\n❌ Token exchange failed:', err);
  }
  process.exit(1);
}
