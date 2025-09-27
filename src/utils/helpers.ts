import { PermissionFlagsBits, GuildMember, Role, User, Guild } from 'discord.js';
import { BotClient } from '../types';

/**
 * Check if a member can moderate another member based on role hierarchy
 */
export function canModerate(moderator: GuildMember, target: GuildMember): boolean {
    // Owner can always moderate
    if (moderator.guild.ownerId === moderator.id) return true;

    // Cannot moderate yourself
    if (moderator.id === target.id) return false;

    // Cannot moderate the owner
    if (target.guild.ownerId === target.id) return false;

    // Check role hierarchy
    return moderator.roles.highest.position > target.roles.highest.position;
}

/**
 * Check if the bot can moderate a member
 */
export function botCanModerate(bot: GuildMember, target: GuildMember): boolean {
    // Cannot moderate the owner
    if (target.guild.ownerId === target.id) return false;

    // Check role hierarchy
    return bot.roles.highest.position > target.roles.highest.position;
}

/**
 * Format a duration in milliseconds to human readable string
 */
export function formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000) % 60;
    const minutes = Math.floor(ms / (1000 * 60)) % 60;
    const hours = Math.floor(ms / (1000 * 60 * 60)) % 24;
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0) parts.push(`${seconds}s`);

    return parts.length > 0 ? parts.join(' ') : '0s';
}

/**
 * Parse a duration string (e.g., "1h30m") to milliseconds
 */
export function parseDuration(durationStr: string): number | null {
    const regex = /(\d+)([smhdw])/g;
    let totalMs = 0;
    let match;

    const multipliers = {
        s: 1000,
        m: 60 * 1000,
        h: 60 * 60 * 1000,
        d: 24 * 60 * 60 * 1000,
        w: 7 * 24 * 60 * 60 * 1000,
    };

    while ((match = regex.exec(durationStr)) !== null) {
        const [, amount, unit] = match;
        if (amount && unit) {
            const multiplier = multipliers[unit as keyof typeof multipliers];
            if (multiplier) {
                totalMs += parseInt(amount) * multiplier;
            }
        }
    }

    return totalMs > 0 ? totalMs : null;
}

/**
 * Format a timestamp to Discord's timestamp format
 */
export function formatTimestamp(date: Date, style: 't' | 'T' | 'd' | 'D' | 'f' | 'F' | 'R' = 'f'): string {
    return `<t:${Math.floor(date.getTime() / 1000)}:${style}>`;
}

/**
 * Truncate text to a maximum length with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
}

/**
 * Generate a random string for IDs
 */
export function generateId(length: number = 8): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * Get a user's display name (nickname or username)
 */
export function getDisplayName(member: GuildMember | User): string {
    if (member instanceof GuildMember) {
        return member.displayName;
    }
    return member.globalName || member.username;
}

/**
 * Check if a user has a specific permission in a guild
 */
export function hasPermission(member: GuildMember, permission: bigint): boolean {
    return member.permissions.has(permission);
}

/**
 * Get the highest role color for a member
 */
export function getMemberColor(member: GuildMember): number {
    const role = member.roles.color;
    return role ? role.color : 0x99aab5; // Default Discord color
}

/**
 * Validate a Discord snowflake ID
 */
export function isValidSnowflake(id: string): boolean {
    const snowflakeRegex = /^\d{17,19}$/;
    return snowflakeRegex.test(id);
}

/**
 * Clean and sanitize user input
 */
export function sanitizeInput(input: string): string {
    return input
        .replace(/[<>@#&]/g, '') // Remove Discord mentions and formatting
        .trim()
        .substring(0, 2000); // Discord's message limit
}

/**
 * Check if a string is a valid URL
 */
export function isValidUrl(string: string): boolean {
    try {
        new URL(string);
        return true;
    } catch {
        return false;
    }
}

/**
 * Get a random element from an array
 */
export function randomElement<T>(array: T[]): T {
    if (array.length === 0) {
        throw new Error('Array is empty');
    }
    return array[Math.floor(Math.random() * array.length)]!;
}

/**
 * Shuffle an array in place
 */
export function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = shuffled[i]!;
        shuffled[i] = shuffled[j]!;
        shuffled[j] = temp;
    }
    return shuffled;
}

/**
 * Chunk an array into smaller arrays
 */
export function chunkArray<T>(array: T[], size: number): T[][] {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}

/**
 * Escape Discord markdown
 */
export function escapeMarkdown(text: string): string {
    return text.replace(/[*_`~|\\]/g, '\\$&');
}

/**
 * Convert bytes to human readable format
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Get guild settings with defaults
 */
export async function getGuildSettings(client: BotClient, guildId: string): Promise<any> {
    try {
        const guild = await client.db.guild.findUnique({
            where: { id: guildId },
        });

        return guild?.settings || {};
    } catch (error) {
        client.logger.error('Failed to get guild settings:', error);
        return {};
    }
}

/**
 * Update guild settings
 */
export async function updateGuildSettings(client: BotClient, guildId: string, settings: any): Promise<void> {
    try {
        await client.db.guild.upsert({
            where: { id: guildId },
            update: { settings },
            create: {
                id: guildId,
                name: 'Unknown Guild',
                settings,
                antiNukeSettings: {},
            },
        });
    } catch (error) {
        client.logger.error('Failed to update guild settings:', error);
    }
}