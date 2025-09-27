import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    EmbedBuilder,
    version as djsVersion
} from 'discord.js';
import { Command, BotClient } from '../../types';
import os from 'os';

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('Display detailed bot statistics and system information'),

    async execute(interaction: ChatInputCommandInteraction) {
        const client = interaction.client as BotClient;

        await interaction.deferReply();

        try {
            // Calculate uptime
            const uptime = client.uptime || 0;
            const uptimeSeconds = Math.floor(uptime / 1000);
            const days = Math.floor(uptimeSeconds / 86400);
            const hours = Math.floor((uptimeSeconds % 86400) / 3600);
            const minutes = Math.floor((uptimeSeconds % 3600) / 60);
            const seconds = uptimeSeconds % 60;

            const uptimeString =
                days > 0 ? `${days}d ${hours}h ${minutes}m ${seconds}s` :
                    hours > 0 ? `${hours}h ${minutes}m ${seconds}s` :
                        minutes > 0 ? `${minutes}m ${seconds}s` :
                            `${seconds}s`;

            // Memory usage
            const memUsage = process.memoryUsage();
            const memUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
            const memTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);

            // System memory
            const totalMemGB = Math.round(os.totalmem() / 1024 / 1024 / 1024);
            const freeMemGB = Math.round(os.freemem() / 1024 / 1024 / 1024);
            const usedMemGB = totalMemGB - freeMemGB;

            // CPU info
            const cpuInfo = os.cpus();
            const cpuModel = cpuInfo[0]?.model || 'Unknown';
            const cpuCores = cpuInfo.length;

            // Calculate CPU usage (basic)
            const loadAverage = os.loadavg()[0] || 0;
            const cpuUsage = Math.min(100, Math.round((loadAverage / cpuCores) * 100));

            // Discord.js and Node.js versions
            const nodeVersion = process.version;
            const platform = os.platform();
            const arch = os.arch();

            // Bot statistics
            const guilds = client.guilds.cache.size;
            const channels = client.channels.cache.size;
            const users = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);

            // WebSocket latency
            const wsLatency = client.ws.ping;

            const embed = new EmbedBuilder()
                .setTitle('📊 Bot Statistics')
                .setColor(0x00aaff)
                .setThumbnail(client.user?.displayAvatarURL() || null)
                .addFields(
                    {
                        name: '🤖 Bot Information',
                        value: [
                            `**Name:** ${client.user?.username || 'Unknown'}`,
                            `**ID:** \`${client.user?.id || 'Unknown'}\``,
                            `**Created:** <t:${Math.floor((client.user?.createdTimestamp || Date.now()) / 1000)}:R>`,
                            `**Uptime:** ${uptimeString}`,
                            `**Latency:** ${wsLatency}ms`
                        ].join('\n'),
                        inline: true,
                    },
                    {
                        name: '📈 Usage Statistics',
                        value: [
                            `**Servers:** ${guilds.toLocaleString()}`,
                            `**Channels:** ${channels.toLocaleString()}`,
                            `**Users:** ${users.toLocaleString()}`,
                            `**Commands:** ${client.commands?.size || 0}`,
                            client.shard ? `**Shard:** ${client.shard.ids[0]} of ${client.shard.count}` : '**Shards:** 1'
                        ].join('\n'),
                        inline: true,
                    },
                    {
                        name: '💻 System Information',
                        value: [
                            `**OS:** ${platform} ${arch}`,
                            `**Node.js:** ${nodeVersion}`,
                            `**Discord.js:** v${djsVersion}`,
                            `**CPU:** ${cpuCores} cores`,
                            `**CPU Usage:** ${cpuUsage}%`
                        ].join('\n'),
                        inline: false,
                    },
                    {
                        name: '🧠 Memory Usage',
                        value: [
                            `**Bot Heap:** ${memUsedMB}MB / ${memTotalMB}MB`,
                            `**System:** ${usedMemGB}GB / ${totalMemGB}GB used`,
                            `**Free:** ${freeMemGB}GB available`,
                            `**Usage:** ${Math.round((usedMemGB / totalMemGB) * 100)}%`
                        ].join('\n'),
                        inline: true,
                    },
                    {
                        name: '⚡ Performance',
                        value: [
                            `**WebSocket:** ${wsLatency}ms`,
                            `**CPU Model:** ${cpuModel.substring(0, 30)}${cpuModel.length > 30 ? '...' : ''}`,
                            `**Load Average:** ${loadAverage.toFixed(2)}`,
                            `**Memory RSS:** ${Math.round(memUsage.rss / 1024 / 1024)}MB`,
                            `**External:** ${Math.round(memUsage.external / 1024 / 1024)}MB`
                        ].join('\n'),
                        inline: true,
                    }
                )
                .setFooter({
                    text: `Requested by ${interaction.user.tag} • Last reboot`,
                    iconURL: interaction.user.displayAvatarURL(),
                })
                .setTimestamp(new Date(Date.now() - uptime));

            // Add additional system info if available
            const hostname = os.hostname();
            if (hostname) {
                embed.addFields({
                    name: '🌐 System Details',
                    value: [
                        `**Hostname:** ${hostname}`,
                        `**Platform:** ${os.type()} ${os.release()}`,
                        `**Architecture:** ${arch}`,
                        `**Endianness:** ${os.endianness()}`,
                        `**Home Directory:** ${os.homedir()}`
                    ].join('\n'),
                    inline: false,
                });
            }

            // Add process info
            embed.addFields({
                name: '⚙️ Process Information',
                value: [
                    `**PID:** ${process.pid}`,
                    `**Arguments:** ${process.argv.length}`,
                    `**Working Directory:** ${process.cwd()}`,
                    `**User:** ${os.userInfo().username}`,
                    `**TTY:** ${process.stdout.isTTY ? 'Yes' : 'No'}`
                ].join('\n'),
                inline: false,
            });

            await interaction.editReply({ embeds: [embed] });

            client.logger.info(`Stats command executed by ${interaction.user.tag}`, {
                guildId: interaction.guildId,
                userId: interaction.user.id,
                botStats: {
                    guilds,
                    channels,
                    users,
                    uptime: uptimeString,
                    memory: memUsedMB,
                    latency: wsLatency,
                },
            });

        } catch (error) {
            client.logger.error('Error in stats command', {
                error: error instanceof Error ? error.message : 'Unknown error',
                guildId: interaction.guildId,
                userId: interaction.user.id,
            });

            await interaction.editReply({
                content: '❌ An error occurred while fetching bot statistics. Please try again later!',
            });
        }
    },
};

export default command;