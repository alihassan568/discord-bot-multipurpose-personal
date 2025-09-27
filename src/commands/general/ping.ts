import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Command, BotClient } from '../../types';

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Check bot latency and response time'),

    async execute(interaction: ChatInputCommandInteraction) {
        const client = interaction.client as BotClient;
        const sent = await interaction.deferReply({ fetchReply: true });

        const embed = new EmbedBuilder()
            .setTitle('🏓 Pong!')
            .setColor(0x00ff00)
            .addFields([
                {
                    name: '📊 Latency',
                    value: `${sent.createdTimestamp - interaction.createdTimestamp}ms`,
                    inline: true,
                },
                {
                    name: '💓 Heartbeat',
                    value: `${Math.round(client.ws.ping)}ms`,
                    inline: true,
                },
                {
                    name: '🔄 Uptime',
                    value: formatUptime(client.uptime || 0),
                    inline: true,
                },
            ])
            .setTimestamp()
            .setFooter({
                text: `Requested by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL(),
            });

        await interaction.editReply({ embeds: [embed] });
    },
};

function formatUptime(uptime: number): string {
    const seconds = Math.floor((uptime / 1000) % 60);
    const minutes = Math.floor((uptime / (1000 * 60)) % 60);
    const hours = Math.floor((uptime / (1000 * 60 * 60)) % 24);
    const days = Math.floor(uptime / (1000 * 60 * 60 * 24));

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0) parts.push(`${seconds}s`);

    return parts.length > 0 ? parts.join(' ') : '0s';
}

export default command;