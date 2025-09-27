import { ChatInputCommandInteraction } from 'discord.js';
import { BotClient, RateLimitConfig } from '../types';

interface RateLimitStore {
    [key: string]: {
        count: number;
        resetTime: number;
    };
}

class RateLimiter {
    private store: RateLimitStore = {};
    private client: BotClient;

    constructor(client: BotClient) {
        this.client = client;

        // Clean up expired entries every minute
        setInterval(() => {
            this.cleanup();
        }, 60000);
    }

    /**
     * Check if a user/guild is rate limited
     */
    async isRateLimited(
        interaction: ChatInputCommandInteraction,
        config: RateLimitConfig,
        scope: 'user' | 'guild' = 'user'
    ): Promise<{ limited: boolean; resetTime?: number }> {
        const key = this.getKey(interaction, scope);
        const now = Date.now();

        // Try to get from Redis first for persistence across restarts
        try {
            const redisKey = `ratelimit:${key}`;
            const data = await this.client.redis.get(redisKey);

            if (data) {
                const { count, resetTime } = JSON.parse(data);

                if (now < resetTime) {
                    if (count >= config.max) {
                        return { limited: true, resetTime };
                    }

                    // Increment count
                    const newCount = count + 1;
                    await this.client.redis.setEx(
                        redisKey,
                        Math.ceil((resetTime - now) / 1000),
                        JSON.stringify({ count: newCount, resetTime })
                    );

                    if (newCount >= config.max) {
                        return { limited: true, resetTime };
                    }
                } else {
                    // Reset window
                    const newResetTime = now + config.windowMs;
                    await this.client.redis.setEx(
                        redisKey,
                        Math.ceil(config.windowMs / 1000),
                        JSON.stringify({ count: 1, resetTime: newResetTime })
                    );
                }
            } else {
                // First request
                const resetTime = now + config.windowMs;
                await this.client.redis.setEx(
                    redisKey,
                    Math.ceil(config.windowMs / 1000),
                    JSON.stringify({ count: 1, resetTime })
                );
            }
        } catch (error) {
            this.client.logger.warn('Redis rate limit check failed, falling back to memory:', error);

            // Fallback to memory storage
            return this.checkMemoryRateLimit(key, config, now);
        }

        return { limited: false };
    }

    /**
     * Memory-based rate limiting fallback
     */
    private checkMemoryRateLimit(
        key: string,
        config: RateLimitConfig,
        now: number
    ): { limited: boolean; resetTime?: number } {
        const entry = this.store[key];

        if (!entry || now >= entry.resetTime) {
            // Create new window
            this.store[key] = {
                count: 1,
                resetTime: now + config.windowMs,
            };
            return { limited: false };
        }

        // Check if limit exceeded
        if (entry.count >= config.max) {
            return { limited: true, resetTime: entry.resetTime };
        }

        // Increment count
        entry.count++;

        // Check if limit exceeded after increment
        if (entry.count >= config.max) {
            return { limited: true, resetTime: entry.resetTime };
        }

        return { limited: false };
    }

    /**
     * Generate rate limit key
     */
    private getKey(interaction: ChatInputCommandInteraction, scope: 'user' | 'guild'): string {
        const command = interaction.commandName;

        if (scope === 'guild' && interaction.guild) {
            return `${command}:guild:${interaction.guild.id}`;
        }

        return `${command}:user:${interaction.user.id}`;
    }

    /**
     * Clean up expired entries from memory store
     */
    private cleanup(): void {
        const now = Date.now();

        for (const key in this.store) {
            if (this.store[key]!.resetTime <= now) {
                delete this.store[key];
            }
        }
    }

    /**
     * Reset rate limit for a specific key
     */
    async resetRateLimit(interaction: ChatInputCommandInteraction, scope: 'user' | 'guild' = 'user'): Promise<void> {
        const key = this.getKey(interaction, scope);

        try {
            await this.client.redis.del(`ratelimit:${key}`);
        } catch (error) {
            this.client.logger.warn('Failed to reset Redis rate limit:', error);
        }

        delete this.store[key];
    }
}

/**
 * Default rate limit configurations for different command types
 */
export const defaultRateLimits: Record<string, RateLimitConfig> = {
    // Moderation commands - stricter limits
    moderation: {
        windowMs: 60 * 1000, // 1 minute
        max: 10, // 10 commands per minute
        message: 'You are using moderation commands too quickly. Please wait a moment.',
    },

    // Music commands - moderate limits
    music: {
        windowMs: 30 * 1000, // 30 seconds
        max: 15, // 15 commands per 30 seconds
        message: 'You are using music commands too quickly. Please wait a moment.',
    },

    // Fun commands - lenient limits
    fun: {
        windowMs: 30 * 1000, // 30 seconds
        max: 20, // 20 commands per 30 seconds
        message: 'You are using fun commands too quickly. Please wait a moment.',
    },

    // Utility commands - very lenient
    utility: {
        windowMs: 15 * 1000, // 15 seconds
        max: 30, // 30 commands per 15 seconds
        message: 'You are using utility commands too quickly. Please wait a moment.',
    },

    // General commands
    general: {
        windowMs: 10 * 1000, // 10 seconds
        max: 20, // 20 commands per 10 seconds
        message: 'You are using commands too quickly. Please wait a moment.',
    },
};

export { RateLimiter };