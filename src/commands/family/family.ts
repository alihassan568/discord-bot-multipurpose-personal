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
    User
} from 'discord.js';
import { BotClient } from '../../types';

const command = {
    data: new SlashCommandBuilder()
        .setName('family')
        .setDescription('Manage server family relationships')
        .addSubcommand(subcommand =>
            subcommand
                .setName('marry')
                .setDescription('Propose marriage to another user')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('User to propose to')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('divorce')
                .setDescription('End your marriage')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('adopt')
                .setDescription('Adopt another user as your child')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('User to adopt')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('disown')
                .setDescription('Disown a child or leave your adoptive parents')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('User to disown or leave (optional)')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('siblings')
                .setDescription('Add someone as your sibling')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('User to add as sibling')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('tree')
                .setDescription('View your family tree')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('View someone else\'s family tree')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all family members')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('List someone else\'s family')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('search')
                .setDescription('Search for families by member')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('User to search for')
                        .setRequired(true)
                )
        )
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
                case 'marry':
                    await this.handleMarry(interaction, guild);
                    break;
                case 'divorce':
                    await this.handleDivorce(interaction, guild);
                    break;
                case 'adopt':
                    await this.handleAdopt(interaction, guild);
                    break;
                case 'disown':
                    await this.handleDisown(interaction, guild);
                    break;
                case 'siblings':
                    await this.handleSiblings(interaction, guild);
                    break;
                case 'tree':
                    await this.handleTree(interaction, guild);
                    break;
                case 'list':
                    await this.handleList(interaction, guild);
                    break;
                case 'search':
                    await this.handleSearch(interaction, guild);
                    break;
            }

            // Log the action
            client.logger.info(`Family ${subcommand} used by ${interaction.user.tag}`, {
                guildId: interaction.guildId,
                userId: interaction.user.id,
                subcommand,
            });

            return;

        } catch (error) {
            console.error('Error in family command:', error);

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

    async handleMarry(interaction: ChatInputCommandInteraction, guild: any): Promise<void> {
        const targetUser = interaction.options.getUser('user', true);

        if (targetUser.id === interaction.user.id) {
            await interaction.reply({
                embeds: [{
                    color: 0xff0000,
                    description: '❌ You cannot marry yourself!',
                }],
                ephemeral: true,
            });
            return;
        }

        if (targetUser.bot) {
            await interaction.reply({
                embeds: [{
                    color: 0xff0000,
                    description: '❌ You cannot marry a bot!',
                }],
                ephemeral: true,
            });
            return;
        }

        // Check if already married (simulated)
        const currentMarriage = null; // In production, check database

        if (currentMarriage) {
            await interaction.reply({
                embeds: [{
                    color: 0xff0000,
                    description: '❌ You are already married! Use `/family divorce` first.',
                }],
                ephemeral: true,
            });
            return;
        }

        const proposalEmbed = new EmbedBuilder()
            .setTitle('💍 Marriage Proposal!')
            .setDescription([
                `**${interaction.user.tag}** has proposed to **${targetUser.tag}**!`,
                '',
                '💕 A beautiful love story begins here...',
                '',
                `${targetUser}, do you accept this marriage proposal?`
            ].join('\n'))
            .setColor(0xff69b4)
            .setThumbnail('https://cdn.discordapp.com/emojis/692428218121699348.png?v=1')
            .addFields(
                {
                    name: '💒 Marriage Benefits',
                    value: [
                        '• Shared family tree',
                        '• Special couple commands',
                        '• Joint family activities',
                        '• Relationship milestones'
                    ].join('\n'),
                    inline: true,
                },
                {
                    name: '🎭 Proposal Details',
                    value: [
                        `**Proposer:** ${interaction.user.tag}`,
                        `**Proposed to:** ${targetUser.tag}`,
                        `**Date:** <t:${Math.floor(Date.now() / 1000)}:F>`,
                        `**Location:** ${guild.name}`
                    ].join('\n'),
                    inline: true,
                }
            )
            .setTimestamp()
            .setFooter({
                text: 'Marriage proposals expire in 5 minutes',
                iconURL: interaction.user.displayAvatarURL()
            });

        const acceptButton = new ButtonBuilder()
            .setCustomId(`marry_accept_${interaction.user.id}_${targetUser.id}`)
            .setLabel('💍 Accept Proposal')
            .setStyle(ButtonStyle.Success);

        const declineButton = new ButtonBuilder()
            .setCustomId(`marry_decline_${interaction.user.id}_${targetUser.id}`)
            .setLabel('💔 Decline Proposal')
            .setStyle(ButtonStyle.Danger);

        const actionRow = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(acceptButton, declineButton);

        const response = await interaction.reply({
            content: `${targetUser}`,
            embeds: [proposalEmbed],
            components: [actionRow],
        });

        try {
            const buttonInteraction = await response.awaitMessageComponent({
                componentType: ComponentType.Button,
                time: 300000, // 5 minutes
                filter: (i) => i.user.id === targetUser.id,
            });

            if (buttonInteraction.customId.includes('accept')) {
                const marriageEmbed = new EmbedBuilder()
                    .setTitle('🎉 Congratulations!')
                    .setDescription([
                        `**${interaction.user.tag}** and **${targetUser.tag}** are now married! 💕`,
                        '',
                        '🎊 May your love story be filled with happiness and joy!',
                        '',
                        'Your family tree has been updated to reflect this beautiful union.'
                    ].join('\n'))
                    .setColor(0x00ff00)
                    .addFields(
                        {
                            name: '💒 Marriage Details',
                            value: [
                                `**Couple:** ${interaction.user.tag} & ${targetUser.tag}`,
                                `**Married on:** <t:${Math.floor(Date.now() / 1000)}:F>`,
                                `**Location:** ${guild.name}`,
                                `**Witnesses:** ${guild.memberCount} server members`
                            ].join('\n'),
                            inline: false,
                        },
                        {
                            name: '🎁 Marriage Perks Unlocked',
                            value: [
                                '• Joint family tree',
                                '• Couple badges in profiles',
                                '• Special anniversary tracking',
                                '• Access to couple-only commands'
                            ].join('\n'),
                            inline: false,
                        }
                    )
                    .setThumbnail('https://cdn.discordapp.com/emojis/692428641978187826.png?v=1')
                    .setTimestamp();

                await buttonInteraction.update({
                    content: `🎉 ${interaction.user} ${targetUser}`,
                    embeds: [marriageEmbed],
                    components: [],
                });

                // In production, save marriage to database
                console.log(`Marriage registered: ${interaction.user.id} + ${targetUser.id}`);

            } else {
                const rejectionEmbed = new EmbedBuilder()
                    .setTitle('💔 Proposal Declined')
                    .setDescription([
                        `**${targetUser.tag}** has declined **${interaction.user.tag}**'s marriage proposal.`,
                        '',
                        'Sometimes love doesn\'t work out, but don\'t give up! 💪'
                    ].join('\n'))
                    .setColor(0xff0000)
                    .setTimestamp();

                await buttonInteraction.update({
                    embeds: [rejectionEmbed],
                    components: [],
                });
            }

        } catch (error) {
            const timeoutEmbed = new EmbedBuilder()
                .setTitle('⏰ Proposal Expired')
                .setDescription('The marriage proposal has expired. Try again when both parties are available!')
                .setColor(0x7289da);

            try {
                await interaction.editReply({
                    embeds: [timeoutEmbed],
                    components: [],
                });
            } catch (e) {
                // Ignore edit errors
            }
        }
    },

    async handleDivorce(interaction: ChatInputCommandInteraction, guild: any): Promise<void> {
        // Simulate marriage data
        const currentMarriage = {
            spouse: { id: '123456789012345678', username: 'ExSpouse#1234' },
            marriedAt: Date.now() - 2592000000, // 30 days ago
            anniversaries: 0
        };

        if (!currentMarriage) {
            await interaction.reply({
                embeds: [{
                    color: 0xff0000,
                    description: '❌ You are not currently married.',
                }],
                ephemeral: true,
            });
            return;
        }

        const confirmEmbed = new EmbedBuilder()
            .setTitle('💔 Confirm Divorce')
            .setDescription([
                `Are you sure you want to divorce **${currentMarriage.spouse.username}**?`,
                '',
                '**This action will:**',
                '• End your marriage',
                '• Remove couple benefits',
                '• Keep marriage history for records',
                '• Notify your spouse',
                '',
                '**This action cannot be undone easily.**'
            ].join('\n'))
            .setColor(0xff0000)
            .addFields({
                name: '💍 Marriage History',
                value: [
                    `**Married to:** ${currentMarriage.spouse.username}`,
                    `**Marriage Date:** <t:${Math.floor(currentMarriage.marriedAt / 1000)}:F>`,
                    `**Duration:** ${Math.floor((Date.now() - currentMarriage.marriedAt) / (1000 * 60 * 60 * 24))} days`,
                    `**Anniversaries:** ${currentMarriage.anniversaries}`
                ].join('\n'),
                inline: false,
            })
            .setTimestamp();

        const confirmButton = new ButtonBuilder()
            .setCustomId('divorce_confirm')
            .setLabel('💔 Confirm Divorce')
            .setStyle(ButtonStyle.Danger);

        const cancelButton = new ButtonBuilder()
            .setCustomId('divorce_cancel')
            .setLabel('❌ Cancel')
            .setStyle(ButtonStyle.Secondary);

        const actionRow = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(confirmButton, cancelButton);

        const response = await interaction.reply({
            embeds: [confirmEmbed],
            components: [actionRow],
            ephemeral: true,
        });

        try {
            const buttonInteraction = await response.awaitMessageComponent({
                componentType: ComponentType.Button,
                time: 60000,
                filter: (i) => i.user.id === interaction.user.id,
            });

            if (buttonInteraction.customId === 'divorce_confirm') {
                const divorceEmbed = new EmbedBuilder()
                    .setTitle('💔 Divorce Finalized')
                    .setDescription([
                        `**${interaction.user.tag}** has divorced **${currentMarriage.spouse.username}**.`,
                        '',
                        'The marriage has been officially ended.',
                        'Both parties are now free to remarry.'
                    ].join('\n'))
                    .setColor(0xff0000)
                    .addFields({
                        name: '📋 Divorce Details',
                        value: [
                            `**Divorced by:** ${interaction.user.tag}`,
                            `**Divorce Date:** <t:${Math.floor(Date.now() / 1000)}:F>`,
                            `**Marriage Duration:** ${Math.floor((Date.now() - currentMarriage.marriedAt) / (1000 * 60 * 60 * 24))} days`,
                            `**Status:** Completed`
                        ].join('\n'),
                        inline: false,
                    })
                    .setTimestamp();

                await buttonInteraction.update({
                    embeds: [divorceEmbed],
                    components: [],
                });

                // In production, update database and notify spouse
                console.log(`Divorce processed: ${interaction.user.id}`);

            } else {
                const cancelEmbed = new EmbedBuilder()
                    .setTitle('❤️ Divorce Cancelled')
                    .setDescription('You chose to stay married. Your relationship continues!')
                    .setColor(0x00ff00);

                await buttonInteraction.update({
                    embeds: [cancelEmbed],
                    components: [],
                });
            }

        } catch (error) {
            try {
                await interaction.editReply({
                    embeds: [{
                        color: 0x7289da,
                        title: '⏰ Request Timed Out',
                        description: 'Divorce request timed out. No changes were made.',
                    }],
                    components: [],
                });
            } catch (e) {
                // Ignore edit errors
            }
        }
    },

    async handleAdopt(interaction: ChatInputCommandInteraction, guild: any): Promise<void> {
        const targetUser = interaction.options.getUser('user', true);

        if (targetUser.id === interaction.user.id) {
            await interaction.reply({
                embeds: [{
                    color: 0xff0000,
                    description: '❌ You cannot adopt yourself!',
                }],
                ephemeral: true,
            });
            return;
        }

        if (targetUser.bot) {
            await interaction.reply({
                embeds: [{
                    color: 0xff0000,
                    description: '❌ You cannot adopt a bot!',
                }],
                ephemeral: true,
            });
            return;
        }

        const adoptionEmbed = new EmbedBuilder()
            .setTitle('👶 Adoption Request!')
            .setDescription([
                `**${interaction.user.tag}** wants to adopt **${targetUser.tag}**!`,
                '',
                '🏠 Welcome to a loving family!',
                '',
                `${targetUser}, do you accept this adoption?`
            ].join('\n'))
            .setColor(0xffa500)
            .setThumbnail('https://cdn.discordapp.com/emojis/692428508127477800.png?v=1')
            .addFields(
                {
                    name: '👨‍👩‍👧‍👦 Family Benefits',
                    value: [
                        '• Shared family tree',
                        '• Family role in server',
                        '• Joint family activities',
                        '• Parental guidance and support'
                    ].join('\n'),
                    inline: true,
                },
                {
                    name: '📋 Adoption Details',
                    value: [
                        `**Adoptive Parent:** ${interaction.user.tag}`,
                        `**Child:** ${targetUser.tag}`,
                        `**Date:** <t:${Math.floor(Date.now() / 1000)}:F>`,
                        `**Family Name:** To be decided`
                    ].join('\n'),
                    inline: true,
                }
            )
            .setTimestamp()
            .setFooter({
                text: 'Adoption requests expire in 5 minutes',
                iconURL: interaction.user.displayAvatarURL()
            });

        const acceptButton = new ButtonBuilder()
            .setCustomId(`adopt_accept_${interaction.user.id}_${targetUser.id}`)
            .setLabel('👶 Accept Adoption')
            .setStyle(ButtonStyle.Success);

        const declineButton = new ButtonBuilder()
            .setCustomId(`adopt_decline_${interaction.user.id}_${targetUser.id}`)
            .setLabel('❌ Decline Adoption')
            .setStyle(ButtonStyle.Danger);

        const actionRow = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(acceptButton, declineButton);

        const response = await interaction.reply({
            content: `${targetUser}`,
            embeds: [adoptionEmbed],
            components: [actionRow],
        });

        try {
            const buttonInteraction = await response.awaitMessageComponent({
                componentType: ComponentType.Button,
                time: 300000,
                filter: (i) => i.user.id === targetUser.id,
            });

            if (buttonInteraction.customId.includes('accept')) {
                const successEmbed = new EmbedBuilder()
                    .setTitle('🎉 Adoption Successful!')
                    .setDescription([
                        `**${targetUser.tag}** has been adopted by **${interaction.user.tag}**! 👨‍👩‍👧‍👦`,
                        '',
                        '🎊 A new family bond has been formed!',
                        '',
                        'Your family tree has been updated to reflect this adoption.'
                    ].join('\n'))
                    .setColor(0x00ff00)
                    .addFields({
                        name: '👨‍👩‍👧‍👦 New Family Structure',
                        value: [
                            `**Parent:** ${interaction.user.tag}`,
                            `**Child:** ${targetUser.tag}`,
                            `**Adoption Date:** <t:${Math.floor(Date.now() / 1000)}:F>`,
                            `**Family Status:** Active`
                        ].join('\n'),
                        inline: false,
                    })
                    .setTimestamp();

                await buttonInteraction.update({
                    content: `🎉 ${interaction.user} ${targetUser}`,
                    embeds: [successEmbed],
                    components: [],
                });

                // In production, save adoption to database
                console.log(`Adoption registered: ${interaction.user.id} adopts ${targetUser.id}`);

            } else {
                const rejectionEmbed = new EmbedBuilder()
                    .setTitle('❌ Adoption Declined')
                    .setDescription([
                        `**${targetUser.tag}** has declined the adoption request.`,
                        '',
                        'Maybe they\'re not ready for a family right now!'
                    ].join('\n'))
                    .setColor(0xff0000)
                    .setTimestamp();

                await buttonInteraction.update({
                    embeds: [rejectionEmbed],
                    components: [],
                });
            }

        } catch (error) {
            const timeoutEmbed = new EmbedBuilder()
                .setTitle('⏰ Request Expired')
                .setDescription('The adoption request has expired.')
                .setColor(0x7289da);

            try {
                await interaction.editReply({
                    embeds: [timeoutEmbed],
                    components: [],
                });
            } catch (e) {
                // Ignore edit errors
            }
        }
    },

    async handleDisown(interaction: ChatInputCommandInteraction, guild: any): Promise<void> {
        const targetUser = interaction.options.getUser('user');

        // Simulate family data
        const familyData = {
            children: [
                { id: '111111111111111111', username: 'Child1#1234' },
                { id: '222222222222222222', username: 'Child2#5678' }
            ],
            parents: [
                { id: '333333333333333333', username: 'Parent1#9012' }
            ]
        };

        if (!targetUser) {
            // Show options for disowning
            if (familyData.children.length === 0 && familyData.parents.length === 0) {
                await interaction.reply({
                    embeds: [{
                        color: 0xff0000,
                        description: '❌ You have no family members to disown.',
                    }],
                    ephemeral: true,
                });
                return;
            }

            const embed = new EmbedBuilder()
                .setTitle('👨‍👩‍👧‍👦 Family Disowning Options')
                .setDescription('Choose a family member to disown or leave:')
                .setColor(0xff0000);

            if (familyData.children.length > 0) {
                embed.addFields({
                    name: '👶 Your Children',
                    value: familyData.children.map(child => `• ${child.username}`).join('\n'),
                    inline: false,
                });
            }

            if (familyData.parents.length > 0) {
                embed.addFields({
                    name: '👨‍👩 Your Parents',
                    value: familyData.parents.map(parent => `• ${parent.username}`).join('\n'),
                    inline: false,
                });
            }

            await interaction.reply({ embeds: [embed], ephemeral: true });
            return;
        }

        // Process disowning specific user
        const isChild = familyData.children.some(child => child.id === targetUser.id);
        const isParent = familyData.parents.some(parent => parent.id === targetUser.id);

        if (!isChild && !isParent) {
            await interaction.reply({
                embeds: [{
                    color: 0xff0000,
                    description: `❌ **${targetUser.tag}** is not part of your family.`,
                }],
                ephemeral: true,
            });
            return;
        }

        const relationshipType = isChild ? 'child' : 'parent';
        const actionType = isChild ? 'disown' : 'leave';

        const confirmEmbed = new EmbedBuilder()
            .setTitle(`💔 Confirm Family ${actionType === 'disown' ? 'Disowning' : 'Departure'}`)
            .setDescription([
                `Are you sure you want to ${actionType} **${targetUser.tag}**?`,
                '',
                '**This action will:**',
                `• Remove them as your ${relationshipType}`,
                '• Update family trees',
                '• Notify the affected user',
                '• Keep records for history',
                '',
                '**This action cannot be undone easily.**'
            ].join('\n'))
            .setColor(0xff0000)
            .setTimestamp();

        const confirmButton = new ButtonBuilder()
            .setCustomId('disown_confirm')
            .setLabel(`💔 Confirm ${actionType === 'disown' ? 'Disowning' : 'Departure'}`)
            .setStyle(ButtonStyle.Danger);

        const cancelButton = new ButtonBuilder()
            .setCustomId('disown_cancel')
            .setLabel('❌ Cancel')
            .setStyle(ButtonStyle.Secondary);

        const actionRow = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(confirmButton, cancelButton);

        const response = await interaction.reply({
            embeds: [confirmEmbed],
            components: [actionRow],
            ephemeral: true,
        });

        try {
            const buttonInteraction = await response.awaitMessageComponent({
                componentType: ComponentType.Button,
                time: 60000,
                filter: (i) => i.user.id === interaction.user.id,
            });

            if (buttonInteraction.customId === 'disown_confirm') {
                const resultEmbed = new EmbedBuilder()
                    .setTitle('💔 Family Separation Complete')
                    .setDescription([
                        `**${interaction.user.tag}** has ${actionType === 'disown' ? 'disowned' : 'left'} **${targetUser.tag}**.`,
                        '',
                        'The family relationship has been officially ended.',
                        'Both parties can form new family relationships.'
                    ].join('\n'))
                    .setColor(0xff0000)
                    .setTimestamp();

                await buttonInteraction.update({
                    embeds: [resultEmbed],
                    components: [],
                });

                // In production, update database
                console.log(`Family separation: ${interaction.user.id} ${actionType}s ${targetUser.id}`);

            } else {
                const cancelEmbed = new EmbedBuilder()
                    .setTitle('❤️ Action Cancelled')
                    .setDescription('You chose to keep your family together!')
                    .setColor(0x00ff00);

                await buttonInteraction.update({
                    embeds: [cancelEmbed],
                    components: [],
                });
            }

        } catch (error) {
            try {
                await interaction.editReply({
                    embeds: [{
                        color: 0x7289da,
                        title: '⏰ Request Timed Out',
                        description: 'Family action timed out. No changes were made.',
                    }],
                    components: [],
                });
            } catch (e) {
                // Ignore edit errors
            }
        }
    },

    async handleSiblings(interaction: ChatInputCommandInteraction, guild: any): Promise<void> {
        const targetUser = interaction.options.getUser('user', true);

        if (targetUser.id === interaction.user.id) {
            await interaction.reply({
                embeds: [{
                    color: 0xff0000,
                    description: '❌ You cannot be your own sibling!',
                }],
                ephemeral: true,
            });
            return;
        }

        if (targetUser.bot) {
            await interaction.reply({
                embeds: [{
                    color: 0xff0000,
                    description: '❌ You cannot add a bot as a sibling!',
                }],
                ephemeral: true,
            });
            return;
        }

        const siblingEmbed = new EmbedBuilder()
            .setTitle('👫 Sibling Request!')
            .setDescription([
                `**${interaction.user.tag}** wants to add **${targetUser.tag}** as a sibling!`,
                '',
                '👨‍👩‍👧‍👦 Join the family bond!',
                '',
                `${targetUser}, do you accept this sibling relationship?`
            ].join('\n'))
            .setColor(0x9932cc)
            .addFields({
                name: '👫 Sibling Benefits',
                value: [
                    '• Shared family connections',
                    '• Sibling badge in profiles',
                    '• Joint family activities',
                    '• Brotherly/sisterly support'
                ].join('\n'),
                inline: false,
            })
            .setTimestamp()
            .setFooter({
                text: 'Sibling requests expire in 3 minutes',
                iconURL: interaction.user.displayAvatarURL()
            });

        const acceptButton = new ButtonBuilder()
            .setCustomId(`sibling_accept_${interaction.user.id}_${targetUser.id}`)
            .setLabel('👫 Accept')
            .setStyle(ButtonStyle.Success);

        const declineButton = new ButtonBuilder()
            .setCustomId(`sibling_decline_${interaction.user.id}_${targetUser.id}`)
            .setLabel('❌ Decline')
            .setStyle(ButtonStyle.Danger);

        const actionRow = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(acceptButton, declineButton);

        const response = await interaction.reply({
            content: `${targetUser}`,
            embeds: [siblingEmbed],
            components: [actionRow],
        });

        try {
            const buttonInteraction = await response.awaitMessageComponent({
                componentType: ComponentType.Button,
                time: 180000,
                filter: (i) => i.user.id === targetUser.id,
            });

            if (buttonInteraction.customId.includes('accept')) {
                const successEmbed = new EmbedBuilder()
                    .setTitle('🎉 New Siblings!')
                    .setDescription([
                        `**${interaction.user.tag}** and **${targetUser.tag}** are now siblings! 👫`,
                        '',
                        '🎊 A beautiful sibling bond has been formed!',
                        '',
                        'Your family trees have been updated.'
                    ].join('\n'))
                    .setColor(0x00ff00)
                    .setTimestamp();

                await buttonInteraction.update({
                    content: `🎉 ${interaction.user} ${targetUser}`,
                    embeds: [successEmbed],
                    components: [],
                });

                // In production, save to database
                console.log(`Siblings added: ${interaction.user.id} + ${targetUser.id}`);

            } else {
                const rejectionEmbed = new EmbedBuilder()
                    .setTitle('❌ Sibling Request Declined')
                    .setDescription('The sibling request has been declined.')
                    .setColor(0xff0000)
                    .setTimestamp();

                await buttonInteraction.update({
                    embeds: [rejectionEmbed],
                    components: [],
                });
            }

        } catch (error) {
            const timeoutEmbed = new EmbedBuilder()
                .setTitle('⏰ Request Expired')
                .setDescription('The sibling request has expired.')
                .setColor(0x7289da);

            try {
                await interaction.editReply({
                    embeds: [timeoutEmbed],
                    components: [],
                });
            } catch (e) {
                // Ignore edit errors
            }
        }
    },

    async handleTree(interaction: ChatInputCommandInteraction, guild: any): Promise<void> {
        const targetUser = interaction.options.getUser('user') || interaction.user;

        await interaction.deferReply();

        // Simulate comprehensive family data
        const familyData = {
            user: targetUser,
            spouse: targetUser.id !== interaction.user.id ? null : { id: '111111111111111111', username: 'Spouse#1234', marriedAt: Date.now() - 2592000000 },
            parents: [
                { id: '222222222222222222', username: 'Parent1#5678' },
                { id: '333333333333333333', username: 'Parent2#9012' }
            ],
            children: [
                { id: '444444444444444444', username: 'Child1#3456' },
                { id: '555555555555555555', username: 'Child2#7890' }
            ],
            siblings: [
                { id: '666666666666666666', username: 'Sibling1#2345' }
            ],
            grandparents: [
                { id: '777777777777777777', username: 'Grandpa#6789' }
            ],
            grandchildren: []
        };

        const embed = new EmbedBuilder()
            .setTitle(`🌳 ${targetUser.tag}'s Family Tree`)
            .setDescription(`Comprehensive family relationships for **${targetUser.tag}**`)
            .setColor(0x8fbc8f)
            .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
            .setTimestamp()
            .setFooter({
                text: `Family tree for ${targetUser.tag}`,
                iconURL: targetUser.displayAvatarURL()
            });

        // Build family tree structure
        const treeStructure = [];

        if (familyData.grandparents.length > 0) {
            treeStructure.push('**👴 Grandparents:**');
            familyData.grandparents.forEach(gp => {
                treeStructure.push(`└── ${gp.username}`);
            });
            treeStructure.push('');
        }

        if (familyData.parents.length > 0) {
            treeStructure.push('**👨‍👩 Parents:**');
            familyData.parents.forEach(parent => {
                treeStructure.push(`├── ${parent.username}`);
            });
            treeStructure.push('');
        }

        treeStructure.push(`**👤 ${targetUser.tag}** (You${targetUser.id !== interaction.user.id ? ' - Viewing' : ''})`);

        if (familyData.spouse) {
            treeStructure.push(`├── 💍 **Spouse:** ${familyData.spouse.username}`);
            const marriageDuration = Math.floor((Date.now() - familyData.spouse.marriedAt) / (1000 * 60 * 60 * 24));
            treeStructure.push(`│   └── Married ${marriageDuration} days ago`);
        }

        if (familyData.siblings.length > 0) {
            treeStructure.push('├── **👫 Siblings:**');
            familyData.siblings.forEach(sibling => {
                treeStructure.push(`│   ├── ${sibling.username}`);
            });
        }

        if (familyData.children.length > 0) {
            treeStructure.push('└── **👶 Children:**');
            familyData.children.forEach((child, index) => {
                const isLast = index === familyData.children.length - 1;
                treeStructure.push(`    ${isLast ? '└──' : '├──'} ${child.username}`);
            });
        }

        embed.addFields({
            name: '🌳 Family Structure',
            value: treeStructure.join('\n') || 'No family members found',
            inline: false,
        });

        // Family statistics
        const totalFamily = familyData.parents.length + familyData.children.length +
            familyData.siblings.length + (familyData.spouse ? 1 : 0) + familyData.grandparents.length;

        embed.addFields(
            {
                name: '📊 Family Statistics',
                value: [
                    `**Total Family Members:** ${totalFamily}`,
                    `**Married:** ${familyData.spouse ? 'Yes' : 'No'}`,
                    `**Parents:** ${familyData.parents.length}`,
                    `**Children:** ${familyData.children.length}`,
                    `**Siblings:** ${familyData.siblings.length}`,
                    `**Generation:** ${familyData.grandparents.length > 0 ? '3rd' : familyData.parents.length > 0 ? '2nd' : '1st'}`
                ].join('\n'),
                inline: true,
            },
            {
                name: '🏆 Family Achievements',
                value: [
                    totalFamily >= 5 ? '• 🏠 Large Family (5+ members)' : '',
                    familyData.spouse ? '• 💑 Happily Married' : '',
                    familyData.children.length >= 2 ? '• 👨‍👩‍👧‍👦 Parent of Multiple Children' : '',
                    familyData.siblings.length > 0 ? '• 👫 Has Siblings' : '',
                    familyData.grandparents.length > 0 ? '• 🌳 Multi-Generational' : ''
                ].filter(Boolean).join('\n') || 'No achievements yet',
                inline: true,
            }
        );

        // Action buttons for family management
        if (targetUser.id === interaction.user.id) {
            const addFamilyButton = new ButtonBuilder()
                .setCustomId('family_add_member')
                .setLabel('Add Family Member')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('➕');

            const familySettingsButton = new ButtonBuilder()
                .setCustomId('family_settings')
                .setLabel('Family Settings')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('⚙️');

            const exportTreeButton = new ButtonBuilder()
                .setCustomId('family_export_tree')
                .setLabel('Export Tree')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('📋');

            const actionRow = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(addFamilyButton, familySettingsButton, exportTreeButton);

            await interaction.editReply({
                embeds: [embed],
                components: [actionRow],
            });
        } else {
            await interaction.editReply({
                embeds: [embed],
            });
        }
    },

    async handleList(interaction: ChatInputCommandInteraction, guild: any): Promise<void> {
        const targetUser = interaction.options.getUser('user') || interaction.user;

        await interaction.deferReply({ ephemeral: true });

        // Simulate family list data
        const familyMembers = [
            { id: '111111111111111111', username: 'Spouse#1234', relationship: 'Spouse', since: Date.now() - 2592000000 },
            { id: '222222222222222222', username: 'Parent1#5678', relationship: 'Parent', since: Date.now() - 31536000000 },
            { id: '333333333333333333', username: 'Parent2#9012', relationship: 'Parent', since: Date.now() - 31536000000 },
            { id: '444444444444444444', username: 'Child1#3456', relationship: 'Child', since: Date.now() - 7776000000 },
            { id: '555555555555555555', username: 'Child2#7890', relationship: 'Child', since: Date.now() - 15552000000 },
            { id: '666666666666666666', username: 'Sibling1#2345', relationship: 'Sibling', since: Date.now() - 20736000000 }
        ];

        const embed = new EmbedBuilder()
            .setTitle(`👨‍👩‍👧‍👦 ${targetUser.tag}'s Family List`)
            .setDescription(`Complete list of family relationships`)
            .setColor(0x7289da)
            .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
            .setTimestamp();

        if (familyMembers.length === 0) {
            embed.addFields({
                name: '💔 No Family Members',
                value: `${targetUser.tag} doesn't have any family members yet.\nUse family commands to build relationships!`,
                inline: false,
            });
        } else {
            // Group by relationship type
            const groupedFamily = familyMembers.reduce((acc, member) => {
                if (!acc[member.relationship]) acc[member.relationship] = [];
                acc[member.relationship]!.push(member);
                return acc;
            }, {} as { [key: string]: any[] });

            Object.entries(groupedFamily).forEach(([relationship, members]) => {
                const emoji = getRelationshipEmoji(relationship);
                embed.addFields({
                    name: `${emoji} ${relationship}${members.length > 1 ? 's' : ''}`,
                    value: members.map(member =>
                        `**${member.username}**\n└── Since <t:${Math.floor(member.since / 1000)}:R>`
                    ).join('\n\n'),
                    inline: true,
                });
            });

            embed.addFields({
                name: '📊 Family Summary',
                value: [
                    `**Total Members:** ${familyMembers.length}`,
                    `**Relationships:** ${Object.keys(groupedFamily).length} types`,
                    `**Oldest Bond:** <t:${Math.floor(Math.min(...familyMembers.map(m => m.since)) / 1000)}:R>`,
                    `**Newest Bond:** <t:${Math.floor(Math.max(...familyMembers.map(m => m.since)) / 1000)}:R>`
                ].join('\n'),
                inline: false,
            });
        }

        await interaction.editReply({ embeds: [embed] });
    },

    async handleSearch(interaction: ChatInputCommandInteraction, guild: any): Promise<void> {
        const searchUser = interaction.options.getUser('user', true);

        await interaction.deferReply({ ephemeral: true });

        // Simulate search results
        const searchResults = {
            directFamily: [
                { userId: '111111111111111111', username: 'User1#1234', relationship: 'Spouse of' },
                { userId: '222222222222222222', username: 'User2#5678', relationship: 'Parent of' }
            ],
            extendedFamily: [
                { userId: '333333333333333333', username: 'User3#9012', relationship: 'Sibling-in-law of' },
                { userId: '444444444444444444', username: 'User4#3456', relationship: 'Grandparent of' }
            ],
            familyConnections: 5,
            familyTrees: 2
        };

        const embed = new EmbedBuilder()
            .setTitle(`🔍 Family Search Results`)
            .setDescription(`Search results for **${searchUser.tag}** in ${guild.name}`)
            .setColor(0x9932cc)
            .setThumbnail(searchUser.displayAvatarURL({ size: 256 }))
            .setTimestamp()
            .setFooter({
                text: `Search for ${searchUser.tag}`,
                iconURL: searchUser.displayAvatarURL()
            });

        if (searchResults.directFamily.length > 0) {
            embed.addFields({
                name: '👨‍👩‍👧‍👦 Direct Family Connections',
                value: searchResults.directFamily.map(result =>
                    `**${result.username}** - ${result.relationship} ${searchUser.tag}`
                ).join('\n'),
                inline: false,
            });
        }

        if (searchResults.extendedFamily.length > 0) {
            embed.addFields({
                name: '🌳 Extended Family Network',
                value: searchResults.extendedFamily.map(result =>
                    `**${result.username}** - ${result.relationship} ${searchUser.tag}`
                ).join('\n'),
                inline: false,
            });
        }

        embed.addFields(
            {
                name: '📊 Connection Statistics',
                value: [
                    `**Total Connections:** ${searchResults.familyConnections}`,
                    `**Family Trees:** Part of ${searchResults.familyTrees} tree(s)`,
                    `**Network Reach:** ${searchResults.directFamily.length + searchResults.extendedFamily.length} people`,
                    `**Relationship Types:** ${new Set([...searchResults.directFamily, ...searchResults.extendedFamily].map(r => r.relationship)).size}`
                ].join('\n'),
                inline: true,
            },
            {
                name: '🎯 Search Insights',
                value: [
                    searchResults.familyConnections >= 5 ? '• Well-connected family member' : '• Growing family network',
                    searchResults.directFamily.some(f => f.relationship.includes('Spouse')) ? '• Married individual' : '• Single individual',
                    searchResults.directFamily.some(f => f.relationship.includes('Parent')) ? '• Has children' : '• No children yet',
                    searchResults.extendedFamily.length > 0 ? '• Part of extended family' : '• Close family only'
                ].join('\n'),
                inline: true,
            }
        );

        await interaction.editReply({ embeds: [embed] });
    },
};

function getRelationshipEmoji(relationship: string): string {
    const emojis: { [key: string]: string } = {
        'Spouse': '💍',
        'Parent': '👨‍👩',
        'Child': '👶',
        'Sibling': '👫',
        'Grandparent': '👴',
        'Grandchild': '👼'
    };
    return emojis[relationship] || '👥';
}

export default command;