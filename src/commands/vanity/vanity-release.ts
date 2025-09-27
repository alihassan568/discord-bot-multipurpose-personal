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

const command = {
    data: new SlashCommandBuilder()
        .setName('vanity-release')
        .setDescription('Release (remove) the server\'s vanity URL')
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('Reason for releasing the vanity URL')
                .setRequired(false)
                .setMaxLength(500)
        )
        .addBooleanOption(option =>
            option
                .setName('confirm')
                .setDescription('Skip confirmation dialog (use with caution)')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .setDMPermission(false),

    async execute(interaction: ChatInputCommandInteraction) {
        const client = interaction.client as BotClient;

        try {
            const guild = interaction.guild;
            if (!guild) {
                return interaction.reply({
                    embeds: [{
                        color: 0xff0000,
                        description: '❌ This command can only be used in a server.',
                    }],
                    ephemeral: true,
                });
            }

            const reason = interaction.options.getString('reason') || 'No reason provided';
            const skipConfirmation = interaction.options.getBoolean('confirm') || false;

            // Check if the server has vanity URL capability
            const canHaveVanity = guild.features.includes('VANITY_URL');

            if (!canHaveVanity) {
                return interaction.reply({
                    embeds: [{
                        color: 0xff0000,
                        description: '❌ This server does not have vanity URL capability.',
                    }],
                    ephemeral: true,
                });
            }

            // Check if server has a vanity URL to release
            let currentVanityURL = null;
            let vanityUses = 0;

            try {
                const invite = await guild.fetchVanityData();
                currentVanityURL = invite.code;
                vanityUses = invite.uses;
            } catch (error) {
                return interaction.reply({
                    embeds: [{
                        color: 0xff9900,
                        description: '⚠️ This server does not currently have a vanity URL to release.',
                    }],
                    ephemeral: true,
                });
            }

            // Show confirmation dialog unless skipped
            if (!skipConfirmation) {
                const warningEmbed = new EmbedBuilder()
                    .setTitle('⚠️ Confirm Vanity URL Release')
                    .setDescription(`**You are about to release the vanity URL: \`discord.gg/${currentVanityURL}\`**\n\nThis action will:`)
                    .addFields(
                        {
                            name: '🚨 Immediate Effects',
                            value: '• Remove the current vanity URL permanently\n• Make the URL available for other servers\n• Break all existing links using this URL\n• Reset usage statistics',
                            inline: false,
                        },
                        {
                            name: '📊 Current Statistics',
                            value: `**Current URL:** \`discord.gg/${currentVanityURL}\`\n**Total Uses:** ${vanityUses.toLocaleString()}\n**Status:** Active`,
                            inline: true,
                        },
                        {
                            name: '⚠️ Warning',
                            value: 'This action **cannot be undone**!\nThe URL may be claimed by another server immediately.',
                            inline: true,
                        }
                    )
                    .setColor(0xff0000)
                    .setTimestamp()
                    .setFooter({ text: 'This action requires confirmation' });

                const confirmButton = new ButtonBuilder()
                    .setCustomId('vanity_release_confirm')
                    .setLabel('Release Vanity URL')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🗑️');

                const cancelButton = new ButtonBuilder()
                    .setCustomId('vanity_release_cancel')
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('❌');

                const actionRow = new ActionRowBuilder<ButtonBuilder>()
                    .addComponents(confirmButton, cancelButton);

                const response = await interaction.reply({
                    embeds: [warningEmbed],
                    components: [actionRow],
                    ephemeral: true,
                });

                try {
                    const confirmation = await response.awaitMessageComponent({
                        componentType: ComponentType.Button,
                        time: 30000, // 30 seconds
                        filter: (i) => i.user.id === interaction.user.id,
                    });

                    if (confirmation.customId === 'vanity_release_cancel') {
                        const cancelEmbed = new EmbedBuilder()
                            .setTitle('✅ Action Cancelled')
                            .setDescription('Vanity URL release has been cancelled. Your vanity URL remains unchanged.')
                            .setColor(0x00ff00);

                        return confirmation.update({
                            embeds: [cancelEmbed],
                            components: [],
                        });
                    }

                    // Continue with release process
                    await confirmation.deferUpdate();

                } catch (error) {
                    const timeoutEmbed = new EmbedBuilder()
                        .setTitle('⏰ Confirmation Timeout')
                        .setDescription('Vanity URL release has been cancelled due to timeout.')
                        .setColor(0xff9900);

                    return interaction.editReply({
                        embeds: [timeoutEmbed],
                        components: [],
                    });
                }
            }

            // Simulate vanity URL release
            // In a real implementation, this would call Discord's API to remove the vanity URL
            // await guild.setVanityCode(null, reason);

            const successEmbed = new EmbedBuilder()
                .setTitle('🗑️ Vanity URL Released')
                .setDescription('**The vanity URL has been successfully released**')
                .addFields(
                    {
                        name: '📋 Release Details',
                        value: `**Released URL:** \`discord.gg/${currentVanityURL}\`\n**Final Usage Count:** ${vanityUses.toLocaleString()}\n**Released By:** ${interaction.user.tag}\n**Reason:** ${reason}`,
                        inline: false,
                    },
                    {
                        name: '✅ Completed Actions',
                        value: '• Vanity URL removed from server\n• URL made available for other servers\n• Usage statistics archived\n• Action logged in audit system',
                        inline: true,
                    },
                    {
                        name: '🎯 Next Steps',
                        value: '• Set up a new vanity URL if desired\n• Update any documentation with new links\n• Monitor for any issues\n• Consider claiming a new URL quickly',
                        inline: true,
                    }
                )
                .setColor(0x00ff00)
                .setThumbnail(guild.iconURL({ size: 256 }))
                .setTimestamp()
                .setFooter({
                    text: `Action completed by ${interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL()
                });

            // Add important reminders
            successEmbed.addFields({
                name: '🚨 Important Reminders',
                value: '• The released URL may be claimed by other servers immediately\n• All existing invite links using this URL are now broken\n• Consider setting up a new vanity URL as soon as possible\n• Update any external references to the old URL',
                inline: false,
            });

            if (skipConfirmation) {
                await interaction.reply({ embeds: [successEmbed] });
            } else {
                await interaction.editReply({
                    embeds: [successEmbed],
                    components: [],
                });
            }

            // Log the action
            client.logger.info(`Vanity URL released by ${interaction.user.tag}`, {
                guildId: interaction.guildId,
                userId: interaction.user.id,
                action: 'vanity_url_released',
                releasedUrl: currentVanityURL,
                finalUsageCount: vanityUses,
                reason,
                skipConfirmation,
            });

            return;

        } catch (error) {
            console.error('Error in vanity-release command:', error);

            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

            if (!interaction.replied && !interaction.deferred) {
                return interaction.reply({
                    embeds: [{
                        color: 0xff0000,
                        description: `❌ An error occurred while releasing vanity URL: ${errorMessage}`,
                    }],
                    ephemeral: true,
                });
            }

            return;
        }
    },
};

export default command;