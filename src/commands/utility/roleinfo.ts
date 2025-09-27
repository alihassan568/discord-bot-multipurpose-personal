import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    EmbedBuilder,
    Role,
    PermissionFlagsBits
} from 'discord.js';
import { Command, BotClient } from '../../types';

function formatPermissions(permissions: bigint[]): string {
    const permissionNames = permissions.map(permission => {
        const entries = Object.entries(PermissionFlagsBits);
        const found = entries.find(([, value]) => value === permission);
        return found ? found[0].replace(/([A-Z])/g, ' $1').trim() : 'Unknown';
    });

    return permissionNames.length > 0 ? permissionNames.join(', ') : 'None';
}

function formatRoleColor(color: number): string {
    if (color === 0) return 'Default';
    return `#${color.toString(16).padStart(6, '0').toUpperCase()}`;
}

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('roleinfo')
        .setDescription('Get detailed information about a role')
        .addRoleOption(option =>
            option
                .setName('role')
                .setDescription('The role to get information about')
                .setRequired(true)
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        const client = interaction.client as BotClient;
        const role = interaction.options.getRole('role', true) as Role;

        if (!interaction.guild) {
            await interaction.reply({
                content: '❌ This command can only be used in a server!',
                ephemeral: true,
            });
            return;
        }

        try {
            // Fetch fresh role data to ensure accuracy
            const freshRole = await interaction.guild.roles.fetch(role.id);
            if (!freshRole) {
                await interaction.reply({
                    content: '❌ Role not found! It may have been deleted.',
                    ephemeral: true,
                });
                return;
            }

            // Count members with this role
            const membersWithRole = interaction.guild.members.cache.filter(member =>
                member.roles.cache.has(freshRole.id)
            ).size;

            // Get role permissions
            const permissions = freshRole.permissions.toArray();
            const dangerousPermissions = permissions.filter(permission => [
                'Administrator',
                'ManageGuild',
                'ManageRoles',
                'ManageChannels',
                'ManageMessages',
                'BanMembers',
                'KickMembers',
                'MentionEveryone'
            ].includes(permission));

            const embed = new EmbedBuilder()
                .setTitle(`🏷️ Role Information: ${freshRole.name}`)
                .setColor(freshRole.color || 0x00aaff)
                .addFields(
                    {
                        name: '🆔 Role ID',
                        value: `\`${freshRole.id}\``,
                        inline: true,
                    },
                    {
                        name: '🎨 Color',
                        value: formatRoleColor(freshRole.color),
                        inline: true,
                    },
                    {
                        name: '📊 Position',
                        value: freshRole.position.toString(),
                        inline: true,
                    },
                    {
                        name: '👥 Members',
                        value: membersWithRole.toString(),
                        inline: true,
                    },
                    {
                        name: '📝 Mentionable',
                        value: freshRole.mentionable ? '✅ Yes' : '❌ No',
                        inline: true,
                    },
                    {
                        name: '🔗 Hoisted',
                        value: freshRole.hoist ? '✅ Yes' : '❌ No',
                        inline: true,
                    }
                )
                .setTimestamp()
                .setFooter({
                    text: `Requested by ${interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL(),
                });

            // Add creation date
            embed.addFields({
                name: '📅 Created',
                value: `<t:${Math.floor(freshRole.createdTimestamp / 1000)}:F>\n<t:${Math.floor(freshRole.createdTimestamp / 1000)}:R>`,
                inline: false,
            });

            // Add role mention (if possible)
            if (freshRole.mentionable ||
                (interaction.member &&
                    typeof interaction.member.permissions !== 'string' &&
                    interaction.member.permissions.has(PermissionFlagsBits.MentionEveryone))) {
                embed.addFields({
                    name: '🔖 Mention',
                    value: `${freshRole}`,
                    inline: false,
                });
            }

            // Add dangerous permissions warning
            if (dangerousPermissions.length > 0) {
                embed.addFields({
                    name: '⚠️ Dangerous Permissions',
                    value: dangerousPermissions.map(p => `\`${p}\``).join(', '),
                    inline: false,
                });
            }

            // Add permissions (truncated if too long)
            const permissionList = permissions.length > 0
                ? permissions.map(p => `\`${p}\``).join(', ')
                : 'None';

            if (permissionList.length > 1000) {
                embed.addFields({
                    name: '🔐 Key Permissions',
                    value: permissions.slice(0, 10).map(p => `\`${p}\``).join(', ') +
                        (permissions.length > 10 ? `\n... and ${permissions.length - 10} more` : ''),
                    inline: false,
                });
            } else {
                embed.addFields({
                    name: '🔐 Permissions',
                    value: permissionList,
                    inline: false,
                });
            }

            // Add integration info if it's a bot role
            if (freshRole.managed) {
                embed.addFields({
                    name: '🤖 Managed Role',
                    value: 'This role is managed by an integration (bot, booster role, etc.)',
                    inline: false,
                });
            }

            await interaction.reply({ embeds: [embed] });

            client.logger.info(`Role info requested by ${interaction.user.tag}`, {
                guildId: interaction.guildId,
                userId: interaction.user.id,
                roleId: freshRole.id,
                roleName: freshRole.name,
                memberCount: membersWithRole,
            });

        } catch (error) {
            client.logger.error('Error in roleinfo command', {
                error: error instanceof Error ? error.message : 'Unknown error',
                guildId: interaction.guildId,
                userId: interaction.user.id,
                roleId: role.id,
            });

            await interaction.reply({
                content: '❌ An error occurred while fetching role information. Please try again later!',
                ephemeral: true,
            });
        }
    },
};

export default command;