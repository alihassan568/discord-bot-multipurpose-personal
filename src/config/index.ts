import dotenv from 'dotenv';
import { BotConfig } from '../types';

// Load environment variables
dotenv.config();

const requiredEnvVars = [
    'DISCORD_TOKEN',
    'DISCORD_CLIENT_ID',
    'DATABASE_URL',
    'REDIS_URL',
    'SESSION_SECRET',
    'JWT_SECRET',
];

for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`);
    }
}

export const config: BotConfig = {
    token: process.env.DISCORD_TOKEN!,
    clientId: process.env.DISCORD_CLIENT_ID!,
    clientSecret: process.env.DISCORD_CLIENT_SECRET!,
    defaultPrefix: process.env.DEFAULT_PREFIX || '!',
    ownerIds: process.env.OWNER_IDS?.split(',') || [],

    database: {
        url: process.env.DATABASE_URL!,
    },

    redis: {
        url: process.env.REDIS_URL!,
        password: process.env.REDIS_PASSWORD,
    },

    dashboard: {
        port: parseInt(process.env.PORT || '3000'),
        sessionSecret: process.env.SESSION_SECRET!,
        jwtSecret: process.env.JWT_SECRET!,
        url: process.env.DASHBOARD_URL || 'http://localhost:3000',
    },

    features: {
        music: process.env.MUSIC_ENABLED === 'true',
        tickets: process.env.TICKETS_ENABLED === 'true',
        moderation: process.env.MODERATION_ENABLED === 'true',
        dashboard: process.env.DASHBOARD_ENABLED === 'true',
        antiNuke: process.env.ANTI_NUKE_ENABLED === 'true',
    },

    antiNuke: {
        enabled: process.env.ANTI_NUKE_ENABLED === 'true',
        detectionWindow: parseInt(process.env.ANTI_NUKE_DETECTION_WINDOW || '30'),
        thresholds: {
            bans: parseInt(process.env.ANTI_NUKE_BAN_THRESHOLD || '5'),
            roleDeletes: parseInt(process.env.ANTI_NUKE_ROLE_DELETE_THRESHOLD || '3'),
            channelDeletes: parseInt(process.env.ANTI_NUKE_CHANNEL_DELETE_THRESHOLD || '3'),
        },
    },
};