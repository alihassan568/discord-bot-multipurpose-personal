import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, GuildMember, Role, EmbedBuilder } from 'discord.js';
import { Command, BotClient } from '../../types';

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('role-claimable')
        .setDescription('Manage which roles can be self-assigned')
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Make a role self-assignable')
                .addRoleOption(option =>
                    option
                        .setName('role')
                        .setDescription('The role to make claimable')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove a role from being self-assignable')
                .addRoleOption(option =>
                    option
                        .setName('role')
                        .setDescription('The role to remove from claimable')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all self-assignable roles')
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guild) return;

        const client = interaction.client as BotClient;
        const subcommand = interaction.options.getSubcommand();
        const moderator = interaction.member as GuildMember;

        // Get current guild configuration
        let guildConfig = await client.db.guild.findUnique({
            where: { id: interaction.guildId! },
            select: { claimableRoles: true },
        });

        if (!guildConfig) {
            // Create guild config if it doesn't exist
            guildConfig = await client.db.guild.create({
                data: {
                    id: interaction.guildId!,
                    name: interaction.guild.name,
                    claimableRoles: [],
                },
                select: { claimableRoles: true },
            });
        }

        const claimableRoles = (guildConfig.claimableRoles as string[]) || [];

        switch (subcommand) {
            case 'add': {
                const role = interaction.options.getRole('role') as Role;

                if (!role) {
                    await interaction.reply({
                        content: '❌ Role not found.',
                        ephemeral: true,
                    });
                    return;
                }

                // Validation checks
                if (role.id === interaction.guild.id) {
                    await interaction.reply({
                        content: '❌ Cannot make the @everyone role claimable.',
                        ephemeral: true,
                    });
                    return;
                }

                if (role.managed) {
                    await interaction.reply({
                        content: '❌ Cannot make managed roles claimable (bot roles, Nitro booster roles, etc.).',
                        ephemeral: true,
                    });
                    return;
                }

                if (role.position >= moderator.roles.highest.position && moderator.id !== interaction.guild.ownerId) {
                    await interaction.reply({
                        content: '❌ You cannot manage a role that is equal to or higher than your highest role.',
                        ephemeral: true,
                    });
                    return;
                }

                const botMember = interaction.guild.members.me!;
                if (role.position >= botMember.roles.highest.position) {
                    await interaction.reply({
                        content: '❌ I cannot manage a role that is equal to or higher than my highest role.',
                        ephemeral: true,
                    });
                    return;
                }

                if (claimableRoles.includes(role.id)) {
                    await interaction.reply({
                        content: `❌ The **${role.name}** role is already self-assignable.`,
                        ephemeral: true,
                    });
                    return;
                }

                // Add role to claimable list
                const updatedClaimableRoles = [...claimableRoles, role.id];

                await client.db.guild.update({
                    where: { id: interaction.guildId! },
                    data: { claimableRoles: updatedClaimableRoles },
                });

                // Log to database
                await client.db.moderationLog.create({
                    data: {
                        guildId: interaction.guildId!,
                        userId: 'system',
                        moderatorId: moderator.id,
                        action: 'CONFIG_CHANGE',
                        reason: `Made role ${role.name} self-assignable`,
                        metadata: {
                            roleId: role.id,
                            roleName: role.name,
                            configType: 'claimable_role_add',
                        },
                    },
                });

                await interaction.reply({
                    content: `✅ The **${role.name}** role is now self-assignable! Users can use \`/role-claim\` to assign it to themselves.`,
                });

                client.logger.info(`Role made claimable: ${role.name} (${role.id}) by ${moderator.user.tag} (${moderator.id}) in ${interaction.guild.name}`, {
                    guildId: interaction.guildId,
                    moderatorId: moderator.id,
                    roleId: role.id,
                    roleName: role.name,
                });
                break;
            }

            case 'remove': {
                const role = interaction.options.getRole('role') as Role;

                if (!role) {
                    await interaction.reply({
                        content: '❌ Role not found.',
                        ephemeral: true,
                    });
                    return;
                }

                if (!claimableRoles.includes(role.id)) {
                    await interaction.reply({
                        content: `❌ The **${role.name}** role is not currently self-assignable.`,
                        ephemeral: true,
                    });
                    return;
                }

                // Remove role from claimable list
                const updatedClaimableRoles = claimableRoles.filter(roleId => roleId !== role.id);

                await client.db.guild.update({
                    where: { id: interaction.guildId! },
                    data: { claimableRoles: updatedClaimableRoles },
                });

                // Log to database
                await client.db.moderationLog.create({
                    data: {
                        guildId: interaction.guildId!,
                        userId: 'system',
                        moderatorId: moderator.id,
                        action: 'CONFIG_CHANGE',
                        reason: `Removed role ${role.name} from being self-assignable`,
                        metadata: {
                            roleId: role.id,
                            roleName: role.name,
                            configType: 'claimable_role_remove',
                        },
                    },
                });

                await interaction.reply({
                    content: `✅ The **${role.name}** role is no longer self-assignable.`,
                });

                client.logger.info(`Role removed from claimable: ${role.name} (${role.id}) by ${moderator.user.tag} (${moderator.id}) in ${interaction.guild.name}`, {
                    guildId: interaction.guildId,
                    moderatorId: moderator.id,
                    roleId: role.id,
                    roleName: role.name,
                });
                break;
            }

            case 'list': {
                if (claimableRoles.length === 0) {
                    await interaction.reply({
                        content: '📝 No roles are currently set as self-assignable.\n\nUse `/role-claimable add <role>` to make roles claimable.',
                        ephemeral: true,
                    });
                    return;
                }

                // Get role objects and filter out deleted roles
                const roleObjects = claimableRoles
                    .map(roleId => interaction.guild!.roles.cache.get(roleId))
                    .filter(role => role !== undefined) as Role[];

                // Remove deleted roles from the database
                if (roleObjects.length !== claimableRoles.length) {
                    const validRoleIds = roleObjects.map(role => role.id);
                    await client.db.guild.update({
                        where: { id: interaction.guildId! },
                        data: { claimableRoles: validRoleIds },
                    });
                }

                if (roleObjects.length === 0) {
                    await interaction.reply({
                        content: '📝 No valid self-assignable roles found. All previously configured roles may have been deleted.',
                        ephemeral: true,
                    });
                    return;
                }

                const embed = new EmbedBuilder()
                    .setTitle('🏷️ Self-Assignable Roles')
                    .setColor(0x5865f2)
                    .setDescription(`Users can claim these roles using \`/role-claim\`:`)
                    .addFields({
                        name: 'Available Roles',
                        value: roleObjects
                            .sort((a, b) => b.position - a.position)
                            .map((role, index) => `${index + 1}. ${role.toString()} - **${role.name}**`)
                            .join('\n'),
                        inline: false,
                    })
                    .setFooter({
                        text: `${roleObjects.length} role${roleObjects.length === 1 ? '' : 's'} available • Requested by ${interaction.user.tag}`,
                        iconURL: interaction.user.displayAvatarURL(),
                    })
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });
                break;
            }
        }
    },
};

export default command;