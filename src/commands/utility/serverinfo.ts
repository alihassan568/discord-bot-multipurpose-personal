import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    EmbedBuilder,
    GuildVerificationLevel,
    GuildExplicitContentFilter,
    GuildDefaultMessageNotifications,
    GuildNSFWLevel
} from 'discord.js';
import { Command, BotClient } from '../../types';

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription('Get detailed information about the server'),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guild) return;

        const client = interaction.client as BotClient;
        const guild = interaction.guild;

        const owner = await guild.fetchOwner().catch(() => null);

        const totalMembers = guild.memberCount;
        const members = await guild.members.fetch();
        const humans = members.filter(member => !member.user.bot).size;
        const bots = members.filter(member => member.user.bot).size;

        const textChannels = guild.channels.cache.filter(ch => ch.type === 0).size;
        const voiceChannels = guild.channels.cache.filter(ch => ch.type === 2).size;
        const categories = guild.channels.cache.filter(ch => ch.type === 4).size;

        const verificationLevels = {
            [GuildVerificationLevel.None]: 'None',
            [GuildVerificationLevel.Low]: 'Low',
            [GuildVerificationLevel.Medium]: 'Medium',
            [GuildVerificationLevel.High]: 'High',
            [GuildVerificationLevel.VeryHigh]: 'Very High'
        };

        const contentFilters = {
            [GuildExplicitContentFilter.Disabled]: 'Disabled',
            [GuildExplicitContentFilter.MembersWithoutRoles]: 'Members without roles',
            [GuildExplicitContentFilter.AllMembers]: 'All members'
        };

        const notificationLevels = {
            [GuildDefaultMessageNotifications.AllMessages]: 'All messages',
            [GuildDefaultMessageNotifications.OnlyMentions]: 'Only @mentions'
        };

        const nsfwLevels = {
            [GuildNSFWLevel.Default]: 'Default',
            [GuildNSFWLevel.Explicit]: 'Explicit',
            [GuildNSFWLevel.Safe]: 'Safe',
            [GuildNSFWLevel.AgeRestricted]: 'Age Restricted'
        };

        const embed = new EmbedBuilder()
            .setTitle(`📊 Server Information - ${guild.name}`)
            .setThumbnail(guild.iconURL() || null)
            .setColor(0x5865f2)
            .addFields(
                {
                    name: '👑 Owner',
                    value: owner ? owner.toString() : 'Unknown',
                    inline: true,
                },
                {
                    name: '🆔 Server ID',
                    value: guild.id,
                    inline: true,
                },
                {
                    name: '📅 Created',
                    value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`,
                    inline: true,
                },
                {
                    name: '👥 Members',
                    value: [
                        `Total: **${totalMembers.toLocaleString()}**`,
                        `Humans: **${humans.toLocaleString()}**`,
                        `Bots: **${bots.toLocaleString()}**`
                    ].join('\n'),
                    inline: true,
                },
                {
                    name: '📺 Channels',
                    value: [
                        `Text: **${textChannels}**`,
                        `Voice: **${voiceChannels}**`,
                        `Categories: **${categories}**`
                    ].join('\n'),
                    inline: true,
                },
                {
                    name: '🎭 Roles',
                    value: `**${guild.roles.cache.size}** roles`,
                    inline: true,
                },
                {
                    name: '😀 Emojis',
                    value: `**${guild.emojis.cache.size}** emojis`,
                    inline: true,
                },
                {
                    name: '⚡ Boosts',
                    value: [
                        `Level: **${guild.premiumTier}**`,
                        `Boosts: **${guild.premiumSubscriptionCount || 0}**`
                    ].join('\n'),
                    inline: true,
                },
                {
                    name: '🔒 Security',
                    value: [
                        `Verification: **${verificationLevels[guild.verificationLevel]}**`,
                        `Content Filter: **${contentFilters[guild.explicitContentFilter]}**`,
                        `NSFW Level: **${nsfwLevels[guild.nsfwLevel]}`
                    ].join('\n'),
                    inline: false,
                }
            )
            .setFooter({
                text: `Requested by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL(),
            })
            .setTimestamp();

        if (guild.bannerURL()) {
            embed.setImage(guild.bannerURL()!);
        }

        const features = guild.features;
        if (features.length > 0) {
            const featureNames = features.map(feature =>
                feature.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
            );

            embed.addFields({
                name: '✨ Features',
                value: featureNames.slice(0, 10).join(', ') + (features.length > 10 ? '...' : ''),
                inline: false,
            });
        }

        await interaction.reply({ embeds: [embed] });

        client.logger.info(`Server info viewed by ${interaction.user.tag} in ${guild.name}`, {
            guildId: guild.id,
            userId: interaction.user.id,
            memberCount: totalMembers,
        });
    },
};

export default command;