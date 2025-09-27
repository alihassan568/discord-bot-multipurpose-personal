import { SlashCommandBuilder, ChatInputCommandInteraction, GuildMember, Role } from 'discord.js';
import { Command, BotClient } from '../../types';

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('role-claim')
        .setDescription('Claim or unclaim a self-assignable role')
        .addRoleOption(option =>
            option
                .setName('role')
                .setDescription('The role to claim or unclaim')
                .setRequired(true)
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guild) return;

        const client = interaction.client as BotClient;
        const role = interaction.options.getRole('role') as Role;
        const member = interaction.member as GuildMember;

        if (!role) {
            await interaction.reply({
                content: '❌ Role not found.',
                ephemeral: true,
            });
            return;
        }

        // Check if the role is in the claimable roles list for this guild
        const guildConfig = await client.db.guild.findUnique({
            where: { id: interaction.guildId! },
            select: { claimableRoles: true },
        });

        const claimableRoles = (guildConfig?.claimableRoles as string[]) || [];

        if (!claimableRoles.includes(role.id)) {
            await interaction.reply({
                content: '❌ This role is not self-assignable. An administrator must make it claimable first.',
                ephemeral: true,
            });
            return;
        }

        // Check if role is @everyone
        if (role.id === interaction.guild.id) {
            await interaction.reply({
                content: '❌ Cannot claim the @everyone role.',
                ephemeral: true,
            });
            return;
        }

        // Check if role is managed by an integration
        if (role.managed) {
            await interaction.reply({
                content: '❌ Cannot claim managed roles (bot roles, Nitro booster roles, etc.).',
                ephemeral: true,
            });
            return;
        }

        // Check if bot can manage the role
        const botMember = interaction.guild.members.me!;
        if (role.position >= botMember.roles.highest.position) {
            await interaction.reply({
                content: '❌ I cannot manage this role due to role hierarchy restrictions.',
                ephemeral: true,
            });
            return;
        }

        const hasRole = member.roles.cache.has(role.id);

        try {
            if (hasRole) {
                // Remove the role
                await member.roles.remove(role, 'Self-removed via role claim command');

                // Log to database
                await client.db.moderationLog.create({
                    data: {
                        guildId: interaction.guildId!,
                        userId: member.id,
                        moderatorId: member.id,
                        action: 'ROLE_REMOVE',
                        reason: `Self-removed role ${role.name}`,
                        metadata: {
                            roleId: role.id,
                            roleName: role.name,
                            selfAssigned: true,
                        },
                    },
                });

                await interaction.reply({
                    content: `✅ Successfully removed the **${role.name}** role from yourself.`,
                    ephemeral: true,
                });

                client.logger.info(`Role self-removed: ${role.name} (${role.id}) by ${member.user.tag} (${member.id}) in ${interaction.guild.name}`, {
                    guildId: interaction.guildId,
                    userId: member.id,
                    roleId: role.id,
                    roleName: role.name,
                    action: 'remove',
                });

            } else {
                // Add the role
                await member.roles.add(role, 'Self-assigned via role claim command');

                // Log to database
                await client.db.moderationLog.create({
                    data: {
                        guildId: interaction.guildId!,
                        userId: member.id,
                        moderatorId: member.id,
                        action: 'ROLE_ADD',
                        reason: `Self-assigned role ${role.name}`,
                        metadata: {
                            roleId: role.id,
                            roleName: role.name,
                            selfAssigned: true,
                        },
                    },
                });

                await interaction.reply({
                    content: `✅ Successfully assigned the **${role.name}** role to yourself.`,
                    ephemeral: true,
                });

                client.logger.info(`Role self-assigned: ${role.name} (${role.id}) by ${member.user.tag} (${member.id}) in ${interaction.guild.name}`, {
                    guildId: interaction.guildId,
                    userId: member.id,
                    roleId: role.id,
                    roleName: role.name,
                    action: 'add',
                });
            }

        } catch (error) {
            client.logger.error('Error in role claim:', error);

            let errorMessage = '❌ An error occurred while managing your role.';

            if (error instanceof Error) {
                if (error.message.includes('Missing Permissions')) {
                    errorMessage = '❌ I don\'t have permission to manage this role.';
                } else if (error.message.includes('hierarchy')) {
                    errorMessage = '❌ Cannot manage this role due to role hierarchy restrictions.';
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