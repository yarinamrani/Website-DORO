/**
 * Playback controller.
 * Bridges the schedule engine with the Spotify client.
 * Makes decisions and executes playback changes.
 */

import { DateTime } from 'luxon';
import { SpotifyClient } from '../spotify/client.js';
import { evaluateSchedule } from './engine.js';
import type {
  ScheduleConfig,
  AgentState,
  AgentDecision,
  ManualOverride,
  SpotifyDevice,
  DayOfWeek,
  DAY_NAMES,
} from '../config/types.js';
import { DAY_NAMES as DayNames } from '../config/types.js';
import { logger } from '../utils/logger.js';

export class PlaybackController {
  private spotify: SpotifyClient;
  private config: ScheduleConfig;
  private state: AgentState;

  constructor(config: ScheduleConfig) {
    this.config = config;
    this.spotify = new SpotifyClient();
    this.state = {
      currentPlaylistUri: null,
      currentRuleId: null,
      manualOverride: null,
      lastActionAt: null,
      lastError: null,
      startedAt: new Date().toISOString(),
    };
  }

  getState(): AgentState {
    return { ...this.state };
  }

  /**
   * Set a manual override. The agent will play this playlist until the override
   * expires or is cleared.
   */
  setOverride(playlistUri: string, durationMinutes: number | null, setBy: string): void {
    const now = new Date();
    this.state.manualOverride = {
      playlistUri,
      expiresAt: durationMinutes
        ? new Date(now.getTime() + durationMinutes * 60 * 1000).toISOString()
        : null,
      setBy,
      setAt: now.toISOString(),
    };
    logger.info(`Manual override set by ${setBy}: ${playlistUri} for ${durationMinutes ?? 'indefinite'} minutes`);
  }

  /**
   * Clear the manual override.
   */
  clearOverride(): void {
    this.state.manualOverride = null;
    logger.info('Manual override cleared');
  }

  /**
   * Check if override is still valid (not expired).
   */
  private isOverrideActive(): boolean {
    const ov = this.state.manualOverride;
    if (!ov) return false;
    if (!ov.expiresAt) return true; // No expiry = active until cleared
    return new Date(ov.expiresAt).getTime() > Date.now();
  }

  /**
   * Find the preferred device by name (partial, case-insensitive match).
   */
  private findPreferredDevice(devices: SpotifyDevice[]): SpotifyDevice | null {
    const preferred = this.config.preferredDeviceName.toLowerCase();
    return devices.find((d) => d.name.toLowerCase().includes(preferred)) ?? null;
  }

  /**
   * Core agent tick — called every poll interval.
   */
  async tick(): Promise<AgentDecision> {
    const now = DateTime.now().setZone(this.config.timezone);
    const dayOfWeek = (now.weekday % 7) as DayOfWeek;

    // Determine target playlist
    let targetPlaylistUri: string;
    let isOverride = false;
    let matchedRule = null;

    // Check for active override
    if (this.isOverrideActive()) {
      targetPlaylistUri = this.state.manualOverride!.playlistUri;
      isOverride = true;
      logger.debug('Using manual override playlist');
    } else {
      // Clear expired override
      if (this.state.manualOverride && !this.isOverrideActive()) {
        logger.info('Manual override expired, returning to schedule');
        this.state.manualOverride = null;
      }

      // Evaluate schedule
      const match = evaluateSchedule(this.config);
      targetPlaylistUri = match.playlistUri;
      matchedRule = match.rule;
    }

    // Build decision object
    const decision: AgentDecision = {
      timestamp: new Date().toISOString(),
      localTime: now.toFormat('HH:mm:ss'),
      dayOfWeek,
      dayName: DayNames[dayOfWeek],
      matchedRule,
      isOverride,
      targetPlaylistUri,
      currentPlayback: null,
      currentDevice: null,
      action: 'none',
      reason: '',
      dryRun: this.config.dryRun,
    };

    try {
      // Get current playback state
      const [playback, devices] = await Promise.all([
        this.spotify.getPlaybackState(),
        this.spotify.getDevices(),
      ]);

      decision.currentPlayback = playback;

      // Find target device
      const preferredDevice = this.findPreferredDevice(devices);
      const activeDevice = devices.find((d) => d.isActive);
      const targetDevice = preferredDevice ?? activeDevice ?? devices[0] ?? null;
      decision.currentDevice = targetDevice;

      if (!targetDevice) {
        decision.action = 'error';
        decision.reason = 'No Spotify devices found. Is Spotify running on the playback machine?';
        decision.error = decision.reason;
        this.state.lastError = decision.reason;
        logger.warn(decision.reason, { devices: devices.length });
        return decision;
      }

      // Check if correct playlist is already playing
      const correctPlaylist = playback && playback.isPlaying && playback.contextUri === targetPlaylistUri;
      const correctDevice = playback && playback.deviceId === targetDevice.id;

      if (correctPlaylist && correctDevice) {
        decision.action = 'none';
        decision.reason = `Correct playlist already playing on ${targetDevice.name}`;
        logger.debug(decision.reason);
        return decision;
      }

      // Correct playlist but wrong device — just transfer
      if (correctPlaylist && !correctDevice) {
        decision.reason = `Transferring playback to ${targetDevice.name}`;
        if (!this.config.dryRun) {
          const success = await this.spotify.transferPlayback(targetDevice.id, true);
          if (success) {
            decision.action = 'switch_playlist';
            this.state.currentPlaylistUri = targetPlaylistUri;
            this.state.currentRuleId = matchedRule?.id ?? null;
            this.state.lastActionAt = new Date().toISOString();
            this.state.lastError = null;
            logger.info(`Transferred playback to ${targetDevice.name}`);
          } else {
            decision.action = 'error';
            decision.error = 'Failed to transfer playback';
            this.state.lastError = decision.error;
          }
        } else {
          decision.action = 'switch_playlist';
          decision.reason = `[DRY RUN] ${decision.reason}`;
        }
        return decision;
      }

      // Need to switch playlist
      const reason = !playback?.isPlaying
        ? 'Playback is stopped/paused — starting playlist'
        : `Switching playlist: ${playback.contextUri} -> ${targetPlaylistUri}`;

      decision.reason = reason;

      if (this.config.dryRun) {
        decision.action = playback?.isPlaying ? 'switch_playlist' : 'start_playback';
        decision.reason = `[DRY RUN] ${reason}`;
        logger.info(decision.reason);
        return decision;
      }

      // Execute the change
      const success = await this.spotify.startPlaylist(targetPlaylistUri, targetDevice.id);

      if (success) {
        decision.action = playback?.isPlaying ? 'switch_playlist' : 'start_playback';
        this.state.currentPlaylistUri = targetPlaylistUri;
        this.state.currentRuleId = matchedRule?.id ?? null;
        this.state.lastActionAt = new Date().toISOString();
        this.state.lastError = null;
        logger.info(`Playback action: ${decision.action} — ${reason}`, {
          device: targetDevice.name,
          playlist: targetPlaylistUri,
          rule: matchedRule?.id ?? 'override/fallback',
        });
      } else {
        decision.action = 'error';
        decision.error = 'Spotify API returned failure for startPlaylist';
        this.state.lastError = decision.error;
        logger.error(decision.error);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      decision.action = 'error';
      decision.error = errorMsg;
      decision.reason = `Exception during tick: ${errorMsg}`;
      this.state.lastError = errorMsg;
      logger.error('Tick error', { error: errorMsg });
    }

    return decision;
  }
}
