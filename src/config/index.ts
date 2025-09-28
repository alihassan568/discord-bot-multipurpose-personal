import dotenv from 'dotenv';
import { BotConfig } from '../types';

// Load environment variables
dotenv.config();

const requiredEnvVars = [
    'DISCORD_TOKEN',
    'DISCORD_CLIENT_ID',
];

// Check required env vars but allow graceful degradation
const missingVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
if (missingVars.length > 0) {
    console.warn(`⚠️  Missing environment variables: ${missingVars.join(', ')}`);
    console.warn('📋 The bot will start in dashboard-only mode. Please add Discord credentials to enable full functionality.');
}

export const config: BotConfig = {
    token: process.env.DISCORD_TOKEN || 'missing_token',
    clientId: process.env.DISCORD_CLIENT_ID || 'missing_client_id',
    clientSecret: process.env.DISCORD_CLIENT_SECRET!,
    defaultPrefix: process.env.DEFAULT_PREFIX || '!',
    ownerIds: process.env.OWNER_IDS?.split(',') || [],

    database: {
        url: process.env.DATABASE_URL || 'file:./dev.db',
    },

    redis: {
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        password: process.env.REDIS_PASSWORD,
    },

    dashboard: {
        port: parseInt(process.env.PORT || '5000'),
        sessionSecret: process.env.SESSION_SECRET || 'dev_session_secret_change_in_production',
        jwtSecret: process.env.JWT_SECRET || 'dev_jwt_secret_change_in_production',
        url: process.env.DASHBOARD_URL || 'http://localhost:5000',
    },

    features: {
        music: process.env.MUSIC_ENABLED === 'true',
        tickets: process.env.TICKETS_ENABLED !== 'false',
        moderation: process.env.MODERATION_ENABLED !== 'false',
        dashboard: process.env.DASHBOARD_ENABLED !== 'false', // Default to true
        antiNuke: process.env.ANTI_NUKE_ENABLED !== 'false',
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