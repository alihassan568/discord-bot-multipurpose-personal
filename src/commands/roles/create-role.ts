import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, GuildMember, ColorResolvable } from 'discord.js';
import { Command, BotClient } from '../../types';

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('create-role')
        .setDescription('Create a new role')
        .addStringOption(option =>
            option
                .setName('name')
                .setDescription('Name of the role')
                .setRequired(true)
                .setMaxLength(100)
        )
        .addStringOption(option =>
            option
                .setName('color')
                .setDescription('Role color (hex code like #ff0000, or color name)')
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
                .setDescription('Reason for creating the role')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guild) return;

        const client = interaction.client as BotClient;
        const name = interaction.options.getString('name', true);
        const colorInput = interaction.options.getString('color');
        const mentionable = interaction.options.getBoolean('mentionable') ?? false;
        const hoist = interaction.options.getBoolean('hoist') ?? false;
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const moderator = interaction.member as GuildMember;

        // Check if role with same name already exists
        const existingRole = interaction.guild.roles.cache.find(role =>
            role.name.toLowerCase() === name.toLowerCase()
        );

        if (existingRole) {
            await interaction.reply({
                content: `❌ A role with the name **${name}** already exists.`,
                ephemeral: true,
            });
            return;
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

        // Check bot permissions
        const botMember = interaction.guild.members.me!;
        if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
            await interaction.reply({
                content: '❌ I don\'t have permission to manage roles.',
                ephemeral: true,
            });
            return;
        }

        try {
            // Create the role
            const roleOptions: any = {
                name: name,
                mentionable: mentionable,
                hoist: hoist,
                reason: `Created by ${moderator.user.tag}: ${reason}`,
            };

            if (color !== undefined) {
                roleOptions.color = color;
            }

            const newRole = await interaction.guild.roles.create(roleOptions);

            // Log to database
            await client.db.moderationLog.create({
                data: {
                    guildId: interaction.guildId!,
                    userId: 'system',
                    moderatorId: moderator.id,
                    action: 'ROLE_CREATE',
                    reason: `Created role ${name}. Reason: ${reason}`,
                    metadata: {
                        roleId: newRole.id,
                        roleName: name,
                        color: color?.toString() || 'default',
                        mentionable,
                        hoist,
                    },
                },
            });

            // Send success message
            await interaction.reply({
                content: [
                    `✅ Successfully created role **${newRole.name}**!`,
                    `**ID:** ${newRole.id}`,
                    `**Color:** ${newRole.hexColor}`,
                    `**Mentionable:** ${mentionable ? 'Yes' : 'No'}`,
                    `**Hoisted:** ${hoist ? 'Yes' : 'No'}`,
                    `**Reason:** ${reason}`,
                ].join('\n'),
            });

            // Log the action
            client.logger.info(`Role created: ${name} (${newRole.id}) by ${moderator.user.tag} (${moderator.id}) in ${interaction.guild.name}`, {
                guildId: interaction.guildId,
                moderatorId: moderator.id,
                roleId: newRole.id,
                roleName: name,
                color: color?.toString() || 'default',
                mentionable,
                hoist,
                reason,
            });

        } catch (error) {
            client.logger.error('Error creating role:', error);

            let errorMessage = '❌ An error occurred while creating the role.';

            if (error instanceof Error) {
                if (error.message.includes('Missing Permissions')) {
                    errorMessage = '❌ I don\'t have permission to create roles.';
                } else if (error.message.includes('Maximum number of roles')) {
                    errorMessage = '❌ This server has reached the maximum number of roles (250).';
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