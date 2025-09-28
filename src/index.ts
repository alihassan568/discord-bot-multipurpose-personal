import { Client, Collection, GatewayIntentBits, Partials } from 'discord.js';
import { PrismaClient } from '@prisma/client';
import { createClient } from 'redis';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';
import { config } from './config';
import { createLogger } from './utils/logger';
import { BotClient, Command, Event } from './types';
import { RateLimiter } from './middleware/rateLimiter';

class DiscordBot {
    public client: BotClient;
    private prisma: PrismaClient;
    private redis: any;

    constructor() {
        // Initialize Discord client with necessary intents
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.GuildMessageReactions,
                GatewayIntentBits.GuildVoiceStates,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.GuildBans,
                GatewayIntentBits.GuildInvites,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.DirectMessages,
            ],
            partials: [Partials.Message, Partials.Channel, Partials.Reaction],
        }) as BotClient;

        // Initialize database and cache
        this.prisma = new PrismaClient();
        this.redis = createClient({ url: config.redis.url });

        // Initialize bot properties
        this.client.commands = new Collection();
        this.client.config = config;
        this.client.logger = createLogger();
        this.client.db = this.prisma;
        this.client.redis = this.redis;
        this.client.rateLimiter = new RateLimiter(this.client);
    }

    async initialize(): Promise<void> {
        try {
            // Connect to databases
            await this.connectDatabase();
            await this.connectRedis();

            // Load commands and events
            await this.loadCommands();
            await this.loadEvents();

            // Start the bot
            await this.client.login(config.token);
        } catch (error) {
            this.client.logger.error('Failed to initialize bot:', error);
            process.exit(1);
        }
    }

    private async connectDatabase(): Promise<void> {
        try {
            await this.prisma.$connect();
            this.client.logger.info('Connected to PostgreSQL database');
        } catch (error) {
            this.client.logger.error('Failed to connect to database:', error);
            throw error;
        }
    }

    private async connectRedis(): Promise<void> {
        try {
            this.redis.on('error', (err: Error) => {
                this.client.logger.error('Redis Client Error:', err);
            });

            this.redis.on('connect', () => {
                this.client.logger.info('Connected to Redis');
            });

            await this.redis.connect();
        } catch (error) {
            this.client.logger.error('Failed to connect to Redis:', error);
            throw error;
        }
    }

    private async loadCommands(): Promise<void> {
        const commandsPath = join(__dirname, 'commands');

        if (!statSync(commandsPath).isDirectory()) {
            this.client.logger.warn('Commands directory not found');
            return;
        }

        const commandFolders = readdirSync(commandsPath).filter(folder =>
            statSync(join(commandsPath, folder)).isDirectory()
        );

        for (const folder of commandFolders) {
            const commandFiles = readdirSync(join(commandsPath, folder))
                .filter(file => file.endsWith('.js') || file.endsWith('.ts'));

            for (const file of commandFiles) {
                try {
                    const commandModule = await import(join(commandsPath, folder, file));
                    const command: Command = commandModule.default || commandModule;

                    if (command.data && typeof command.execute === 'function') {
                        this.client.commands.set(command.data.name, command);
                        this.client.logger.debug(`Loaded command: ${command.data.name}`);
                    } else {
                        this.client.logger.warn(`Command ${file} is missing required properties`);
                    }
                } catch (error) {
                    this.client.logger.error(`Failed to load command ${file}:`, error);
                }
            }
        }

        this.client.logger.info(`Loaded ${this.client.commands.size} commands`);
    }

    private async loadEvents(): Promise<void> {
        const eventsPath = join(__dirname, 'events');

        if (!statSync(eventsPath).isDirectory()) {
            this.client.logger.warn('Events directory not found');
            return;
        }

        const eventFiles = readdirSync(eventsPath)
            .filter(file => file.endsWith('.js') || file.endsWith('.ts'));

        for (const file of eventFiles) {
            try {
                const eventModule = await import(join(eventsPath, file));
                const event: Event = eventModule.default || eventModule;

                if (event.name && typeof event.execute === 'function') {
                    if (event.once) {
                        this.client.once(event.name, (...args) => event.execute(...args));
                    } else {
                        this.client.on(event.name, (...args) => event.execute(...args));
                    }

                    this.client.logger.debug(`Loaded event: ${event.name}`);
                } else {
                    this.client.logger.warn(`Event ${file} is missing required properties`);
                }
            } catch (error) {
                this.client.logger.error(`Failed to load event ${file}:`, error);
            }
        }
    }

    async shutdown(): Promise<void> {
        this.client.logger.info('Shutting down bot...');

        try {
            await this.prisma.$disconnect();
            await this.redis.quit();
            this.client.destroy();

            this.client.logger.info('Bot shutdown complete');
        } catch (error) {
            this.client.logger.error('Error during shutdown:', error);
        }
    }
}

// Initialize and start the bot
const bot = new DiscordBot();

// Handle graceful shutdown
process.on('SIGINT', async () => {
    await bot.shutdown();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await bot.shutdown();
    process.exit(0);
});

export { bot };