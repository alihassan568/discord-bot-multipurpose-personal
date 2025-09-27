import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    EmbedBuilder,
    GuildMember,
    User
} from 'discord.js';
import { Command, BotClient } from '../../types';

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('Get information about a user')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('The user to get information about')
                .setRequired(false)
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guild) return;

        const client = interaction.client as BotClient;
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        const embed = new EmbedBuilder()
            .setTitle(`👤 User Information - ${targetUser.tag}`)
            .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
            .setColor(member?.displayColor || 0x5865f2)
            .addFields(
                {
                    name: '🏷️ Username',
                    value: targetUser.username,
                    inline: true,
                },
                {
                    name: '🆔 User ID',
                    value: targetUser.id,
                    inline: true,
                },
                {
                    name: '📅 Account Created',
                    value: `<t:${Math.floor(targetUser.createdTimestamp / 1000)}:F>`,
                    inline: false,
                }
            );

        // Add member-specific information if they're in the server
        if (member) {
            embed.addFields(
                {
                    name: '📝 Display Name',
                    value: member.displayName,
                    inline: true,
                },
                {
                    name: '📅 Joined Server',
                    value: member.joinedAt ? `<t:${Math.floor(member.joinedAt.getTime() / 1000)}:F>` : 'Unknown',
                    inline: false,
                }
            );

            // Add roles (excluding @everyone)
            const roles = member.roles.cache
                .filter(role => role.id !== interaction.guild!.id)
                .sort((a, b) => b.position - a.position)
                .map(role => role.toString());

            if (roles.length > 0) {
                const roleText = roles.length > 10
                    ? `${roles.slice(0, 10).join(', ')} and ${roles.length - 10} more...`
                    : roles.join(', ');

                embed.addFields({
                    name: `🎭 Roles (${roles.length})`,
                    value: roleText,
                    inline: false,
                });
            }

            // Add permissions info
            const keyPermissions = [];
            if (member.permissions.has('Administrator')) keyPermissions.push('Administrator');
            if (member.permissions.has('ManageGuild')) keyPermissions.push('Manage Server');
            if (member.permissions.has('ManageChannels')) keyPermissions.push('Manage Channels');
            if (member.permissions.has('ManageRoles')) keyPermissions.push('Manage Roles');
            if (member.permissions.has('BanMembers')) keyPermissions.push('Ban Members');
            if (member.permissions.has('KickMembers')) keyPermissions.push('Kick Members');

            if (keyPermissions.length > 0) {
                embed.addFields({
                    name: '🔑 Key Permissions',
                    value: keyPermissions.join(', '),
                    inline: false,
                });
            }

            // Add boost info
            if (member.premiumSince) {
                embed.addFields({
                    name: '💎 Server Booster',
                    value: `Since <t:${Math.floor(member.premiumSince.getTime() / 1000)}:F>`,
                    inline: true,
                });
            }
        } else {
            embed.addFields({
                name: '❌ Server Member',
                value: 'User is not in this server',
                inline: true,
            });
        }

        // Add bot info
        if (targetUser.bot) {
            embed.addFields({
                name: '🤖 Bot Account',
                value: 'This is a bot account',
                inline: true,
            });
        }

        // Add badges/flags
        const flags = targetUser.flags?.toArray() || [];
        if (flags.length > 0) {
            const flagEmojis: { [key: string]: string } = {
                Staff: '👨‍💼',
                Partner: '🤝',
                Hypesquad: '🎉',
                BugHunterLevel1: '🐛',
                BugHunterLevel2: '🐛',
                HypesquadOnlineHouse1: '🏠',
                HypesquadOnlineHouse2: '🏠',
                HypesquadOnlineHouse3: '🏠',
                PremiumEarlySupporter: '⭐',
                VerifiedDeveloper: '✅',
                CertifiedModerator: '🛡️',
                BotHTTPInteractions: '🔗',
            };

            const badgeText = flags
                .map(flag => `${flagEmojis[flag] || '🏆'} ${flag.replace(/([A-Z])/g, ' $1').trim()}`)
                .join('\n');

            embed.addFields({
                name: '🏆 Badges',
                value: badgeText,
                inline: false,
            });
        }

        embed.setFooter({
            text: `Requested by ${interaction.user.tag}`,
            iconURL: interaction.user.displayAvatarURL(),
        })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });

        client.logger.info(`User info viewed: ${targetUser.tag} by ${interaction.user.tag} in ${interaction.guild.name}`, {
            guildId: interaction.guildId,
            userId: interaction.user.id,
            targetUserId: targetUser.id,
            inServer: member !== null,
        });
    },
};

export default command;