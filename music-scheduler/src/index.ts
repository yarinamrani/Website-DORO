/**
 * DORO Music Scheduler — Main Entry Point
 *
 * ⚠️  PRIVATE / INTERNAL USE ONLY — NOT FOR COMMERCIAL PUBLIC PLAYBACK
 *     Spotify personal accounts are NOT licensed for restaurant use.
 *     For production business use, see README for compliant alternatives.
 *
 * This agent:
 * 1. Loads schedule config from schedule.json
 * 2. Starts a health/control HTTP server
 * 3. Runs a poll loop every N seconds
 * 4. Each tick: evaluates schedule -> checks playback -> switches if needed
 * 5. Logs every decision
 */

import { loadScheduleConfig } from './config/loader.js';
import { PlaybackController } from './scheduler/controller.js';
import { createServer } from './server/health.js';
import { logger } from './utils/logger.js';

// Load .env file
import 'dotenv/config';

const BANNER = `
╔═══════════════════════════════════════════════════════════╗
║           DORO Music Scheduler Agent v1.0.0              ║
║                                                          ║
║   ⚠️  PRIVATE / INTERNAL USE ONLY                        ║
║   NOT licensed for commercial public playback.           ║
╚═══════════════════════════════════════════════════════════╝
`;

async function main(): Promise<void> {
  console.log(BANNER);

  // Load config
  const config = loadScheduleConfig();
  logger.info('Schedule config loaded', {
    timezone: config.timezone,
    rules: config.rules.length,
    dryRun: config.dryRun,
    pollInterval: config.pollIntervalSeconds,
  });

  if (config.dryRun) {
    logger.warn('*** DRY RUN MODE — no playback changes will be made ***');
  }

  // Initialize controller
  const controller = new PlaybackController(config);
  logger.info('Playback controller initialized');

  // Start HTTP server
  const port = parseInt(process.env.PORT || '8888', 10);
  const app = createServer(controller, config);
  app.listen(port, () => {
    logger.info(`Health/control server running on http://localhost:${port}`);
    logger.info(`  GET  /health    — agent health`);
    logger.info(`  GET  /state     — full state`);
    logger.info(`  GET  /schedule  — view schedule`);
    logger.info(`  GET  /next      — preview current match`);
    logger.info(`  POST /override  — set manual override`);
    logger.info(`  DELETE /override — clear override`);
  });

  // Agent loop
  const intervalMs = config.pollIntervalSeconds * 1000;
  logger.info(`Starting agent loop (every ${config.pollIntervalSeconds}s)...`);

  // Run first tick immediately
  await runTick(controller);

  // Then schedule recurring ticks
  setInterval(async () => {
    await runTick(controller);
  }, intervalMs);

  // Graceful shutdown
  const shutdown = () => {
    logger.info('Shutting down gracefully...');
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

async function runTick(controller: PlaybackController): Promise<void> {
  try {
    const decision = await controller.tick();

    // Log decision at appropriate level
    if (decision.action === 'error') {
      logger.error('Agent decision', { decision });
    } else if (decision.action !== 'none') {
      logger.info('Agent decision', {
        action: decision.action,
        reason: decision.reason,
        rule: decision.matchedRule?.id ?? 'none',
        playlist: decision.targetPlaylistUri,
        device: decision.currentDevice?.name ?? 'none',
        dryRun: decision.dryRun,
      });
    } else {
      logger.debug('Agent decision: no action needed', {
        rule: decision.matchedRule?.id ?? 'fallback',
        localTime: decision.localTime,
      });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`Unhandled tick error: ${msg}`);
  }
}

main().catch((err) => {
  logger.error('Fatal error', { error: err });
  console.error(err);
  process.exit(1);
});
