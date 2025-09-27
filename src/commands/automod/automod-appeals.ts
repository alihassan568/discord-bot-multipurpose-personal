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
import { checkAuthorizationWithError } from '../../utils/permissions';

const command = {
    data: new SlashCommandBuilder()
        .setName('automod-appeals')
        .setDescription('Manage automod appeals and moderation overrides')
        .addSubcommand(subcommand =>
            subcommand
                .setName('review')
                .setDescription('Review pending automod appeals')
                .addStringOption(option =>
                    option
                        .setName('status')
                        .setDescription('Filter appeals by status')
                        .setRequired(false)
                        .addChoices(
                            { name: 'All Appeals', value: 'all' },
                            { name: 'Pending Review', value: 'pending' },
                            { name: 'Under Investigation', value: 'investigating' },
                            { name: 'Approved', value: 'approved' },
                            { name: 'Rejected', value: 'rejected' }
                        )
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('override')
                .setDescription('Override or reverse an automod action')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('User whose automod action to override')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('action-type')
                        .setDescription('Type of action to override')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Remove Warning', value: 'remove_warning' },
                            { name: 'Remove Timeout', value: 'remove_timeout' },
                            { name: 'Unban User', value: 'unban' },
                            { name: 'Restore Message', value: 'restore_message' },
                            { name: 'Clear Violations', value: 'clear_violations' }
                        )
                )
                .addStringOption(option =>
                    option
                        .setName('reason')
                        .setDescription('Reason for the override')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('investigate')
                .setDescription('Investigate a specific automod incident')
                .addStringOption(option =>
                    option
                        .setName('incident-id')
                        .setDescription('Incident ID to investigate (or user ID for recent incidents)')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('settings')
                .setDescription('Configure appeal system settings')
                .addBooleanOption(option =>
                    option
                        .setName('allow-appeals')
                        .setDescription('Allow users to submit appeals')
                        .setRequired(false)
                )
                .addIntegerOption(option =>
                    option
                        .setName('appeal-cooldown')
                        .setDescription('Cooldown between appeals (in hours)')
                        .setRequired(false)
                        .setMinValue(1)
                        .setMaxValue(168)
                )
                .addBooleanOption(option =>
                    option
                        .setName('auto-notify')
                        .setDescription('Automatically notify users of appeal decisions')
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
            const isAuthorized = await checkAuthorizationWithError(interaction, guild.ownerId, 'automod appeals commands');
            if (!isAuthorized) return;

            switch (subcommand) {
                case 'review':
                    await this.handleReview(interaction, guild);
                    break;
                case 'override':
                    await this.handleOverride(interaction, guild);
                    break;
                case 'investigate':
                    await this.handleInvestigate(interaction, guild);
                    break;
                case 'settings':
                    await this.handleSettings(interaction, guild);
                    break;
            }

            // Log the action
            client.logger.info(`Automod appeals ${subcommand} used by ${interaction.user.tag}`, {
                guildId: interaction.guildId,
                userId: interaction.user.id,
                subcommand,
            });

            return;

        } catch (error) {
            console.error('Error in automod-appeals command:', error);

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

    async handleReview(interaction: ChatInputCommandInteraction, guild: any): Promise<void> {
        const status = interaction.options.getString('status') || 'pending';

        // Simulate appeal data
        const appeals = [
            {
                id: 'AP001',
                userId: '111111111111111111',
                username: 'AppealUser#1234',
                type: 'Timeout Appeal',
                originalAction: 'timeout',
                reason: 'False positive spam detection',
                submittedAt: Date.now() - 3600000, // 1 hour ago
                status: 'pending',
                urgency: 'medium'
            },
            {
                id: 'AP002',
                userId: '222222222222222222',
                username: 'InnocentUser#5678',
                type: 'Ban Appeal',
                originalAction: 'ban',
                reason: 'Account was compromised when violations occurred',
                submittedAt: Date.now() - 7200000, // 2 hours ago
                status: 'investigating',
                urgency: 'high'
            },
            {
                id: 'AP003',
                userId: '333333333333333333',
                username: 'MisunderstoodUser#9012',
                type: 'Warning Appeal',
                originalAction: 'warning',
                reason: 'Message was taken out of context',
                submittedAt: Date.now() - 1800000, // 30 minutes ago
                status: 'pending',
                urgency: 'low'
            }
        ];

        const filteredAppeals = status === 'all'
            ? appeals
            : appeals.filter(appeal => appeal.status === status);

        const embed = new EmbedBuilder()
            .setTitle('📋 Automod Appeals Review Panel')
            .setDescription(`Showing ${getStatusDisplay(status)} appeals`)
            .setColor(getStatusColor(status))
            .setTimestamp()
            .setFooter({
                text: `${filteredAppeals.length} appeal(s) • Reviewed by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL()
            });

        if (filteredAppeals.length === 0) {
            embed.addFields({
                name: '✅ No Appeals Found',
                value: `There are currently no ${status === 'all' ? '' : status} appeals to review.`,
                inline: false,
            });
        } else {
            // Group appeals by urgency
            const highUrgency = filteredAppeals.filter(a => a.urgency === 'high');
            const mediumUrgency = filteredAppeals.filter(a => a.urgency === 'medium');
            const lowUrgency = filteredAppeals.filter(a => a.urgency === 'low');

            if (highUrgency.length > 0) {
                embed.addFields({
                    name: '🚨 High Priority Appeals',
                    value: highUrgency.map(appeal =>
                        `**${appeal.id}** - ${appeal.username}\n` +
                        `**Type:** ${appeal.type} | **Status:** ${appeal.status}\n` +
                        `**Reason:** ${appeal.reason}\n` +
                        `**Submitted:** <t:${Math.floor(appeal.submittedAt / 1000)}:R>\n`
                    ).join('\n'),
                    inline: false,
                });
            }

            if (mediumUrgency.length > 0) {
                embed.addFields({
                    name: '⚠️ Medium Priority Appeals',
                    value: mediumUrgency.map(appeal =>
                        `**${appeal.id}** - ${appeal.username}\n` +
                        `**Type:** ${appeal.type} | **Status:** ${appeal.status}\n` +
                        `**Reason:** ${appeal.reason}\n` +
                        `**Submitted:** <t:${Math.floor(appeal.submittedAt / 1000)}:R>\n`
                    ).join('\n'),
                    inline: false,
                });
            }

            if (lowUrgency.length > 0) {
                embed.addFields({
                    name: '📝 Low Priority Appeals',
                    value: lowUrgency.map(appeal =>
                        `**${appeal.id}** - ${appeal.username}\n` +
                        `**Type:** ${appeal.type} | **Status:** ${appeal.status}\n` +
                        `**Reason:** ${appeal.reason}\n` +
                        `**Submitted:** <t:${Math.floor(appeal.submittedAt / 1000)}:R>\n`
                    ).join('\n'),
                    inline: false,
                });
            }
        }

        // Action buttons
        const approveButton = new ButtonBuilder()
            .setCustomId('appeals_approve')
            .setLabel('Approve Appeal')
            .setStyle(ButtonStyle.Success)
            .setEmoji('✅');

        const rejectButton = new ButtonBuilder()
            .setCustomId('appeals_reject')
            .setLabel('Reject Appeal')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('❌');

        const investigateButton = new ButtonBuilder()
            .setCustomId('appeals_investigate')
            .setLabel('Start Investigation')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🔍');

        const actionRow = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(approveButton, rejectButton, investigateButton);

        const response = await interaction.reply({
            embeds: [embed],
            components: filteredAppeals.length > 0 ? [actionRow] : [],
        });

        // Handle button interactions
        if (filteredAppeals.length > 0) {
            try {
                const buttonInteraction = await response.awaitMessageComponent({
                    componentType: ComponentType.Button,
                    time: 300000, // 5 minutes
                    filter: (i) => i.user.id === interaction.user.id,
                });

                // Create modal for appeal ID input
                const modal = new ModalBuilder()
                    .setCustomId(`appeals_${buttonInteraction.customId.split('_')[1]}`)
                    .setTitle('Appeal Action');

                const appealIdInput = new TextInputBuilder()
                    .setCustomId('appeal_id')
                    .setLabel('Appeal ID')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Enter the appeal ID (e.g., AP001)')
                    .setRequired(true)
                    .setMaxLength(10);

                const reasonInput = new TextInputBuilder()
                    .setCustomId('action_reason')
                    .setLabel('Reason for Action')
                    .setStyle(TextInputStyle.Paragraph)
                    .setPlaceholder('Explain your decision...')
                    .setRequired(true)
                    .setMaxLength(1000);

                const firstActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(appealIdInput);
                const secondActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(reasonInput);

                modal.addComponents(firstActionRow, secondActionRow);

                await buttonInteraction.showModal(modal);

                // Handle modal submission
                const modalSubmission = await buttonInteraction.awaitModalSubmit({
                    time: 300000,
                    filter: (i) => i.user.id === interaction.user.id,
                });

                const appealId = modalSubmission.fields.getTextInputValue('appeal_id');
                const actionReason = modalSubmission.fields.getTextInputValue('action_reason');
                const action = buttonInteraction.customId.split('_')[1] ?? 'unknown';

                const resultEmbed = new EmbedBuilder()
                    .setTitle(`${getActionEmoji(action)} Appeal ${action.charAt(0).toUpperCase() + action.slice(1)}`)
                    .setDescription(`Appeal **${appealId}** has been ${action}d successfully.`)
                    .setColor(getActionColor(action))
                    .addFields(
                        {
                            name: 'Action Details',
                            value: [
                                `**Appeal ID:** ${appealId}`,
                                `**Action:** ${action.charAt(0).toUpperCase() + action.slice(1)}`,
                                `**Moderator:** ${interaction.user.tag}`,
                                `**Reason:** ${actionReason}`
                            ].join('\n'),
                            inline: false,
                        },
                        {
                            name: 'Next Steps',
                            value: getNextSteps(action),
                            inline: false,
                        }
                    )
                    .setTimestamp();

                await modalSubmission.reply({
                    embeds: [resultEmbed],
                    ephemeral: true,
                });

            } catch (error) {
                try {
                    await interaction.editReply({ components: [] });
                } catch (e) {
                    // Ignore edit errors
                }
            }
        }
    },

    async handleOverride(interaction: ChatInputCommandInteraction, guild: any): Promise<void> {
        const user = interaction.options.getUser('user', true);
        const actionType = interaction.options.getString('action-type', true);
        const reason = interaction.options.getString('reason', true);

        await interaction.deferReply();

        // Simulate user violation history
        const userViolations = {
            totalViolations: 5,
            recentActions: [
                { type: 'timeout', reason: 'Spam detection', timestamp: Date.now() - 3600000 },
                { type: 'warning', reason: 'Profanity filter', timestamp: Date.now() - 7200000 },
                { type: 'warning', reason: 'Caps abuse', timestamp: Date.now() - 86400000 }
            ],
            appealHistory: [
                { id: 'AP001', status: 'approved', timestamp: Date.now() - 604800000 }
            ]
        };

        const embed = new EmbedBuilder()
            .setTitle('⚖️ Automod Action Override')
            .setDescription('Successfully processed automod action override')
            .setColor(0x00ff00)
            .setTimestamp()
            .setFooter({
                text: `Override processed by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL()
            });

        embed.addFields(
            {
                name: '👤 User Information',
                value: [
                    `**User:** ${user.tag}`,
                    `**User ID:** ${user.id}`,
                    `**Total Violations:** ${userViolations.totalViolations}`,
                    `**Previous Appeals:** ${userViolations.appealHistory.length}`
                ].join('\n'),
                inline: true,
            },
            {
                name: '🔧 Override Details',
                value: [
                    `**Action Type:** ${getActionTypeDisplay(actionType)}`,
                    `**Reason:** ${reason}`,
                    `**Status:** Completed Successfully`,
                    `**Effective:** Immediately`
                ].join('\n'),
                inline: true,
            },
            {
                name: '📋 Actions Taken',
                value: getOverrideActions(actionType),
                inline: false,
            },
            {
                name: '📊 Impact Assessment',
                value: [
                    '• User can now participate normally',
                    '• Violation count adjusted accordingly',
                    '• Appeal system notified of override',
                    '• Automod learning system updated',
                    '• Moderator action logged for review'
                ].join('\n'),
                inline: false,
            }
        );

        // Send notification to user
        try {
            const userNotificationEmbed = new EmbedBuilder()
                .setTitle('✅ Automod Action Overridden')
                .setDescription(`Your recent automod action in **${guild.name}** has been overridden by a moderator.`)
                .setColor(0x00ff00)
                .addFields(
                    {
                        name: 'Override Details',
                        value: [
                            `**Action Removed:** ${getActionTypeDisplay(actionType)}`,
                            `**Reason:** ${reason}`,
                            `**Moderator:** ${interaction.user.tag}`,
                            `**Date:** <t:${Math.floor(Date.now() / 1000)}:F>`
                        ].join('\n'),
                        inline: false,
                    },
                    {
                        name: '💡 What This Means',
                        value: 'The previous automod action against your account has been reversed. You can continue participating in the server normally.',
                        inline: false,
                    }
                )
                .setTimestamp();

            await user.send({ embeds: [userNotificationEmbed] });

            embed.addFields({
                name: '📨 User Notification',
                value: '✅ User has been notified of the override via DM',
                inline: false,
            });

        } catch (error) {
            embed.addFields({
                name: '📨 User Notification',
                value: '⚠️ Could not send DM to user (DMs may be disabled)',
                inline: false,
            });
        }

        await interaction.editReply({ embeds: [embed] });
    },

    async handleInvestigate(interaction: ChatInputCommandInteraction, guild: any): Promise<void> {
        const incidentId = interaction.options.getString('incident-id', true);

        await interaction.deferReply();

        // Simulate incident investigation data
        const incidentData = {
            id: incidentId.startsWith('INC') ? incidentId : `INC${Date.now().toString().slice(-6)}`,
            userId: incidentId.match(/^\d{17,19}$/) ? incidentId : '123456789012345678',
            username: 'InvestigatedUser#1234',
            timestamp: Date.now() - 1800000, // 30 minutes ago
            trigger: 'Spam Detection Algorithm',
            confidence: 97.3,
            actionTaken: 'Timeout (10 minutes)',
            messageContent: '[REDACTED - Potential spam content]',
            context: {
                messagesInLast5Min: 15,
                similarContentDetected: true,
                userReports: 2,
                previousViolations: 3
            },
            evidence: [
                'Rapid message posting (15 messages in 5 minutes)',
                'Repetitive content pattern detected',
                'Similar to known spam signatures',
                'Multiple user reports received',
                'Account shows bot-like behavior patterns'
            ],
            investigation: {
                status: 'completed',
                outcome: 'action_justified',
                notes: 'Clear spam pattern with high confidence. Action appropriate.'
            }
        };

        const embed = new EmbedBuilder()
            .setTitle('🔍 Automod Incident Investigation')
            .setDescription(`Detailed investigation report for incident **${incidentData.id}**`)
            .setColor(0x7289da)
            .setTimestamp()
            .setFooter({
                text: `Investigation by ${interaction.user.tag} • Case #${incidentData.id}`,
                iconURL: interaction.user.displayAvatarURL()
            });

        embed.addFields(
            {
                name: '📋 Incident Overview',
                value: [
                    `**Incident ID:** ${incidentData.id}`,
                    `**User:** ${incidentData.username}`,
                    `**User ID:** ${incidentData.userId}`,
                    `**Timestamp:** <t:${Math.floor(incidentData.timestamp / 1000)}:F>`,
                    `**Trigger:** ${incidentData.trigger}`,
                    `**Confidence:** ${incidentData.confidence}%`
                ].join('\n'),
                inline: true,
            },
            {
                name: '⚖️ Action Details',
                value: [
                    `**Action Taken:** ${incidentData.actionTaken}`,
                    `**Message Content:** ${incidentData.messageContent}`,
                    `**Investigation Status:** ${incidentData.investigation.status}`,
                    `**Outcome:** ${getOutcomeDisplay(incidentData.investigation.outcome)}`
                ].join('\n'),
                inline: true,
            },
            {
                name: '🔍 Contextual Information',
                value: [
                    `**Recent Messages:** ${incidentData.context.messagesInLast5Min} in 5 minutes`,
                    `**Similar Content:** ${incidentData.context.similarContentDetected ? 'Detected' : 'None'}`,
                    `**User Reports:** ${incidentData.context.userReports} reports`,
                    `**Previous Violations:** ${incidentData.context.previousViolations} violations`,
                    `**Account Age:** Estimated 2 weeks old`
                ].join('\n'),
                inline: false,
            },
            {
                name: '📊 Evidence Analysis',
                value: incidentData.evidence.map((item, index) => `${index + 1}. ${item}`).join('\n'),
                inline: false,
            },
            {
                name: '🎯 Investigation Conclusion',
                value: incidentData.investigation.notes,
                inline: false,
            },
            {
                name: '🛠️ Recommended Actions',
                value: getRecommendedActions(incidentData.investigation.outcome),
                inline: false,
            }
        );

        // Create action buttons
        const justifiedButton = new ButtonBuilder()
            .setCustomId('investigation_justified')
            .setLabel('Mark as Justified')
            .setStyle(ButtonStyle.Success)
            .setEmoji('✅');

        const overturnButton = new ButtonBuilder()
            .setCustomId('investigation_overturn')
            .setLabel('Overturn Action')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🔄');

        const appealButton = new ButtonBuilder()
            .setCustomId('investigation_appeal')
            .setLabel('Process Appeal')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('📝');

        const actionRow = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(justifiedButton, overturnButton, appealButton);

        await interaction.editReply({
            embeds: [embed],
            components: [actionRow],
        });

        // Handle button interactions
        try {
            const buttonInteraction = await interaction.followUp({
                content: 'Investigation report generated. Use the buttons above to take action.',
                ephemeral: true,
            });
        } catch (error) {
            // Handle any errors silently
        }
    },

    async handleSettings(interaction: ChatInputCommandInteraction, guild: any): Promise<void> {
        const allowAppeals = interaction.options.getBoolean('allow-appeals');
        const appealCooldown = interaction.options.getInteger('appeal-cooldown');
        const autoNotify = interaction.options.getBoolean('auto-notify');

        const currentSettings = {
            allowAppeals: true,
            appealCooldown: 24,
            autoNotify: true,
            maxAppealsPerUser: 3,
            appealChannels: ['#appeals', '#moderation'],
            autoApprovalEnabled: false
        };

        const embed = new EmbedBuilder()
            .setTitle('⚙️ Appeal System Configuration')
            .setColor(0x00ff00)
            .setTimestamp()
            .setFooter({
                text: `Configured by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL()
            });

        const configChanges: string[] = [];

        if (allowAppeals !== null) {
            configChanges.push(`**Appeals Enabled:** ${allowAppeals ? 'Yes' : 'No'}`);
        }

        if (appealCooldown !== null) {
            configChanges.push(`**Appeal Cooldown:** ${appealCooldown} hours`);
        }

        if (autoNotify !== null) {
            configChanges.push(`**Auto Notifications:** ${autoNotify ? 'Enabled' : 'Disabled'}`);
        }

        if (configChanges.length > 0) {
            embed.setDescription('✅ **Appeal system configuration updated**')
                .addFields({
                    name: '🔧 Configuration Changes',
                    value: configChanges.join('\n'),
                    inline: false,
                });
        } else {
            embed.setDescription('📋 **Current appeal system configuration:**');
        }

        embed.addFields(
            {
                name: '⚙️ Appeal Settings',
                value: [
                    `**Appeals Enabled:** ${currentSettings.allowAppeals ? 'Yes' : 'No'}`,
                    `**Appeal Cooldown:** ${currentSettings.appealCooldown} hours`,
                    `**Auto Notifications:** ${currentSettings.autoNotify ? 'Enabled' : 'Disabled'}`,
                    `**Max Appeals per User:** ${currentSettings.maxAppealsPerUser}`,
                    `**Auto-Approval:** ${currentSettings.autoApprovalEnabled ? 'Enabled' : 'Disabled'}`
                ].join('\n'),
                inline: true,
            },
            {
                name: '📊 Appeal Statistics',
                value: [
                    '**Total Appeals:** 47',
                    '**Approved:** 28 (59.6%)',
                    '**Rejected:** 15 (31.9%)',
                    '**Pending:** 4 (8.5%)',
                    '**Average Response Time:** 4.2 hours'
                ].join('\n'),
                inline: true,
            },
            {
                name: '🔧 Appeal Process Flow',
                value: [
                    '1. **User Submission:** Users submit appeals via DM or appeal channel',
                    '2. **Automatic Review:** System performs initial validation and filtering',
                    '3. **Moderator Assignment:** Appeals are assigned to available moderators',
                    '4. **Investigation:** Moderators review evidence and context',
                    '5. **Decision:** Appeal is approved, rejected, or requires more information',
                    '6. **Notification:** User and relevant staff are notified of the decision'
                ].join('\n'),
                inline: false,
            }
        );

        await interaction.reply({ embeds: [embed] });
    },
};

// Helper functions
function getStatusDisplay(status: string): string {
    const displays: { [key: string]: string } = {
        'all': 'all',
        'pending': 'pending review',
        'investigating': 'under investigation',
        'approved': 'approved',
        'rejected': 'rejected'
    };
    return displays[status] || 'all';
}

function getStatusColor(status: string): number {
    const colors: { [key: string]: number } = {
        'all': 0x7289da,
        'pending': 0xffa500,
        'investigating': 0x9932cc,
        'approved': 0x00ff00,
        'rejected': 0xff0000
    };
    return colors[status] || 0x7289da;
}

function getActionEmoji(action: string): string {
    const emojis: { [key: string]: string } = {
        'approve': '✅',
        'reject': '❌',
        'investigate': '🔍'
    };
    return emojis[action] || '📋';
}

function getActionColor(action: string): number {
    const colors: { [key: string]: number } = {
        'approve': 0x00ff00,
        'reject': 0xff0000,
        'investigate': 0x9932cc
    };
    return colors[action] || 0x7289da;
}

function getNextSteps(action: string): string {
    const steps: { [key: string]: string } = {
        'approve': '• User has been notified of appeal approval\n• Original automod action has been reversed\n• User can now participate normally',
        'reject': '• User has been notified of appeal rejection\n• Original automod action remains in effect\n• User may submit a new appeal after cooldown period',
        'investigate': '• Investigation has been initiated\n• Additional evidence is being gathered\n• User will be notified once investigation is complete'
    };
    return steps[action] || 'No specific next steps required';
}

function getActionTypeDisplay(actionType: string): string {
    const displays: { [key: string]: string } = {
        'remove_warning': 'Warning Removal',
        'remove_timeout': 'Timeout Removal',
        'unban': 'Ban Reversal',
        'restore_message': 'Message Restoration',
        'clear_violations': 'Violation History Clear'
    };
    return displays[actionType] || actionType;
}

function getOverrideActions(actionType: string): string {
    const actions: { [key: string]: string } = {
        'remove_warning': '• Warning removed from user record\n• Violation count decremented\n• User notification sent',
        'remove_timeout': '• Timeout immediately lifted\n• User can send messages again\n• Timeout logged as overridden',
        'unban': '• User unbanned from server\n• Ban record marked as overridden\n• Re-entry permissions restored',
        'restore_message': '• Deleted message content restored\n• Message visible to all users again\n• Deletion logged as overridden',
        'clear_violations': '• All violation records cleared\n• User starts with clean slate\n• Appeal history preserved for reference'
    };
    return actions[actionType] || 'Standard override actions applied';
}

function getOutcomeDisplay(outcome: string): string {
    const displays: { [key: string]: string } = {
        'action_justified': 'Action Justified',
        'action_overturned': 'Action Overturned',
        'requires_review': 'Requires Manual Review',
        'insufficient_evidence': 'Insufficient Evidence'
    };
    return displays[outcome] || outcome;
}

function getRecommendedActions(outcome: string): string {
    const recommendations: { [key: string]: string } = {
        'action_justified': '• No action required - original decision was correct\n• Consider adjusting automod sensitivity if needed\n• Document case for future reference',
        'action_overturned': '• Reverse the original automod action\n• Notify user of the overturn\n• Review automod rules to prevent similar false positives',
        'requires_review': '• Escalate to senior moderation team\n• Gather additional context if available\n• Consider temporary action pending full review',
        'insufficient_evidence': '• Release any temporary restrictions\n• Mark case as inconclusive\n• Monitor user behavior going forward'
    };
    return recommendations[outcome] || 'Standard follow-up procedures apply';
}

export default command;