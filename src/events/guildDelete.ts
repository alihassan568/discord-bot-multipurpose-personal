import { Events, Guild } from 'discord.js';
import { Event, BotClient } from '../types';

const event: Event = {
    name: Events.GuildDelete,
    execute: async (guild: Guild) => {
        const client = guild.client as BotClient;

        try {
            // Keep guild data for potential re-invite but mark as inactive
            await client.db.guild.update({
                where: { id: guild.id },
                data: {
                    settings: {
                        ...((await client.db.guild.findUnique({ where: { id: guild.id } }))?.settings as object || {}),
                        inactive: true,
                        leftAt: new Date().toISOString(),
                    },
                },
            });

            client.logger.info(`Left guild: ${guild.name} (${guild.id})`);
        } catch (error) {
            client.logger.error(`Error handling guild leave for ${guild.name}:`, error);
        }
    },
};

export default event;