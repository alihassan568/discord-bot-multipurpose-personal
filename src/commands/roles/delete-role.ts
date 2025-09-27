import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, GuildMember, Role } from 'discord.js';
import { Command, BotClient } from '../../types';

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('delete-role')
        .setDescription('Delete a role')
        .addRoleOption(option =>
            option
                .setName('role')
                .setDescription('The role to delete')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('Reason for deleting the role')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guild) return;

        const client = interaction.client as BotClient;
        const role = interaction.options.getRole('role') as Role;
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const moderator = interaction.member as GuildMember;

        if (!role) {
            await interaction.reply({
                content: '❌ Role not found.',
                ephemeral: true,
            });
            return;
        }

        // Check if role is @everyone
        if (role.id === interaction.guild.id) {
            await interaction.reply({
                content: '❌ Cannot delete the @everyone role.',
                ephemeral: true,
            });
            return;
        }

        // Check if role is managed by an integration
        if (role.managed) {
            await interaction.reply({
                content: '❌ Cannot delete managed roles (bot roles, Nitro booster roles, etc.).',
                ephemeral: true,
            });
            return;
        }

        // Check if role is higher than moderator's highest role
        if (role.position >= moderator.roles.highest.position && moderator.id !== interaction.guild.ownerId) {
            await interaction.reply({
                content: '❌ You cannot delete a role that is equal to or higher than your highest role.',
                ephemeral: true,
            });
            return;
        }

        // Check if bot can manage the role
        const botMember = interaction.guild.members.me!;
        if (role.position >= botMember.roles.highest.position) {
            await interaction.reply({
                content: '❌ I cannot delete a role that is equal to or higher than my highest role.',
                ephemeral: true,
            });
            return;
        }

        // Store role information before deletion
        const roleName = role.name;
        const roleId = role.id;
        const memberCount = role.members.size;

        try {
            // Delete the role
            await role.delete(`Deleted by ${moderator.user.tag}: ${reason}`);

            // Log to database
            await client.db.moderationLog.create({
                data: {
                    guildId: interaction.guildId!,
                    userId: 'system',
                    moderatorId: moderator.id,
                    action: 'ROLE_DELETE',
                    reason: `Deleted role ${roleName} (had ${memberCount} members). Reason: ${reason}`,
                    metadata: {
                        roleId: roleId,
                        roleName: roleName,
                        memberCount: memberCount,
                    },
                },
            });

            // Send success message
            await interaction.reply({
                content: [
                    `✅ Successfully deleted role **${roleName}**!`,
                    `**ID:** ${roleId}`,
                    `**Members affected:** ${memberCount.toLocaleString()}`,
                    `**Reason:** ${reason}`,
                ].join('\n'),
            });

            // Log the action
            client.logger.info(`Role deleted: ${roleName} (${roleId}) with ${memberCount} members by ${moderator.user.tag} (${moderator.id}) in ${interaction.guild.name}`, {
                guildId: interaction.guildId,
                moderatorId: moderator.id,
                roleId: roleId,
                roleName: roleName,
                memberCount: memberCount,
                reason,
            });

        } catch (error) {
            client.logger.error('Error deleting role:', error);

            let errorMessage = '❌ An error occurred while deleting the role.';

            if (error instanceof Error) {
                if (error.message.includes('Missing Permissions')) {
                    errorMessage = '❌ I don\'t have permission to delete roles.';
                } else if (error.message.includes('Unknown Role')) {
                    errorMessage = '❌ Role not found (it may have already been deleted).';
                } else if (error.message.includes('hierarchy')) {
                    errorMessage = '❌ Cannot delete this role due to role hierarchy restrictions.';
                }
            }

            await interaction.reply({
                content: errorMessage,
                ephemeral: true,
            });
        }
    },
};

export default command;