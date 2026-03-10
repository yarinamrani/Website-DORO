/**
 * One-time OAuth setup script.
 * Run with: npm run auth
 *
 * Opens a browser for Spotify login, captures the authorization code
 * via a local HTTP server on 127.0.0.1, exchanges it for tokens, and saves them.
 */

import 'dotenv/config';
import { createServer } from 'node:http';
import { writeFileSync } from 'node:fs';
import { getEnvRequired, getTokensPath } from '../config/loader.js';
import type { SpotifyTokens } from '../config/types.js';

const CLIENT_ID = getEnvRequired('SPOTIFY_CLIENT_ID');
const CLIENT_SECRET = getEnvRequired('SPOTIFY_CLIENT_SECRET');
const PORT = parseInt(process.env.PORT || '8888', 10);
const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI || `http://127.0.0.1:${PORT}/callback`;

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

console.log('\n🎵 DORO Music Scheduler — Spotify Auth Setup\n');
console.log('1. Open this URL in your browser:\n');
console.log(`   ${buildAuthUrl()}\n`);
console.log('2. Log in with the Spotify Premium account for the restaurant');
console.log('3. Accept the permissions');
console.log('4. Auth will complete automatically\n');
console.log(`Waiting for callback on http://127.0.0.1:${PORT}...\n`);

const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://127.0.0.1:${PORT}`);

  if (url.pathname === '/callback') {
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');

    if (error) {
      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end(`<h1>Auth failed</h1><p>${error}</p>`);
      console.error(`Auth failed: ${error}`);
      process.exit(1);
    }

    if (!code) {
      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end('<h1>No code received</h1>');
      return;
    }

    try {
      const tokens = await exchangeCode(code);
      const tokensPath = getTokensPath();
      writeFileSync(tokensPath, JSON.stringify(tokens, null, 2));

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<h1>Auth successful!</h1><p>Tokens saved. You can close this window.</p>');

      console.log('✅ Tokens saved to', tokensPath);
      console.log('   You can now run: npm run dev\n');

      setTimeout(() => process.exit(0), 1000);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/html' });
      res.end(`<h1>Token exchange failed</h1><pre>${err}</pre>`);
      console.error('Token exchange failed:', err);
      process.exit(1);
    }
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, '127.0.0.1');
