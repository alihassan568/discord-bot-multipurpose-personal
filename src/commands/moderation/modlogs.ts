import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits, GuildMember, type APIEmbedField } from 'discord.js';
import { Command, BotClient } from '../../types';
import { chunkArray } from '../../utils/helpers';

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('modlogs')
        .setDescription('View moderation history for a user')
        .addUserOption(option =>
            option
                .setName('target')
                .setDescription('The user to view moderation logs for')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option
                .setName('limit')
                .setDescription('Number of recent logs to show (default: 10)')
                .setMinValue(1)
                .setMaxValue(50)
                .setRequired(false)
        )
        .addStringOption(option =>
            option
                .setName('action')
                .setDescription('Filter by action type')
                .addChoices(
                    { name: 'Ban', value: 'BAN' },
                    { name: 'Kick', value: 'KICK' },
                    { name: 'Mute', value: 'MUTE' },
                    { name: 'Warn', value: 'WARN' },
                    { name: 'Note', value: 'NOTE' },
                    { name: 'All', value: 'ALL' }
                )
                .setRequired(false)
        ),

    permissions: [PermissionFlagsBits.ModerateMembers],
    guildOnly: true,

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guild) return;

        const client = interaction.client as BotClient;
        const target = interaction.options.getUser('target', true);
        const limit = interaction.options.getInteger('limit') || 10;
        const actionFilter = interaction.options.getString('action') || 'ALL';

        try {
            // Build where clause
            const whereClause: any = {
                guildId: interaction.guild.id,
                targetId: target.id,
            };

            if (actionFilter !== 'ALL') {
                whereClause.action = actionFilter;
            }

            // Fetch moderation logs
            const logs = await client.db.moderationLog.findMany({
                where: whereClause,
                orderBy: {
                    createdAt: 'desc',
                },
                take: limit,
                include: {
                    moderator: {
                        select: {
                            id: true,
                            username: true,
                        },
                    },
                },
            });

            if (logs.length === 0) {
                await interaction.reply({
                    content: `📋 No moderation logs found for ${target.tag}${actionFilter !== 'ALL' ? ` with action type: ${actionFilter}` : ''}.`,
                    ephemeral: true,
                });
                return;
            }

            // Get warning count
            const warningCount = await client.db.moderationLog.count({
                where: {
                    guildId: interaction.guild.id,
                    targetId: target.id,
                    action: 'WARN',
                },
            });

            // Create embed
            const embed = new EmbedBuilder()
                .setTitle(`📋 Moderation Logs - ${target.tag}`)
                .setColor(0x3498db)
                .setThumbnail(target.displayAvatarURL())
                .setDescription(`Showing ${logs.length} most recent logs${actionFilter !== 'ALL' ? ` (${actionFilter} only)` : ''}`)
                .addFields({
                    name: '📊 Summary',
                    value: [
                        `**Total Warnings:** ${warningCount}`,
                        `**User ID:** ${target.id}`,
                        `**Account Created:** <t:${Math.floor(target.createdTimestamp / 1000)}:R>`,
                    ].join('\n'),
                    inline: false,
                })
                .setFooter({
                    text: `Requested by ${interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL(),
                })
                .setTimestamp();

            // Add log entries
            const logFields: APIEmbedField[] = logs.map((log: any) => {
                const actionEmoji = getActionEmoji(log.action);
                const moderatorName = log.moderator?.username || 'Unknown';
                const expiresText = log.expiresAt ? `\n**Expires:** <t:${Math.floor(new Date(log.expiresAt).getTime() / 1000)}:R>` : '';

                return {
                    name: `${actionEmoji} ${log.action} - Case ${log.id.slice(-8)}`,
                    value: [
                        `**Moderator:** ${moderatorName}`,
                        `**Reason:** ${log.reason || 'No reason provided'}`,
                        `**Date:** <t:${Math.floor(new Date(log.createdAt).getTime() / 1000)}:R>${expiresText}`,
                    ].join('\n'),
                    inline: false,
                };
            });

            // Discord has a limit of 25 fields per embed
            const fieldChunks = chunkArray(logFields, 10);

            // Send first chunk
            if (fieldChunks[0] && fieldChunks[0].length > 0) {
                embed.addFields(...fieldChunks[0]);
            }
            await interaction.reply({ embeds: [embed] });

            // Send additional chunks if needed
            for (let i = 1; i < fieldChunks.length; i++) {
                const followUpEmbed = new EmbedBuilder()
                    .setTitle(`📋 Moderation Logs - ${target.tag} (Page ${i + 1})`)
                    .setColor(0x3498db)
                    .setFooter({
                        text: `Page ${i + 1} of ${fieldChunks.length}`,
                    });

                if (fieldChunks[i] && fieldChunks[i]!.length > 0) {
                    followUpEmbed.addFields(...fieldChunks[i]!);
                }

                await interaction.followUp({ embeds: [followUpEmbed] });
            }

            // Log the lookup
            client.logger.info(`${interaction.user.tag} viewed moderation logs for ${target.tag} in ${interaction.guild.name}`, {
                guildId: interaction.guild.id,
                viewerId: interaction.user.id,
                targetId: target.id,
                logsReturned: logs.length,
                actionFilter,
            });

        } catch (error) {
            client.logger.error('Error executing modlogs command:', error);

            const errorMessage = {
                content: '❌ An error occurred while fetching moderation logs!',
                ephemeral: true,
            };

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(errorMessage);
            } else {
                await interaction.reply(errorMessage);
            }
        }
    },
};

function getActionEmoji(action: string): string {
    const emojiMap: Record<string, string> = {
        BAN: '🔨',
        UNBAN: '🔓',
        KICK: '👢',
        MUTE: '🔇',
        UNMUTE: '🔊',
        TIMEOUT: '⏰',
        UNTIMEOUT: '⏰',
        WARN: '⚠️',
        NOTE: '📝',
        PURGE: '🧹',
        NICKNAME_CHANGE: '📝',
        ROLE_ADD: '➕',
        ROLE_REMOVE: '➖',
    };

    return emojiMap[action] || '📋';
}

export default command;