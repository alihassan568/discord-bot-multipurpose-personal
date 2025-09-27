import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    EmbedBuilder,
    PermissionFlagsBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType
} from 'discord.js';
import { BotClient } from '../../types';

const command = {
    data: new SlashCommandBuilder()
        .setName('vanity-claim-log')
        .setDescription('View logs of vanity URL claims, changes, and protection events')
        .addIntegerOption(option =>
            option
                .setName('limit')
                .setDescription('Number of log entries to show (1-25)')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(25)
        )
        .addStringOption(option =>
            option
                .setName('filter')
                .setDescription('Filter logs by event type')
                .setRequired(false)
                .addChoices(
                    { name: 'All Events', value: 'all' },
                    { name: 'Claims', value: 'claims' },
                    { name: 'Releases', value: 'releases' },
                    { name: 'Changes', value: 'changes' },
                    { name: 'Protection Events', value: 'protection' },
                    { name: 'Security Alerts', value: 'security' }
                )
        )
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('Filter logs by specific user')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .setDMPermission(false),

    async execute(interaction: ChatInputCommandInteraction) {
        const client = interaction.client as BotClient;

        try {
            const guild = interaction.guild;
            if (!guild) {
                return interaction.reply({
                    embeds: [{
                        color: 0xff0000,
                        description: '❌ This command can only be used in a server.',
                    }],
                    ephemeral: true,
                });
            }

            const limit = interaction.options.getInteger('limit') || 10;
            const filter = interaction.options.getString('filter') || 'all';
            const targetUser = interaction.options.getUser('user');

            await interaction.deferReply();

            // In a real implementation, this would fetch from database
            // For now, we'll simulate log entries
            const simulatedLogs = [
                {
                    id: 1,
                    timestamp: Date.now() - 86400000, // 1 day ago
                    type: 'claim',
                    user: interaction.user,
                    action: 'Vanity URL claimed',
                    details: 'discord.gg/awesome-server',
                    success: true,
                },
                {
                    id: 2,
                    timestamp: Date.now() - 172800000, // 2 days ago
                    type: 'protection',
                    user: interaction.user,
                    action: 'Protection enabled',
                    details: 'Automatic protection activated',
                    success: true,
                },
                {
                    id: 3,
                    timestamp: Date.now() - 259200000, // 3 days ago
                    type: 'change',
                    user: interaction.user,
                    action: 'Vanity URL modified',
                    details: 'Changed from discord.gg/old-name',
                    success: true,
                },
                {
                    id: 4,
                    timestamp: Date.now() - 345600000, // 4 days ago
                    type: 'security',
                    user: { tag: 'Unknown User', id: '000000000000000000' },
                    action: 'Unauthorized change attempt',
                    details: 'Blocked by protection system',
                    success: false,
                },
                {
                    id: 5,
                    timestamp: Date.now() - 432000000, // 5 days ago
                    type: 'release',
                    user: interaction.user,
                    action: 'Vanity URL released',
                    details: 'discord.gg/old-server-name',
                    success: true,
                },
            ];

            // Apply filters
            let filteredLogs = simulatedLogs;

            if (filter !== 'all') {
                const filterMap: { [key: string]: string[] } = {
                    'claims': ['claim'],
                    'releases': ['release'],
                    'changes': ['change', 'modify'],
                    'protection': ['protection'],
                    'security': ['security', 'alert'],
                };

                const filterTypes = filterMap[filter] || [];
                filteredLogs = simulatedLogs.filter(log =>
                    filterTypes.some(type => log.type.includes(type))
                );
            }

            if (targetUser) {
                filteredLogs = filteredLogs.filter(log =>
                    log.user.id === targetUser.id
                );
            }

            // Limit results
            filteredLogs = filteredLogs.slice(0, limit);

            const embed = new EmbedBuilder()
                .setTitle('📋 Vanity URL Activity Log')
                .setDescription(`Showing ${filteredLogs.length} log entries${filter !== 'all' ? ` (filtered by: ${filter})` : ''}${targetUser ? ` for ${targetUser.tag}` : ''}`)
                .setColor(0x7289da)
                .setThumbnail(guild.iconURL({ size: 256 }))
                .setTimestamp()
                .setFooter({
                    text: `Requested by ${interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL()
                });

            if (filteredLogs.length === 0) {
                embed.addFields({
                    name: '📝 No Logs Found',
                    value: 'No vanity URL activity matches your criteria.\n\nThis could mean:\n• No recent activity\n• Filters too restrictive\n• User has no vanity actions\n• Feature recently enabled',
                    inline: false,
                });
            } else {
                // Group logs by type for better display
                const logsByType: { [key: string]: any[] } = {};
                filteredLogs.forEach(log => {
                    if (!logsByType[log.type]) {
                        logsByType[log.type] = [];
                    }
                    logsByType[log.type]!.push(log);
                });

                Object.entries(logsByType).forEach(([type, logs]) => {
                    const typeEmojis: { [key: string]: string } = {
                        'claim': '🎯',
                        'release': '🗑️',
                        'change': '🔄',
                        'protection': '🛡️',
                        'security': '🚨',
                    };

                    const typeTitles: { [key: string]: string } = {
                        'claim': 'Vanity Claims',
                        'release': 'URL Releases',
                        'change': 'URL Changes',
                        'protection': 'Protection Events',
                        'security': 'Security Alerts',
                    };

                    const logEntries = logs.map(log => {
                        const status = log.success ? '✅' : '❌';
                        const userInfo = typeof log.user.tag === 'string' ? log.user.tag : 'Unknown User';
                        const timeString = `<t:${Math.floor(log.timestamp / 1000)}:R>`;

                        return `${status} **${log.action}**\n└ ${log.details}\n└ By: ${userInfo} • ${timeString}`;
                    }).join('\n\n');

                    embed.addFields({
                        name: `${typeEmojis[type]} ${typeTitles[type]} (${logs.length})`,
                        value: logEntries,
                        inline: false,
                    });
                });
            }

            // Add summary statistics
            const totalClaims = simulatedLogs.filter(log => log.type === 'claim').length;
            const totalReleases = simulatedLogs.filter(log => log.type === 'release').length;
            const securityEvents = simulatedLogs.filter(log => log.type === 'security').length;
            const protectionEvents = simulatedLogs.filter(log => log.type === 'protection').length;

            embed.addFields({
                name: '📊 Summary Statistics',
                value: `**Total Claims:** ${totalClaims}\n**Total Releases:** ${totalReleases}\n**Security Events:** ${securityEvents}\n**Protection Events:** ${protectionEvents}`,
                inline: true,
            });

            embed.addFields({
                name: '🎯 Quick Actions',
                value: '• `/vanity-status` - Check current status\n• `/vanity-lock` - Configure protection\n• `/vanity-release` - Release current URL\n• Use filters to narrow down results',
                inline: true,
            });

            // Add navigation buttons if there are more logs
            const components: ActionRowBuilder<ButtonBuilder>[] = [];

            if (simulatedLogs.length > limit) {
                const refreshButton = new ButtonBuilder()
                    .setCustomId('vanity_logs_refresh')
                    .setLabel('Refresh')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🔄');

                const exportButton = new ButtonBuilder()
                    .setCustomId('vanity_logs_export')
                    .setLabel('Export Full Log')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📄');

                components.push(
                    new ActionRowBuilder<ButtonBuilder>()
                        .addComponents(refreshButton, exportButton)
                );
            }

            const response = await interaction.editReply({
                embeds: [embed],
                components,
            });

            // Handle button interactions
            if (components.length > 0) {
                try {
                    const buttonInteraction = await response.awaitMessageComponent({
                        componentType: ComponentType.Button,
                        time: 300000, // 5 minutes
                        filter: (i) => i.user.id === interaction.user.id,
                    });

                    if (buttonInteraction.customId === 'vanity_logs_refresh') {
                        await buttonInteraction.deferUpdate();

                        const refreshEmbed = new EmbedBuilder()
                            .setTitle('🔄 Logs Refreshed')
                            .setDescription('Vanity URL logs have been refreshed with the latest data.')
                            .setColor(0x00ff00)
                            .setTimestamp();

                        await buttonInteraction.editReply({
                            embeds: [refreshEmbed],
                            components: [],
                        });

                    } else if (buttonInteraction.customId === 'vanity_logs_export') {
                        await buttonInteraction.deferUpdate();

                        const exportEmbed = new EmbedBuilder()
                            .setTitle('📄 Export Completed')
                            .setDescription('Full vanity URL log has been exported.\n\n*In a real implementation, this would generate a downloadable file with complete log data.*')
                            .setColor(0x00ff00)
                            .setTimestamp();

                        await buttonInteraction.editReply({
                            embeds: [exportEmbed],
                            components: [],
                        });
                    }

                } catch (error) {
                    // Timeout or error - just remove components
                    try {
                        await interaction.editReply({ components: [] });
                    } catch (e) {
                        // Ignore edit errors
                    }
                }
            }

            // Log the action
            client.logger.info(`Vanity claim log viewed by ${interaction.user.tag}`, {
                guildId: interaction.guildId,
                userId: interaction.user.id,
                filter,
                limit,
                targetUserId: targetUser?.id,
                resultsCount: filteredLogs.length,
            });

            return;

        } catch (error) {
            console.error('Error in vanity-claim-log command:', error);

            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

            if (!interaction.replied && !interaction.deferred) {
                return interaction.reply({
                    embeds: [{
                        color: 0xff0000,
                        description: `❌ An error occurred while fetching vanity logs: ${errorMessage}`,
                    }],
                    ephemeral: true,
                });
            }

            return;
        }
    },
};

export default command;