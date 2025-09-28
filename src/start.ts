// Main entry point that starts both bot and dashboard
import { config } from './config';
import { createLogger } from './utils/logger';

const logger = createLogger();

async function startApplication() {
    try {
        logger.info('Starting Discord Bot Application...');
        
        // Start dashboard if enabled
        if (config.features.dashboard) {
            logger.info('Starting dashboard server...');
            const { startDashboard } = await import('./dashboard');
            await startDashboard();
        }
        
        // Start Discord bot only if credentials are available
        if (config.token && config.token !== 'missing_token' && config.clientId && config.clientId !== 'missing_client_id') {
            logger.info('Starting Discord bot...');
            const DiscordBotModule = await import('./index');
            const DiscordBot = (DiscordBotModule as any).default || DiscordBotModule;
            const bot = new DiscordBot();
            await bot.initialize();
        } else {
            logger.warn('⚠️  Discord credentials not provided. Bot functionality disabled.');
            logger.info('🌐 Dashboard is running in standalone mode.');
            logger.info('📋 To enable bot functionality, add DISCORD_TOKEN and DISCORD_CLIENT_ID environment variables.');
        }
        
        logger.info('Application started successfully!');
        
    } catch (error) {
        logger.error('Failed to start application:', error);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    logger.info('Received SIGINT, shutting down gracefully...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    logger.info('Received SIGTERM, shutting down gracefully...');
    process.exit(0);
});

startApplication();