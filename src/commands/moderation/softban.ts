import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits, GuildMember } from 'discord.js';
import { Command, BotClient, ModerationAction } from '../../types';
import { canModerate, botCanModerate, getDisplayName } from '../../utils/helpers';

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('softban')
        .setDescription('Ban and immediately unban a user to delete their messages')
        .addUserOption(option =>
            option
                .setName('target')
                .setDescription('The user to softban')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option
                .setName('days')
                .setDescription('Number of days of messages to delete (1-7)')
                .setMinValue(1)
                .setMaxValue(7)
                .setRequired(false)
        )
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('Reason for the softban')
                .setRequired(false)
        ),

    permissions: [PermissionFlagsBits.BanMembers],
    guildOnly: true,

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guild) return;

        const client = interaction.client as BotClient;
        const target = interaction.options.getUser('target', true);
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const deleteDays = interaction.options.getInteger('days') || 7;

        const moderator = interaction.member as GuildMember;
        const targetMember = interaction.guild.members.cache.get(target.id);

        try {
            // Basic validation
            if (target.id === moderator.id) {
                await interaction.reply({
                    content: '❌ You cannot softban yourself!',
                    ephemeral: true,
                });
                return;
            }

            if (target.id === client.user?.id) {
                await interaction.reply({
                    content: '❌ I cannot softban myself!',
                    ephemeral: true,
                });
                return;
            }

            // Permission checks (only if user is in server)
            if (targetMember) {
                if (!canModerate(moderator, targetMember)) {
                    await interaction.reply({
                        content: '❌ You cannot softban someone with a higher or equal role!',
                        ephemeral: true,
                    });
                    return;
                }

                if (!botCanModerate(interaction.guild.members.me!, targetMember)) {
                    await interaction.reply({
                        content: '❌ I cannot softban this user! They may have a higher role than me.',
                        ephemeral: true,
                    });
                    return;
                }

                if (!targetMember.bannable) {
                    await interaction.reply({
                        content: '❌ I cannot softban this user due to role hierarchy or permissions!',
                        ephemeral: true,
                    });
                    return;
                }
            }

            // Defer reply as this operation takes time
            await interaction.deferReply();

            // Try to DM the user before softban
            try {
                const dmEmbed = new EmbedBuilder()
                    .setTitle('🔄 You have been softbanned')
                    .setColor(0xffa500)
                    .addFields([
                        { name: 'Server', value: interaction.guild.name, inline: true },
                        { name: 'Reason', value: reason, inline: true },
                        { name: 'Moderator', value: moderator.user.tag, inline: true },
                    ])
                    .setDescription('This is a temporary ban to clear your messages. You can rejoin the server immediately.')
                    .setTimestamp();

                await target.send({ embeds: [dmEmbed] });
            } catch (error) {
                client.logger.debug(`Could not DM user ${target.tag} about softban`);
            }

            // Execute the ban
            await interaction.guild.members.ban(target, {
                deleteMessageDays: deleteDays,
                reason: `Softban: ${reason} | Moderator: ${moderator.user.tag}`,
            });

            // Wait a brief moment
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Immediately unban
            await interaction.guild.members.unban(target, `Softban completion | Moderator: ${moderator.user.tag}`);

            // Log to database
            const modLog = await client.db.moderationLog.create({
                data: {
                    guildId: interaction.guild.id,
                    action: ModerationAction.BAN, // Using BAN action but with softban metadata
                    targetId: target.id,
                    moderatorId: moderator.id,
                    reason,
                    metadata: {
                        type: 'softban',
                        deleteDays,
                        targetUsername: target.username,
                        targetDisplayName: targetMember ? getDisplayName(targetMember) : target.globalName || target.username,
                        moderatorUsername: moderator.user.username,
                    },
                },
            });

            // Send confirmation
            const confirmEmbed = new EmbedBuilder()
                .setTitle('🔄 User Softbanned')
                .setColor(0xffa500)
                .addFields([
                    { name: 'User', value: `${target.tag} (${target.id})`, inline: true },
                    { name: 'Moderator', value: moderator.user.tag, inline: true },
                    { name: 'Messages Deleted', value: `${deleteDays} days`, inline: true },
                    { name: 'Reason', value: reason, inline: false },
                    { name: 'Case ID', value: modLog.id, inline: true },
                ])
                .setDescription('User has been banned and unbanned to clear messages. They can rejoin immediately.')
                .setThumbnail(target.displayAvatarURL())
                .setTimestamp()
                .setFooter({
                    text: `Softbanned by ${moderator.user.tag}`,
                    iconURL: moderator.user.displayAvatarURL(),
                });

            await interaction.editReply({ embeds: [confirmEmbed] });

            client.logger.info(`${moderator.user.tag} softbanned ${target.tag} in ${interaction.guild.name}: ${reason}`, {
                guildId: interaction.guild.id,
                moderatorId: moderator.id,
                targetId: target.id,
                caseId: modLog.id,
                deleteDays,
            });

        } catch (error) {
            client.logger.error('Error executing softban command:', error);

            const errorMessage = {
                content: '❌ An error occurred while trying to softban the user!',
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