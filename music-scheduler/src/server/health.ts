/**
 * Lightweight HTTP server for health checks and remote control.
 * Provides:
 * - GET /health — agent status
 * - GET /state — full agent state
 * - POST /override — set manual override
 * - DELETE /override — clear manual override
 * - GET /schedule — view current schedule config
 * - GET /next — preview what would play right now
 */

import express from 'express';
import { PlaybackController } from '../scheduler/controller.js';
import { evaluateSchedule } from '../scheduler/engine.js';
import type { ScheduleConfig } from '../config/types.js';
import { logger } from '../utils/logger.js';

export function createServer(
  controller: PlaybackController,
  config: ScheduleConfig
): express.Express {
  const app = express();
  app.use(express.json());

  app.get('/health', (_req, res) => {
    const state = controller.getState();
    res.json({
      status: 'ok',
      startedAt: state.startedAt,
      lastActionAt: state.lastActionAt,
      lastError: state.lastError,
      dryRun: config.dryRun,
      uptime: process.uptime(),
    });
  });

  app.get('/state', (_req, res) => {
    res.json(controller.getState());
  });

  app.get('/schedule', (_req, res) => {
    res.json({
      timezone: config.timezone,
      fallback: config.fallbackPlaylistUri,
      preferredDevice: config.preferredDeviceName,
      pollInterval: config.pollIntervalSeconds,
      dryRun: config.dryRun,
      rules: config.rules.map((r) => ({
        id: r.id,
        mood: r.mood,
        days: r.days,
        time: `${r.startTime}-${r.endTime}`,
        playlist: r.playlistUri,
        priority: r.priority,
        enabled: r.enabled,
      })),
    });
  });

  app.get('/next', (_req, res) => {
    const match = evaluateSchedule(config);
    res.json({
      localTime: match.localTime,
      dayOfWeek: match.dayOfWeek,
      matchedRule: match.rule
        ? { id: match.rule.id, mood: match.rule.mood }
        : null,
      playlistUri: match.playlistUri,
      isFallback: match.isFallback,
    });
  });

  app.post('/override', (req, res) => {
    const { playlistUri, durationMinutes, setBy } = req.body as {
      playlistUri?: string;
      durationMinutes?: number;
      setBy?: string;
    };

    if (!playlistUri) {
      res.status(400).json({ error: 'playlistUri is required' });
      return;
    }

    controller.setOverride(
      playlistUri,
      durationMinutes ?? null,
      setBy ?? 'api'
    );
    res.json({ status: 'override_set', state: controller.getState() });
  });

  app.delete('/override', (_req, res) => {
    controller.clearOverride();
    res.json({ status: 'override_cleared', state: controller.getState() });
  });

  // Error handler
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error('HTTP error', { error: err.message });
    res.status(500).json({ error: err.message });
  });

  return app;
}
