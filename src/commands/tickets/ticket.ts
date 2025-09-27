import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    PermissionFlagsBits,
    GuildMember,
    EmbedBuilder,
    ChannelType,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    TextChannel,
    CategoryChannel
} from 'discord.js';
import { Command, BotClient } from '../../types';

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Ticket management system')
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Create a new support ticket')
                .addStringOption(option =>
                    option
                        .setName('subject')
                        .setDescription('Brief description of your issue')
                        .setRequired(true)
                        .setMaxLength(100)
                )
                .addStringOption(option =>
                    option
                        .setName('priority')
                        .setDescription('Priority level of the ticket')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Low', value: 'LOW' },
                            { name: 'Medium', value: 'MEDIUM' },
                            { name: 'High', value: 'HIGH' },
                            { name: 'Urgent', value: 'URGENT' }
                        )
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('close')
                .setDescription('Close a ticket')
                .addStringOption(option =>
                    option
                        .setName('reason')
                        .setDescription('Reason for closing the ticket')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add a user to the ticket')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('User to add to the ticket')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove a user from the ticket')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('User to remove from the ticket')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('transcript')
                .setDescription('Generate a transcript of the ticket')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('claim')
                .setDescription('Claim a ticket as a staff member')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('unclaim')
                .setDescription('Unclaim a ticket')
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guild) return;

        const client = interaction.client as BotClient;
        const subcommand = interaction.options.getSubcommand();
        const member = interaction.member as GuildMember;

        switch (subcommand) {
            case 'create':
                await handleCreateTicket(interaction, client, member);
                break;
            case 'close':
                await handleCloseTicket(interaction, client, member);
                break;
            case 'add':
                await handleAddUser(interaction, client, member);
                break;
            case 'remove':
                await handleRemoveUser(interaction, client, member);
                break;
            case 'transcript':
                await handleTranscript(interaction, client, member);
                break;
            case 'claim':
                await handleClaimTicket(interaction, client, member);
                break;
            case 'unclaim':
                await handleUnclaimTicket(interaction, client, member);
                break;
        }
    },
};

async function handleCreateTicket(interaction: ChatInputCommandInteraction, client: BotClient, member: GuildMember) {
    const subject = interaction.options.getString('subject', true);
    const priority = interaction.options.getString('priority') || 'MEDIUM';

    // Check if user already has an open ticket
    const existingTicket = await client.db.ticket.findFirst({
        where: {
            guildId: interaction.guildId!,
            userId: member.id,
            status: 'OPEN',
        },
    });

    if (existingTicket) {
        await interaction.reply({
            content: `❌ You already have an open ticket: <#${existingTicket.channelId}>`,
            ephemeral: true,
        });
        return;
    }

    // Get guild configuration for ticket system
    const guildConfig = await client.db.guild.findUnique({
        where: { id: interaction.guildId! },
        select: {
            ticketCategoryId: true,
            ticketSupportRoleId: true,
            ticketLogChannelId: true
        },
    });

    let ticketCategory: CategoryChannel | null = null;
    if (guildConfig?.ticketCategoryId) {
        ticketCategory = interaction.guild!.channels.cache.get(guildConfig.ticketCategoryId) as CategoryChannel;
    }

    try {
        // Create ticket channel
        const ticketChannel = await interaction.guild!.channels.create({
            name: `ticket-${member.user.username}-${Date.now().toString().slice(-6)}`,
            type: ChannelType.GuildText,
            parent: ticketCategory?.id || null,
            topic: `Support ticket by ${member.user.tag} | Subject: ${subject}`,
            permissionOverwrites: [
                {
                    id: interaction.guild!.id, // @everyone
                    deny: [PermissionFlagsBits.ViewChannel],
                },
                {
                    id: member.id, // Ticket creator
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ReadMessageHistory,
                        PermissionFlagsBits.AttachFiles,
                        PermissionFlagsBits.EmbedLinks,
                    ],
                },
                {
                    id: client.user!.id, // Bot
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ManageChannels,
                        PermissionFlagsBits.ManageMessages,
                    ],
                },
            ],
        });

        // Add support role permissions if configured
        if (guildConfig?.ticketSupportRoleId) {
            const supportRole = interaction.guild!.roles.cache.get(guildConfig.ticketSupportRoleId);
            if (supportRole) {
                await ticketChannel.permissionOverwrites.create(supportRole, {
                    ViewChannel: true,
                    SendMessages: true,
                    ReadMessageHistory: true,
                    AttachFiles: true,
                    EmbedLinks: true,
                });
            }
        }

        // Create ticket in database
        const ticket = await client.db.ticket.create({
            data: {
                guildId: interaction.guildId!,
                channelId: ticketChannel.id,
                userId: member.id,
                subject: subject,
                priority: priority as any,
                status: 'OPEN',
                createdAt: new Date(),
            },
        });

        // Create ticket embed and buttons
        const embed = new EmbedBuilder()
            .setTitle('🎫 Support Ticket Created')
            .setDescription(`**Subject:** ${subject}\n**Priority:** ${priority}\n**Created by:** ${member.toString()}`)
            .setColor(getPriorityColor(priority))
            .addFields(
                {
                    name: '📝 Instructions',
                    value: [
                        '• Describe your issue in detail',
                        '• Attach any relevant screenshots or files',
                        '• Staff will assist you shortly',
                        '• Use the buttons below to manage this ticket',
                    ].join('\n'),
                }
            )
            .setFooter({ text: `Ticket ID: ${ticket.id.slice(-8)}` })
            .setTimestamp();

        const buttons = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('ticket_close')
                    .setLabel('Close Ticket')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🔒'),
                new ButtonBuilder()
                    .setCustomId('ticket_claim')
                    .setLabel('Claim')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🙋'),
                new ButtonBuilder()
                    .setCustomId('ticket_transcript')
                    .setLabel('Transcript')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📜')
            );

        await ticketChannel.send({
            content: `${member.toString()}${guildConfig?.ticketSupportRoleId ? ` ${interaction.guild!.roles.cache.get(guildConfig.ticketSupportRoleId)?.toString() || ''}` : ''}`,
            embeds: [embed],
            components: [buttons],
        });

        // Log ticket creation
        if (guildConfig?.ticketLogChannelId) {
            const logChannel = interaction.guild!.channels.cache.get(guildConfig.ticketLogChannelId) as TextChannel;
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setTitle('🎫 Ticket Created')
                    .setColor(0x00ff00)
                    .addFields(
                        { name: 'User', value: member.toString(), inline: true },
                        { name: 'Subject', value: subject, inline: true },
                        { name: 'Priority', value: priority, inline: true },
                        { name: 'Channel', value: ticketChannel.toString(), inline: true }
                    )
                    .setTimestamp();

                await logChannel.send({ embeds: [logEmbed] });
            }
        }

        await interaction.reply({
            content: `✅ Ticket created successfully! Please head to ${ticketChannel.toString()} to get support.`,
            ephemeral: true,
        });

        client.logger.info(`Ticket created by ${member.user.tag} (${member.id}) in ${interaction.guild!.name}: ${subject}`, {
            guildId: interaction.guildId,
            userId: member.id,
            channelId: ticketChannel.id,
            ticketId: ticket.id,
            subject,
            priority,
        });

    } catch (error) {
        client.logger.error('Error creating ticket:', error);
        await interaction.reply({
            content: '❌ An error occurred while creating your ticket. Please try again later.',
            ephemeral: true,
        });
    }
}

async function handleCloseTicket(interaction: ChatInputCommandInteraction, client: BotClient, member: GuildMember) {
    const reason = interaction.options.getString('reason') || 'No reason provided';

    // Check if this is a ticket channel
    const ticket = await client.db.ticket.findFirst({
        where: {
            channelId: interaction.channelId,
            status: 'OPEN',
        },
    });

    if (!ticket) {
        await interaction.reply({
            content: '❌ This is not an active ticket channel.',
            ephemeral: true,
        });
        return;
    }

    // Check permissions (ticket owner, staff, or admin)
    const isTicketOwner = ticket.userId === member.id;
    const hasManageChannels = member.permissions.has(PermissionFlagsBits.ManageChannels);
    const guildConfig = await client.db.guild.findUnique({
        where: { id: interaction.guildId! },
        select: { ticketSupportRoleId: true },
    });
    const hasSupport = guildConfig?.ticketSupportRoleId ? member.roles.cache.has(guildConfig.ticketSupportRoleId) : false;

    if (!isTicketOwner && !hasManageChannels && !hasSupport) {
        await interaction.reply({
            content: '❌ You don\'t have permission to close this ticket.',
            ephemeral: true,
        });
        return;
    }

    try {
        // Update ticket status
        await client.db.ticket.update({
            where: { id: ticket.id },
            data: {
                status: 'CLOSED',
                closedBy: member.id,
                closedReason: reason,
                closedAt: new Date(),
            },
        });

        const embed = new EmbedBuilder()
            .setTitle('🔒 Ticket Closed')
            .setDescription(`**Closed by:** ${member.toString()}\n**Reason:** ${reason}`)
            .setColor(0xff0000)
            .setFooter({ text: `Ticket ID: ${ticket.id.slice(-8)}` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });

        // Archive the channel after 5 seconds
        setTimeout(async () => {
            try {
                const channel = interaction.channel as TextChannel;
                await channel.setName(`closed-${channel.name.replace('ticket-', '')}`);
                await channel.setParent(null); // Remove from category

                // Lock the channel
                await channel.permissionOverwrites.edit(interaction.guild!.id, {
                    SendMessages: false,
                });

                if (ticket.userId !== member.id) {
                    await channel.permissionOverwrites.edit(ticket.userId, {
                        SendMessages: false,
                    });
                }
            } catch (error) {
                client.logger.error('Error archiving ticket channel:', error);
            }
        }, 5000);

        client.logger.info(`Ticket closed by ${member.user.tag} (${member.id}) in ${interaction.guild!.name}`, {
            guildId: interaction.guildId,
            userId: member.id,
            ticketId: ticket.id,
            closedBy: member.id,
            reason,
        });

    } catch (error) {
        client.logger.error('Error closing ticket:', error);
        await interaction.reply({
            content: '❌ An error occurred while closing the ticket.',
            ephemeral: true,
        });
    }
}

// Helper functions for other subcommands would continue here...
// Due to length limits, I'll implement the remaining handlers in separate files

function getPriorityColor(priority: string): number {
    switch (priority) {
        case 'LOW': return 0x00ff00;    // Green
        case 'MEDIUM': return 0xffff00; // Yellow  
        case 'HIGH': return 0xff8000;   // Orange
        case 'URGENT': return 0xff0000; // Red
        default: return 0x5865f2;       // Blurple
    }
}

async function handleAddUser(interaction: ChatInputCommandInteraction, client: BotClient, member: GuildMember) {
    const userToAdd = interaction.options.getUser('user', true);

    // Check if this is a ticket channel
    const ticket = await client.db.ticket.findFirst({
        where: {
            channelId: interaction.channelId,
            status: 'OPEN',
        },
    });

    if (!ticket) {
        await interaction.reply({
            content: '❌ This is not an active ticket channel.',
            ephemeral: true,
        });
        return;
    }

    // Check permissions
    const isTicketOwner = ticket.userId === member.id;
    const hasManageChannels = member.permissions.has(PermissionFlagsBits.ManageChannels);

    if (!isTicketOwner && !hasManageChannels) {
        await interaction.reply({
            content: '❌ Only the ticket owner or staff can add users to tickets.',
            ephemeral: true,
        });
        return;
    }

    try {
        const channel = interaction.channel as TextChannel;

        // Check if user already has access
        const existingPerms = channel.permissionOverwrites.cache.get(userToAdd.id);
        if (existingPerms?.allow.has(PermissionFlagsBits.ViewChannel)) {
            await interaction.reply({
                content: `❌ ${userToAdd.tag} already has access to this ticket.`,
                ephemeral: true,
            });
            return;
        }

        // Add user to ticket
        await channel.permissionOverwrites.create(userToAdd, {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true,
            AttachFiles: true,
            EmbedLinks: true,
        });

        const embed = new EmbedBuilder()
            .setTitle('➕ User Added to Ticket')
            .setDescription(`**${userToAdd.tag}** has been added to this ticket by ${member.toString()}`)
            .setColor(0x00ff00)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });

        client.logger.info(`User added to ticket: ${userToAdd.tag} by ${member.user.tag}`, {
            guildId: interaction.guildId,
            ticketId: ticket.id,
            addedUserId: userToAdd.id,
            addedBy: member.id,
        });

    } catch (error) {
        client.logger.error('Error adding user to ticket:', error);
        await interaction.reply({
            content: '❌ An error occurred while adding the user to the ticket.',
            ephemeral: true,
        });
    }
}

async function handleRemoveUser(interaction: ChatInputCommandInteraction, client: BotClient, member: GuildMember) {
    const userToRemove = interaction.options.getUser('user', true);

    // Check if this is a ticket channel
    const ticket = await client.db.ticket.findFirst({
        where: {
            channelId: interaction.channelId,
            status: 'OPEN',
        },
    });

    if (!ticket) {
        await interaction.reply({
            content: '❌ This is not an active ticket channel.',
            ephemeral: true,
        });
        return;
    }

    // Check permissions
    const isTicketOwner = ticket.userId === member.id;
    const hasManageChannels = member.permissions.has(PermissionFlagsBits.ManageChannels);

    if (!isTicketOwner && !hasManageChannels) {
        await interaction.reply({
            content: '❌ Only the ticket owner or staff can remove users from tickets.',
            ephemeral: true,
        });
        return;
    }

    // Can't remove the ticket owner
    if (userToRemove.id === ticket.userId) {
        await interaction.reply({
            content: '❌ Cannot remove the ticket owner from their own ticket.',
            ephemeral: true,
        });
        return;
    }

    try {
        const channel = interaction.channel as TextChannel;

        // Check if user has access
        const existingPerms = channel.permissionOverwrites.cache.get(userToRemove.id);
        if (!existingPerms?.allow.has(PermissionFlagsBits.ViewChannel)) {
            await interaction.reply({
                content: `❌ ${userToRemove.tag} doesn't have access to this ticket.`,
                ephemeral: true,
            });
            return;
        }

        // Remove user from ticket
        await channel.permissionOverwrites.delete(userToRemove, 'Removed from ticket');

        const embed = new EmbedBuilder()
            .setTitle('➖ User Removed from Ticket')
            .setDescription(`**${userToRemove.tag}** has been removed from this ticket by ${member.toString()}`)
            .setColor(0xff0000)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });

        client.logger.info(`User removed from ticket: ${userToRemove.tag} by ${member.user.tag}`, {
            guildId: interaction.guildId,
            ticketId: ticket.id,
            removedUserId: userToRemove.id,
            removedBy: member.id,
        });

    } catch (error) {
        client.logger.error('Error removing user from ticket:', error);
        await interaction.reply({
            content: '❌ An error occurred while removing the user from the ticket.',
            ephemeral: true,
        });
    }
}

async function handleTranscript(interaction: ChatInputCommandInteraction, client: BotClient, member: GuildMember) {
    const ticket = await client.db.ticket.findFirst({
        where: {
            channelId: interaction.channelId,
        },
    });

    if (!ticket) {
        await interaction.reply({
            content: '❌ This is not a ticket channel.',
            ephemeral: true,
        });
        return;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
        const channel = interaction.channel as TextChannel;
        const messages = await channel.messages.fetch({ limit: 100 });

        // Sort messages chronologically
        const sortedMessages = Array.from(messages.values()).reverse();

        // Generate transcript text
        const transcriptLines = [
            `# Ticket Transcript`,
            `**Ticket ID:** ${ticket.id.slice(-8)}`,
            `**Subject:** ${ticket.subject}`,
            `**Created:** ${ticket.createdAt.toISOString()}`,
            `**Channel:** #${channel.name}`,
            `**Participant Count:** ${channel.members.size}`,
            `---\n`,
        ];

        for (const message of sortedMessages) {
            const timestamp = message.createdAt.toISOString();
            const author = message.author.tag;
            const content = message.content || '*[No text content]*';

            transcriptLines.push(`[${timestamp}] ${author}: ${content}`);

            // Add attachment info
            if (message.attachments.size > 0) {
                for (const attachment of message.attachments.values()) {
                    transcriptLines.push(`  📎 Attachment: ${attachment.name} (${attachment.url})`);
                }
            }

            // Add embed info
            if (message.embeds.length > 0) {
                const embed = message.embeds[0];
                transcriptLines.push(`  📄 Embed: ${embed?.title || 'Untitled'}`);
            }
        }

        const transcript = transcriptLines.join('\n');
        const buffer = Buffer.from(transcript, 'utf-8');

        await interaction.editReply({
            content: `✅ Transcript generated for ticket **${ticket.subject}**`,
            files: [{
                attachment: buffer,
                name: `ticket-${ticket.id.slice(-8)}-transcript.txt`,
            }],
        });

        client.logger.info(`Ticket transcript generated by ${member.user.tag}`, {
            guildId: interaction.guildId,
            ticketId: ticket.id,
            generatedBy: member.id,
        });

    } catch (error) {
        client.logger.error('Error generating transcript:', error);
        await interaction.editReply({
            content: '❌ An error occurred while generating the transcript.',
        });
    }
}

async function handleClaimTicket(interaction: ChatInputCommandInteraction, client: BotClient, member: GuildMember) {
    // Check if member has permission to claim tickets
    const guildConfig = await client.db.guild.findUnique({
        where: { id: interaction.guildId! },
        select: { ticketSupportRoleId: true },
    });

    const hasManageChannels = member.permissions.has(PermissionFlagsBits.ManageChannels);
    const hasSupport = guildConfig?.ticketSupportRoleId ? member.roles.cache.has(guildConfig.ticketSupportRoleId) : false;

    if (!hasManageChannels && !hasSupport) {
        await interaction.reply({
            content: '❌ You don\'t have permission to claim tickets.',
            ephemeral: true,
        });
        return;
    }

    const ticket = await client.db.ticket.findFirst({
        where: {
            channelId: interaction.channelId,
            status: 'OPEN',
        },
    });

    if (!ticket) {
        await interaction.reply({
            content: '❌ This is not an active ticket channel.',
            ephemeral: true,
        });
        return;
    }

    if (ticket.claimedBy) {
        const claimedUser = await interaction.guild!.members.fetch(ticket.claimedBy).catch(() => null);
        await interaction.reply({
            content: `❌ This ticket is already claimed by ${claimedUser?.toString() || 'someone'}.`,
            ephemeral: true,
        });
        return;
    }

    try {
        await client.db.ticket.update({
            where: { id: ticket.id },
            data: {
                claimedBy: member.id,
                claimedAt: new Date(),
            },
        });

        const embed = new EmbedBuilder()
            .setTitle('🙋 Ticket Claimed')
            .setDescription(`This ticket has been claimed by ${member.toString()}`)
            .setColor(0x0099ff)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });

        client.logger.info(`Ticket claimed by ${member.user.tag}`, {
            guildId: interaction.guildId,
            ticketId: ticket.id,
            claimedBy: member.id,
        });

    } catch (error) {
        client.logger.error('Error claiming ticket:', error);
        await interaction.reply({
            content: '❌ An error occurred while claiming the ticket.',
            ephemeral: true,
        });
    }
}

async function handleUnclaimTicket(interaction: ChatInputCommandInteraction, client: BotClient, member: GuildMember) {
    const ticket = await client.db.ticket.findFirst({
        where: {
            channelId: interaction.channelId,
            status: 'OPEN',
        },
    });

    if (!ticket) {
        await interaction.reply({
            content: '❌ This is not an active ticket channel.',
            ephemeral: true,
        });
        return;
    }

    if (!ticket.claimedBy) {
        await interaction.reply({
            content: '❌ This ticket is not currently claimed.',
            ephemeral: true,
        });
        return;
    }

    // Only the person who claimed it or staff can unclaim
    const isClaimOwner = ticket.claimedBy === member.id;
    const hasManageChannels = member.permissions.has(PermissionFlagsBits.ManageChannels);

    if (!isClaimOwner && !hasManageChannels) {
        await interaction.reply({
            content: '❌ You can only unclaim tickets that you have claimed.',
            ephemeral: true,
        });
        return;
    }

    try {
        await client.db.ticket.update({
            where: { id: ticket.id },
            data: {
                claimedBy: null,
                claimedAt: null,
            },
        });

        const embed = new EmbedBuilder()
            .setTitle('🙋‍♀️ Ticket Unclaimed')
            .setDescription(`This ticket has been unclaimed by ${member.toString()}`)
            .setColor(0xff9900)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });

        client.logger.info(`Ticket unclaimed by ${member.user.tag}`, {
            guildId: interaction.guildId,
            ticketId: ticket.id,
            unclaimedBy: member.id,
        });

    } catch (error) {
        client.logger.error('Error unclaiming ticket:', error);
        await interaction.reply({
            content: '❌ An error occurred while unclaiming the ticket.',
            ephemeral: true,
        });
    }
}

export default command;