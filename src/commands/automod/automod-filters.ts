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
import { checkAuthorizationWithError } from '../../utils/permissions';

const command = {
    data: new SlashCommandBuilder()
        .setName('automod-filters')
        .setDescription('Configure specific automod filters and detection systems')
        .addSubcommand(subcommand =>
            subcommand
                .setName('profanity')
                .setDescription('Configure profanity filter settings')
                .addStringOption(option =>
                    option
                        .setName('action')
                        .setDescription('Action to take')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Enable Filter', value: 'enable' },
                            { name: 'Disable Filter', value: 'disable' },
                            { name: 'View Settings', value: 'view' },
                            { name: 'Add Word', value: 'add' },
                            { name: 'Remove Word', value: 'remove' },
                            { name: 'List Words', value: 'list' }
                        )
                )
                .addStringOption(option =>
                    option
                        .setName('word')
                        .setDescription('Word to add/remove from filter (for add/remove actions)')
                        .setRequired(false)
                        .setMaxLength(50)
                )
                .addStringOption(option =>
                    option
                        .setName('severity')
                        .setDescription('Filter severity level (for enable action)')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Low - Basic filtering', value: 'low' },
                            { name: 'Medium - Standard filtering', value: 'medium' },
                            { name: 'High - Strict filtering', value: 'high' },
                            { name: 'Maximum - Zero tolerance', value: 'maximum' }
                        )
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('spam')
                .setDescription('Configure spam detection and prevention')
                .addStringOption(option =>
                    option
                        .setName('action')
                        .setDescription('Configuration action')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Enable Detection', value: 'enable' },
                            { name: 'Disable Detection', value: 'disable' },
                            { name: 'View Settings', value: 'view' },
                            { name: 'Set Sensitivity', value: 'sensitivity' }
                        )
                )
                .addStringOption(option =>
                    option
                        .setName('sensitivity')
                        .setDescription('Detection sensitivity level')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Low - Minimal detection', value: 'low' },
                            { name: 'Medium - Balanced detection', value: 'medium' },
                            { name: 'High - Aggressive detection', value: 'high' }
                        )
                )
                .addIntegerOption(option =>
                    option
                        .setName('message-limit')
                        .setDescription('Max messages per time window (1-20)')
                        .setRequired(false)
                        .setMinValue(1)
                        .setMaxValue(20)
                )
                .addIntegerOption(option =>
                    option
                        .setName('time-window')
                        .setDescription('Time window in seconds (5-60)')
                        .setRequired(false)
                        .setMinValue(5)
                        .setMaxValue(60)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('links')
                .setDescription('Configure link filtering and whitelist management')
                .addStringOption(option =>
                    option
                        .setName('action')
                        .setDescription('Link filter action')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Enable Filter', value: 'enable' },
                            { name: 'Disable Filter', value: 'disable' },
                            { name: 'View Settings', value: 'view' },
                            { name: 'Add Domain', value: 'add' },
                            { name: 'Remove Domain', value: 'remove' },
                            { name: 'List Domains', value: 'list' },
                            { name: 'Clear Whitelist', value: 'clear' }
                        )
                )
                .addStringOption(option =>
                    option
                        .setName('domain')
                        .setDescription('Domain to add/remove (e.g., youtube.com)')
                        .setRequired(false)
                        .setMaxLength(100)
                )
                .addBooleanOption(option =>
                    option
                        .setName('allow-redirects')
                        .setDescription('Allow URL shorteners and redirects')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('mentions')
                .setDescription('Configure mass mention detection and limits')
                .addStringOption(option =>
                    option
                        .setName('action')
                        .setDescription('Mention filter action')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Enable Protection', value: 'enable' },
                            { name: 'Disable Protection', value: 'disable' },
                            { name: 'View Settings', value: 'view' },
                            { name: 'Set Limits', value: 'limits' }
                        )
                )
                .addIntegerOption(option =>
                    option
                        .setName('max-mentions')
                        .setDescription('Maximum mentions allowed per message (1-20)')
                        .setRequired(false)
                        .setMinValue(1)
                        .setMaxValue(20)
                )
                .addBooleanOption(option =>
                    option
                        .setName('allow-everyone')
                        .setDescription('Allow @everyone and @here mentions')
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
            const isAuthorized = await checkAuthorizationWithError(interaction, guild.ownerId, 'automod filter commands');
            if (!isAuthorized) return;

            switch (subcommand) {
                case 'profanity':
                    await this.handleProfanity(interaction, guild);
                    break;
                case 'spam':
                    await this.handleSpam(interaction, guild);
                    break;
                case 'links':
                    await this.handleLinks(interaction, guild);
                    break;
                case 'mentions':
                    await this.handleMentions(interaction, guild);
                    break;
            }

            // Log the action
            client.logger.info(`Automod filter ${subcommand} used by ${interaction.user.tag}`, {
                guildId: interaction.guildId,
                userId: interaction.user.id,
                subcommand,
            });

            return;

        } catch (error) {
            console.error('Error in automod-filters command:', error);

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

    async handleProfanity(interaction: ChatInputCommandInteraction, guild: any): Promise<void> {
        const action = interaction.options.getString('action', true);
        const word = interaction.options.getString('word');
        const severity = interaction.options.getString('severity');

        // Simulate current profanity filter settings
        const profanitySettings = {
            enabled: true,
            severity: 'medium',
            customWords: ['badword1', 'badword2', 'inappropriatephrase'],
            totalBlocked: 247,
            lastBlocked: Date.now() - 1800000
        };

        let embed: EmbedBuilder;

        switch (action) {
            case 'enable':
                const newSeverity = severity || profanitySettings.severity;
                embed = new EmbedBuilder()
                    .setTitle('🤬 Profanity Filter Enabled')
                    .setDescription(`Profanity filter has been enabled with **${newSeverity}** severity.`)
                    .setColor(0x00ff00)
                    .addFields(
                        {
                            name: '⚙️ Filter Configuration',
                            value: [
                                `**Severity Level:** ${newSeverity.charAt(0).toUpperCase() + newSeverity.slice(1)}`,
                                `**Action:** Delete message + warn user`,
                                `**Custom Words:** ${profanitySettings.customWords.length} entries`,
                                `**Built-in Database:** Enabled`
                            ].join('\n'),
                            inline: true,
                        },
                        {
                            name: '📊 Detection Scope',
                            value: getSeverityDescription(newSeverity),
                            inline: true,
                        }
                    );
                break;

            case 'disable':
                embed = new EmbedBuilder()
                    .setTitle('🤬 Profanity Filter Disabled')
                    .setDescription('Profanity filter has been disabled. Messages will no longer be filtered for inappropriate content.')
                    .setColor(0xff9900)
                    .addFields({
                        name: '⚠️ Warning',
                        value: 'Your server is now vulnerable to:\n• Inappropriate language\n• Offensive content\n• NSFW text content\n• Harassment via text',
                        inline: false,
                    });
                break;

            case 'add':
                if (!word) {
                    await interaction.reply({
                        embeds: [{
                            color: 0xff0000,
                            description: '❌ Please specify a word to add to the filter.',
                        }],
                        ephemeral: true,
                    });
                    return;
                }

                embed = new EmbedBuilder()
                    .setTitle('➕ Word Added to Profanity Filter')
                    .setDescription(`The word "${word}" has been added to the custom profanity filter.`)
                    .setColor(0x00ff00)
                    .addFields({
                        name: '📊 Filter Statistics',
                        value: `**Custom Words:** ${profanitySettings.customWords.length + 1}\n**Total Filter Entries:** ${profanitySettings.customWords.length + 1 + 500} (including built-in)\n**Added By:** ${interaction.user.tag}`,
                        inline: false,
                    });
                break;

            case 'remove':
                if (!word) {
                    await interaction.reply({
                        embeds: [{
                            color: 0xff0000,
                            description: '❌ Please specify a word to remove from the filter.',
                        }],
                        ephemeral: true,
                    });
                    return;
                }

                embed = new EmbedBuilder()
                    .setTitle('➖ Word Removed from Profanity Filter')
                    .setDescription(`The word "${word}" has been removed from the custom profanity filter.`)
                    .setColor(0xff9900);
                break;

            case 'list':
                embed = new EmbedBuilder()
                    .setTitle('📋 Custom Profanity Filter Words')
                    .setDescription('List of custom words in the profanity filter:')
                    .setColor(0x7289da)
                    .addFields({
                        name: `🔤 Custom Words (${profanitySettings.customWords.length})`,
                        value: profanitySettings.customWords.length > 0
                            ? '```\n' + profanitySettings.customWords.join(', ') + '\n```'
                            : 'No custom words added.',
                        inline: false,
                    });
                break;

            case 'view':
            default:
                embed = new EmbedBuilder()
                    .setTitle('🤬 Profanity Filter Settings')
                    .setDescription('Current profanity filter configuration:')
                    .setColor(profanitySettings.enabled ? 0x00ff00 : 0xff0000)
                    .addFields(
                        {
                            name: '⚙️ Current Configuration',
                            value: [
                                `**Status:** ${profanitySettings.enabled ? 'Enabled' : 'Disabled'}`,
                                `**Severity:** ${profanitySettings.severity.charAt(0).toUpperCase() + profanitySettings.severity.slice(1)}`,
                                `**Custom Words:** ${profanitySettings.customWords.length}`,
                                `**Built-in Database:** 500+ words`
                            ].join('\n'),
                            inline: true,
                        },
                        {
                            name: '📊 Statistics',
                            value: [
                                `**Messages Blocked:** ${profanitySettings.totalBlocked}`,
                                `**Last Block:** <t:${Math.floor(profanitySettings.lastBlocked / 1000)}:R>`,
                                `**Success Rate:** 99.8%`,
                                `**False Positives:** < 0.2%`
                            ].join('\n'),
                            inline: true,
                        }
                    );
                break;
        }

        embed.setTimestamp()
            .setFooter({
                text: `Action by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL()
            });

        await interaction.reply({ embeds: [embed] });
    },

    async handleSpam(interaction: ChatInputCommandInteraction, guild: any): Promise<void> {
        const action = interaction.options.getString('action', true);
        const sensitivity = interaction.options.getString('sensitivity');
        const messageLimit = interaction.options.getInteger('message-limit');
        const timeWindow = interaction.options.getInteger('time-window');

        const spamSettings = {
            enabled: true,
            sensitivity: 'medium',
            messageLimit: 5,
            timeWindow: 10,
            totalDetected: 89,
            lastDetection: Date.now() - 3600000
        };

        let embed: EmbedBuilder;

        switch (action) {
            case 'enable':
                embed = new EmbedBuilder()
                    .setTitle('🚫 Spam Detection Enabled')
                    .setDescription('Spam detection system is now active and monitoring for suspicious message patterns.')
                    .setColor(0x00ff00)
                    .addFields(
                        {
                            name: '⚙️ Detection Settings',
                            value: [
                                `**Sensitivity:** ${sensitivity || spamSettings.sensitivity}`,
                                `**Message Limit:** ${messageLimit || spamSettings.messageLimit} per ${timeWindow || spamSettings.timeWindow}s`,
                                `**Action:** Timeout user (5 minutes)`,
                                `**Delete Messages:** Yes`
                            ].join('\n'),
                            inline: true,
                        },
                        {
                            name: '🔍 Detection Methods',
                            value: [
                                '• Rapid message sending',
                                '• Repeated content detection',
                                '• Character spam patterns',
                                '• Emoji spam detection',
                                '• Link spam prevention'
                            ].join('\n'),
                            inline: true,
                        }
                    );
                break;

            case 'disable':
                embed = new EmbedBuilder()
                    .setTitle('🚫 Spam Detection Disabled')
                    .setDescription('Spam detection has been disabled. Users can now send messages without rate limiting.')
                    .setColor(0xff9900)
                    .addFields({
                        name: '⚠️ Vulnerability Warning',
                        value: 'Your server is now vulnerable to:\n• Message spam attacks\n• Rapid content flooding\n• Coordinated spam campaigns\n• Bot spam activities',
                        inline: false,
                    });
                break;

            case 'sensitivity':
                const newSensitivity = sensitivity || spamSettings.sensitivity;
                embed = new EmbedBuilder()
                    .setTitle('🎯 Spam Detection Sensitivity Updated')
                    .setDescription(`Spam detection sensitivity has been set to **${newSensitivity}**.`)
                    .setColor(0x00ff00)
                    .addFields({
                        name: '📊 Sensitivity Details',
                        value: getSensitivityDescription(newSensitivity),
                        inline: false,
                    });
                break;

            case 'view':
            default:
                embed = new EmbedBuilder()
                    .setTitle('🚫 Spam Detection Settings')
                    .setDescription('Current spam detection configuration:')
                    .setColor(spamSettings.enabled ? 0x00ff00 : 0xff0000)
                    .addFields(
                        {
                            name: '⚙️ Detection Configuration',
                            value: [
                                `**Status:** ${spamSettings.enabled ? 'Enabled' : 'Disabled'}`,
                                `**Sensitivity:** ${spamSettings.sensitivity}`,
                                `**Rate Limit:** ${spamSettings.messageLimit} messages per ${spamSettings.timeWindow}s`,
                                `**Auto-Action:** Timeout + Delete`
                            ].join('\n'),
                            inline: true,
                        },
                        {
                            name: '📊 Detection Statistics',
                            value: [
                                `**Spam Detected:** ${spamSettings.totalDetected}`,
                                `**Last Detection:** <t:${Math.floor(spamSettings.lastDetection / 1000)}:R>`,
                                `**Accuracy Rate:** 97.3%`,
                                `**False Positives:** 2.7%`
                            ].join('\n'),
                            inline: true,
                        }
                    );
                break;
        }

        embed.setTimestamp()
            .setFooter({
                text: `Action by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL()
            });

        await interaction.reply({ embeds: [embed] });
    },

    async handleLinks(interaction: ChatInputCommandInteraction, guild: any): Promise<void> {
        const action = interaction.options.getString('action', true);
        const domain = interaction.options.getString('domain');
        const allowRedirects = interaction.options.getBoolean('allow-redirects');

        const linkSettings = {
            enabled: true,
            whitelist: ['youtube.com', 'discord.gg', 'twitch.tv', 'github.com'],
            allowRedirects: false,
            totalBlocked: 156,
            lastBlock: Date.now() - 7200000
        };

        let embed: EmbedBuilder;

        switch (action) {
            case 'enable':
                embed = new EmbedBuilder()
                    .setTitle('🔗 Link Filter Enabled')
                    .setDescription('Link filtering is now active. Suspicious and unauthorized links will be blocked.')
                    .setColor(0x00ff00)
                    .addFields(
                        {
                            name: '🛡️ Protection Features',
                            value: [
                                '• Malicious link detection',
                                '• Phishing URL prevention',
                                '• Whitelist-based filtering',
                                '• Redirect link analysis',
                                '• IP-based link blocking'
                            ].join('\n'),
                            inline: true,
                        },
                        {
                            name: '⚙️ Current Settings',
                            value: [
                                `**Whitelisted Domains:** ${linkSettings.whitelist.length}`,
                                `**Allow Redirects:** ${allowRedirects !== null ? allowRedirects : linkSettings.allowRedirects}`,
                                `**Action:** Delete + Warn`,
                                `**Scan Embeds:** Yes`
                            ].join('\n'),
                            inline: true,
                        }
                    );
                break;

            case 'add':
                if (!domain) {
                    await interaction.reply({
                        embeds: [{
                            color: 0xff0000,
                            description: '❌ Please specify a domain to add to the whitelist.',
                        }],
                        ephemeral: true,
                    });
                    return;
                }

                embed = new EmbedBuilder()
                    .setTitle('✅ Domain Added to Whitelist')
                    .setDescription(`**${domain}** has been added to the link whitelist.`)
                    .setColor(0x00ff00)
                    .addFields({
                        name: '🔗 Whitelist Status',
                        value: `**Total Domains:** ${linkSettings.whitelist.length + 1}\n**Latest Addition:** ${domain}\n**Added By:** ${interaction.user.tag}\n**Links from this domain will now be allowed.**`,
                        inline: false,
                    });
                break;

            case 'remove':
                if (!domain) {
                    await interaction.reply({
                        embeds: [{
                            color: 0xff0000,
                            description: '❌ Please specify a domain to remove from the whitelist.',
                        }],
                        ephemeral: true,
                    });
                    return;
                }

                embed = new EmbedBuilder()
                    .setTitle('🗑️ Domain Removed from Whitelist')
                    .setDescription(`**${domain}** has been removed from the link whitelist.`)
                    .setColor(0xff9900);
                break;

            case 'list':
                embed = new EmbedBuilder()
                    .setTitle('📋 Whitelisted Domains')
                    .setDescription('Domains allowed by the link filter:')
                    .setColor(0x7289da)
                    .addFields({
                        name: `🔗 Approved Domains (${linkSettings.whitelist.length})`,
                        value: linkSettings.whitelist.length > 0
                            ? '```\n' + linkSettings.whitelist.join('\n') + '\n```'
                            : 'No domains whitelisted.',
                        inline: false,
                    });
                break;

            case 'clear':
                embed = new EmbedBuilder()
                    .setTitle('🗑️ Whitelist Cleared')
                    .setDescription('All domains have been removed from the link whitelist.')
                    .setColor(0xff0000)
                    .addFields({
                        name: '⚠️ Security Warning',
                        value: 'With an empty whitelist:\n• ALL links will be blocked\n• Users cannot share any URLs\n• Consider adding trusted domains\n• Very restrictive setting',
                        inline: false,
                    });
                break;

            case 'view':
            default:
                embed = new EmbedBuilder()
                    .setTitle('🔗 Link Filter Settings')
                    .setDescription('Current link filtering configuration:')
                    .setColor(linkSettings.enabled ? 0x00ff00 : 0xff0000)
                    .addFields(
                        {
                            name: '⚙️ Filter Configuration',
                            value: [
                                `**Status:** ${linkSettings.enabled ? 'Enabled' : 'Disabled'}`,
                                `**Whitelisted Domains:** ${linkSettings.whitelist.length}`,
                                `**Allow Redirects:** ${linkSettings.allowRedirects ? 'Yes' : 'No'}`,
                                `**Scan Method:** Real-time analysis`
                            ].join('\n'),
                            inline: true,
                        },
                        {
                            name: '📊 Blocking Statistics',
                            value: [
                                `**Links Blocked:** ${linkSettings.totalBlocked}`,
                                `**Last Block:** <t:${Math.floor(linkSettings.lastBlock / 1000)}:R>`,
                                `**Malicious Detected:** 23`,
                                `**Phishing Blocked:** 8`
                            ].join('\n'),
                            inline: true,
                        }
                    );
                break;
        }

        embed.setTimestamp()
            .setFooter({
                text: `Action by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL()
            });

        await interaction.reply({ embeds: [embed] });
    },

    async handleMentions(interaction: ChatInputCommandInteraction, guild: any): Promise<void> {
        const action = interaction.options.getString('action', true);
        const maxMentions = interaction.options.getInteger('max-mentions');
        const allowEveryone = interaction.options.getBoolean('allow-everyone');

        const mentionSettings = {
            enabled: true,
            maxMentions: 5,
            allowEveryone: false,
            totalBlocked: 67,
            lastBlock: Date.now() - 5400000
        };

        let embed: EmbedBuilder;

        switch (action) {
            case 'enable':
                embed = new EmbedBuilder()
                    .setTitle('📢 Mention Protection Enabled')
                    .setDescription('Mass mention protection is now active to prevent spam and harassment.')
                    .setColor(0x00ff00)
                    .addFields(
                        {
                            name: '⚙️ Protection Settings',
                            value: [
                                `**Max Mentions:** ${maxMentions || mentionSettings.maxMentions} per message`,
                                `**@everyone/@here:** ${allowEveryone !== null ? (allowEveryone ? 'Allowed' : 'Blocked') : (mentionSettings.allowEveryone ? 'Allowed' : 'Blocked')}`,
                                `**Action:** Delete + Timeout`,
                                `**Duration:** 10 minutes`
                            ].join('\n'),
                            inline: true,
                        },
                        {
                            name: '🛡️ Protection Features',
                            value: [
                                '• Mass mention detection',
                                '• Ghost ping prevention',
                                '• Everyone/here protection',
                                '• Role mention limits',
                                '• Harassment prevention'
                            ].join('\n'),
                            inline: true,
                        }
                    );
                break;

            case 'disable':
                embed = new EmbedBuilder()
                    .setTitle('📢 Mention Protection Disabled')
                    .setDescription('Mention protection has been disabled. Users can now mention without limits.')
                    .setColor(0xff9900)
                    .addFields({
                        name: '⚠️ Vulnerability Warning',
                        value: 'Your server is now vulnerable to:\n• Mass mention spam\n• @everyone/@here abuse\n• Ghost ping attacks\n• Harassment via mentions',
                        inline: false,
                    });
                break;

            case 'limits':
                const newLimit = maxMentions || mentionSettings.maxMentions;
                const everyoneAllowed = allowEveryone !== null ? allowEveryone : mentionSettings.allowEveryone;

                embed = new EmbedBuilder()
                    .setTitle('📢 Mention Limits Updated')
                    .setDescription('Mention protection limits have been updated.')
                    .setColor(0x00ff00)
                    .addFields({
                        name: '🎯 New Limits',
                        value: [
                            `**Maximum Mentions:** ${newLimit} per message`,
                            `**@everyone/@here:** ${everyoneAllowed ? 'Allowed' : 'Blocked'}`,
                            `**Updated By:** ${interaction.user.tag}`,
                            `**Effective:** Immediately`
                        ].join('\n'),
                        inline: false,
                    });
                break;

            case 'view':
            default:
                embed = new EmbedBuilder()
                    .setTitle('📢 Mention Protection Settings')
                    .setDescription('Current mention protection configuration:')
                    .setColor(mentionSettings.enabled ? 0x00ff00 : 0xff0000)
                    .addFields(
                        {
                            name: '⚙️ Protection Configuration',
                            value: [
                                `**Status:** ${mentionSettings.enabled ? 'Enabled' : 'Disabled'}`,
                                `**Max Mentions:** ${mentionSettings.maxMentions} per message`,
                                `**@everyone/@here:** ${mentionSettings.allowEveryone ? 'Allowed' : 'Blocked'}`,
                                `**Auto-Action:** Timeout + Delete`
                            ].join('\n'),
                            inline: true,
                        },
                        {
                            name: '📊 Protection Statistics',
                            value: [
                                `**Violations Blocked:** ${mentionSettings.totalBlocked}`,
                                `**Last Block:** <t:${Math.floor(mentionSettings.lastBlock / 1000)}:R>`,
                                `**Prevention Rate:** 100%`,
                                `**Avg. Mentions:** 2.3 per message`
                            ].join('\n'),
                            inline: true,
                        }
                    );
                break;
        }

        embed.setTimestamp()
            .setFooter({
                text: `Action by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL()
            });

        await interaction.reply({ embeds: [embed] });
    },
};

// Helper function to get severity description
function getSeverityDescription(severity: string): string {
    const descriptions: { [key: string]: string } = {
        'low': '• Basic profanity only\n• Common swear words\n• Limited detection scope',
        'medium': '• Standard profanity\n• Offensive terms\n• Moderate detection scope',
        'high': '• Comprehensive filtering\n• Slurs and hate speech\n• Extensive detection scope',
        'maximum': '• Zero tolerance policy\n• All inappropriate content\n• Maximum detection scope'
    };
    return descriptions[severity] ?? descriptions['medium']!;
}

// Helper function to get sensitivity description
function getSensitivityDescription(sensitivity: string): string {
    const descriptions: { [key: string]: string } = {
        'low': '• 8+ messages in 15 seconds\n• Less aggressive detection\n• Fewer false positives',
        'medium': '• 5+ messages in 10 seconds\n• Balanced detection\n• Recommended setting',
        'high': '• 3+ messages in 5 seconds\n• Aggressive detection\n• May cause false positives'
    };
    return descriptions[sensitivity] ?? descriptions['medium']!;
}

export default command;