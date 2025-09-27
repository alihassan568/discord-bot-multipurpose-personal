import { Events, Guild } from 'discord.js';
import { Event, BotClient } from '../types';

const event: Event = {
    name: Events.GuildCreate,
    execute: async (guild: Guild) => {
        const client = guild.client as BotClient;

        try {
            // Add guild to database
            await client.db.guild.upsert({
                where: { id: guild.id },
                update: { name: guild.name },
                create: {
                    id: guild.id,
                    name: guild.name,
                    settings: {},
                    antiNukeSettings: {},
                },
            });

            client.logger.info(`Joined new guild: ${guild.name} (${guild.id})`);

            // Send welcome message to system channel if available
            if (guild.systemChannel) {
                try {
                    await guild.systemChannel.send({
                        embeds: [
                            {
                                title: '👋 Thanks for adding me!',
                                description: `Hello! I'm a multipurpose Discord bot with moderation, music, tickets, and more!\n\n**Getting Started:**\n• Use \`/help\` to see all available commands\n• Use \`/setup\` to configure server settings\n• Join our [support server](https://discord.gg/your-invite) for help\n\n**Key Features:**\n🛡️ Advanced moderation & anti-nuke\n🎵 Music player with queue\n🎫 Support ticket system\n📊 User profiles & stats\n🎉 Fun commands & more!`,
                                color: 0x5865f2,
                                timestamp: new Date().toISOString(),
                                footer: {
                                    text: 'Use /help for a list of commands',
                                },
                            },
                        ],
                    });
                } catch (error) {
                    client.logger.warn(`Could not send welcome message to ${guild.name}:`, error);
                }
            }
        } catch (error) {
            client.logger.error(`Error handling guild join for ${guild.name}:`, error);
        }
    },
};

export default event;