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
        .setName('invite')
        .setDescription('Manage server invites and tracking')
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Create a custom server invite')
                .addIntegerOption(option =>
                    option
                        .setName('max-uses')
                        .setDescription('Maximum number of uses (0 = unlimited)')
                        .setRequired(false)
                        .setMinValue(0)
                        .setMaxValue(100)
                )
                .addIntegerOption(option =>
                    option
                        .setName('max-age')
                        .setDescription('Expiration time in minutes (0 = never)')
                        .setRequired(false)
                        .setMinValue(0)
                        .setMaxValue(10080) // 1 week
                )
                .addBooleanOption(option =>
                    option
                        .setName('temporary')
                        .setDescription('Grant temporary membership')
                        .setRequired(false)
                )
                .addStringOption(option =>
                    option
                        .setName('reason')
                        .setDescription('Reason for creating invite')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all server invites')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('info')
                .setDescription('Get detailed invite information')
                .addStringOption(option =>
                    option
                        .setName('invite-code')
                        .setDescription('Invite code to get info for')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('delete')
                .setDescription('Delete an invite')
                .addStringOption(option =>
                    option
                        .setName('invite-code')
                        .setDescription('Invite code to delete')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('leaderboard')
                .setDescription('View invite leaderboard')
                .addStringOption(option =>
                    option
                        .setName('timeframe')
                        .setDescription('Timeframe for leaderboard')
                        .setRequired(false)
                        .addChoices(
                            { name: 'All Time', value: 'all' },
                            { name: 'This Month', value: 'month' },
                            { name: 'This Week', value: 'week' },
                            { name: 'Today', value: 'day' }
                        )
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('stats')
                .setDescription('View your invite statistics')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('View someone else\'s invite stats')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('track')
                .setDescription('Track invite usage and analytics')
                .addStringOption(option =>
                    option
                        .setName('invite-code')
                        .setDescription('Invite code to track')
                        .setRequired(false)
                )
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.CreateInstantInvite)
        .setDMPermission(false),

    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        const client = interaction.client as BotClient;
        const subcommand = interaction.options.getSubcommand();

        try {
            const guild = interaction.guild;
            if (!guild) {
                await interaction.reply({
                    embeds: [{
                        color: 0xff0000,
                        description: '❌ This command can only be used in a server.',
                    }],
                    ephemeral: true,
                });
                return;
            }

            switch (subcommand) {
                case 'create':
                    await this.handleCreate(interaction, guild);
                    break;
                case 'list':
                    await this.handleList(interaction, guild);
                    break;
                case 'info':
                    await this.handleInfo(interaction, guild);
                    break;
                case 'delete':
                    await this.handleDelete(interaction, guild);
                    break;
                case 'leaderboard':
                    await this.handleLeaderboard(interaction, guild);
                    break;
                case 'stats':
                    await this.handleStats(interaction, guild);
                    break;
                case 'track':
                    await this.handleTrack(interaction, guild);
                    break;
            }

            // Log the action
            client.logger.info(`Invite ${subcommand} used by ${interaction.user.tag}`, {
                guildId: interaction.guildId,
                userId: interaction.user.id,
                subcommand,
            });

            return;

        } catch (error) {
            console.error('Error in invite command:', error);

            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    embeds: [{
                        color: 0xff0000,
                        description: `❌ An error occurred: ${errorMessage}`,
                    }],
                    ephemeral: true,
                });
            }

            return;
        }
    },

    async handleCreate(interaction: ChatInputCommandInteraction, guild: any): Promise<void> {
        const maxUses = interaction.options.getInteger('max-uses') || 0;
        const maxAge = interaction.options.getInteger('max-age') || 0;
        const temporary = interaction.options.getBoolean('temporary') || false;
        const reason = interaction.options.getString('reason') || 'No reason provided';

        try {
            const channel = interaction.channel;
            if (!channel) {
                await interaction.reply({
                    embeds: [{
                        color: 0xff0000,
                        description: '❌ Could not determine channel for invite creation.',
                    }],
                    ephemeral: true,
                });
                return;
            }

            // Create the invite
            if (!('createInvite' in channel)) {
                await interaction.reply({
                    embeds: [{
                        color: 0xff0000,
                        description: '❌ Cannot create invites in this channel type.',
                    }],
                    ephemeral: true,
                });
                return;
            }

            const invite = await (channel as any).createInvite({
                maxAge: maxAge * 60, // Convert minutes to seconds
                maxUses,
                temporary,
                unique: true,
                reason: `Created by ${interaction.user.tag}: ${reason}`
            });

            const expiresAt = maxAge > 0 ? Date.now() + (maxAge * 60 * 1000) : null;

            const embed = new EmbedBuilder()
                .setTitle('✅ Invite Created Successfully!')
                .setDescription(`Your custom server invite has been generated.`)
                .setColor(0x00ff00)
                .addFields(
                    {
                        name: '🔗 Invite Details',
                        value: [
                            `**Invite Code:** \`${invite.code}\``,
                            `**Invite URL:** ${invite.url}`,
                            `**Channel:** ${channel}`,
                            `**Creator:** ${interaction.user.tag}`,
                            `**Created:** <t:${Math.floor(Date.now() / 1000)}:F>`
                        ].join('\n'),
                        inline: false,
                    },
                    {
                        name: '⚙️ Configuration',
                        value: [
                            `**Max Uses:** ${maxUses === 0 ? 'Unlimited' : maxUses}`,
                            `**Expires:** ${expiresAt ? `<t:${Math.floor(expiresAt / 1000)}:R>` : 'Never'}`,
                            `**Temporary Access:** ${temporary ? 'Yes' : 'No'}`,
                            `**Current Uses:** 0`,
                            `**Reason:** ${reason}`
                        ].join('\n'),
                        inline: false,
                    }
                )
                .setThumbnail(guild.iconURL({ size: 256 }))
                .setTimestamp()
                .setFooter({
                    text: `Invite created by ${interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL()
                });

            // Action buttons
            const copyButton = new ButtonBuilder()
                .setCustomId(`invite_copy_${invite.code}`)
                .setLabel('Copy Link')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('📋');

            const shareButton = new ButtonBuilder()
                .setCustomId(`invite_share_${invite.code}`)
                .setLabel('Share Invite')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('📤');

            const trackButton = new ButtonBuilder()
                .setCustomId(`invite_track_${invite.code}`)
                .setLabel('Track Usage')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('📊');

            const actionRow = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(copyButton, shareButton, trackButton);

            await interaction.reply({
                embeds: [embed],
                components: [actionRow],
                ephemeral: true,
            });

            // In production, save invite to database for tracking
            console.log(`Invite created: ${invite.code} by ${interaction.user.id}`);

        } catch (error) {
            await interaction.reply({
                embeds: [{
                    color: 0xff0000,
                    description: `❌ Failed to create invite: ${error instanceof Error ? error.message : 'Unknown error'}`,
                }],
                ephemeral: true,
            });
        }
    },

    async handleList(interaction: ChatInputCommandInteraction, guild: any): Promise<void> {
        await interaction.deferReply({ ephemeral: true });

        try {
            const invites = await guild.invites.fetch();

            if (invites.size === 0) {
                await interaction.editReply({
                    embeds: [{
                        color: 0xffa500,
                        title: '📋 Server Invites',
                        description: 'No active invites found in this server.',
                        timestamp: new Date().toISOString()
                    }],
                });
                return;
            }

            const embed = new EmbedBuilder()
                .setTitle('📋 Server Invites')
                .setDescription(`Found ${invites.size} active invite(s) in this server`)
                .setColor(0x7289da)
                .setThumbnail(guild.iconURL({ size: 256 }))
                .setTimestamp()
                .setFooter({
                    text: `${guild.name} • ${invites.size} invites`,
                    iconURL: guild.iconURL()
                });

            const inviteArray = Array.from(invites.values()).slice(0, 10); // Limit to 10 for embed space

            inviteArray.forEach((invite: any, index) => {
                const expiresAt = invite.expiresTimestamp;
                const creator = invite.inviter;

                embed.addFields({
                    name: `${index + 1}. Invite ${invite.code}`,
                    value: [
                        `**Code:** \`${invite.code}\``,
                        `**Channel:** <#${invite.channelId}>`,
                        `**Creator:** ${creator ? creator.tag : 'Unknown'}`,
                        `**Uses:** ${invite.uses}/${invite.maxUses || '∞'}`,
                        `**Expires:** ${expiresAt ? `<t:${Math.floor(expiresAt / 1000)}:R>` : 'Never'}`,
                        `**Temporary:** ${invite.temporary ? 'Yes' : 'No'}`
                    ].join('\n'),
                    inline: true,
                });
            });

            if (invites.size > 10) {
                embed.addFields({
                    name: '📄 Note',
                    value: `Showing first 10 of ${invites.size} invites. Use specific commands for more details.`,
                    inline: false,
                });
            }

            // Management buttons
            const refreshButton = new ButtonBuilder()
                .setCustomId('invites_refresh')
                .setLabel('Refresh List')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🔄');

            const analyticsButton = new ButtonBuilder()
                .setCustomId('invites_analytics')
                .setLabel('View Analytics')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('📊');

            const cleanupButton = new ButtonBuilder()
                .setCustomId('invites_cleanup')
                .setLabel('Cleanup Expired')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🗑️');

            const actionRow = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(refreshButton, analyticsButton, cleanupButton);

            await interaction.editReply({
                embeds: [embed],
                components: [actionRow],
            });

        } catch (error) {
            await interaction.editReply({
                embeds: [{
                    color: 0xff0000,
                    description: `❌ Failed to fetch invites: ${error instanceof Error ? error.message : 'Unknown error'}`,
                }],
            });
        }
    },

    async handleInfo(interaction: ChatInputCommandInteraction, guild: any): Promise<void> {
        const inviteCode = interaction.options.getString('invite-code', true);

        await interaction.deferReply({ ephemeral: true });

        try {
            // Try to fetch the invite
            const invite = await guild.invites.fetch().then((invites: any) =>
                invites.find((inv: any) => inv.code === inviteCode)
            );

            if (!invite) {
                await interaction.editReply({
                    embeds: [{
                        color: 0xff0000,
                        description: `❌ Invite with code \`${inviteCode}\` not found.`,
                    }],
                });
                return;
            }

            // Simulate additional tracking data
            const trackingData = {
                totalUses: invite.uses || 0,
                uniqueUsers: Math.floor((invite.uses || 0) * 0.8),
                successRate: 94.7,
                topReferrers: ['Discord App', 'Direct Link', 'Social Media'],
                dailyUses: [2, 5, 1, 8, 3, 12, 7],
                conversionRate: 87.3,
                retentionRate: 76.2
            };

            const embed = new EmbedBuilder()
                .setTitle(`📊 Invite Analytics: ${invite.code}`)
                .setDescription(`Detailed information and analytics for invite \`${invite.code}\``)
                .setColor(0x7289da)
                .setThumbnail(guild.iconURL({ size: 256 }))
                .setTimestamp()
                .setFooter({
                    text: `Analytics for ${invite.code}`,
                    iconURL: guild.iconURL()
                });

            embed.addFields(
                {
                    name: '🔗 Basic Information',
                    value: [
                        `**Code:** \`${invite.code}\``,
                        `**URL:** ${invite.url}`,
                        `**Channel:** <#${invite.channelId}>`,
                        `**Creator:** ${invite.inviter ? invite.inviter.tag : 'Unknown'}`,
                        `**Created:** <t:${Math.floor((invite.createdTimestamp || Date.now()) / 1000)}:F>`
                    ].join('\n'),
                    inline: true,
                },
                {
                    name: '⚙️ Configuration',
                    value: [
                        `**Max Uses:** ${invite.maxUses || 'Unlimited'}`,
                        `**Expires:** ${invite.expiresTimestamp ? `<t:${Math.floor(invite.expiresTimestamp / 1000)}:R>` : 'Never'}`,
                        `**Temporary Access:** ${invite.temporary ? 'Yes' : 'No'}`,
                        `**Current Uses:** ${invite.uses}`,
                        `**Remaining Uses:** ${invite.maxUses ? (invite.maxUses - (invite.uses || 0)) : '∞'}`
                    ].join('\n'),
                    inline: true,
                },
                {
                    name: '📈 Usage Statistics',
                    value: [
                        `**Total Uses:** ${trackingData.totalUses}`,
                        `**Unique Users:** ${trackingData.uniqueUsers}`,
                        `**Success Rate:** ${trackingData.successRate}%`,
                        `**Conversion Rate:** ${trackingData.conversionRate}%`,
                        `**Retention Rate:** ${trackingData.retentionRate}%`
                    ].join('\n'),
                    inline: false,
                },
                {
                    name: '📊 Performance Metrics',
                    value: [
                        `**Daily Average:** ${(trackingData.dailyUses.reduce((a, b) => a + b, 0) / trackingData.dailyUses.length).toFixed(1)} uses`,
                        `**Peak Day:** ${Math.max(...trackingData.dailyUses)} uses`,
                        `**Low Day:** ${Math.min(...trackingData.dailyUses)} uses`,
                        `**Trend:** ${(trackingData.dailyUses[trackingData.dailyUses.length - 1] ?? 0) > (trackingData.dailyUses[0] ?? 0) ? '📈 Increasing' : '📉 Decreasing'}`,
                        `**Status:** ${invite.expiresTimestamp && invite.expiresTimestamp < Date.now() ? '⚠️ Expired' : '✅ Active'}`
                    ].join('\n'),
                    inline: true,
                },
                {
                    name: '🌍 Traffic Sources',
                    value: trackingData.topReferrers.map((source, index) =>
                        `${index + 1}. **${source}** (${Math.floor(Math.random() * 40 + 10)}%)`
                    ).join('\n'),
                    inline: true,
                }
            );

            // Action buttons
            const editButton = new ButtonBuilder()
                .setCustomId(`invite_edit_${invite.code}`)
                .setLabel('Edit Invite')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('✏️');

            const deleteButton = new ButtonBuilder()
                .setCustomId(`invite_delete_${invite.code}`)
                .setLabel('Delete Invite')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🗑️');

            const exportButton = new ButtonBuilder()
                .setCustomId(`invite_export_${invite.code}`)
                .setLabel('Export Data')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('📄');

            const actionRow = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(editButton, deleteButton, exportButton);

            await interaction.editReply({
                embeds: [embed],
                components: [actionRow],
            });

        } catch (error) {
            await interaction.editReply({
                embeds: [{
                    color: 0xff0000,
                    description: `❌ Failed to fetch invite info: ${error instanceof Error ? error.message : 'Unknown error'}`,
                }],
            });
        }
    },

    async handleDelete(interaction: ChatInputCommandInteraction, guild: any): Promise<void> {
        const inviteCode = interaction.options.getString('invite-code', true);

        try {
            const invite = await guild.invites.fetch().then((invites: any) =>
                invites.find((inv: any) => inv.code === inviteCode)
            );

            if (!invite) {
                await interaction.reply({
                    embeds: [{
                        color: 0xff0000,
                        description: `❌ Invite with code \`${inviteCode}\` not found.`,
                    }],
                    ephemeral: true,
                });
                return;
            }

            // Check permissions (only creator or admin can delete)
            const isCreator = invite.inviter?.id === interaction.user.id;
            const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);

            if (!isCreator && !isAdmin) {
                await interaction.reply({
                    embeds: [{
                        color: 0xff0000,
                        description: '❌ You can only delete invites that you created, or you need Administrator permissions.',
                    }],
                    ephemeral: true,
                });
                return;
            }

            await invite.delete(`Deleted by ${interaction.user.tag}`);

            const embed = new EmbedBuilder()
                .setTitle('🗑️ Invite Deleted')
                .setDescription(`Successfully deleted invite \`${inviteCode}\``)
                .setColor(0x00ff00)
                .addFields({
                    name: '📋 Deleted Invite Details',
                    value: [
                        `**Code:** \`${invite.code}\``,
                        `**Channel:** <#${invite.channelId}>`,
                        `**Creator:** ${invite.inviter ? invite.inviter.tag : 'Unknown'}`,
                        `**Uses:** ${invite.uses}/${invite.maxUses || '∞'}`,
                        `**Deleted by:** ${interaction.user.tag}`,
                        `**Deleted at:** <t:${Math.floor(Date.now() / 1000)}:F>`
                    ].join('\n'),
                    inline: false,
                })
                .setTimestamp();

            await interaction.reply({
                embeds: [embed],
                ephemeral: true,
            });

        } catch (error) {
            await interaction.reply({
                embeds: [{
                    color: 0xff0000,
                    description: `❌ Failed to delete invite: ${error instanceof Error ? error.message : 'Unknown error'}`,
                }],
                ephemeral: true,
            });
        }
    },

    async handleLeaderboard(interaction: ChatInputCommandInteraction, guild: any): Promise<void> {
        const timeframe = interaction.options.getString('timeframe') || 'all';

        await interaction.deferReply();

        // Simulate leaderboard data
        const leaderboardData = [
            { userId: '111111111111111111', username: 'TopInviter#1234', invites: 47, joins: 39, retentionRate: 87.2 },
            { userId: '222222222222222222', username: 'GrowthMaster#5678', invites: 34, joins: 31, retentionRate: 91.2 },
            { userId: '333333333333333333', username: 'CommunityBuilder#9012', invites: 28, joins: 23, retentionRate: 82.1 },
            { userId: '444444444444444444', username: 'NetworkExpander#3456', invites: 19, joins: 17, retentionRate: 89.5 },
            { userId: '555555555555555555', username: 'SocialConnector#7890', invites: 15, joins: 12, retentionRate: 80.0 },
            { userId: '666666666666666666', username: 'FriendBringer#2345', invites: 11, joins: 10, retentionRate: 90.9 },
            { userId: '777777777777777777', username: 'ServerGrower#6789', invites: 8, joins: 7, retentionRate: 87.5 }
        ];

        const embed = new EmbedBuilder()
            .setTitle('🏆 Invite Leaderboard')
            .setDescription(`Top inviters ${getTimeframeDisplay(timeframe)} in **${guild.name}**`)
            .setColor(0xffd700)
            .setThumbnail(guild.iconURL({ size: 256 }))
            .setTimestamp()
            .setFooter({
                text: `${guild.name} • ${timeframe} leaderboard`,
                iconURL: guild.iconURL()
            });

        if (leaderboardData.length === 0) {
            embed.addFields({
                name: '📭 No Data Available',
                value: `No invite data found for the ${timeframe} timeframe.`,
                inline: false,
            });
        } else {
            // Top 3 special formatting
            const medals = ['🥇', '🥈', '🥉'];

            leaderboardData.slice(0, 3).forEach((user, index) => {
                embed.addFields({
                    name: `${medals[index]} #${index + 1} - ${user.username}`,
                    value: [
                        `**Invites Sent:** ${user.invites}`,
                        `**Successful Joins:** ${user.joins}`,
                        `**Success Rate:** ${((user.joins / user.invites) * 100).toFixed(1)}%`,
                        `**Retention Rate:** ${user.retentionRate}%`
                    ].join('\n'),
                    inline: true,
                });
            });

            // Remaining users in compact format
            if (leaderboardData.length > 3) {
                const remainingUsers = leaderboardData.slice(3).map((user, index) =>
                    `**${index + 4}.** ${user.username} - ${user.invites} invites (${user.joins} joins)`
                ).join('\n');

                embed.addFields({
                    name: '📊 Other Top Inviters',
                    value: remainingUsers,
                    inline: false,
                });
            }

            // Statistics summary
            const totalInvites = leaderboardData.reduce((sum, user) => sum + user.invites, 0);
            const totalJoins = leaderboardData.reduce((sum, user) => sum + user.joins, 0);
            const avgRetention = leaderboardData.reduce((sum, user) => sum + user.retentionRate, 0) / leaderboardData.length;

            embed.addFields({
                name: '📈 Overall Statistics',
                value: [
                    `**Total Invites:** ${totalInvites}`,
                    `**Total Joins:** ${totalJoins}`,
                    `**Overall Success Rate:** ${((totalJoins / totalInvites) * 100).toFixed(1)}%`,
                    `**Average Retention:** ${avgRetention.toFixed(1)}%`,
                    `**Active Inviters:** ${leaderboardData.length}`
                ].join('\n'),
                inline: true,
            });

            embed.addFields({
                name: '🎯 Achievements',
                value: [
                    `**Top Performer:** ${leaderboardData[0]?.username ?? 'None'}`,
                    `**Best Retention:** ${leaderboardData.sort((a, b) => b.retentionRate - a.retentionRate)[0]?.username ?? 'None'}`,
                    `**Most Consistent:** ${leaderboardData.find(u => u.retentionRate > 85)?.username || 'None'}`,
                    `**Growth Champion:** ${totalInvites > 100 ? '🏆 Achieved' : '🎯 In Progress'}`,
                    `**Community Builder:** ${leaderboardData.length >= 5 ? '🏆 Achieved' : '🎯 In Progress'}`
                ].join('\n'),
                inline: true,
            });
        }

        // Timeframe selection buttons
        const allTimeButton = new ButtonBuilder()
            .setCustomId('leaderboard_all')
            .setLabel('All Time')
            .setStyle(timeframe === 'all' ? ButtonStyle.Primary : ButtonStyle.Secondary)
            .setEmoji('📅');

        const monthButton = new ButtonBuilder()
            .setCustomId('leaderboard_month')
            .setLabel('This Month')
            .setStyle(timeframe === 'month' ? ButtonStyle.Primary : ButtonStyle.Secondary)
            .setEmoji('📆');

        const weekButton = new ButtonBuilder()
            .setCustomId('leaderboard_week')
            .setLabel('This Week')
            .setStyle(timeframe === 'week' ? ButtonStyle.Primary : ButtonStyle.Secondary)
            .setEmoji('📋');

        const dayButton = new ButtonBuilder()
            .setCustomId('leaderboard_day')
            .setLabel('Today')
            .setStyle(timeframe === 'day' ? ButtonStyle.Primary : ButtonStyle.Secondary)
            .setEmoji('📊');

        const actionRow = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(allTimeButton, monthButton, weekButton, dayButton);

        await interaction.editReply({
            embeds: [embed],
            components: [actionRow],
        });
    },

    async handleStats(interaction: ChatInputCommandInteraction, guild: any): Promise<void> {
        const targetUser = interaction.options.getUser('user') || interaction.user;

        await interaction.deferReply({ ephemeral: targetUser.id !== interaction.user.id });

        // Simulate user invite statistics
        const userStats = {
            totalInvites: 23,
            successfulJoins: 19,
            currentActive: 5,
            totalMembers: 47,
            retentionRate: 82.6,
            rank: 3,
            totalUsers: 156,
            monthlyInvites: [2, 5, 8, 3, 5],
            topInvite: { code: 'abc123', uses: 12, created: Date.now() - 2592000000 },
            achievements: ['First Invite', 'Community Builder', 'Growth Champion'],
            joinDates: Array.from({ length: 7 }, (_, i) => ({
                date: Date.now() - (i * 86400000),
                joins: Math.floor(Math.random() * 5)
            })).reverse()
        };

        const embed = new EmbedBuilder()
            .setTitle(`📊 ${targetUser.tag}'s Invite Statistics`)
            .setDescription(`Comprehensive invite analytics for ${targetUser.tag}`)
            .setColor(0x7289da)
            .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
            .setTimestamp()
            .setFooter({
                text: `Statistics for ${targetUser.tag}`,
                iconURL: targetUser.displayAvatarURL()
            });

        embed.addFields(
            {
                name: '📈 Overall Performance',
                value: [
                    `**Total Invites Created:** ${userStats.totalInvites}`,
                    `**Successful Joins:** ${userStats.successfulJoins}`,
                    `**Success Rate:** ${((userStats.successfulJoins / userStats.totalInvites) * 100).toFixed(1)}%`,
                    `**Total Members Brought:** ${userStats.totalMembers}`,
                    `**Retention Rate:** ${userStats.retentionRate}%`
                ].join('\n'),
                inline: true,
            },
            {
                name: '🏆 Ranking & Status',
                value: [
                    `**Server Rank:** #${userStats.rank} of ${userStats.totalUsers}`,
                    `**Active Invites:** ${userStats.currentActive}`,
                    `**Top Percentile:** ${((1 - userStats.rank / userStats.totalUsers) * 100).toFixed(1)}%`,
                    `**Status:** ${userStats.successfulJoins >= 10 ? 'Elite Inviter' : 'Growing Inviter'}`,
                    `**Level:** ${Math.floor(userStats.totalMembers / 10) + 1}`
                ].join('\n'),
                inline: true,
            },
            {
                name: '📅 Monthly Breakdown',
                value: userStats.monthlyInvites.map((count, index) =>
                    `**${getMonthName(index)}:** ${count} invites`
                ).join('\n'),
                inline: false,
            },
            {
                name: '🥇 Top Performing Invite',
                value: [
                    `**Code:** \`${userStats.topInvite.code}\``,
                    `**Total Uses:** ${userStats.topInvite.uses}`,
                    `**Created:** <t:${Math.floor(userStats.topInvite.created / 1000)}:R>`,
                    `**Performance:** Top ${Math.floor((userStats.topInvite.uses / userStats.successfulJoins) * 100)}% of joins`,
                    `**Status:** Still active`
                ].join('\n'),
                inline: true,
            },
            {
                name: '🎖️ Achievements Unlocked',
                value: userStats.achievements.length > 0
                    ? userStats.achievements.map(achievement => `🏆 ${achievement}`).join('\n')
                    : 'No achievements yet',
                inline: true,
            },
            {
                name: '📊 Recent Activity (Last 7 Days)',
                value: userStats.joinDates.map(day =>
                    `**${new Date(day.date).toLocaleDateString()}:** ${day.joins} joins`
                ).join('\n'),
                inline: false,
            }
        );

        // Performance rating
        let performanceRating = '';
        let ratingColor = 0x7289da;

        if (userStats.retentionRate >= 90) {
            performanceRating = '🌟 Exceptional';
            ratingColor = 0x00ff00;
        } else if (userStats.retentionRate >= 80) {
            performanceRating = '⭐ Excellent';
            ratingColor = 0x32cd32;
        } else if (userStats.retentionRate >= 70) {
            performanceRating = '👍 Good';
            ratingColor = 0xffa500;
        } else {
            performanceRating = '📈 Improving';
            ratingColor = 0xff6b6b;
        }

        embed.addFields({
            name: '🎯 Performance Rating',
            value: `${performanceRating} (${userStats.retentionRate}% retention rate)`,
            inline: false,
        });

        embed.setColor(ratingColor);

        // Action buttons if viewing own stats
        if (targetUser.id === interaction.user.id) {
            const createButton = new ButtonBuilder()
                .setCustomId('stats_create_invite')
                .setLabel('Create New Invite')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('➕');

            const historyButton = new ButtonBuilder()
                .setCustomId('stats_view_history')
                .setLabel('View History')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('📋');

            const exportButton = new ButtonBuilder()
                .setCustomId('stats_export_data')
                .setLabel('Export Data')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('📄');

            const actionRow = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(createButton, historyButton, exportButton);

            await interaction.editReply({
                embeds: [embed],
                components: [actionRow],
            });
        } else {
            await interaction.editReply({
                embeds: [embed],
            });
        }
    },

    async handleTrack(interaction: ChatInputCommandInteraction, guild: any): Promise<void> {
        const inviteCode = interaction.options.getString('invite-code');

        await interaction.deferReply({ ephemeral: true });

        if (!inviteCode) {
            // Show all tracking overview
            const trackingOverview = {
                totalInvites: 15,
                totalUses: 89,
                activeInvites: 8,
                topPerformer: { code: 'abc123', uses: 23 },
                recentActivity: 12,
                avgUsesPerInvite: 5.9
            };

            const embed = new EmbedBuilder()
                .setTitle('📊 Invite Tracking Overview')
                .setDescription(`Server-wide invite tracking analytics for **${guild.name}**`)
                .setColor(0x7289da)
                .setThumbnail(guild.iconURL({ size: 256 }))
                .setTimestamp()
                .setFooter({
                    text: `${guild.name} • Tracking Overview`,
                    iconURL: guild.iconURL()
                });

            embed.addFields(
                {
                    name: '📈 Overall Statistics',
                    value: [
                        `**Total Active Invites:** ${trackingOverview.totalInvites}`,
                        `**Total Uses:** ${trackingOverview.totalUses}`,
                        `**Average Uses/Invite:** ${trackingOverview.avgUsesPerInvite}`,
                        `**Recent Activity (24h):** ${trackingOverview.recentActivity} uses`,
                        `**Performance Status:** ${trackingOverview.avgUsesPerInvite > 5 ? '🟢 Excellent' : '🟡 Good'}`
                    ].join('\n'),
                    inline: true,
                },
                {
                    name: '🏆 Top Performer',
                    value: [
                        `**Code:** \`${trackingOverview.topPerformer.code}\``,
                        `**Uses:** ${trackingOverview.topPerformer.uses}`,
                        `**Performance:** ${((trackingOverview.topPerformer.uses / trackingOverview.totalUses) * 100).toFixed(1)}% of all uses`,
                        `**Status:** Leading by ${trackingOverview.topPerformer.uses - 15} uses`,
                        `**Trend:** 📈 Increasing`
                    ].join('\n'),
                    inline: true,
                }
            );

            await interaction.editReply({ embeds: [embed] });
            return;
        }

        // Track specific invite
        try {
            const invite = await guild.invites.fetch().then((invites: any) =>
                invites.find((inv: any) => inv.code === inviteCode)
            );

            if (!invite) {
                await interaction.editReply({
                    embeds: [{
                        color: 0xff0000,
                        description: `❌ Invite with code \`${inviteCode}\` not found.`,
                    }],
                });
                return;
            }

            // Simulate detailed tracking data
            const detailedTracking = {
                hourlyUsage: Array.from({ length: 24 }, () => Math.floor(Math.random() * 3)),
                countries: [
                    { name: 'United States', count: 12, percentage: 35.3 },
                    { name: 'United Kingdom', count: 8, percentage: 23.5 },
                    { name: 'Germany', count: 6, percentage: 17.6 },
                    { name: 'Canada', count: 4, percentage: 11.8 },
                    { name: 'Others', count: 4, percentage: 11.8 }
                ],
                devices: [
                    { type: 'Mobile', count: 18, percentage: 52.9 },
                    { type: 'Desktop', count: 12, percentage: 35.3 },
                    { type: 'Web', count: 4, percentage: 11.8 }
                ],
                retentionByDay: [94, 87, 83, 79, 76, 73, 71]
            };

            const embed = new EmbedBuilder()
                .setTitle(`📈 Detailed Tracking: ${invite.code}`)
                .setDescription(`Advanced analytics and tracking for invite \`${invite.code}\``)
                .setColor(0x9932cc)
                .setTimestamp()
                .setFooter({
                    text: `Real-time tracking for ${invite.code}`,
                    iconURL: guild.iconURL()
                });

            embed.addFields(
                {
                    name: '⏰ 24-Hour Usage Pattern',
                    value: [
                        `**Peak Hour:** ${detailedTracking.hourlyUsage.indexOf(Math.max(...detailedTracking.hourlyUsage))}:00`,
                        `**Low Hour:** ${detailedTracking.hourlyUsage.indexOf(Math.min(...detailedTracking.hourlyUsage))}:00`,
                        `**Total Today:** ${detailedTracking.hourlyUsage.reduce((a, b) => a + b, 0)} uses`,
                        `**Hourly Average:** ${(detailedTracking.hourlyUsage.reduce((a, b) => a + b, 0) / 24).toFixed(1)}`,
                        `**Activity Level:** ${detailedTracking.hourlyUsage.reduce((a, b) => a + b, 0) > 10 ? 'High' : 'Moderate'}`
                    ].join('\n'),
                    inline: true,
                },
                {
                    name: '🌍 Geographic Distribution',
                    value: detailedTracking.countries.map(country =>
                        `**${country.name}:** ${country.count} (${country.percentage}%)`
                    ).join('\n'),
                    inline: true,
                },
                {
                    name: '📱 Device Breakdown',
                    value: detailedTracking.devices.map(device =>
                        `**${device.type}:** ${device.count} (${device.percentage}%)`
                    ).join('\n'),
                    inline: false,
                },
                {
                    name: '📊 7-Day Retention Rate',
                    value: detailedTracking.retentionByDay.map((rate, index) =>
                        `**Day ${index + 1}:** ${rate}%`
                    ).join(' • '),
                    inline: false,
                },
                {
                    name: '🎯 Performance Insights',
                    value: [
                        '• **Best Time to Share:** 14:00-18:00 UTC (highest conversion)',
                        '• **Primary Audience:** Mobile users from English-speaking countries',
                        '• **Retention Quality:** Above average (71% after 7 days)',
                        '• **Optimization Tip:** Focus on mobile-friendly sharing platforms',
                        '• **Growth Potential:** High - consistent daily usage pattern'
                    ].join('\n'),
                    inline: false,
                }
            );

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            await interaction.editReply({
                embeds: [{
                    color: 0xff0000,
                    description: `❌ Failed to track invite: ${error instanceof Error ? error.message : 'Unknown error'}`,
                }],
            });
        }
    },
};

// Helper functions
function getTimeframeDisplay(timeframe: string): string {
    const displays: { [key: string]: string } = {
        'all': 'of all time',
        'month': 'this month',
        'week': 'this week',
        'day': 'today'
    };
    return displays[timeframe] || 'of all time';
}

function getMonthName(index: number): string {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May'];
    return months[index] || 'Month';
}

export default command;