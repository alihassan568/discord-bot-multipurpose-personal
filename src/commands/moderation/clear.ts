import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits, GuildMember, TextChannel } from 'discord.js';
import { Command, BotClient, ModerationAction } from '../../types';

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Clear messages from the channel')
        .addIntegerOption(option =>
            option
                .setName('amount')
                .setDescription('Number of messages to delete (1-100)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100)
        )
        .addUserOption(option =>
            option
                .setName('target')
                .setDescription('Only delete messages from this user')
                .setRequired(false)
        )
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('Reason for clearing messages')
                .setRequired(false)
        )
        .addBooleanOption(option =>
            option
                .setName('silent')
                .setDescription('Do not show confirmation message')
                .setRequired(false)
        ),

    permissions: [PermissionFlagsBits.ManageMessages],
    guildOnly: true,

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guild || !interaction.channel) return;

        const client = interaction.client as BotClient;
        const amount = interaction.options.getInteger('amount', true);
        const target = interaction.options.getUser('target');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const silent = interaction.options.getBoolean('silent') || false;

        const moderator = interaction.member as GuildMember;

        try {
            // Defer reply since this might take time
            await interaction.deferReply({ ephemeral: silent });

            if (!(interaction.channel instanceof TextChannel)) {
                await interaction.editReply({
                    content: '❌ This command can only be used in text channels!',
                });
                return;
            }

            // Fetch messages
            const messages = await interaction.channel.messages.fetch({
                limit: Math.min(amount + 1, 100) // +1 for the interaction itself
            });

            let messagesToDelete = messages.filter(msg => msg.id !== interaction.id);

            // Filter by user if specified
            if (target) {
                messagesToDelete = messagesToDelete.filter(msg => msg.author.id === target.id);
            }

            // Filter out messages older than 14 days (Discord limitation)
            const twoWeeksAgo = Date.now() - (14 * 24 * 60 * 60 * 1000);
            const validMessages = messagesToDelete.filter(msg => msg.createdTimestamp > twoWeeksAgo);

            if (validMessages.size === 0) {
                await interaction.editReply({
                    content: target
                        ? `❌ No messages found from ${target.tag} in the last 14 days!`
                        : '❌ No messages found to delete (messages older than 14 days cannot be bulk deleted)!',
                });
                return;
            }

            // Delete messages
            const deletedMessages = await interaction.channel.bulkDelete(validMessages, true);

            // Log to database
            const modLog = await client.db.moderationLog.create({
                data: {
                    guildId: interaction.guild.id,
                    action: ModerationAction.PURGE,
                    targetId: target?.id || 'all',
                    moderatorId: moderator.id,
                    reason,
                    metadata: {
                        channelId: interaction.channel.id,
                        channelName: interaction.channel.name,
                        messagesDeleted: deletedMessages.size,
                        requestedAmount: amount,
                        targetUser: target ? {
                            id: target.id,
                            username: target.username,
                            tag: target.tag,
                        } : null,
                        moderatorUsername: moderator.user.username,
                    },
                },
            });

            // Create confirmation embed
            const confirmEmbed = new EmbedBuilder()
                .setTitle('🧹 Messages Cleared')
                .setColor(0x00ff00)
                .addFields([
                    { name: 'Channel', value: `${interaction.channel}`, inline: true },
                    { name: 'Messages Deleted', value: `${deletedMessages.size}`, inline: true },
                    { name: 'Moderator', value: moderator.user.tag, inline: true },
                    { name: 'Target User', value: target ? target.tag : 'All users', inline: true },
                    { name: 'Reason', value: reason, inline: false },
                    { name: 'Case ID', value: modLog.id, inline: true },
                ])
                .setTimestamp()
                .setFooter({
                    text: `Cleared by ${moderator.user.tag}`,
                    iconURL: moderator.user.displayAvatarURL(),
                });

            if (silent) {
                await interaction.editReply({
                    content: `✅ Successfully deleted ${deletedMessages.size} messages.`,
                });
            } else {
                await interaction.editReply({ embeds: [confirmEmbed] });

                // Delete the confirmation message after 10 seconds
                setTimeout(async () => {
                    try {
                        await interaction.deleteReply();
                    } catch (error) {
                        // Message might already be deleted or bot lacks permissions
                    }
                }, 10000);
            }

            // Send to moderation log channel if configured
            const guild = await client.db.guild.findUnique({
                where: { id: interaction.guild.id },
            });

            const modLogChannelId = guild?.settings?.moderation?.logChannelId;
            if (modLogChannelId && modLogChannelId !== interaction.channel.id) {
                const modLogChannel = interaction.guild.channels.cache.get(modLogChannelId);
                if (modLogChannel?.isTextBased()) {
                    const logEmbed = new EmbedBuilder()
                        .setTitle('🚨 Moderation Action: Message Clear')
                        .setColor(0x00ff00)
                        .addFields([
                            { name: 'Channel', value: `${interaction.channel}`, inline: true },
                            { name: 'Moderator', value: `${moderator} (${moderator.user.tag})`, inline: true },
                            { name: 'Messages Deleted', value: `${deletedMessages.size}`, inline: true },
                            { name: 'Target User', value: target ? `${target} (${target.tag})` : 'All users', inline: true },
                            { name: 'Reason', value: reason, inline: false },
                            { name: 'Case ID', value: modLog.id, inline: true },
                            { name: 'Timestamp', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                        ])
                        .setTimestamp();

                    try {
                        await modLogChannel.send({ embeds: [logEmbed] });
                    } catch (error) {
                        client.logger.warn(`Failed to send to mod log channel: ${error}`);
                    }
                }
            }

            client.logger.info(`${moderator.user.tag} cleared ${deletedMessages.size} messages in ${interaction.channel.name} (${interaction.guild.name})${target ? ` from ${target.tag}` : ''}: ${reason}`, {
                guildId: interaction.guild.id,
                channelId: interaction.channel.id,
                moderatorId: moderator.id,
                targetId: target?.id,
                messagesDeleted: deletedMessages.size,
                caseId: modLog.id,
            });

        } catch (error) {
            client.logger.error('Error executing clear command:', error);

            const errorMessage = {
                content: '❌ An error occurred while trying to clear messages!',
            };

            if (interaction.deferred) {
                await interaction.editReply(errorMessage);
            } else {
                await interaction.reply({ ...errorMessage, ephemeral: true });
            }
        }
    },
};

export default command;