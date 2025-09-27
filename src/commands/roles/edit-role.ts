import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, GuildMember, Role, ColorResolvable } from 'discord.js';
import { Command, BotClient } from '../../types';

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('edit-role')
        .setDescription('Edit an existing role')
        .addRoleOption(option =>
            option
                .setName('role')
                .setDescription('The role to edit')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('name')
                .setDescription('New name for the role')
                .setRequired(false)
                .setMaxLength(100)
        )
        .addStringOption(option =>
            option
                .setName('color')
                .setDescription('New color for the role (hex code like #ff0000, or color name)')
                .setRequired(false)
        )
        .addBooleanOption(option =>
            option
                .setName('mentionable')
                .setDescription('Whether the role should be mentionable')
                .setRequired(false)
        )
        .addBooleanOption(option =>
            option
                .setName('hoist')
                .setDescription('Whether the role should be displayed separately in the member list')
                .setRequired(false)
        )
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('Reason for editing the role')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guild) return;

        const client = interaction.client as BotClient;
        const role = interaction.options.getRole('role') as Role;
        const newName = interaction.options.getString('name');
        const colorInput = interaction.options.getString('color');
        const mentionable = interaction.options.getBoolean('mentionable');
        const hoist = interaction.options.getBoolean('hoist');
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
                content: '❌ Cannot edit the @everyone role.',
                ephemeral: true,
            });
            return;
        }

        // Check if role is managed by an integration
        if (role.managed) {
            await interaction.reply({
                content: '❌ Cannot edit managed roles (bot roles, Nitro booster roles, etc.).',
                ephemeral: true,
            });
            return;
        }

        // Check if role is higher than moderator's highest role
        if (role.position >= moderator.roles.highest.position && moderator.id !== interaction.guild.ownerId) {
            await interaction.reply({
                content: '❌ You cannot edit a role that is equal to or higher than your highest role.',
                ephemeral: true,
            });
            return;
        }

        // Check if bot can manage the role
        const botMember = interaction.guild.members.me!;
        if (role.position >= botMember.roles.highest.position) {
            await interaction.reply({
                content: '❌ I cannot edit a role that is equal to or higher than my highest role.',
                ephemeral: true,
            });
            return;
        }

        // Check if at least one property is being changed
        if (!newName && !colorInput && mentionable === null && hoist === null) {
            await interaction.reply({
                content: '❌ You must specify at least one property to change.',
                ephemeral: true,
            });
            return;
        }

        // Check if new name already exists (if changing name)
        if (newName && newName !== role.name) {
            const existingRole = interaction.guild.roles.cache.find(r =>
                r.name.toLowerCase() === newName.toLowerCase() && r.id !== role.id
            );

            if (existingRole) {
                await interaction.reply({
                    content: `❌ A role with the name **${newName}** already exists.`,
                    ephemeral: true,
                });
                return;
            }
        }

        // Parse color
        let color: ColorResolvable | undefined;
        if (colorInput) {
            // Handle hex colors
            if (colorInput.startsWith('#')) {
                const hex = colorInput.slice(1);
                if (!/^[0-9A-Fa-f]{6}$/.test(hex)) {
                    await interaction.reply({
                        content: '❌ Invalid hex color format. Use format like #ff0000',
                        ephemeral: true,
                    });
                    return;
                }
                color = parseInt(hex, 16);
            } else {
                // Handle color names
                const colorNames: { [key: string]: number } = {
                    'red': 0xff0000,
                    'green': 0x00ff00,
                    'blue': 0x0000ff,
                    'yellow': 0xffff00,
                    'purple': 0x800080,
                    'orange': 0xffa500,
                    'pink': 0xffc0cb,
                    'black': 0x000000,
                    'white': 0xffffff,
                    'gray': 0x808080,
                    'grey': 0x808080,
                    'blurple': 0x5865f2,
                };

                const colorName = colorInput.toLowerCase();
                if (colorNames[colorName]) {
                    color = colorNames[colorName];
                } else {
                    await interaction.reply({
                        content: `❌ Unknown color name. Supported colors: ${Object.keys(colorNames).join(', ')}\n\nOr use hex format like #ff0000`,
                        ephemeral: true,
                    });
                    return;
                }
            }
        }

        // Store old values for comparison
        const oldName = role.name;
        const oldColor = role.hexColor;
        const oldMentionable = role.mentionable;
        const oldHoist = role.hoist;

        try {
            // Build edit options
            const editOptions: any = {
                reason: `Edited by ${moderator.user.tag}: ${reason}`,
            };

            if (newName) editOptions.name = newName;
            if (color !== undefined) editOptions.color = color;
            if (mentionable !== null) editOptions.mentionable = mentionable;
            if (hoist !== null) editOptions.hoist = hoist;

            // Edit the role
            await role.edit(editOptions);

            // Create changes summary
            const changes = [];
            if (newName && newName !== oldName) {
                changes.push(`**Name:** ${oldName} → ${newName}`);
            }
            if (color !== undefined) {
                const newHexColor = role.hexColor;
                changes.push(`**Color:** ${oldColor} → ${newHexColor}`);
            }
            if (mentionable !== null && mentionable !== oldMentionable) {
                changes.push(`**Mentionable:** ${oldMentionable ? 'Yes' : 'No'} → ${mentionable ? 'Yes' : 'No'}`);
            }
            if (hoist !== null && hoist !== oldHoist) {
                changes.push(`**Hoisted:** ${oldHoist ? 'Yes' : 'No'} → ${hoist ? 'Yes' : 'No'}`);
            }

            // Log to database
            await client.db.moderationLog.create({
                data: {
                    guildId: interaction.guildId!,
                    userId: 'system',
                    moderatorId: moderator.id,
                    action: 'ROLE_EDIT',
                    reason: `Edited role ${oldName}. Changes: ${changes.join(', ')}. Reason: ${reason}`,
                    metadata: {
                        roleId: role.id,
                        oldName: oldName,
                        newName: newName || oldName,
                        changes: changes,
                    },
                },
            });

            // Send success message
            await interaction.reply({
                content: [
                    `✅ Successfully edited role **${role.name}**!`,
                    '',
                    '**Changes made:**',
                    ...changes,
                    '',
                    `**Reason:** ${reason}`,
                ].join('\n'),
            });

            // Log the action
            client.logger.info(`Role edited: ${oldName} (${role.id}) by ${moderator.user.tag} (${moderator.id}) in ${interaction.guild.name}`, {
                guildId: interaction.guildId,
                moderatorId: moderator.id,
                roleId: role.id,
                oldName: oldName,
                newName: newName || oldName,
                changes: changes,
                reason,
            });

        } catch (error) {
            client.logger.error('Error editing role:', error);

            let errorMessage = '❌ An error occurred while editing the role.';

            if (error instanceof Error) {
                if (error.message.includes('Missing Permissions')) {
                    errorMessage = '❌ I don\'t have permission to edit roles.';
                } else if (error.message.includes('Unknown Role')) {
                    errorMessage = '❌ Role not found (it may have been deleted).';
                } else if (error.message.includes('hierarchy')) {
                    errorMessage = '❌ Cannot edit this role due to role hierarchy restrictions.';
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