import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    EmbedBuilder
} from 'discord.js';
import { Command, BotClient } from '../../types';

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Check bot latency and API response time'),

    async execute(interaction: ChatInputCommandInteraction) {
        const client = interaction.client as BotClient;

        // Record the time when the command was executed
        const commandStart = Date.now();

        // Send initial reply to measure interaction latency
        await interaction.reply({
            content: '🏓 Pinging...',
            ephemeral: false,
        });

        // Calculate interaction latency (time to send initial reply)
        const interactionLatency = Date.now() - commandStart;

        // Get WebSocket heartbeat ping
        const wsLatency = client.ws.ping;

        // Calculate edit latency
        const editStart = Date.now();

        // Determine latency status and colors
        function getLatencyStatus(latency: number): { status: string; color: number; emoji: string } {
            if (latency < 100) {
                return { status: 'Excellent', color: 0x00ff00, emoji: '🟢' };
            } else if (latency < 200) {
                return { status: 'Good', color: 0x99ff00, emoji: '🟡' };
            } else if (latency < 300) {
                return { status: 'Fair', color: 0xffaa00, emoji: '🟠' };
            } else if (latency < 500) {
                return { status: 'Poor', color: 0xff6600, emoji: '🔴' };
            } else {
                return { status: 'Very Poor', color: 0xff0000, emoji: '⚫' };
            }
        }

        const wsStatus = getLatencyStatus(wsLatency);
        const interactionStatus = getLatencyStatus(interactionLatency);

        const embed = new EmbedBuilder()
            .setTitle('🏓 Pong!')
            .setColor(Math.min(wsStatus.color, interactionStatus.color)) // Use worse color
            .addFields(
                {
                    name: '📡 WebSocket Latency',
                    value: `${wsStatus.emoji} ${wsLatency}ms (${wsStatus.status})`,
                    inline: true,
                },
                {
                    name: '⚡ Interaction Latency',
                    value: `${interactionStatus.emoji} ${interactionLatency}ms (${interactionStatus.status})`,
                    inline: true,
                },
                {
                    name: '🕐 Uptime',
                    value: `<t:${Math.floor((Date.now() - (client.uptime || 0)) / 1000)}:R>`,
                    inline: true,
                }
            )
            .setFooter({
                text: `Requested by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL(),
            })
            .setTimestamp();

        // Add additional info
        const editLatency = Date.now() - editStart;
        embed.addFields({
            name: '🔄 Edit Latency',
            value: `${getLatencyStatus(editLatency).emoji} ${editLatency}ms`,
            inline: true,
        });

        // Add shard info if sharded
        if (client.shard) {
            embed.addFields({
                name: '🌐 Shard Info',
                value: `Shard ${client.shard.ids[0]} of ${client.shard.count}`,
                inline: true,
            });
        }

        // Add server count if available
        if (client.guilds.cache.size > 0) {
            embed.addFields({
                name: '🏘️ Servers',
                value: client.guilds.cache.size.toString(),
                inline: true,
            });
        }

        // Add memory usage
        const memUsage = process.memoryUsage();
        const memUsageEmbed = `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`;

        embed.addFields({
            name: '💾 Memory Usage',
            value: memUsageEmbed,
            inline: true,
        });

        // Add Node.js version
        embed.addFields({
            name: '⚙️ Node.js Version',
            value: process.version,
            inline: true,
        });

        // Add overall status based on worst latency
        const overallLatency = Math.max(wsLatency, interactionLatency);
        const overallStatus = getLatencyStatus(overallLatency);

        embed.setDescription(`Overall Status: ${overallStatus.emoji} **${overallStatus.status}**`);

        await interaction.editReply({
            content: null,
            embeds: [embed]
        });

        client.logger.info(`Ping command executed by ${interaction.user.tag}`, {
            guildId: interaction.guildId,
            userId: interaction.user.id,
            wsLatency,
            interactionLatency,
            editLatency,
        });
    },
};

export default command;