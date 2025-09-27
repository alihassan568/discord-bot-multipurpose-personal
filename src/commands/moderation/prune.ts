import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, GuildMember, TextChannel } from 'discord.js';
import { Command, BotClient } from '../../types';

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('prune')
        .setDescription('Delete multiple messages at once')
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
                .setName('user')
                .setDescription('Only delete messages from this user')
                .setRequired(false)
        )
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('Reason for the message deletion')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guild) return;

        const client = interaction.client as BotClient;
        const amount = interaction.options.getInteger('amount', true);
        const targetUser = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const moderator = interaction.member as GuildMember;
        const channel = interaction.channel as TextChannel;

        if (!channel || !channel.isTextBased()) {
            await interaction.reply({
                content: '❌ This command can only be used in text channels.',
                ephemeral: true,
            });
            return;
        }

        try {
            // Fetch messages
            const messages = await channel.messages.fetch({ limit: amount + 1 }); // +1 to account for the command
            let messagesToDelete = messages.filter(msg => {
                // Don't delete messages older than 14 days (Discord limitation)
                const age = Date.now() - msg.createdTimestamp;
                return age < 14 * 24 * 60 * 60 * 1000;
            });

            // Filter by user if specified
            if (targetUser) {
                messagesToDelete = messagesToDelete.filter(msg => msg.author.id === targetUser.id);
            }

            // Remove the command message from deletion
            messagesToDelete = messagesToDelete.filter(msg => msg.id !== interaction.id);

            if (messagesToDelete.size === 0) {
                await interaction.reply({
                    content: '❌ No messages found to delete. Messages older than 14 days cannot be bulk deleted.',
                    ephemeral: true,
                });
                return;
            }

            // Bulk delete messages
            const deleted = await channel.bulkDelete(messagesToDelete, true);

            // Log to database
            await client.db.moderationLog.create({
                data: {
                    guildId: interaction.guildId!,
                    userId: targetUser?.id || 'all',
                    moderatorId: moderator.id,
                    action: 'PRUNE',
                    reason: `Deleted ${deleted.size} messages${targetUser ? ` from ${targetUser.tag}` : ''}. Reason: ${reason}`,
                    metadata: {
                        channel: channel.id,
                        messageCount: deleted.size,
                        targetUser: targetUser?.id || null,
                    },
                },
            });

            // Send confirmation message
            const confirmMessage = await interaction.reply({
                content: `✅ Successfully deleted **${deleted.size}** message${deleted.size === 1 ? '' : 's'}${targetUser ? ` from **${targetUser.tag}**` : ''}.\n**Reason:** ${reason}`,
                fetchReply: true,
            });

            // Auto-delete confirmation after 5 seconds
            setTimeout(async () => {
                try {
                    if (confirmMessage.deletable) {
                        await confirmMessage.delete();
                    }
                } catch (error) {
                    // Message might already be deleted
                }
            }, 5000);

            // Log the action
            client.logger.info(`Messages pruned by ${moderator.user.tag} (${moderator.id}) in ${channel.name} (${channel.id}): ${deleted.size} messages${targetUser ? ` from ${targetUser.tag}` : ''}`, {
                guildId: interaction.guildId,
                channelId: channel.id,
                moderatorId: moderator.id,
                messageCount: deleted.size,
                targetUserId: targetUser?.id || null,
                reason,
            });

        } catch (error) {
            client.logger.error('Error pruning messages:', error);

            let errorMessage = '❌ An error occurred while trying to delete messages.';

            if (error instanceof Error) {
                if (error.message.includes('Missing Permissions')) {
                    errorMessage = '❌ I don\'t have permission to delete messages in this channel.';
                } else if (error.message.includes('Unknown Message')) {
                    errorMessage = '❌ Some messages could not be deleted (they may have already been removed).';
                }
            }

            await interaction.reply({
                content: errorMessage,
                ephemeral: true,
            });
        }
    },
};

export default command;