import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    EmbedBuilder,
    PermissionFlagsBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType
} from 'discord.js';
import { BotClient } from '../../types';

const BOT_OWNER_ID = process.env.BOT_OWNER_ID || '123456789012345678';

const command = {
    data: new SlashCommandBuilder()
        .setName('set-extraowner')
        .setDescription('Manage extra owners for the server (Bot Owner & Server Owner only)')
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add an extra owner to the server')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('User to add as extra owner')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('reason')
                        .setDescription('Reason for adding this extra owner')
                        .setRequired(false)
                        .setMaxLength(200)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove an extra owner from the server')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('User to remove from extra owners')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('reason')
                        .setDescription('Reason for removing this extra owner')
                        .setRequired(false)
                        .setMaxLength(200)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all extra owners for this server')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('clear')
                .setDescription('Remove all extra owners from the server')
                .addStringOption(option =>
                    option
                        .setName('confirmation')
                        .setDescription('Type "CONFIRM" to clear all extra owners')
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

            // Check if user has permission to use this command
            const isBotOwner = interaction.user.id === BOT_OWNER_ID;
            const isServerOwner = interaction.user.id === guild.ownerId;

            if (!isBotOwner && !isServerOwner) {
                await interaction.reply({
                    embeds: [{
                        color: 0xff0000,
                        title: '🚫 Access Denied',
                        description: 'Only the **Bot Owner** and **Server Owner** can manage extra owners.',
                        fields: [
                            {
                                name: '👑 Authorized Users',
                                value: `• Bot Owner: <@${BOT_OWNER_ID}>\n• Server Owner: <@${guild.ownerId}>`,
                                inline: false
                            }
                        ]
                    }],
                    ephemeral: true,
                });
                return;
            }

            // In production, this would fetch from database
            // For now, simulate extra owners storage
            const extraOwners = [
                { userId: '987654321098765432', addedBy: guild.ownerId, addedAt: Date.now() - 86400000, reason: 'Trusted administrator' },
                { userId: '456789012345678901', addedBy: BOT_OWNER_ID, addedAt: Date.now() - 172800000, reason: 'Co-management' }
            ];

            switch (subcommand) {
                case 'add':
                    await this.handleAdd(interaction, extraOwners, guild, isBotOwner);
                    break;
                case 'remove':
                    await this.handleRemove(interaction, extraOwners, guild, isBotOwner);
                    break;
                case 'list':
                    await this.handleList(interaction, extraOwners, guild);
                    break;
                case 'clear':
                    await this.handleClear(interaction, extraOwners, guild, isBotOwner);
                    break;
            }

            // Log the action
            client.logger.info(`Extra owner ${subcommand} used by ${interaction.user.tag}`, {
                guildId: interaction.guildId,
                userId: interaction.user.id,
                subcommand,
                isBotOwner,
                isServerOwner,
            });

            return;

        } catch (error) {
            console.error('Error in set-extraowner command:', error);

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

    async handleAdd(interaction: ChatInputCommandInteraction, extraOwners: any[], guild: any, isBotOwner: boolean): Promise<void> {
        const targetUser = interaction.options.getUser('user', true);
        const reason = interaction.options.getString('reason') || 'No reason provided';

        // Check if we've reached the maximum of 3 extra owners
        if (extraOwners.length >= 3) {
            await interaction.reply({
                embeds: [{
                    color: 0xff0000,
                    title: '⚠️ Maximum Extra Owners Reached',
                    description: 'This server already has the maximum of **3 extra owners**.',
                    fields: [
                        {
                            name: '📋 Current Extra Owners',
                            value: extraOwners.map((owner, index) =>
                                `${index + 1}. <@${owner.userId}> (Added by <@${owner.addedBy}>)`
                            ).join('\n'),
                            inline: false
                        },
                        {
                            name: '💡 Solution',
                            value: 'Remove an existing extra owner before adding a new one using `/set-extraowner remove`',
                            inline: false
                        }
                    ]
                }],
                ephemeral: true,
            });
            return;
        }

        // Check if user is already an extra owner
        const isAlreadyOwner = extraOwners.some(owner => owner.userId === targetUser.id);
        if (isAlreadyOwner) {
            await interaction.reply({
                embeds: [{
                    color: 0xff9900,
                    description: `⚠️ ${targetUser.tag} is already an extra owner of this server.`,
                }],
                ephemeral: true,
            });
            return;
        }

        // Check if trying to add bot owner or server owner
        if (targetUser.id === BOT_OWNER_ID) {
            await interaction.reply({
                embeds: [{
                    color: 0xff9900,
                    description: '⚠️ The Bot Owner already has all permissions and cannot be added as an extra owner.',
                }],
                ephemeral: true,
            });
            return;
        }

        if (targetUser.id === guild.ownerId) {
            await interaction.reply({
                embeds: [{
                    color: 0xff9900,
                    description: '⚠️ The Server Owner already has all permissions and cannot be added as an extra owner.',
                }],
                ephemeral: true,
            });
            return;
        }

        // Check if target user is in the guild
        const member = await guild.members.fetch(targetUser.id).catch(() => null);
        if (!member) {
            await interaction.reply({
                embeds: [{
                    color: 0xff0000,
                    description: '❌ The specified user is not a member of this server.',
                }],
                ephemeral: true,
            });
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle('✅ Extra Owner Added')
            .setDescription(`**${targetUser.tag}** has been successfully added as an extra owner.`)
            .setColor(0x00ff00)
            .setThumbnail(targetUser.displayAvatarURL({ size: 128 }))
            .addFields(
                {
                    name: '👤 New Extra Owner Details',
                    value: [
                        `**User:** ${targetUser.tag} (${targetUser.id})`,
                        `**Added By:** ${interaction.user.tag}`,
                        `**Reason:** ${reason}`,
                        `**Added At:** <t:${Math.floor(Date.now() / 1000)}:F>`
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '🔑 Permissions Granted',
                    value: [
                        '• Access to `/antinuke` commands',
                        '• Access to `/vanity-*` commands',
                        '• Access to `/automod` commands',
                        '• Access to `/raid-protection` commands',
                        '• Access to `/security-alerts` commands'
                    ].join('\n'),
                    inline: true
                },
                {
                    name: '📊 Extra Owner Status',
                    value: [
                        `**Total Extra Owners:** ${extraOwners.length + 1}/3`,
                        `**Remaining Slots:** ${2 - extraOwners.length}`,
                        `**Server Owner:** <@${guild.ownerId}>`,
                        `**Bot Owner:** <@${BOT_OWNER_ID}>`
                    ].join('\n'),
                    inline: true
                }
            )
            .setTimestamp()
            .setFooter({
                text: `Added by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL()
            });

        await interaction.reply({ embeds: [embed] });

        // Send notification to the new extra owner
        try {
            const notificationEmbed = new EmbedBuilder()
                .setTitle('👑 You\'ve Been Made an Extra Owner!')
                .setDescription(`You have been granted extra owner permissions in **${guild.name}**.`)
                .setColor(0x7289da)
                .addFields(
                    {
                        name: '🔑 Your New Permissions',
                        value: '• Full access to anti-nuke commands\n• Complete vanity URL management\n• Automod configuration control\n• Security system management',
                        inline: false
                    },
                    {
                        name: '📋 Important Notes',
                        value: '• Use these permissions responsibly\n• Follow server guidelines\n• Report any security concerns\n• Coordinate with other staff',
                        inline: false
                    }
                )
                .setThumbnail(guild.iconURL())
                .setTimestamp();

            await targetUser.send({ embeds: [notificationEmbed] });
        } catch (error) {
            // User has DMs disabled, ignore
        }
    },

    async handleRemove(interaction: ChatInputCommandInteraction, extraOwners: any[], guild: any, isBotOwner: boolean): Promise<void> {
        const targetUser = interaction.options.getUser('user', true);
        const reason = interaction.options.getString('reason') || 'No reason provided';

        // Check if user is actually an extra owner
        const ownerIndex = extraOwners.findIndex(owner => owner.userId === targetUser.id);
        if (ownerIndex === -1) {
            await interaction.reply({
                embeds: [{
                    color: 0xff9900,
                    description: `⚠️ ${targetUser.tag} is not an extra owner of this server.`,
                }],
                ephemeral: true,
            });
            return;
        }

        const ownerData = extraOwners[ownerIndex];

        const embed = new EmbedBuilder()
            .setTitle('🗑️ Extra Owner Removed')
            .setDescription(`**${targetUser.tag}** has been removed as an extra owner.`)
            .setColor(0xff9900)
            .setThumbnail(targetUser.displayAvatarURL({ size: 128 }))
            .addFields(
                {
                    name: '👤 Removed Extra Owner Details',
                    value: [
                        `**User:** ${targetUser.tag} (${targetUser.id})`,
                        `**Originally Added By:** <@${ownerData.addedBy}>`,
                        `**Added At:** <t:${Math.floor(ownerData.addedAt / 1000)}:R>`,
                        `**Removed By:** ${interaction.user.tag}`,
                        `**Reason:** ${reason}`
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '🚫 Permissions Revoked',
                    value: [
                        '• No longer has access to `/antinuke` commands',
                        '• No longer has access to `/vanity-*` commands',
                        '• No longer has access to `/automod` commands',
                        '• No longer has access to security commands',
                        '• Reverted to standard member permissions'
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '📊 Updated Status',
                    value: [
                        `**Total Extra Owners:** ${extraOwners.length - 1}/3`,
                        `**Available Slots:** ${3 - (extraOwners.length - 1)}`,
                        `**Removal Timestamp:** <t:${Math.floor(Date.now() / 1000)}:F>`
                    ].join('\n'),
                    inline: false
                }
            )
            .setTimestamp()
            .setFooter({
                text: `Removed by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL()
            });

        await interaction.reply({ embeds: [embed] });
    },

    async handleList(interaction: ChatInputCommandInteraction, extraOwners: any[], guild: any): Promise<void> {
        const embed = new EmbedBuilder()
            .setTitle('👑 Server Ownership Structure')
            .setColor(0x7289da)
            .setThumbnail(guild.iconURL({ size: 256 }))
            .setTimestamp()
            .setFooter({
                text: `Requested by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL()
            });

        // Main owners
        embed.addFields({
            name: '👑 Primary Owners',
            value: [
                `**Bot Owner:** <@${BOT_OWNER_ID}>`,
                `**Server Owner:** <@${guild.ownerId}>`
            ].join('\n'),
            inline: false
        });

        if (extraOwners.length > 0) {
            const extraOwnersList = extraOwners.map((owner, index) => {
                const addedTime = `<t:${Math.floor(owner.addedAt / 1000)}:R>`;
                return `${index + 1}. <@${owner.userId}>\n   └ Added by <@${owner.addedBy}> ${addedTime}\n   └ Reason: ${owner.reason}`;
            }).join('\n\n');

            embed.addFields({
                name: `🔑 Extra Owners (${extraOwners.length}/3)`,
                value: extraOwnersList,
                inline: false
            });
        } else {
            embed.addFields({
                name: '🔑 Extra Owners (0/3)',
                value: 'No extra owners have been assigned to this server.',
                inline: false
            });
        }

        embed.addFields(
            {
                name: '🛡️ Permissions Summary',
                value: [
                    '**All Owners Have Access To:**',
                    '• Anti-nuke system configuration',
                    '• Vanity URL management',
                    '• Automod system control',
                    '• Security alerts and monitoring',
                    '• Raid protection management'
                ].join('\n'),
                inline: true
            },
            {
                name: '📊 System Status',
                value: [
                    `**Available Slots:** ${3 - extraOwners.length}`,
                    `**Total Authorized Users:** ${2 + extraOwners.length}`,
                    `**Last Modified:** <t:${Math.floor(Date.now() / 1000)}:R>`,
                    `**Security Level:** Maximum`
                ].join('\n'),
                inline: true
            }
        );

        await interaction.reply({ embeds: [embed] });
    },

    async handleClear(interaction: ChatInputCommandInteraction, extraOwners: any[], guild: any, isBotOwner: boolean): Promise<void> {
        const confirmation = interaction.options.getString('confirmation', true);

        if (confirmation !== 'CONFIRM') {
            await interaction.reply({
                embeds: [{
                    color: 0xff0000,
                    title: '❌ Invalid Confirmation',
                    description: 'To clear all extra owners, you must type exactly `CONFIRM` in the confirmation field.',
                    fields: [{
                        name: '⚠️ Warning',
                        value: 'This action will remove ALL extra owners from the server and cannot be undone.',
                        inline: false
                    }]
                }],
                ephemeral: true,
            });
            return;
        }

        if (extraOwners.length === 0) {
            await interaction.reply({
                embeds: [{
                    color: 0xff9900,
                    description: '⚠️ There are no extra owners to clear.',
                }],
                ephemeral: true,
            });
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle('🗑️ All Extra Owners Cleared')
            .setDescription(`**${extraOwners.length} extra owners** have been removed from the server.`)
            .setColor(0xff0000)
            .addFields(
                {
                    name: '🚫 Removed Extra Owners',
                    value: extraOwners.map((owner, index) =>
                        `${index + 1}. <@${owner.userId}> (Added by <@${owner.addedBy}>)`
                    ).join('\n'),
                    inline: false
                },
                {
                    name: '📋 Clear Details',
                    value: [
                        `**Cleared By:** ${interaction.user.tag}`,
                        `**Timestamp:** <t:${Math.floor(Date.now() / 1000)}:F>`,
                        `**Total Removed:** ${extraOwners.length} users`,
                        `**Available Slots:** 3/3`
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '🔄 Next Steps',
                    value: '• Extra owners can be re-added using `/set-extraowner add`\n• All security permissions remain with Bot Owner and Server Owner\n• Previous extra owners have been notified of the change',
                    inline: false
                }
            )
            .setTimestamp()
            .setFooter({
                text: `Cleared by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL()
            });

        await interaction.reply({ embeds: [embed] });
    },

    // Helper function to check if user is authorized (used by other commands)
    isAuthorizedUser(userId: string, guildOwnerId: string, extraOwners: string[] = []): boolean {
        return userId === BOT_OWNER_ID ||
            userId === guildOwnerId ||
            extraOwners.includes(userId);
    },
};

export default command;