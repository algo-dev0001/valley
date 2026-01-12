import dotenv from 'dotenv';
import { createApp } from './app';
import { initDB, closeDB } from './db';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3000;

/**
 * Start the server
 */
async function start() {
  try {
    // Initialize database connection
    initDB();
    console.log('Database initialized');

    // Create Express app
    const app = createApp();

    // Start listening
    const server = app.listen(PORT, () => {
      console.log(`
🚀 Server running on port ${PORT}
📍 Health check: http://localhost:${PORT}/health
📍 API endpoint: http://localhost:${PORT}/api/generate-sequence
      `);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      console.log(`\n${signal} received. Closing server gracefully...`);
      
      server.close(async () => {
        console.log('HTTP server closed');
        await closeDB();
        process.exit(0);
      });

      // Force exit after 10 seconds
      setTimeout(() => {
        console.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
start();
