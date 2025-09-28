import { Events, Client, ActivityType } from 'discord.js';
import { Event, BotClient } from '../types';

const event: Event = {
    name: Events.ClientReady,
    once: true,
    execute: async (client: BotClient) => {
        client.logger.info(`Bot is ready! Logged in as ${client.user?.tag}`);

        // Set bot status
        client.user?.setPresence({
            activities: [
                {
                    name: 'your server | /help',
                    type: ActivityType.Watching,
                },
            ],
            status: 'online',
        });

        // Initialize guild count
        const guildCount = client.guilds.cache.size;
        client.logger.info(`Connected to ${guildCount} guild(s)`);

        // Sync guild data to database
        await syncGuilds(client);
    },
};

async function syncGuilds(client: BotClient): Promise<void> {
    try {
        const guilds = client.guilds.cache.map(guild => ({
            id: guild.id,
            name: guild.name,
        }));

        for (const guild of guilds) {
            await client.db.guild.upsert({
                where: { id: guild.id },
                update: { name: guild.name },
                create: {
                    id: guild.id,
                    name: guild.name,
                    settings: JSON.stringify({}),
                    antiNukeSettings: JSON.stringify({})
                },
            });
        }

        client.logger.info(`Synced ${guilds.length} guilds to database`);
    } catch (error) {
        client.logger.error('Failed to sync guilds:', error);
    }
}

export default event;