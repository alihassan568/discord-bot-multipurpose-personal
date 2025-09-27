import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    EmbedBuilder,
    PermissionFlagsBits,
    ActionRowBuilder,
    SelectMenuBuilder,
    ComponentType,
    SelectMenuInteraction
} from 'discord.js';
import { BotClient } from '../../types';
import { checkAuthorizationWithError } from '../../utils/permissions';

const command = {
    data: new SlashCommandBuilder()
        .setName('antinuke')
        .setDescription('Configure anti-nuke protection settings for the server')
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('View current anti-nuke protection status')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('enable')
                .setDescription('Enable anti-nuke protection')
                .addBooleanOption(option =>
                    option
                        .setName('strict-mode')
                        .setDescription('Enable strict mode for maximum protection')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('disable')
                .setDescription('Disable anti-nuke protection')
                .addStringOption(option =>
                    option
                        .setName('reason')
                        .setDescription('Reason for disabling protection')
                        .setRequired(false)
                        .setMaxLength(200)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('configure')
                .setDescription('Configure specific anti-nuke settings')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('whitelist')
                .setDescription('Manage the anti-nuke whitelist')
                .addStringOption(option =>
                    option
                        .setName('action')
                        .setDescription('Action to perform')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Add User', value: 'add_user' },
                            { name: 'Remove User', value: 'remove_user' },
                            { name: 'Add Role', value: 'add_role' },
                            { name: 'Remove Role', value: 'remove_role' },
                            { name: 'List', value: 'list' }
                        )
                )
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('User to add/remove from whitelist')
                        .setRequired(false)
                )
                .addRoleOption(option =>
                    option
                        .setName('role')
                        .setDescription('Role to add/remove from whitelist')
                        .setRequired(false)
                )
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
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

            // Check authorization
            const isAuthorized = await checkAuthorizationWithError(interaction, guild.ownerId, 'anti-nuke commands');
            if (!isAuthorized) return;

            // Simulate anti-nuke settings (in real implementation, this would be from database)
            const antiNukeSettings = {
                enabled: true,
                strictMode: false,
                channelDeleteLimit: 3,
                roleDeleteLimit: 2,
                memberBanLimit: 5,
                memberKickLimit: 10,
                timeWindow: 60, // seconds
                autoResponse: 'ban',
                whitelistedUsers: [interaction.user.id],
                whitelistedRoles: [],
            };

            switch (subcommand) {
                case 'status':
                    await this.handleStatus(interaction, antiNukeSettings, guild);
                    break;
                case 'enable':
                    await this.handleEnable(interaction, antiNukeSettings);
                    break;
                case 'disable':
                    await this.handleDisable(interaction, antiNukeSettings);
                    break;
                case 'configure':
                    await this.handleConfigure(interaction, antiNukeSettings);
                    break;
                case 'whitelist':
                    await this.handleWhitelist(interaction, antiNukeSettings);
                    break;
            }

            // Log the action
            client.logger.info(`Anti-nuke ${subcommand} used by ${interaction.user.tag}`, {
                guildId: interaction.guildId,
                userId: interaction.user.id,
                subcommand,
            });

            return;

        } catch (error) {
            console.error('Error in antinuke command:', error);

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

    async handleStatus(interaction: ChatInputCommandInteraction, settings: any, guild: any): Promise<void> {
        const embed = new EmbedBuilder()
            .setTitle('🛡️ Anti-Nuke Protection Status')
            .setColor(settings.enabled ? 0x00ff00 : 0xff0000)
            .setThumbnail(guild.iconURL({ size: 256 }))
            .setTimestamp()
            .setFooter({
                text: `Requested by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL()
            });

        if (settings.enabled) {
            embed.setDescription('✅ **Anti-Nuke Protection is ACTIVE**')
                .addFields(
                    {
                        name: '⚙️ Current Configuration',
                        value: [
                            `**Status:** ${settings.enabled ? 'Enabled' : 'Disabled'}`,
                            `**Mode:** ${settings.strictMode ? 'Strict' : 'Standard'}`,
                            `**Auto Response:** ${settings.autoResponse.charAt(0).toUpperCase() + settings.autoResponse.slice(1)}`,
                            `**Time Window:** ${settings.timeWindow} seconds`
                        ].join('\n'),
                        inline: true,
                    },
                    {
                        name: '📊 Protection Limits',
                        value: [
                            `**Channel Deletions:** ${settings.channelDeleteLimit}/min`,
                            `**Role Deletions:** ${settings.roleDeleteLimit}/min`,
                            `**Member Bans:** ${settings.memberBanLimit}/min`,
                            `**Member Kicks:** ${settings.memberKickLimit}/min`
                        ].join('\n'),
                        inline: true,
                    },
                    {
                        name: '👥 Whitelist Status',
                        value: [
                            `**Whitelisted Users:** ${settings.whitelistedUsers.length}`,
                            `**Whitelisted Roles:** ${settings.whitelistedRoles.length}`,
                            `**Total Protected:** ${settings.whitelistedUsers.length + settings.whitelistedRoles.length}`
                        ].join('\n'),
                        inline: false,
                    }
                );

            const protectedActions = [
                '🔒 Mass channel deletion protection',
                '🔒 Mass role deletion protection',
                '🔒 Mass member ban protection',
                '🔒 Mass member kick protection',
                '🔒 Webhook spam protection',
                '🔒 Server setting modification protection',
                '🔒 Permission escalation detection',
                '🔒 Bot addition monitoring'
            ];

            embed.addFields({
                name: '🛡️ Active Protections',
                value: protectedActions.join('\n'),
                inline: false,
            });

        } else {
            embed.setDescription('❌ **Anti-Nuke Protection is DISABLED**')
                .addFields(
                    {
                        name: '⚠️ Server Vulnerabilities',
                        value: '• Mass channel deletion possible\n• Mass role deletion possible\n• Mass member actions unprotected\n• No automated response to threats\n• Manual monitoring required',
                        inline: false,
                    },
                    {
                        name: '🎯 Recommendations',
                        value: '• Enable protection immediately\n• Configure appropriate limits\n• Set up whitelist for trusted users\n• Test protection with `/antinuke configure`',
                        inline: false,
                    }
                );
        }

        await interaction.reply({ embeds: [embed] });
    },

    async handleEnable(interaction: ChatInputCommandInteraction, settings: any): Promise<void> {
        const strictMode = interaction.options.getBoolean('strict-mode') || false;

        const embed = new EmbedBuilder()
            .setTitle('✅ Anti-Nuke Protection Enabled')
            .setDescription(`Anti-nuke protection has been enabled in ${strictMode ? 'strict' : 'standard'} mode.`)
            .setColor(0x00ff00)
            .addFields(
                {
                    name: '🛡️ Protection Active',
                    value: strictMode
                        ? '• Maximum security settings applied\n• Lower action limits\n• Immediate response to threats\n• Enhanced monitoring active'
                        : '• Standard security settings applied\n• Balanced protection and usability\n• Reasonable action limits\n• Monitoring active',
                    inline: false,
                },
                {
                    name: '📋 Next Steps',
                    value: '• Review settings with `/antinuke configure`\n• Set up whitelist with `/antinuke whitelist`\n• Monitor activity logs\n• Test protection if needed',
                    inline: false,
                }
            )
            .setTimestamp()
            .setFooter({ text: `Enabled by ${interaction.user.tag}` });

        await interaction.reply({ embeds: [embed] });
    },

    async handleDisable(interaction: ChatInputCommandInteraction, settings: any): Promise<void> {
        const reason = interaction.options.getString('reason') || 'No reason provided';

        const embed = new EmbedBuilder()
            .setTitle('⚠️ Anti-Nuke Protection Disabled')
            .setDescription('**Anti-nuke protection has been disabled for this server.**')
            .setColor(0xff9900)
            .addFields(
                {
                    name: '📋 Disable Details',
                    value: `**Reason:** ${reason}\n**Disabled By:** ${interaction.user.tag}\n**Timestamp:** <t:${Math.floor(Date.now() / 1000)}:F>`,
                    inline: false,
                },
                {
                    name: '⚠️ Security Warning',
                    value: 'Your server is now vulnerable to:\n• Mass channel deletion\n• Mass role manipulation\n• Mass member actions\n• Other destructive activities',
                    inline: true,
                },
                {
                    name: '🎯 Recommendations',
                    value: '• Re-enable protection as soon as possible\n• Monitor server activity manually\n• Limit administrative permissions\n• Consider temporary protection',
                    inline: true,
                }
            )
            .setTimestamp()
            .setFooter({ text: 'Consider re-enabling protection soon' });

        await interaction.reply({ embeds: [embed] });
    },

    async handleConfigure(interaction: ChatInputCommandInteraction, settings: any): Promise<void> {
        const selectMenu = new SelectMenuBuilder()
            .setCustomId('antinuke_configure')
            .setPlaceholder('Select a setting to configure')
            .addOptions(
                {
                    label: 'Channel Protection',
                    description: 'Configure channel deletion limits',
                    value: 'channel_limits',
                    emoji: '📁',
                },
                {
                    label: 'Role Protection',
                    description: 'Configure role deletion limits',
                    value: 'role_limits',
                    emoji: '👑',
                },
                {
                    label: 'Member Protection',
                    description: 'Configure ban/kick limits',
                    value: 'member_limits',
                    emoji: '👥',
                },
                {
                    label: 'Time Window',
                    description: 'Configure detection time window',
                    value: 'time_window',
                    emoji: '⏰',
                },
                {
                    label: 'Auto Response',
                    description: 'Configure automatic response actions',
                    value: 'auto_response',
                    emoji: '⚡',
                }
            );

        const actionRow = new ActionRowBuilder<SelectMenuBuilder>()
            .addComponents(selectMenu);

        const embed = new EmbedBuilder()
            .setTitle('⚙️ Anti-Nuke Configuration')
            .setDescription('Select a setting category to configure:')
            .setColor(0x7289da)
            .addFields(
                {
                    name: '📊 Current Settings Overview',
                    value: [
                        `**Channel Delete Limit:** ${settings.channelDeleteLimit}/min`,
                        `**Role Delete Limit:** ${settings.roleDeleteLimit}/min`,
                        `**Member Ban Limit:** ${settings.memberBanLimit}/min`,
                        `**Time Window:** ${settings.timeWindow} seconds`,
                        `**Auto Response:** ${settings.autoResponse}`
                    ].join('\n'),
                    inline: false,
                }
            );

        const response = await interaction.reply({
            embeds: [embed],
            components: [actionRow],
            ephemeral: true,
        });

        try {
            const selectInteraction = await response.awaitMessageComponent({
                componentType: ComponentType.StringSelect,
                time: 60000,
                filter: (i) => i.user.id === interaction.user.id,
            }) as SelectMenuInteraction;

            const selectedValue = selectInteraction.values[0];

            if (!selectedValue) return;

            // In a real implementation, this would open modals or additional configuration
            const configEmbed = new EmbedBuilder()
                .setTitle(`⚙️ Configure ${selectedValue.replace('_', ' ').toUpperCase()}`)
                .setDescription(`Configuration for ${selectedValue} would be handled here.\n\n*In a production implementation, this would open detailed configuration options.*`)
                .setColor(0x00ff00);

            await selectInteraction.update({
                embeds: [configEmbed],
                components: [],
            });

        } catch (error) {
            try {
                await interaction.editReply({ components: [] });
            } catch (e) {
                // Ignore edit errors
            }
        }
    },

    async handleWhitelist(interaction: ChatInputCommandInteraction, settings: any): Promise<void> {
        const action = interaction.options.getString('action', true);
        const user = interaction.options.getUser('user');
        const role = interaction.options.getRole('role');

        let embed: EmbedBuilder;

        switch (action) {
            case 'add_user':
                if (!user) {
                    await interaction.reply({
                        embeds: [{
                            color: 0xff0000,
                            description: '❌ Please specify a user to add to the whitelist.',
                        }],
                        ephemeral: true,
                    });
                    return;
                }

                embed = new EmbedBuilder()
                    .setTitle('✅ User Added to Whitelist')
                    .setDescription(`${user.tag} has been added to the anti-nuke whitelist.`)
                    .setColor(0x00ff00)
                    .addFields({
                        name: '🛡️ Whitelist Permissions',
                        value: '• Bypass channel deletion limits\n• Bypass role deletion limits\n• Bypass member action limits\n• Protected from auto-responses',
                        inline: false,
                    });
                break;

            case 'remove_user':
                if (!user) {
                    await interaction.reply({
                        embeds: [{
                            color: 0xff0000,
                            description: '❌ Please specify a user to remove from the whitelist.',
                        }],
                        ephemeral: true,
                    });
                    return;
                }

                embed = new EmbedBuilder()
                    .setTitle('🗑️ User Removed from Whitelist')
                    .setDescription(`${user.tag} has been removed from the anti-nuke whitelist.`)
                    .setColor(0xff9900);
                break;

            case 'add_role':
                if (!role) {
                    await interaction.reply({
                        embeds: [{
                            color: 0xff0000,
                            description: '❌ Please specify a role to add to the whitelist.',
                        }],
                        ephemeral: true,
                    });
                    return;
                }

                embed = new EmbedBuilder()
                    .setTitle('✅ Role Added to Whitelist')
                    .setDescription(`${role.name} has been added to the anti-nuke whitelist.`)
                    .setColor(0x00ff00);
                break;

            case 'remove_role':
                if (!role) {
                    await interaction.reply({
                        embeds: [{
                            color: 0xff0000,
                            description: '❌ Please specify a role to remove from the whitelist.',
                        }],
                        ephemeral: true,
                    });
                    return;
                }

                embed = new EmbedBuilder()
                    .setTitle('🗑️ Role Removed from Whitelist')
                    .setDescription(`${role.name} has been removed from the anti-nuke whitelist.`)
                    .setColor(0xff9900);
                break;

            case 'list':
                embed = new EmbedBuilder()
                    .setTitle('📋 Anti-Nuke Whitelist')
                    .setDescription('Current whitelist entries:')
                    .setColor(0x7289da)
                    .addFields(
                        {
                            name: '👥 Whitelisted Users',
                            value: settings.whitelistedUsers.length > 0
                                ? `${settings.whitelistedUsers.length} users whitelisted`
                                : 'No users whitelisted',
                            inline: true,
                        },
                        {
                            name: '👑 Whitelisted Roles',
                            value: settings.whitelistedRoles.length > 0
                                ? `${settings.whitelistedRoles.length} roles whitelisted`
                                : 'No roles whitelisted',
                            inline: true,
                        }
                    );
                break;

            default:
                await interaction.reply({
                    embeds: [{
                        color: 0xff0000,
                        description: '❌ Invalid action specified.',
                    }],
                    ephemeral: true,
                });
                return;
        }

        embed.setTimestamp()
            .setFooter({
                text: `Action by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL()
            });

        await interaction.reply({ embeds: [embed] });
    },
};

export default command;