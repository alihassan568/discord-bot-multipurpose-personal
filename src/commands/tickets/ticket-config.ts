import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    PermissionFlagsBits,
    GuildMember,
    EmbedBuilder,
    ChannelType,
    CategoryChannel,
    TextChannel,
    Role
} from 'discord.js';
import { Command, BotClient } from '../../types';

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('ticket-config')
        .setDescription('Configure the ticket system')
        .addSubcommand(subcommand =>
            subcommand
                .setName('setup')
                .setDescription('Set up the ticket system with default settings')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('category')
                .setDescription('Set the category for ticket channels')
                .addChannelOption(option =>
                    option
                        .setName('category')
                        .setDescription('Category channel for tickets')
                        .addChannelTypes(ChannelType.GuildCategory)
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('support-role')
                .setDescription('Set the support role for ticket access')
                .addRoleOption(option =>
                    option
                        .setName('role')
                        .setDescription('Role that can access all tickets')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('log-channel')
                .setDescription('Set the channel for ticket logs')
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('Channel for ticket logs')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('View current ticket system configuration')
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guild) return;

        const client = interaction.client as BotClient;
        const subcommand = interaction.options.getSubcommand();
        const member = interaction.member as GuildMember;

        switch (subcommand) {
            case 'setup':
                await handleSetup(interaction, client, member);
                break;
            case 'category':
                await handleSetCategory(interaction, client, member);
                break;
            case 'support-role':
                await handleSetSupportRole(interaction, client, member);
                break;
            case 'log-channel':
                await handleSetLogChannel(interaction, client, member);
                break;
            case 'view':
                await handleViewConfig(interaction, client, member);
                break;
        }
    },
};

async function handleSetup(interaction: ChatInputCommandInteraction, client: BotClient, member: GuildMember) {
    await interaction.deferReply();

    try {
        // Create ticket category
        const ticketCategory = await interaction.guild!.channels.create({
            name: '🎫 Tickets',
            type: ChannelType.GuildCategory,
            permissionOverwrites: [
                {
                    id: interaction.guild!.id, // @everyone
                    deny: [PermissionFlagsBits.ViewChannel],
                },
                {
                    id: client.user!.id, // Bot
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.ManageChannels,
                        PermissionFlagsBits.SendMessages,
                    ],
                },
            ],
        });

        // Create ticket logs channel
        const logChannel = await interaction.guild!.channels.create({
            name: 'ticket-logs',
            type: ChannelType.GuildText,
            topic: 'Automated ticket system logs',
            permissionOverwrites: [
                {
                    id: interaction.guild!.id, // @everyone
                    deny: [PermissionFlagsBits.SendMessages],
                },
            ],
        });

        // Try to create a support role (optional)
        let supportRole: Role | null = null;
        try {
            supportRole = await interaction.guild!.roles.create({
                name: 'Ticket Support',
                color: 0x0099ff,
                reason: 'Automatic ticket system setup',
            });
        } catch (error) {
            // Role creation failed, will mention this in response
        }

        // Update guild configuration
        await client.db.guild.upsert({
            where: { id: interaction.guildId! },
            update: {
                ticketCategoryId: ticketCategory.id,
                ticketLogChannelId: logChannel.id,
                ticketSupportRoleId: supportRole?.id || null,
            },
            create: {
                id: interaction.guildId!,
                name: interaction.guild!.name,
                ticketCategoryId: ticketCategory.id,
                ticketLogChannelId: logChannel.id,
                ticketSupportRoleId: supportRole?.id || null,
            },
        });

        const embed = new EmbedBuilder()
            .setTitle('✅ Ticket System Setup Complete')
            .setColor(0x00ff00)
            .addFields(
                {
                    name: '📂 Ticket Category',
                    value: ticketCategory.toString(),
                    inline: true,
                },
                {
                    name: '📊 Log Channel',
                    value: logChannel.toString(),
                    inline: true,
                },
                {
                    name: '👥 Support Role',
                    value: supportRole ? supportRole.toString() : 'Not created (insufficient permissions)',
                    inline: true,
                }
            )
            .addFields({
                name: '📝 Next Steps',
                value: [
                    '• Assign the support role to staff members',
                    '• Users can now create tickets with `/ticket create`',
                    '• Staff can manage tickets in the ticket channels',
                    '• All ticket activity will be logged',
                ].join('\n'),
            })
            .setFooter({ text: 'Ticket system ready for use!' })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });

        client.logger.info(`Ticket system set up by ${member.user.tag} in ${interaction.guild!.name}`, {
            guildId: interaction.guildId,
            setupBy: member.id,
            categoryId: ticketCategory.id,
            logChannelId: logChannel.id,
            supportRoleId: supportRole?.id || null,
        });

    } catch (error) {
        client.logger.error('Error setting up ticket system:', error);
        await interaction.editReply({
            content: '❌ An error occurred while setting up the ticket system. Please check my permissions and try again.',
        });
    }
}

async function handleSetCategory(interaction: ChatInputCommandInteraction, client: BotClient, member: GuildMember) {
    const category = interaction.options.getChannel('category', true) as CategoryChannel;

    try {
        await client.db.guild.upsert({
            where: { id: interaction.guildId! },
            update: { ticketCategoryId: category.id },
            create: {
                id: interaction.guildId!,
                name: interaction.guild!.name,
                ticketCategoryId: category.id,
            },
        });

        await interaction.reply({
            content: `✅ Ticket category set to ${category.toString()}`,
        });

        client.logger.info(`Ticket category updated by ${member.user.tag} in ${interaction.guild!.name}`, {
            guildId: interaction.guildId,
            updatedBy: member.id,
            categoryId: category.id,
        });

    } catch (error) {
        client.logger.error('Error setting ticket category:', error);
        await interaction.reply({
            content: '❌ An error occurred while setting the ticket category.',
            ephemeral: true,
        });
    }
}

async function handleSetSupportRole(interaction: ChatInputCommandInteraction, client: BotClient, member: GuildMember) {
    const role = interaction.options.getRole('role', true) as Role;

    try {
        await client.db.guild.upsert({
            where: { id: interaction.guildId! },
            update: { ticketSupportRoleId: role.id },
            create: {
                id: interaction.guildId!,
                name: interaction.guild!.name,
                ticketSupportRoleId: role.id,
            },
        });

        await interaction.reply({
            content: `✅ Ticket support role set to ${role.toString()}`,
        });

        client.logger.info(`Ticket support role updated by ${member.user.tag} in ${interaction.guild!.name}`, {
            guildId: interaction.guildId,
            updatedBy: member.id,
            supportRoleId: role.id,
        });

    } catch (error) {
        client.logger.error('Error setting support role:', error);
        await interaction.reply({
            content: '❌ An error occurred while setting the support role.',
            ephemeral: true,
        });
    }
}

async function handleSetLogChannel(interaction: ChatInputCommandInteraction, client: BotClient, member: GuildMember) {
    const channel = interaction.options.getChannel('channel', true) as TextChannel;

    try {
        await client.db.guild.upsert({
            where: { id: interaction.guildId! },
            update: { ticketLogChannelId: channel.id },
            create: {
                id: interaction.guildId!,
                name: interaction.guild!.name,
                ticketLogChannelId: channel.id,
            },
        });

        await interaction.reply({
            content: `✅ Ticket log channel set to ${channel.toString()}`,
        });

        client.logger.info(`Ticket log channel updated by ${member.user.tag} in ${interaction.guild!.name}`, {
            guildId: interaction.guildId,
            updatedBy: member.id,
            logChannelId: channel.id,
        });

    } catch (error) {
        client.logger.error('Error setting log channel:', error);
        await interaction.reply({
            content: '❌ An error occurred while setting the log channel.',
            ephemeral: true,
        });
    }
}

async function handleViewConfig(interaction: ChatInputCommandInteraction, client: BotClient, member: GuildMember) {
    const guildConfig = await client.db.guild.findUnique({
        where: { id: interaction.guildId! },
        select: {
            ticketCategoryId: true,
            ticketSupportRoleId: true,
            ticketLogChannelId: true
        },
    });

    const embed = new EmbedBuilder()
        .setTitle('🎫 Ticket System Configuration')
        .setColor(0x5865f2);

    if (!guildConfig || (!guildConfig.ticketCategoryId && !guildConfig.ticketSupportRoleId && !guildConfig.ticketLogChannelId)) {
        embed.setDescription('❌ Ticket system is not configured. Use `/ticket-config setup` to get started.');
    } else {
        const category = guildConfig.ticketCategoryId ?
            interaction.guild!.channels.cache.get(guildConfig.ticketCategoryId) || '❌ Deleted' :
            '❌ Not set';

        const supportRole = guildConfig.ticketSupportRoleId ?
            interaction.guild!.roles.cache.get(guildConfig.ticketSupportRoleId) || '❌ Deleted' :
            '❌ Not set';

        const logChannel = guildConfig.ticketLogChannelId ?
            interaction.guild!.channels.cache.get(guildConfig.ticketLogChannelId) || '❌ Deleted' :
            '❌ Not set';

        embed.addFields(
            {
                name: '📂 Ticket Category',
                value: category.toString(),
                inline: true,
            },
            {
                name: '👥 Support Role',
                value: supportRole.toString(),
                inline: true,
            },
            {
                name: '📊 Log Channel',
                value: logChannel.toString(),
                inline: true,
            }
        );

        // Add status indicator
        const isConfigured = guildConfig.ticketCategoryId && guildConfig.ticketLogChannelId;
        embed.addFields({
            name: '📋 Status',
            value: isConfigured ? '✅ Fully Configured' : '⚠️ Partial Configuration',
        });
    }

    embed.setFooter({
        text: `Requested by ${interaction.user.tag}`,
        iconURL: interaction.user.displayAvatarURL(),
    })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

export default command;