import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, Role, PermissionFlagsBits } from 'discord.js';
import { Command, BotClient } from '../../types';

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('role-info')
        .setDescription('Get detailed information about a role')
        .addRoleOption(option =>
            option
                .setName('role')
                .setDescription('The role to get information about')
                .setRequired(true)
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guild) return;

        const client = interaction.client as BotClient;
        const role = interaction.options.getRole('role') as Role;

        if (!role) {
            await interaction.reply({
                content: '❌ Role not found.',
                ephemeral: true,
            });
            return;
        }

        // Get role permissions
        const permissions = role.permissions.toArray();
        const dangerousPerms = [
            'Administrator',
            'ManageGuild',
            'ManageRoles',
            'ManageChannels',
            'ManageMessages',
            'ManageWebhooks',
            'BanMembers',
            'KickMembers',
            'MentionEveryone',
        ];

        const hasDangerousPerms = permissions.some(perm => dangerousPerms.includes(perm));

        // Format creation date
        const createdTimestamp = Math.floor(role.createdTimestamp / 1000);

        // Get member count with this role
        const membersWithRole = role.members.size;

        // Format permissions display
        let permissionsText = 'None';
        if (permissions.length > 0) {
            if (permissions.includes('Administrator')) {
                permissionsText = '👑 Administrator (All Permissions)';
            } else {
                const displayPerms = permissions.slice(0, 10); // Show first 10 permissions
                permissionsText = displayPerms.map(perm => {
                    const formatted = perm.replace(/([A-Z])/g, ' $1').trim();
                    return dangerousPerms.includes(perm) ? `⚠️ ${formatted}` : formatted;
                }).join(', ');

                if (permissions.length > 10) {
                    permissionsText += `... and ${permissions.length - 10} more`;
                }
            }
        }

        const embed = new EmbedBuilder()
            .setTitle(`📋 Role Information - ${role.name}`)
            .setColor(role.color || 0x99aab5)
            .addFields(
                {
                    name: '🏷️ Basic Info',
                    value: [
                        `**Name:** ${role.name}`,
                        `**ID:** ${role.id}`,
                        `**Mention:** ${role.toString()}`,
                        `**Color:** ${role.hexColor}`,
                        `**Position:** ${role.position}`,
                    ].join('\n'),
                    inline: true,
                },
                {
                    name: '👥 Members & Status',
                    value: [
                        `**Members:** ${membersWithRole.toLocaleString()}`,
                        `**Mentionable:** ${role.mentionable ? 'Yes' : 'No'}`,
                        `**Displayed separately:** ${role.hoist ? 'Yes' : 'No'}`,
                        `**Managed by integration:** ${role.managed ? 'Yes' : 'No'}`,
                        `**Created:** <t:${createdTimestamp}:R>`,
                    ].join('\n'),
                    inline: true,
                }
            );

        // Add permissions field if role has any
        if (permissions.length > 0) {
            embed.addFields({
                name: `🔑 Key Permissions ${hasDangerousPerms ? '⚠️' : ''}`,
                value: permissionsText.length > 1024 ? permissionsText.substring(0, 1021) + '...' : permissionsText,
                inline: false,
            });
        }

        // Add warning for dangerous permissions
        if (hasDangerousPerms) {
            embed.addFields({
                name: '⚠️ Security Notice',
                value: 'This role has potentially dangerous permissions that could be misused.',
                inline: false,
            });
        }

        // Add role icon if available (Discord feature for premium guilds)
        if (role.iconURL()) {
            embed.setThumbnail(role.iconURL()!);
        }

        embed.setFooter({
            text: `Requested by ${interaction.user.tag}`,
            iconURL: interaction.user.displayAvatarURL(),
        })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });

        // Log the lookup
        client.logger.info(`Role info viewed: ${role.name} (${role.id}) by ${interaction.user.tag} (${interaction.user.id}) in ${interaction.guild.name}`, {
            guildId: interaction.guildId,
            userId: interaction.user.id,
            roleId: role.id,
            roleName: role.name,
        });
    },
};

export default command;