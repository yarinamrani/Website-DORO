import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ScheduleConfig, SpotifyTokens } from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function loadScheduleConfig(): ScheduleConfig {
  const configPath = resolve(__dirname, 'schedule.json');
  if (!existsSync(configPath)) {
    throw new Error(`Schedule config not found at ${configPath}`);
  }
  const raw = readFileSync(configPath, 'utf-8');
  const config: ScheduleConfig = JSON.parse(raw);

  // Allow env override for dry-run
  if (process.env.DRY_RUN === 'true') {
    config.dryRun = true;
  }

  validateConfig(config);
  return config;
}

function validateConfig(config: ScheduleConfig): void {
  if (!config.timezone) throw new Error('Config missing: timezone');
  if (!config.fallbackPlaylistUri) throw new Error('Config missing: fallbackPlaylistUri');
  if (!config.rules || config.rules.length === 0) throw new Error('Config missing: rules');

  for (const rule of config.rules) {
    if (!rule.id) throw new Error('Rule missing: id');
    if (!rule.playlistUri) throw new Error(`Rule ${rule.id} missing: playlistUri`);
    if (!rule.startTime || !rule.endTime) throw new Error(`Rule ${rule.id} missing: time range`);
    if (!rule.days || rule.days.length === 0) throw new Error(`Rule ${rule.id} missing: days`);

    const timeRegex = /^\d{2}:\d{2}$/;
    if (!timeRegex.test(rule.startTime)) throw new Error(`Rule ${rule.id}: invalid startTime "${rule.startTime}"`);
    if (!timeRegex.test(rule.endTime)) throw new Error(`Rule ${rule.id}: invalid endTime "${rule.endTime}"`);
  }
}

export function getEnvRequired(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

export function getTokensPath(): string {
  return resolve(__dirname, '../../tokens.json');
}

export function loadTokens(): SpotifyTokens | null {
  const path = getTokensPath();
  if (!existsSync(path)) return null;
  const raw = readFileSync(path, 'utf-8');
  return JSON.parse(raw);
}

export function saveTokens(tokens: SpotifyTokens): void {
  writeFileSync(getTokensPath(), JSON.stringify(tokens, null, 2));
}
