import { Events, GuildMember, TextChannel } from 'discord.js';
import { Event, BotClient } from '../types';

const event: Event = {
    name: Events.GuildMemberAdd,
    async execute(member: GuildMember) {
        const client = member.client as BotClient;

        try {
            const guildConfig = await client.db.guild.findUnique({
                where: { id: member.guild.id },
            });

            if (guildConfig?.welcomeEnabled && guildConfig.welcomeChannelId) {
                const channel = member.guild.channels.cache.get(guildConfig.welcomeChannelId) as TextChannel;

                if (channel) {
                    let message = guildConfig.welcomeMessage || "Welcome {user} to {server}! We're glad to have you.";
                    message = message.replace('{user}', member.toString());
                    message = message.replace('{server}', member.guild.name);

                    await channel.send(message);
                }
            }
        } catch (error) {
            client.logger.error('Error in guildMemberAdd event:', error);
        }
    },
};

export default event;
