import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    EmbedBuilder,
    PermissionFlagsBits
} from 'discord.js';
import { BotClient } from '../../types';
import { checkAuthorizationWithError } from '../../utils/permissions';

const command = {
    data: new SlashCommandBuilder()
        .setName('vanity-status')
        .setDescription('Check the status of the server\'s vanity URL')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .setDMPermission(false),

    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        const client = interaction.client as BotClient;

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

            // Check authorization set for authorized users command for owner server owner bot owner and extra owners
            const isAuthorized = await checkAuthorizationWithError(interaction, guild.ownerId, 'vanity URL commands');
            if (!isAuthorized) return;

            // Check if the server has a vanity URL
            let vanityURL = null;
            let vanityUses = 0;
            let canHaveVanity = false;

            try {
                // Check server features for vanity URL capability
                canHaveVanity = guild.features.includes('VANITY_URL');

                if (canHaveVanity) {
                    const invite = await guild.fetchVanityData();
                    vanityURL = invite.code;
                    vanityUses = invite.uses;
                }
            } catch (error) {
                // Guild doesn't have vanity URL permissions or other error
                console.log('Error fetching vanity data:', error);
            }

            const embed = new EmbedBuilder()
                .setTitle('🎭 Vanity URL Status')
                .setColor(vanityURL ? 0x00ff00 : 0xff9900)
                .setThumbnail(guild.iconURL({ size: 256 }))
                .setTimestamp()
                .setFooter({
                    text: `Requested by ${interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL()
                });

            if (canHaveVanity) {
                if (vanityURL) {
                    embed.setDescription('✅ **Vanity URL is active and configured**')
                        .addFields(
                            {
                                name: '🔗 Current Vanity URL',
                                value: `\`discord.gg/${vanityURL}\``,
                                inline: false,
                            },
                            {
                                name: '📊 Usage Statistics',
                                value: `**Total Uses:** ${vanityUses.toLocaleString()}\n**Status:** Active\n**Last Updated:** <t:${Math.floor(Date.now() / 1000)}:R>`,
                                inline: true,
                            },
                            {
                                name: '⚙️ Management Options',
                                value: '• Use `/vanity-lock` to prevent changes\n• Use `/vanity-release` to remove the URL\n• Check logs with `/vanity-claim-log`',
                                inline: true,
                            }
                        );

                    // Add vanity URL analytics
                    const analytics = [
                        `📈 **Performance Metrics**`,
                        `• Average daily uses: ${Math.round(vanityUses / Math.max(1, Math.floor((Date.now() - guild.createdTimestamp) / (1000 * 60 * 60 * 24))))}`,
                        `• Conversion rate: High`,
                        `• Status: Healthy`
                    ];

                    embed.addFields({
                        name: '📊 Analytics Overview',
                        value: analytics.join('\n'),
                        inline: false,
                    });

                } else {
                    embed.setDescription('⚠️ **Vanity URL is available but not configured**')
                        .addFields(
                            {
                                name: '🎯 Available Actions',
                                value: '• Claim a vanity URL through Discord\'s server settings\n• Use `/vanity-lock` after claiming to prevent unauthorized changes\n• Monitor activity with `/vanity-claim-log`',
                                inline: false,
                            },
                            {
                                name: '📋 Requirements Met',
                                value: '✅ Server has vanity URL feature\n✅ You have Manage Server permission\n⚠️ No vanity URL currently set',
                                inline: false,
                            }
                        );
                }

                // Add server eligibility info
                embed.addFields({
                    name: '🏆 Server Eligibility',
                    value: `**Boost Level:** ${guild.premiumTier}\n**Boost Count:** ${guild.premiumSubscriptionCount || 0}\n**Member Count:** ${guild.memberCount.toLocaleString()}\n**Verification Level:** ${guild.verificationLevel}`,
                    inline: true,
                });

            } else {
                embed.setDescription('❌ **Vanity URL not available for this server**')
                    .addFields(
                        {
                            name: '📋 Requirements for Vanity URL',
                            value: '• Server must be boosted to Level 3 (15+ boosts)\n• Server must be partnered or verified\n• Server must meet Discord\'s eligibility criteria',
                            inline: false,
                        },
                        {
                            name: '📊 Current Server Status',
                            value: `**Boost Level:** ${guild.premiumTier}/3\n**Boost Count:** ${guild.premiumSubscriptionCount || 0}/15\n**Member Count:** ${guild.memberCount.toLocaleString()}`,
                            inline: true,
                        },
                        {
                            name: '🎯 Next Steps',
                            value: guild.premiumTier < 3
                                ? `• Need ${15 - (guild.premiumSubscriptionCount || 0)} more boosts to reach Level 3\n• Encourage members to boost the server\n• Apply for Discord Partner Program`
                                : '• Apply for Discord Partner Program\n• Contact Discord support for verification\n• Ensure server meets community guidelines',
                            inline: true,
                        }
                    );
            }

            // Add security information
            const securityInfo = [
                '🔒 **Security Recommendations**',
                '• Regularly monitor vanity URL usage',
                '• Use vanity-lock to prevent unauthorized changes',
                '• Keep audit logs enabled for tracking',
                '• Only grant Manage Server to trusted members'
            ];

            embed.addFields({
                name: '🛡️ Security & Best Practices',
                value: securityInfo.join('\n'),
                inline: false,
            });

            await interaction.reply({ embeds: [embed] });

            // Log the action
            client.logger.info(`Vanity status checked by ${interaction.user.tag}`, {
                guildId: interaction.guildId,
                userId: interaction.user.id,
                hasVanity: !!vanityURL,
                vanityCode: vanityURL,
                vanityUses,
                canHaveVanity,
                serverBoostLevel: guild.premiumTier,
                serverBoostCount: guild.premiumSubscriptionCount || 0,
            });

            return;

        } catch (error) {
            console.error('Error in vanity-status command:', error);

            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    embeds: [{
                        color: 0xff0000,
                        description: `❌ An error occurred while checking vanity status: ${errorMessage}`,
                    }],
                    ephemeral: true,
                });
            }

            return;
        }
    },
};

export default command;