/**
 * Schedule evaluation engine.
 * Determines which rule matches the current time and day.
 */

import { DateTime } from 'luxon';
import type { ScheduleConfig, ScheduleRule, DayOfWeek } from '../config/types.js';
import { logger } from '../utils/logger.js';

export interface ScheduleMatch {
  rule: ScheduleRule | null;
  /** The playlist URI to play (rule match or fallback) */
  playlistUri: string;
  /** Whether this is the fallback playlist */
  isFallback: boolean;
  /** Current local time as string */
  localTime: string;
  /** Current day of week */
  dayOfWeek: DayOfWeek;
}

/**
 * Parse "HH:mm" into total minutes since midnight.
 */
function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Evaluate the schedule and return the best matching rule.
 */
export function evaluateSchedule(config: ScheduleConfig): ScheduleMatch {
  const now = DateTime.now().setZone(config.timezone);
  const dayOfWeek = (now.weekday % 7) as DayOfWeek; // Luxon: 1=Mon..7=Sun -> we want 0=Sun
  const currentMinutes = now.hour * 60 + now.minute;
  const localTime = now.toFormat('HH:mm:ss');

  logger.debug(`Evaluating schedule: ${localTime} day=${dayOfWeek} (${now.weekdayLong})`);

  // Find all matching enabled rules
  const matches: ScheduleRule[] = [];

  for (const rule of config.rules) {
    if (!rule.enabled) continue;
    if (!rule.days.includes(dayOfWeek)) continue;

    const startMin = parseTimeToMinutes(rule.startTime);
    const endMin = parseTimeToMinutes(rule.endTime);

    // Handle same-day ranges (start < end)
    if (startMin < endMin) {
      if (currentMinutes >= startMin && currentMinutes < endMin) {
        matches.push(rule);
      }
    } else {
      // Handle overnight ranges (e.g., 22:00 - 02:00)
      if (currentMinutes >= startMin || currentMinutes < endMin) {
        matches.push(rule);
      }
    }
  }

  if (matches.length === 0) {
    logger.info(`No matching rule at ${localTime} — using fallback playlist`);
    return {
      rule: null,
      playlistUri: config.fallbackPlaylistUri,
      isFallback: true,
      localTime,
      dayOfWeek,
    };
  }

  // Sort by priority descending, take highest
  matches.sort((a, b) => b.priority - a.priority);
  const winner = matches[0];

  logger.info(
    `Matched rule: "${winner.id}" (${winner.mood}) priority=${winner.priority} at ${localTime}`
  );

  return {
    rule: winner,
    playlistUri: winner.playlistUri,
    isFallback: false,
    localTime,
    dayOfWeek,
  };
}
