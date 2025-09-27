import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, GuildMember, Role } from 'discord.js';
import { Command, BotClient } from '../../types';

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('remove-role')
        .setDescription('Remove a role from a user')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('The user to remove the role from')
                .setRequired(true)
        )
        .addRoleOption(option =>
            option
                .setName('role')
                .setDescription('The role to remove')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('Reason for removing the role')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guild) return;

        const client = interaction.client as BotClient;
        const targetUser = interaction.options.getMember('user') as GuildMember;
        const role = interaction.options.getRole('role') as Role;
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const moderator = interaction.member as GuildMember;

        // Validation checks
        if (!targetUser) {
            await interaction.reply({
                content: '❌ User not found or not a member of this server.',
                ephemeral: true,
            });
            return;
        }

        if (!role) {
            await interaction.reply({
                content: '❌ Role not found.',
                ephemeral: true,
            });
            return;
        }

        // Check if user has the role
        if (!targetUser.roles.cache.has(role.id)) {
            await interaction.reply({
                content: `❌ ${targetUser.user.tag} doesn't have the **${role.name}** role.`,
                ephemeral: true,
            });
            return;
        }

        // Check if role is manageable by the moderator
        if (role.position >= moderator.roles.highest.position && moderator.id !== interaction.guild.ownerId) {
            await interaction.reply({
                content: '❌ You cannot remove a role that is equal to or higher than your highest role.',
                ephemeral: true,
            });
            return;
        }

        // Check if bot can manage the role
        const botMember = interaction.guild.members.me!;
        if (role.position >= botMember.roles.highest.position) {
            await interaction.reply({
                content: '❌ I cannot remove a role that is equal to or higher than my highest role.',
                ephemeral: true,
            });
            return;
        }

        // Check if role is @everyone
        if (role.id === interaction.guild.id) {
            await interaction.reply({
                content: '❌ Cannot remove the @everyone role.',
                ephemeral: true,
            });
            return;
        }

        // Check if role is managed by an integration (bot roles, boosts, etc.)
        if (role.managed) {
            await interaction.reply({
                content: '❌ Cannot remove managed roles (bot roles, Nitro booster roles, etc.).',
                ephemeral: true,
            });
            return;
        }

        try {
            // Remove the role
            await targetUser.roles.remove(role, reason);

            // Log to database
            await client.db.moderationLog.create({
                data: {
                    guildId: interaction.guildId!,
                    userId: targetUser.id,
                    moderatorId: moderator.id,
                    action: 'ROLE_REMOVE',
                    reason: `Removed role ${role.name}. Reason: ${reason}`,
                    metadata: {
                        roleId: role.id,
                        roleName: role.name,
                    },
                },
            });

            // Send success message
            await interaction.reply({
                content: `✅ Successfully removed the **${role.name}** role from **${targetUser.user.tag}**.\n**Reason:** ${reason}`,
            });

            // Try to DM the user
            try {
                await targetUser.send({
                    content: `The **${role.name}** role has been removed from you in **${interaction.guild.name}**.\n**Reason:** ${reason}`,
                });
            } catch (error) {
                // User has DMs disabled or blocked the bot
            }

            // Log the action
            client.logger.info(`Role removed: ${role.name} (${role.id}) from ${targetUser.user.tag} (${targetUser.id}) by ${moderator.user.tag} (${moderator.id}) in ${interaction.guild.name}`, {
                guildId: interaction.guildId,
                userId: targetUser.id,
                moderatorId: moderator.id,
                roleId: role.id,
                roleName: role.name,
                reason,
            });

        } catch (error) {
            client.logger.error('Error removing role:', error);

            let errorMessage = '❌ An error occurred while trying to remove the role.';

            if (error instanceof Error) {
                if (error.message.includes('Missing Permissions')) {
                    errorMessage = '❌ I don\'t have permission to manage roles.';
                } else if (error.message.includes('hierarchy')) {
                    errorMessage = '❌ Cannot remove this role due to role hierarchy restrictions.';
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