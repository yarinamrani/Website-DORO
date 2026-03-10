/**
 * DORO Music Scheduler — Type Definitions
 *
 * ⚠️  PRIVATE / INTERNAL USE ONLY — NOT FOR COMMERCIAL PUBLIC PLAYBACK
 *     Spotify personal accounts are NOT licensed for restaurant use.
 *     See README for compliant alternatives.
 */

/** Days of the week (0 = Sunday, 6 = Saturday) */
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const DAY_NAMES: Record<DayOfWeek, string> = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
};

export interface ScheduleRule {
  /** Unique rule ID for logging */
  id: string;
  /** Human-readable mood label */
  mood: string;
  /** Days this rule applies (0=Sun, 6=Sat) */
  days: DayOfWeek[];
  /** Start time in HH:mm (24h) */
  startTime: string;
  /** End time in HH:mm (24h) — can be next-day if > startTime conceptually */
  endTime: string;
  /** Spotify playlist URI: spotify:playlist:<id> */
  playlistUri: string;
  /** Priority — higher number wins when rules overlap */
  priority: number;
  /** Whether this rule is active */
  enabled: boolean;
}

export interface ScheduleConfig {
  /** IANA timezone, e.g. "Asia/Jerusalem" */
  timezone: string;
  /** Fallback playlist URI when no rule matches */
  fallbackPlaylistUri: string;
  /** Preferred Spotify device name (partial match OK) */
  preferredDeviceName: string;
  /** Agent poll interval in seconds (default: 60) */
  pollIntervalSeconds: number;
  /** Enable dry-run mode (log decisions but don't control playback) */
  dryRun: boolean;
  /** Schedule rules */
  rules: ScheduleRule[];
}

export interface ManualOverride {
  /** Playlist URI to force */
  playlistUri: string;
  /** When the override expires (ISO 8601) — null = until manually cleared */
  expiresAt: string | null;
  /** Who set it */
  setBy: string;
  /** When it was set (ISO 8601) */
  setAt: string;
}

export interface AgentState {
  /** Currently playing playlist URI (as seen by agent) */
  currentPlaylistUri: string | null;
  /** Current rule ID being applied */
  currentRuleId: string | null;
  /** Active manual override */
  manualOverride: ManualOverride | null;
  /** Last successful action timestamp */
  lastActionAt: string | null;
  /** Last error message */
  lastError: string | null;
  /** Agent start time */
  startedAt: string;
}

export interface SpotifyTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface SpotifyDevice {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  volumePercent: number | null;
}

export interface SpotifyPlaybackState {
  isPlaying: boolean;
  deviceId: string | null;
  deviceName: string | null;
  contextUri: string | null;
  trackName: string | null;
  artistName: string | null;
  progressMs: number | null;
}

export interface AgentDecision {
  timestamp: string;
  localTime: string;
  dayOfWeek: DayOfWeek;
  dayName: string;
  matchedRule: ScheduleRule | null;
  isOverride: boolean;
  targetPlaylistUri: string;
  currentPlayback: SpotifyPlaybackState | null;
  currentDevice: SpotifyDevice | null;
  action: 'none' | 'switch_playlist' | 'start_playback' | 'error';
  reason: string;
  dryRun: boolean;
  error?: string;
}
