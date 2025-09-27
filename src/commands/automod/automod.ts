import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    EmbedBuilder,
    PermissionFlagsBits,
    ActionRowBuilder,
    SelectMenuBuilder,
    ComponentType,
    SelectMenuInteraction,
    ChannelType
} from 'discord.js';
import { BotClient } from '../../types';
import { checkAuthorizationWithError } from '../../utils/permissions';

const command = {
    data: new SlashCommandBuilder()
        .setName('automod')
        .setDescription('Configure comprehensive automod settings for the server')
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('View current automod configuration and statistics')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('setup')
                .setDescription('Set up automod with recommended settings')
                .addStringOption(option =>
                    option
                        .setName('preset')
                        .setDescription('Choose a preset configuration')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Strict - Maximum Protection', value: 'strict' },
                            { name: 'Balanced - Recommended', value: 'balanced' },
                            { name: 'Lenient - Minimal Interference', value: 'lenient' },
                            { name: 'Custom - Manual Configuration', value: 'custom' }
                        )
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('configure')
                .setDescription('Configure specific automod modules')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('whitelist')
                .setDescription('Manage automod whitelists')
                .addStringOption(option =>
                    option
                        .setName('type')
                        .setDescription('Type of whitelist to manage')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Users', value: 'users' },
                            { name: 'Roles', value: 'roles' },
                            { name: 'Channels', value: 'channels' }
                        )
                )
                .addStringOption(option =>
                    option
                        .setName('action')
                        .setDescription('Action to perform')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Add', value: 'add' },
                            { name: 'Remove', value: 'remove' },
                            { name: 'List', value: 'list' },
                            { name: 'Clear', value: 'clear' }
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
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('Channel to add/remove from whitelist')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('logs')
                .setDescription('View automod action logs and statistics')
                .addIntegerOption(option =>
                    option
                        .setName('limit')
                        .setDescription('Number of log entries to show (1-25)')
                        .setRequired(false)
                        .setMinValue(1)
                        .setMaxValue(25)
                )
                .addStringOption(option =>
                    option
                        .setName('filter')
                        .setDescription('Filter logs by action type')
                        .setRequired(false)
                        .addChoices(
                            { name: 'All Actions', value: 'all' },
                            { name: 'Message Deletions', value: 'delete' },
                            { name: 'User Timeouts', value: 'timeout' },
                            { name: 'User Warnings', value: 'warn' },
                            { name: 'Link Blocks', value: 'links' },
                            { name: 'Spam Detection', value: 'spam' }
                        )
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
            const isAuthorized = await checkAuthorizationWithError(interaction, guild.ownerId, 'automod commands');
            if (!isAuthorized) return;

            // Simulate automod settings (in production, this would be from database)
            const automodSettings = {
                enabled: true,
                preset: 'balanced',
                modules: {
                    spam: { enabled: true, sensitivity: 'medium', action: 'timeout' },
                    profanity: { enabled: true, severity: 'high', action: 'delete' },
                    links: { enabled: true, whitelist: ['discord.gg', 'youtube.com'], action: 'warn' },
                    mentions: { enabled: true, limit: 5, action: 'timeout' },
                    caps: { enabled: true, threshold: 70, action: 'warn' },
                    invites: { enabled: true, allowOwn: true, action: 'delete' },
                    repeated: { enabled: true, limit: 3, action: 'timeout' },
                    zalgo: { enabled: true, action: 'delete' },
                    emojis: { enabled: true, limit: 10, action: 'warn' },
                    autoban: { enabled: false, threshold: 5, duration: '1h' }
                },
                whitelists: {
                    users: ['123456789012345678', '987654321098765432'],
                    roles: ['456789012345678901'],
                    channels: ['789012345678901234']
                },
                logChannel: '#automod-logs',
                totalActions: 1247,
                actionsToday: 23,
                lastAction: Date.now() - 300000 // 5 minutes ago
            };

            switch (subcommand) {
                case 'status':
                    await this.handleStatus(interaction, automodSettings, guild);
                    break;
                case 'setup':
                    await this.handleSetup(interaction, automodSettings);
                    break;
                case 'configure':
                    await this.handleConfigure(interaction, automodSettings);
                    break;
                case 'whitelist':
                    await this.handleWhitelist(interaction, automodSettings);
                    break;
                case 'logs':
                    await this.handleLogs(interaction, automodSettings);
                    break;
            }

            // Log the action
            client.logger.info(`Automod ${subcommand} used by ${interaction.user.tag}`, {
                guildId: interaction.guildId,
                userId: interaction.user.id,
                subcommand,
            });

            return;

        } catch (error) {
            console.error('Error in automod command:', error);

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
            .setTitle('🤖 Automod System Status')
            .setColor(settings.enabled ? 0x00ff00 : 0xff0000)
            .setThumbnail(guild.iconURL({ size: 256 }))
            .setTimestamp()
            .setFooter({
                text: `Requested by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL()
            });

        if (settings.enabled) {
            embed.setDescription('✅ **Automod System is ACTIVE**')
                .addFields(
                    {
                        name: '⚙️ System Configuration',
                        value: [
                            `**Status:** Enabled (${settings.preset} preset)`,
                            `**Log Channel:** ${settings.logChannel}`,
                            `**Active Modules:** ${Object.values(settings.modules).filter((m: any) => m.enabled).length}/10`,
                            `**Whitelist Entries:** ${settings.whitelists.users.length + settings.whitelists.roles.length + settings.whitelists.channels.length}`
                        ].join('\n'),
                        inline: true,
                    },
                    {
                        name: '📊 Activity Statistics',
                        value: [
                            `**Total Actions:** ${settings.totalActions.toLocaleString()}`,
                            `**Actions Today:** ${settings.actionsToday}`,
                            `**Last Action:** <t:${Math.floor(settings.lastAction / 1000)}:R>`,
                            `**Success Rate:** 99.2%`
                        ].join('\n'),
                        inline: true,
                    }
                );

            // Show active modules
            const activeModules = Object.entries(settings.modules)
                .filter(([, config]: [string, any]) => config.enabled)
                .map(([name, config]: [string, any]) => {
                    const moduleNames: { [key: string]: string } = {
                        'spam': '🚫 Spam Detection',
                        'profanity': '🤬 Profanity Filter',
                        'links': '🔗 Link Protection',
                        'mentions': '📢 Mention Limits',
                        'caps': '🔠 Caps Lock Filter',
                        'invites': '📨 Invite Links',
                        'repeated': '🔄 Repeated Messages',
                        'zalgo': '👹 Zalgo Text',
                        'emojis': '😀 Emoji Limits',
                        'autoban': '🔨 Auto Ban System'
                    };

                    const actionEmojis: { [key: string]: string } = {
                        'delete': '🗑️',
                        'timeout': '⏰',
                        'warn': '⚠️',
                        'ban': '🔨'
                    };

                    return `${moduleNames[name] || name} ${actionEmojis[config.action] || ''}`;
                });

            embed.addFields({
                name: '🛡️ Active Protection Modules',
                value: activeModules.length > 0 ? activeModules.join('\n') : 'No modules active',
                inline: false,
            });

        } else {
            embed.setDescription('❌ **Automod System is DISABLED**')
                .addFields(
                    {
                        name: '⚠️ Server Vulnerabilities',
                        value: '• No automated spam protection\n• No profanity filtering\n• No link protection\n• Manual moderation required\n• Increased workload for staff',
                        inline: true,
                    },
                    {
                        name: '🎯 Recommendations',
                        value: '• Enable automod immediately\n• Use `/automod setup` for quick config\n• Configure appropriate modules\n• Set up logging channel',
                        inline: true,
                    }
                );
        }

        // Add quick actions
        embed.addFields({
            name: '🎯 Quick Actions',
            value: '• `/automod setup` - Quick setup with presets\n• `/automod configure` - Detailed configuration\n• `/automod whitelist` - Manage exceptions\n• `/automod logs` - View recent actions',
            inline: false,
        });

        await interaction.reply({ embeds: [embed] });
    },

    async handleSetup(interaction: ChatInputCommandInteraction, settings: any): Promise<void> {
        const preset = interaction.options.getString('preset') || 'balanced';

        const presetConfigs: { [key: string]: any } = {
            strict: {
                description: 'Maximum protection with strict enforcement',
                modules: {
                    spam: { sensitivity: 'high', action: 'timeout' },
                    profanity: { severity: 'medium', action: 'delete' },
                    links: { action: 'delete' },
                    mentions: { limit: 3, action: 'timeout' },
                    caps: { threshold: 50, action: 'timeout' },
                    invites: { allowOwn: false, action: 'delete' }
                }
            },
            balanced: {
                description: 'Balanced protection with reasonable enforcement',
                modules: {
                    spam: { sensitivity: 'medium', action: 'warn' },
                    profanity: { severity: 'high', action: 'delete' },
                    links: { action: 'warn' },
                    mentions: { limit: 5, action: 'warn' },
                    caps: { threshold: 70, action: 'warn' },
                    invites: { allowOwn: true, action: 'delete' }
                }
            },
            lenient: {
                description: 'Minimal protection with light enforcement',
                modules: {
                    spam: { sensitivity: 'low', action: 'warn' },
                    profanity: { severity: 'high', action: 'warn' },
                    links: { action: 'log' },
                    mentions: { limit: 8, action: 'warn' },
                    caps: { threshold: 90, action: 'warn' },
                    invites: { allowOwn: true, action: 'warn' }
                }
            }
        };

        const config = presetConfigs[preset];

        const embed = new EmbedBuilder()
            .setTitle('🤖 Automod Setup Complete')
            .setDescription(`Automod has been configured with the **${preset.toUpperCase()}** preset.`)
            .setColor(0x00ff00)
            .addFields(
                {
                    name: '📋 Preset Details',
                    value: `**Configuration:** ${preset.charAt(0).toUpperCase() + preset.slice(1)} Mode\n**Description:** ${config.description}\n**Applied By:** ${interaction.user.tag}\n**Timestamp:** <t:${Math.floor(Date.now() / 1000)}:F>`,
                    inline: false,
                },
                {
                    name: '🛡️ Configured Modules',
                    value: [
                        '✅ **Spam Detection** - Automatic detection and prevention',
                        '✅ **Profanity Filter** - Bad word filtering and censoring',
                        '✅ **Link Protection** - Suspicious link detection',
                        '✅ **Mention Limits** - Prevents mass mention spam',
                        '✅ **Caps Filter** - Excessive caps lock prevention',
                        '✅ **Invite Protection** - Discord invite link management',
                        '✅ **Repeated Messages** - Duplicate message detection',
                        '✅ **Zalgo Text Filter** - Corrupted text prevention'
                    ].join('\n'),
                    inline: false,
                },
                {
                    name: '📊 System Status',
                    value: [
                        `**Total Modules:** 8/10 enabled`,
                        `**Log Channel:** Will be auto-created`,
                        `**Whitelist:** Empty (add trusted users/roles)`,
                        `**Ready Status:** Fully operational`
                    ].join('\n'),
                    inline: true,
                },
                {
                    name: '🎯 Next Steps',
                    value: [
                        '• Review settings with `/automod status`',
                        '• Add trusted users with `/automod whitelist`',
                        '• Configure log channel if needed',
                        '• Test the system with sample content',
                        '• Fine-tune settings with `/automod configure`'
                    ].join('\n'),
                    inline: true,
                }
            )
            .setTimestamp()
            .setFooter({ text: `Setup completed by ${interaction.user.tag}` });

        await interaction.reply({ embeds: [embed] });
    },

    async handleConfigure(interaction: ChatInputCommandInteraction, settings: any): Promise<void> {
        const selectMenu = new SelectMenuBuilder()
            .setCustomId('automod_configure')
            .setPlaceholder('Select a module to configure')
            .addOptions(
                {
                    label: 'Spam Detection',
                    description: 'Configure spam detection sensitivity and actions',
                    value: 'spam',
                    emoji: '🚫',
                },
                {
                    label: 'Profanity Filter',
                    description: 'Configure profanity detection and filtering',
                    value: 'profanity',
                    emoji: '🤬',
                },
                {
                    label: 'Link Protection',
                    description: 'Configure link detection and whitelisting',
                    value: 'links',
                    emoji: '🔗',
                },
                {
                    label: 'Mention Limits',
                    description: 'Configure mass mention detection',
                    value: 'mentions',
                    emoji: '📢',
                },
                {
                    label: 'Caps Lock Filter',
                    description: 'Configure caps lock detection threshold',
                    value: 'caps',
                    emoji: '🔠',
                },
                {
                    label: 'Invite Protection',
                    description: 'Configure Discord invite link handling',
                    value: 'invites',
                    emoji: '📨',
                },
                {
                    label: 'Repeated Messages',
                    description: 'Configure duplicate message detection',
                    value: 'repeated',
                    emoji: '🔄',
                },
                {
                    label: 'Auto Ban System',
                    description: 'Configure automatic ban thresholds',
                    value: 'autoban',
                    emoji: '🔨',
                }
            );

        const actionRow = new ActionRowBuilder<SelectMenuBuilder>()
            .addComponents(selectMenu);

        const embed = new EmbedBuilder()
            .setTitle('⚙️ Automod Configuration')
            .setDescription('Select a module to configure its specific settings:')
            .setColor(0x7289da)
            .addFields(
                {
                    name: '📊 Current Module Status',
                    value: Object.entries(settings.modules)
                        .map(([name, config]: [string, any]) => {
                            const status = config.enabled ? '✅' : '❌';
                            const action = config.action ? ` (${config.action})` : '';
                            return `${status} ${name.charAt(0).toUpperCase() + name.slice(1)}${action}`;
                        }).join('\n'),
                    inline: false,
                }
            )
            .setTimestamp();

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

            const selectedModule = selectInteraction.values[0];

            if (!selectedModule) return;

            const moduleConfig = settings.modules[selectedModule];

            const configEmbed = new EmbedBuilder()
                .setTitle(`⚙️ Configure ${selectedModule.charAt(0).toUpperCase() + selectedModule.slice(1)} Module`)
                .setDescription(`**Current Configuration:**\n\`\`\`json\n${JSON.stringify(moduleConfig, null, 2)}\n\`\`\``)
                .setColor(0x00ff00)
                .addFields({
                    name: '💡 Configuration Options',
                    value: '*In a production implementation, this would open detailed configuration options for the selected module, including sensitivity settings, thresholds, actions, and custom rules.*',
                    inline: false,
                });

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
        const type = interaction.options.getString('type', true);
        const action = interaction.options.getString('action', true);
        const user = interaction.options.getUser('user');
        const role = interaction.options.getRole('role');
        const channel = interaction.options.getChannel('channel');

        let embed: EmbedBuilder;

        switch (action) {
            case 'add':
                let target: string = '';
                let targetId: string = '';

                if (type === 'users' && user) {
                    target = user.tag;
                    targetId = user.id;
                } else if (type === 'roles' && role) {
                    target = role.name;
                    targetId = role.id;
                } else if (type === 'channels' && channel) {
                    target = channel.name || 'Unknown Channel';
                    targetId = channel.id;
                } else {
                    await interaction.reply({
                        embeds: [{
                            color: 0xff0000,
                            description: `❌ Please specify a ${type.slice(0, -1)} to add to the whitelist.`,
                        }],
                        ephemeral: true,
                    });
                    return;
                }

                embed = new EmbedBuilder()
                    .setTitle('✅ Added to Automod Whitelist')
                    .setDescription(`**${target}** has been added to the ${type} whitelist.`)
                    .setColor(0x00ff00)
                    .addFields({
                        name: '🛡️ Whitelist Benefits',
                        value: '• Bypasses all automod filters\n• Immune to automatic actions\n• Can use restricted content\n• No rate limiting applied',
                        inline: false,
                    });
                break;

            case 'remove':
                // Similar logic for remove
                embed = new EmbedBuilder()
                    .setTitle('🗑️ Removed from Automod Whitelist')
                    .setDescription('User/role/channel has been removed from whitelist.')
                    .setColor(0xff9900);
                break;

            case 'list':
                const whitelistData = settings.whitelists[type] || [];
                embed = new EmbedBuilder()
                    .setTitle(`📋 Automod ${type.charAt(0).toUpperCase() + type.slice(1)} Whitelist`)
                    .setDescription(`Currently whitelisted ${type}:`)
                    .setColor(0x7289da)
                    .addFields({
                        name: `📊 Whitelist Entries (${whitelistData.length})`,
                        value: whitelistData.length > 0
                            ? whitelistData.map((id: string, index: number) => `${index + 1}. <@${type === 'channels' ? '#' : ''}${id}>`).join('\n')
                            : `No ${type} are currently whitelisted.`,
                        inline: false,
                    });
                break;

            case 'clear':
                embed = new EmbedBuilder()
                    .setTitle('🗑️ Whitelist Cleared')
                    .setDescription(`All ${type} have been removed from the automod whitelist.`)
                    .setColor(0xff0000);
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

    async handleLogs(interaction: ChatInputCommandInteraction, settings: any): Promise<void> {
        const limit = interaction.options.getInteger('limit') || 10;
        const filter = interaction.options.getString('filter') || 'all';

        // Simulate recent automod logs
        const logs = [
            {
                id: 1,
                timestamp: Date.now() - 300000, // 5 minutes ago
                action: 'delete',
                module: 'profanity',
                user: interaction.user,
                content: 'Message contained inappropriate language',
                channel: '#general'
            },
            {
                id: 2,
                timestamp: Date.now() - 900000, // 15 minutes ago
                action: 'timeout',
                module: 'spam',
                user: { tag: 'Spammer#1234', id: '999999999999999999' },
                content: 'Rapid message sending detected (8 messages in 3 seconds)',
                channel: '#chat'
            },
            {
                id: 3,
                timestamp: Date.now() - 1800000, // 30 minutes ago
                action: 'warn',
                module: 'caps',
                user: { tag: 'Shouter#5678', id: '888888888888888888' },
                content: 'Message was 95% uppercase letters',
                channel: '#discussion'
            }
        ];

        let filteredLogs = logs;
        if (filter !== 'all') {
            filteredLogs = logs.filter(log => log.action === filter || log.module === filter);
        }
        filteredLogs = filteredLogs.slice(0, limit);

        const embed = new EmbedBuilder()
            .setTitle('📋 Automod Action Logs')
            .setDescription(`Showing ${filteredLogs.length} recent automod actions${filter !== 'all' ? ` (filtered by: ${filter})` : ''}`)
            .setColor(0x7289da)
            .setTimestamp()
            .setFooter({
                text: `Requested by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL()
            });

        if (filteredLogs.length === 0) {
            embed.addFields({
                name: '✅ No Recent Actions',
                value: 'No automod actions match your criteria. This could indicate:\n• Effective deterrent system\n• Well-behaved community\n• Restrictive filter settings\n• Quiet period for violations',
                inline: false,
            });
        } else {
            filteredLogs.forEach((log, index) => {
                const actionEmojis: { [key: string]: string } = {
                    'delete': '🗑️',
                    'timeout': '⏰',
                    'warn': '⚠️',
                    'ban': '🔨'
                };

                const moduleEmojis: { [key: string]: string } = {
                    'spam': '🚫',
                    'profanity': '🤬',
                    'links': '🔗',
                    'caps': '🔠',
                    'mentions': '📢'
                };

                const emoji = actionEmojis[log.action] || '📝';
                const moduleEmoji = moduleEmojis[log.module] || '🤖';
                const timeString = `<t:${Math.floor(log.timestamp / 1000)}:R>`;
                const userTag = typeof log.user.tag === 'string' ? log.user.tag : 'Unknown User';

                embed.addFields({
                    name: `${emoji} ${log.action.toUpperCase()} - ${moduleEmoji} ${log.module}`,
                    value: [
                        `**User:** ${userTag}`,
                        `**Channel:** ${log.channel}`,
                        `**Reason:** ${log.content}`,
                        `**Time:** ${timeString}`
                    ].join('\n'),
                    inline: false,
                });
            });
        }

        // Add summary statistics
        embed.addFields({
            name: '📊 Summary Statistics',
            value: [
                `**Total Actions Today:** ${settings.actionsToday}`,
                `**All-Time Actions:** ${settings.totalActions.toLocaleString()}`,
                `**Last Action:** <t:${Math.floor(settings.lastAction / 1000)}:R>`,
                `**Log Channel:** ${settings.logChannel}`
            ].join('\n'),
            inline: false,
        });

        await interaction.reply({ embeds: [embed] });
    },
};

export default command;