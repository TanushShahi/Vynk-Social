import app from './app.js';
import { ENV } from './config/env.js';
import { query, db } from './config/db.js';
import { runSeed } from './db/seed.js';

async function startServer() {
  try {
    // Check if database needs seeding
    const userCount = (query.get('SELECT COUNT(*) as count FROM users') as any)?.count || 0;
    if (userCount === 0) {
      console.log('Empty database detected. Running seed...');
      await runSeed();
    }

    const server = app.listen(ENV.PORT, () => {
      console.log(`===============================================`);
      console.log(`⚡ Vynk API Server Running on http://localhost:${ENV.PORT}`);
      console.log(`📡 Health Check: http://localhost:${ENV.PORT}/api/health`);
      console.log(`===============================================`);
    });

    // Graceful shutdown handlers for Docker & process supervisors
    const gracefulShutdown = (signal: string) => {
      console.log(`\n[${signal}] Initiating graceful shutdown...`);
      server.close(() => {
        console.log('HTTP server closed.');
        try {
          db.pragma('wal_checkpoint(TRUNCATE)');
          db.close();
          console.log('SQLite database safely checkpointed and closed.');
        } catch (dbErr) {
          console.error('Error closing database:', dbErr);
        }
        process.exit(0);
      });

      // Force exit if connections don't close within 10s
      setTimeout(() => {
        console.error('Forced shutdown after timeout.');
        process.exit(1);
      }, 10000).unref();
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
