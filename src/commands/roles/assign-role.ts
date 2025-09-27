import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, GuildMember, Role } from 'discord.js';
import { Command, BotClient } from '../../types';

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('assign-role')
        .setDescription('Assign a role to a user')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('The user to assign the role to')
                .setRequired(true)
        )
        .addRoleOption(option =>
            option
                .setName('role')
                .setDescription('The role to assign')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('Reason for assigning the role')
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

        // Check if user already has the role
        if (targetUser.roles.cache.has(role.id)) {
            await interaction.reply({
                content: `❌ ${targetUser.user.tag} already has the **${role.name}** role.`,
                ephemeral: true,
            });
            return;
        }

        // Check if role is manageable by the moderator
        if (role.position >= moderator.roles.highest.position && moderator.id !== interaction.guild.ownerId) {
            await interaction.reply({
                content: '❌ You cannot assign a role that is equal to or higher than your highest role.',
                ephemeral: true,
            });
            return;
        }

        // Check if bot can manage the role
        const botMember = interaction.guild.members.me!;
        if (role.position >= botMember.roles.highest.position) {
            await interaction.reply({
                content: '❌ I cannot assign a role that is equal to or higher than my highest role.',
                ephemeral: true,
            });
            return;
        }

        // Check if role is @everyone
        if (role.id === interaction.guild.id) {
            await interaction.reply({
                content: '❌ Cannot assign the @everyone role.',
                ephemeral: true,
            });
            return;
        }

        // Check if role is managed by an integration (bot roles, boosts, etc.)
        if (role.managed) {
            await interaction.reply({
                content: '❌ Cannot assign managed roles (bot roles, Nitro booster roles, etc.).',
                ephemeral: true,
            });
            return;
        }

        try {
            // Assign the role
            await targetUser.roles.add(role, reason);

            // Log to database
            await client.db.moderationLog.create({
                data: {
                    guildId: interaction.guildId!,
                    userId: targetUser.id,
                    moderatorId: moderator.id,
                    action: 'ROLE_ADD',
                    reason: `Assigned role ${role.name}. Reason: ${reason}`,
                    metadata: {
                        roleId: role.id,
                        roleName: role.name,
                    },
                },
            });

            // Send success message
            await interaction.reply({
                content: `✅ Successfully assigned the **${role.name}** role to **${targetUser.user.tag}**.\n**Reason:** ${reason}`,
            });

            // Try to DM the user
            try {
                await targetUser.send({
                    content: `You have been assigned the **${role.name}** role in **${interaction.guild.name}**.\n**Reason:** ${reason}`,
                });
            } catch (error) {
                // User has DMs disabled or blocked the bot
            }

            // Log the action
            client.logger.info(`Role assigned: ${role.name} (${role.id}) to ${targetUser.user.tag} (${targetUser.id}) by ${moderator.user.tag} (${moderator.id}) in ${interaction.guild.name}`, {
                guildId: interaction.guildId,
                userId: targetUser.id,
                moderatorId: moderator.id,
                roleId: role.id,
                roleName: role.name,
                reason,
            });

        } catch (error) {
            client.logger.error('Error assigning role:', error);

            let errorMessage = '❌ An error occurred while trying to assign the role.';

            if (error instanceof Error) {
                if (error.message.includes('Missing Permissions')) {
                    errorMessage = '❌ I don\'t have permission to manage roles.';
                } else if (error.message.includes('hierarchy')) {
                    errorMessage = '❌ Cannot assign this role due to role hierarchy restrictions.';
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