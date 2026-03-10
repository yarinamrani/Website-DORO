/**
 * Spotify Web API client with automatic token refresh.
 * Handles all API calls needed by the scheduler.
 */

import { writeFileSync } from 'node:fs';
import { getEnvRequired, loadTokens, getTokensPath } from '../config/loader.js';
import type { SpotifyTokens, SpotifyDevice, SpotifyPlaybackState } from '../config/types.js';
import { logger } from '../utils/logger.js';

const BASE_URL = 'https://api.spotify.com/v1';

export class SpotifyClient {
  private tokens: SpotifyTokens;
  private clientId: string;
  private clientSecret: string;

  constructor() {
    const tokens = loadTokens();
    if (!tokens) {
      throw new Error(
        'No Spotify tokens found. Run "npm run auth" first to authorize.'
      );
    }
    this.tokens = tokens;
    this.clientId = getEnvRequired('SPOTIFY_CLIENT_ID');
    this.clientSecret = getEnvRequired('SPOTIFY_CLIENT_SECRET');
  }

  private async refreshAccessToken(): Promise<void> {
    logger.info('Refreshing Spotify access token...');

    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: this.tokens.refreshToken,
    });

    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`,
      },
      body: body.toString(),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Token refresh failed: ${res.status} ${text}`);
    }

    const data = await res.json() as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
    };

    this.tokens.accessToken = data.access_token;
    if (data.refresh_token) {
      this.tokens.refreshToken = data.refresh_token;
    }
    this.tokens.expiresAt = Date.now() + data.expires_in * 1000;

    // Persist updated tokens
    writeFileSync(getTokensPath(), JSON.stringify(this.tokens, null, 2));
    logger.info('Access token refreshed and saved');
  }

  private async ensureValidToken(): Promise<void> {
    // Refresh if token expires within 5 minutes
    if (Date.now() > this.tokens.expiresAt - 5 * 60 * 1000) {
      await this.refreshAccessToken();
    }
  }

  private async apiCall(
    method: string,
    path: string,
    body?: Record<string, unknown>
  ): Promise<Response> {
    await this.ensureValidToken();

    const url = `${BASE_URL}${path}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.tokens.accessToken}`,
    };
    if (body) {
      headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    // If 401, try one refresh and retry
    if (res.status === 401) {
      logger.warn('Got 401, attempting token refresh...');
      await this.refreshAccessToken();
      const retryRes = await fetch(url, {
        method,
        headers: {
          ...headers,
          Authorization: `Bearer ${this.tokens.accessToken}`,
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      return retryRes;
    }

    return res;
  }

  /**
   * Get available playback devices.
   */
  async getDevices(): Promise<SpotifyDevice[]> {
    const res = await this.apiCall('GET', '/me/player/devices');
    if (!res.ok) {
      logger.error(`Failed to get devices: ${res.status}`);
      return [];
    }
    const data = await res.json() as {
      devices: Array<{
        id: string;
        name: string;
        type: string;
        is_active: boolean;
        volume_percent: number | null;
      }>;
    };
    return data.devices.map((d) => ({
      id: d.id,
      name: d.name,
      type: d.type,
      isActive: d.is_active,
      volumePercent: d.volume_percent,
    }));
  }

  /**
   * Get current playback state.
   */
  async getPlaybackState(): Promise<SpotifyPlaybackState | null> {
    const res = await this.apiCall('GET', '/me/player');
    if (res.status === 204 || !res.ok) {
      return null;
    }
    const data = await res.json() as {
      is_playing: boolean;
      device?: { id: string; name: string };
      context?: { uri: string };
      item?: { name: string; artists?: Array<{ name: string }> };
      progress_ms?: number;
    };
    return {
      isPlaying: data.is_playing,
      deviceId: data.device?.id ?? null,
      deviceName: data.device?.name ?? null,
      contextUri: data.context?.uri ?? null,
      trackName: data.item?.name ?? null,
      artistName: data.item?.artists?.[0]?.name ?? null,
      progressMs: data.progress_ms ?? null,
    };
  }

  /**
   * Start or resume playback of a playlist on a specific device.
   */
  async startPlaylist(playlistUri: string, deviceId: string): Promise<boolean> {
    const res = await this.apiCall('PUT', `/me/player/play?device_id=${deviceId}`, {
      context_uri: playlistUri,
    });

    if (res.status === 204 || res.status === 200) {
      return true;
    }

    const text = await res.text();
    logger.error(`Failed to start playlist: ${res.status} ${text}`);
    return false;
  }

  /**
   * Transfer playback to a specific device.
   */
  async transferPlayback(deviceId: string, play: boolean = true): Promise<boolean> {
    const res = await this.apiCall('PUT', '/me/player', {
      device_ids: [deviceId],
      play,
    });

    if (res.status === 204 || res.status === 200) {
      return true;
    }

    const text = await res.text();
    logger.error(`Failed to transfer playback: ${res.status} ${text}`);
    return false;
  }
}
