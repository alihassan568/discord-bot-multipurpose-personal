// Main entry point that starts both bot and dashboard
import { config } from './config';
import { createLogger } from './utils/logger';
import { bot } from './index';

const logger = createLogger();

async function startApplication() {
    try {
        logger.info('Starting Discord Bot Application...');

        // Initialize the bot
        await bot.initialize();

        // Start dashboard if enabled
        if (config.features.dashboard) {
            logger.info('Starting dashboard server...');
            const { startDashboard } = await import('./dashboard');
            await startDashboard(bot.client);
        }

        logger.info('Application started successfully!');

    } catch (error) {
        logger.error('Failed to start application:', error);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    logger.info('Received SIGINT, shutting down gracefully...');
    await bot.shutdown();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM, shutting down gracefully...');
    await bot.shutdown();
    process.exit(0);
});

startApplication();
