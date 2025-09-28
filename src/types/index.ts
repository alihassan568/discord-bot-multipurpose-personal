import {
    Client,
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    PermissionResolvable,
    Guild,
    GuildMember,
} from 'discord.js';

export interface BotClient extends Client {
    commands: Map<string, Command>;
    config: BotConfig;
    logger: Logger;
    db: any; // Prisma client type
    redis: any; // Redis client type
    rateLimiter: any; // RateLimiter type
}

export interface category {
    name: string;
    value: string;
    inline: boolean;
}

export interface Command {
    data: any; // SlashCommandBuilder or any of its variants
    permissions?: PermissionResolvable[];
    ownerOnly?: boolean;
    guildOnly?: boolean;
    cooldown?: number;
    execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

export interface Event {
    name: string;
    once?: boolean;
    execute: (...args: any[]) => void | Promise<void>;
}

export interface BotConfig {
    token: string;
    clientId: string;
    clientSecret: string;
    defaultPrefix: string;
    ownerIds: string[];
    database: {
        url: string;
    };
    redis: {
        url: string;
        password?: string | undefined;
    };
    dashboard: {
        port: number;
        sessionSecret: string;
        jwtSecret: string;
        url: string;
    };
    features: {
        music: boolean;
        tickets: boolean;
        moderation: boolean;
        dashboard: boolean;
        antiNuke: boolean;
    };
    antiNuke: {
        enabled: boolean;
        detectionWindow: number;
        thresholds: {
            bans: number;
            roleDeletes: number;
            channelDeletes: number;
        };
    };
}

export interface GuildSettings {
    id: string;
    prefix: string;
    moderation: {
        enabled: boolean;
        logChannelId?: string;
        muteRoleId?: string;
        automodEnabled: boolean;
    };
    tickets: {
        enabled: boolean;
        categoryId?: string;
        staffRoleIds: string[];
        transcriptChannelId?: string;
    };
    music: {
        enabled: boolean;
        maxQueueSize: number;
        maxTrackLength: number;
        djRoleIds: string[];
    };
    antiNuke: {
        enabled: boolean;
        whitelistedUserIds: string[];
        thresholds: {
            bans: number;
            roleDeletes: number;
            channelDeletes: number;
            permissionGrants: number;
        };
        actions: {
            revertActions: boolean;
            removePermissions: boolean;
            banOffender: boolean;
            notifyOwner: boolean;
        };
    };
    vanity: {
        protected: boolean;
        alertChannelId?: string;
        autoBanEnabled: boolean;
    };
}

export interface ModerationLogData {
    guildId: string;
    action: string;
    targetId: string;
    moderatorId: string;
    reason?: string;
    duration?: number;
    evidence?: string[];
    metadata?: Record<string, any>;
}

export interface TicketData {
    id: string;
    guildId: string;
    userId: string;
    channelId?: string;
    threadId?: string;
    category?: string;
    subject: string;
    status: 'OPEN' | 'PENDING' | 'RESOLVED' | 'CLOSED' | 'ARCHIVED';
    staffIds: string[];
    transcriptUrl?: string;
    metadata: Record<string, any>;
}

export interface AntiNukeEvent {
    type: 'ban' | 'role_delete' | 'channel_delete' | 'permission_grant';
    guildId: string;
    actorId: string;
    targetId?: string;
    timestamp: Date;
    metadata?: Record<string, any>;
}

export interface RoleSnapshotData {
    roles: Array<{
        id: string;
        name: string;
        color: number;
        permissions: string;
        position: number;
        mentionable: boolean;
        hoisted: boolean;
    }>;
    channels: Array<{
        id: string;
        name: string;
        type: number;
        position: number;
        parentId?: string;
        permissionOverwrites: Array<{
            id: string;
            type: number;
            allow: string;
            deny: string;
        }>;
    }>;
}

export interface MusicTrack {
    title: string;
    artist: string;
    url: string;
    duration: number;
    thumbnail?: string;
    requestedBy: string;
    source: 'youtube' | 'spotify' | 'soundcloud' | 'file';
}

export interface UserProfileData {
    guildId: string;
    userId: string;
    messageCount: number;
    voiceMinutes: number;
    xp: number;
    level: number;
    bio?: string;
    badges: string[];
    lastSeen: Date;
    optOut: boolean;
}

export interface Logger {
    info: (message: string, meta?: any) => void;
    warn: (message: string, meta?: any) => void;
    error: (message: string, meta?: any) => void;
    debug: (message: string, meta?: any) => void;
}

export interface RateLimitConfig {
    windowMs: number;
    max: number;
    message?: string;
    skipSuccessfulRequests?: boolean;
}

export interface APIResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

export enum ModerationAction {
    BAN = 'BAN',
    UNBAN = 'UNBAN',
    KICK = 'KICK',
    MUTE = 'MUTE',
    UNMUTE = 'UNMUTE',
    TIMEOUT = 'TIMEOUT',
    UNTIMEOUT = 'UNTIMEOUT',
    WARN = 'WARN',
    NOTE = 'NOTE',
    ROLE_ADD = 'ROLE_ADD',
    ROLE_REMOVE = 'ROLE_REMOVE',
    NICKNAME_CHANGE = 'NICKNAME_CHANGE',
    PURGE = 'PURGE',
}