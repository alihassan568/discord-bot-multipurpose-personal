import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    EmbedBuilder,
    PermissionFlagsBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ChannelType
} from 'discord.js';
import { BotClient } from '../../types';

const command = {
    data: new SlashCommandBuilder()
        .setName('giveaway')
        .setDescription('Manage server giveaways')
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Create a new giveaway')
                .addStringOption(option =>
                    option
                        .setName('prize')
                        .setDescription('What is being given away')
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option
                        .setName('duration')
                        .setDescription('Duration in minutes')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(10080) // 1 week max
                )
                .addIntegerOption(option =>
                    option
                        .setName('winners')
                        .setDescription('Number of winners')
                        .setRequired(false)
                        .setMinValue(1)
                        .setMaxValue(20)
                )
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('Channel to host the giveaway')
                        .setRequired(false)
                        .addChannelTypes(ChannelType.GuildText)
                )
                .addRoleOption(option =>
                    option
                        .setName('required-role')
                        .setDescription('Role required to participate')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('end')
                .setDescription('End a giveaway early')
                .addStringOption(option =>
                    option
                        .setName('message-id')
                        .setDescription('Giveaway message ID')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('reroll')
                .setDescription('Reroll giveaway winners')
                .addStringOption(option =>
                    option
                        .setName('message-id')
                        .setDescription('Giveaway message ID')
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option
                        .setName('new-winners')
                        .setDescription('Number of new winners to pick')
                        .setRequired(false)
                        .setMinValue(1)
                        .setMaxValue(10)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all active giveaways')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('edit')
                .setDescription('Edit an existing giveaway')
                .addStringOption(option =>
                    option
                        .setName('message-id')
                        .setDescription('Giveaway message ID')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('participants')
                .setDescription('View giveaway participants')
                .addStringOption(option =>
                    option
                        .setName('message-id')
                        .setDescription('Giveaway message ID')
                        .setRequired(true)
                )
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .setDMPermission(false),

    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        const client = interaction.client as BotClient;
        const subcommand = interaction.options.getSubcommand();

        try {
            const guild = interaction.guild;
            if (!guild) {
                await interaction.reply({
                    embeds: [{
                        color: 0xff0000,
                        description: '❌ This command can only be used in a server.',
                    }],
                    ephemeral: true,
                });
                return;
            }

            switch (subcommand) {
                case 'create':
                    await this.handleCreate(interaction, guild);
                    break;
                case 'end':
                    await this.handleEnd(interaction, guild);
                    break;
                case 'reroll':
                    await this.handleReroll(interaction, guild);
                    break;
                case 'list':
                    await this.handleList(interaction, guild);
                    break;
                case 'edit':
                    await this.handleEdit(interaction, guild);
                    break;
                case 'participants':
                    await this.handleParticipants(interaction, guild);
                    break;
            }

            // Log the action
            client.logger.info(`Giveaway ${subcommand} used by ${interaction.user.tag}`, {
                guildId: interaction.guildId,
                userId: interaction.user.id,
                subcommand,
            });

            return;

        } catch (error) {
            console.error('Error in giveaway command:', error);

            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    embeds: [{
                        color: 0xff0000,
                        description: `❌ An error occurred: ${errorMessage}`,
                    }],
                    ephemeral: true,
                });
            }

            return;
        }
    },

    async handleCreate(interaction: ChatInputCommandInteraction, guild: any): Promise<void> {
        const prize = interaction.options.getString('prize', true);
        const duration = interaction.options.getInteger('duration', true);
        const winners = interaction.options.getInteger('winners') || 1;
        const channel = interaction.options.getChannel('channel') || interaction.channel;
        const requiredRole = interaction.options.getRole('required-role');

        const endTime = Date.now() + (duration * 60 * 1000);
        const giveawayId = `GW${Date.now().toString().slice(-8)}`;

        const embed = new EmbedBuilder()
            .setTitle('🎉 GIVEAWAY 🎉')
            .setDescription([
                `**Prize:** ${prize}`,
                `**Winners:** ${winners} winner${winners > 1 ? 's' : ''}`,
                `**Ends:** <t:${Math.floor(endTime / 1000)}:R>`,
                `**Hosted by:** ${interaction.user}`,
                requiredRole ? `**Required Role:** ${requiredRole}` : '',
                '',
                '**How to Enter:**',
                '🎉 Click the button below to participate!',
                '',
                `**Participants:** 0`,
                `**Giveaway ID:** \`${giveawayId}\``
            ].filter(line => line !== '').join('\n'))
            .setColor(0xff69b4)
            .setThumbnail(guild.iconURL({ size: 256 }))
            .setTimestamp(endTime)
            .setFooter({
                text: 'Ends at',
                iconURL: interaction.user.displayAvatarURL()
            });

        const participateButton = new ButtonBuilder()
            .setCustomId(`giveaway_participate_${giveawayId}`)
            .setLabel('🎉 Enter Giveaway')
            .setStyle(ButtonStyle.Primary);

        const viewButton = new ButtonBuilder()
            .setCustomId(`giveaway_view_${giveawayId}`)
            .setLabel('👥 View Participants')
            .setStyle(ButtonStyle.Secondary);

        const actionRow = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(participateButton, viewButton);

        try {
            const giveawayMessage = await (channel as any).send({
                embeds: [embed],
                components: [actionRow],
            });

            // In production, save to database
            const giveawayData = {
                id: giveawayId,
                messageId: giveawayMessage.id,
                channelId: channel!.id,
                guildId: guild.id,
                hostId: interaction.user.id,
                prize,
                winners,
                endTime,
                requiredRole: requiredRole?.id,
                participants: [],
                active: true,
                createdAt: Date.now()
            };

            await interaction.reply({
                embeds: [{
                    color: 0x00ff00,
                    title: '✅ Giveaway Created!',
                    description: [
                        `Successfully created giveaway in ${channel}`,
                        `**Prize:** ${prize}`,
                        `**Duration:** ${duration} minutes`,
                        `**Winners:** ${winners}`,
                        `**Giveaway ID:** \`${giveawayId}\``,
                        '',
                        `**Message Link:** [Jump to Giveaway](https://discord.com/channels/${guild.id}/${channel!.id}/${giveawayMessage.id})`
                    ].join('\n'),
                    timestamp: new Date().toISOString()
                }],
                ephemeral: true,
            });

            // Set timeout to end giveaway automatically
            setTimeout(async () => {
                await this.endGiveaway(giveawayData, guild, interaction.client as BotClient);
            }, duration * 60 * 1000);

        } catch (error) {
            await interaction.reply({
                embeds: [{
                    color: 0xff0000,
                    description: `❌ Failed to create giveaway: ${error instanceof Error ? error.message : 'Unknown error'}`,
                }],
                ephemeral: true,
            });
        }
    },

    async handleEnd(interaction: ChatInputCommandInteraction, guild: any): Promise<void> {
        const messageId = interaction.options.getString('message-id', true);

        await interaction.deferReply({ ephemeral: true });

        // In production, fetch from database
        const giveawayData = {
            id: 'GW12345678',
            messageId,
            channelId: interaction.channelId!,
            hostId: interaction.user.id,
            prize: 'Discord Nitro',
            winners: 1,
            participants: ['111111111111111111', '222222222222222222', '333333333333333333'],
            active: true
        };

        if (!giveawayData.active) {
            await interaction.editReply({
                embeds: [{
                    color: 0xff0000,
                    description: '❌ This giveaway has already ended.',
                }],
            });
            return;
        }

        if (giveawayData.hostId !== interaction.user.id && !interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
            await interaction.editReply({
                embeds: [{
                    color: 0xff0000,
                    description: '❌ Only the giveaway host or administrators can end this giveaway.',
                }],
            });
            return;
        }

        try {
            await this.endGiveaway(giveawayData, guild, interaction.client as BotClient);

            await interaction.editReply({
                embeds: [{
                    color: 0x00ff00,
                    title: '✅ Giveaway Ended',
                    description: `Successfully ended the giveaway for **${giveawayData.prize}**`,
                    fields: [
                        {
                            name: '📊 Results',
                            value: [
                                `**Participants:** ${giveawayData.participants.length}`,
                                `**Winners Selected:** ${Math.min(giveawayData.winners, giveawayData.participants.length)}`,
                                `**Ended by:** ${interaction.user.tag}`
                            ].join('\n'),
                            inline: false
                        }
                    ],
                    timestamp: new Date().toISOString()
                }],
            });

        } catch (error) {
            await interaction.editReply({
                embeds: [{
                    color: 0xff0000,
                    description: `❌ Failed to end giveaway: ${error instanceof Error ? error.message : 'Unknown error'}`,
                }],
            });
        }
    },

    async handleReroll(interaction: ChatInputCommandInteraction, guild: any): Promise<void> {
        const messageId = interaction.options.getString('message-id', true);
        const newWinners = interaction.options.getInteger('new-winners') || 1;

        await interaction.deferReply();

        // Simulate giveaway data
        const giveawayData = {
            id: 'GW12345678',
            messageId,
            channelId: interaction.channelId!,
            prize: 'Discord Nitro',
            participants: [
                '111111111111111111', '222222222222222222', '333333333333333333',
                '444444444444444444', '555555555555555555', '666666666666666666'
            ],
            active: false
        };

        if (giveawayData.participants.length === 0) {
            await interaction.editReply({
                embeds: [{
                    color: 0xff0000,
                    description: '❌ No participants found for this giveaway.',
                }],
            });
            return;
        }

        const availableWinners = Math.min(newWinners, giveawayData.participants.length);
        const selectedWinners = giveawayData.participants
            .sort(() => Math.random() - 0.5)
            .slice(0, availableWinners);

        const embed = new EmbedBuilder()
            .setTitle('🎊 Giveaway Reroll Results!')
            .setDescription(`**Prize:** ${giveawayData.prize}`)
            .addFields(
                {
                    name: '🏆 New Winners',
                    value: selectedWinners.map((id, index) => `${index + 1}. <@${id}>`).join('\n'),
                    inline: false,
                },
                {
                    name: '📊 Reroll Stats',
                    value: [
                        `**Total Participants:** ${giveawayData.participants.length}`,
                        `**Winners Selected:** ${selectedWinners.length}`,
                        `**Rerolled by:** ${interaction.user.tag}`
                    ].join('\n'),
                    inline: false,
                }
            )
            .setColor(0x00ff00)
            .setTimestamp();

        await interaction.editReply({
            content: selectedWinners.map(id => `<@${id}>`).join(' '),
            embeds: [embed],
        });
    },

    async handleList(interaction: ChatInputCommandInteraction, guild: any): Promise<void> {
        await interaction.deferReply({ ephemeral: true });

        // Simulate active giveaways data
        const activeGiveaways = [
            {
                id: 'GW12345678',
                messageId: '1234567890123456789',
                channelId: '987654321098765432',
                prize: 'Discord Nitro Classic',
                endTime: Date.now() + 3600000,
                participants: 45,
                winners: 1,
                hostId: interaction.user.id
            },
            {
                id: 'GW87654321',
                messageId: '9876543210987654321',
                channelId: '123456789012345678',
                prize: 'Gaming Headset',
                endTime: Date.now() + 7200000,
                participants: 23,
                winners: 2,
                hostId: '111111111111111111'
            },
            {
                id: 'GW55555555',
                messageId: '5555555555555555555',
                channelId: '666666666666666666',
                prize: '$50 Steam Gift Card',
                endTime: Date.now() + 86400000,
                participants: 127,
                winners: 1,
                hostId: '222222222222222222'
            }
        ];

        if (activeGiveaways.length === 0) {
            await interaction.editReply({
                embeds: [{
                    color: 0xffa500,
                    title: '📋 Active Giveaways',
                    description: 'No active giveaways found in this server.',
                    timestamp: new Date().toISOString()
                }],
            });
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle('📋 Active Giveaways')
            .setDescription(`Found ${activeGiveaways.length} active giveaway(s) in this server`)
            .setColor(0x7289da)
            .setTimestamp()
            .setFooter({
                text: `${guild.name} • ${activeGiveaways.length} active`,
                iconURL: guild.iconURL()
            });

        activeGiveaways.forEach((giveaway, index) => {
            embed.addFields({
                name: `${index + 1}. ${giveaway.prize}`,
                value: [
                    `**ID:** \`${giveaway.id}\``,
                    `**Channel:** <#${giveaway.channelId}>`,
                    `**Ends:** <t:${Math.floor(giveaway.endTime / 1000)}:R>`,
                    `**Participants:** ${giveaway.participants}`,
                    `**Winners:** ${giveaway.winners}`,
                    `**Host:** <@${giveaway.hostId}>`,
                    `**[Jump to Giveaway](https://discord.com/channels/${guild.id}/${giveaway.channelId}/${giveaway.messageId})**`
                ].join('\n'),
                inline: true,
            });
        });

        // Quick action buttons
        const endButton = new ButtonBuilder()
            .setCustomId('giveaway_quick_end')
            .setLabel('End Giveaway')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🛑');

        const rerollButton = new ButtonBuilder()
            .setCustomId('giveaway_quick_reroll')
            .setLabel('Reroll Giveaway')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🔄');

        const participantsButton = new ButtonBuilder()
            .setCustomId('giveaway_quick_participants')
            .setLabel('View Participants')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('👥');

        const actionRow = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(endButton, rerollButton, participantsButton);

        await interaction.editReply({
            embeds: [embed],
            components: [actionRow],
        });
    },

    async handleEdit(interaction: ChatInputCommandInteraction, guild: any): Promise<void> {
        const messageId = interaction.options.getString('message-id', true);

        // Show modal for editing
        const modal = new ModalBuilder()
            .setCustomId(`giveaway_edit_${messageId}`)
            .setTitle('Edit Giveaway');

        const prizeInput = new TextInputBuilder()
            .setCustomId('edit_prize')
            .setLabel('Prize')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Enter new prize description...')
            .setRequired(false)
            .setMaxLength(256);

        const winnersInput = new TextInputBuilder()
            .setCustomId('edit_winners')
            .setLabel('Number of Winners')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Enter number of winners (1-20)')
            .setRequired(false)
            .setMaxLength(2);

        const durationInput = new TextInputBuilder()
            .setCustomId('edit_duration')
            .setLabel('Additional Duration (minutes)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Add more time to the giveaway (optional)')
            .setRequired(false)
            .setMaxLength(4);

        const requirementInput = new TextInputBuilder()
            .setCustomId('edit_requirements')
            .setLabel('Additional Requirements')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Add special requirements or conditions...')
            .setRequired(false)
            .setMaxLength(500);

        const firstRow = new ActionRowBuilder<TextInputBuilder>().addComponents(prizeInput);
        const secondRow = new ActionRowBuilder<TextInputBuilder>().addComponents(winnersInput);
        const thirdRow = new ActionRowBuilder<TextInputBuilder>().addComponents(durationInput);
        const fourthRow = new ActionRowBuilder<TextInputBuilder>().addComponents(requirementInput);

        modal.addComponents(firstRow, secondRow, thirdRow, fourthRow);

        await interaction.showModal(modal);
    },

    async handleParticipants(interaction: ChatInputCommandInteraction, guild: any): Promise<void> {
        const messageId = interaction.options.getString('message-id', true);

        await interaction.deferReply({ ephemeral: true });

        // Simulate participant data
        const participants = [
            { id: '111111111111111111', username: 'User1#1234', joinedAt: Date.now() - 3600000 },
            { id: '222222222222222222', username: 'User2#5678', joinedAt: Date.now() - 3000000 },
            { id: '333333333333333333', username: 'User3#9012', joinedAt: Date.now() - 2400000 },
            { id: '444444444444444444', username: 'User4#3456', joinedAt: Date.now() - 1800000 },
            { id: '555555555555555555', username: 'User5#7890', joinedAt: Date.now() - 1200000 }
        ];

        const giveawayData = {
            id: 'GW12345678',
            prize: 'Discord Nitro',
            winners: 1,
            endTime: Date.now() + 3600000
        };

        const embed = new EmbedBuilder()
            .setTitle('👥 Giveaway Participants')
            .setDescription(`Participants for: **${giveawayData.prize}**`)
            .setColor(0x7289da)
            .addFields(
                {
                    name: '📊 Statistics',
                    value: [
                        `**Total Participants:** ${participants.length}`,
                        `**Winners:** ${giveawayData.winners}`,
                        `**Ends:** <t:${Math.floor(giveawayData.endTime / 1000)}:R>`,
                        `**Win Chance:** ${((giveawayData.winners / participants.length) * 100).toFixed(1)}%`
                    ].join('\n'),
                    inline: false,
                }
            );

        if (participants.length > 0) {
            const participantList = participants
                .sort((a, b) => a.joinedAt - b.joinedAt)
                .map((p, index) => `${index + 1}. <@${p.id}> • <t:${Math.floor(p.joinedAt / 1000)}:R>`)
                .join('\n');

            embed.addFields({
                name: '🎫 Recent Participants',
                value: participantList.length > 1024 ? participantList.substring(0, 1021) + '...' : participantList,
                inline: false,
            });
        }

        embed.setTimestamp()
            .setFooter({
                text: `Giveaway ID: ${giveawayData.id}`,
                iconURL: interaction.user.displayAvatarURL()
            });

        await interaction.editReply({
            embeds: [embed],
        });
    },

    async endGiveaway(giveawayData: any, guild: any, client: BotClient): Promise<void> {
        try {
            const channel = await guild.channels.fetch(giveawayData.channelId);
            if (!channel) return;

            const message = await channel.messages.fetch(giveawayData.messageId);
            if (!message) return;

            const participants = giveawayData.participants || [];

            if (participants.length === 0) {
                // No participants
                const embed = new EmbedBuilder()
                    .setTitle('🎉 Giveaway Ended')
                    .setDescription([
                        `**Prize:** ${giveawayData.prize}`,
                        '**Winner:** No one participated 😢',
                        '',
                        'Better luck next time!'
                    ].join('\n'))
                    .setColor(0xff0000)
                    .setTimestamp();

                await message.edit({
                    embeds: [embed],
                    components: [],
                });
                return;
            }

            // Select winners
            const maxWinners = Math.min(giveawayData.winners, participants.length);
            const winners = participants
                .sort(() => Math.random() - 0.5)
                .slice(0, maxWinners);

            const embed = new EmbedBuilder()
                .setTitle('🎊 Giveaway Results!')
                .setDescription(`**Prize:** ${giveawayData.prize}`)
                .addFields(
                    {
                        name: '🏆 Winners',
                        value: winners.map((id: string, index: number) => `${index + 1}. <@${id}>`).join('\n'),
                        inline: false,
                    },
                    {
                        name: '📊 Statistics',
                        value: [
                            `**Total Participants:** ${participants.length}`,
                            `**Winners:** ${winners.length}`,
                            `**Hosted by:** <@${giveawayData.hostId}>`
                        ].join('\n'),
                        inline: false,
                    }
                )
                .setColor(0x00ff00)
                .setTimestamp();

            await message.edit({
                content: winners.map((id: string) => `<@${id}>`).join(' '),
                embeds: [embed],
                components: [],
            });

            // Send DM to winners
            for (const winnerId of winners) {
                try {
                    const user = await client.users.fetch(winnerId);
                    const dmEmbed = new EmbedBuilder()
                        .setTitle('🎉 Congratulations! You Won!')
                        .setDescription([
                            `You won **${giveawayData.prize}** in **${guild.name}**!`,
                            '',
                            'Contact the giveaway host or server moderators to claim your prize.',
                            `**Giveaway Host:** <@${giveawayData.hostId}>`
                        ].join('\n'))
                        .setColor(0x00ff00)
                        .setThumbnail(guild.iconURL({ size: 256 }))
                        .setTimestamp();

                    await user.send({ embeds: [dmEmbed] });
                } catch (error) {
                    // User has DMs disabled or other error
                    console.log(`Could not DM winner ${winnerId}`);
                }
            }

        } catch (error) {
            console.error('Error ending giveaway:', error);
        }
    },
};

export default command;