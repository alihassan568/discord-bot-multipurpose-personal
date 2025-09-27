import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits, GuildMember } from 'discord.js';
import { Command, BotClient, ModerationAction } from '../../types';
import { canModerate, botCanModerate, getDisplayName } from '../../utils/helpers';

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kick a user from the server')
        .addUserOption(option =>
            option
                .setName('target')
                .setDescription('The user to kick')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('Reason for the kick')
                .setRequired(false)
        ),

    permissions: [PermissionFlagsBits.KickMembers],
    guildOnly: true,

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guild) return;

        const client = interaction.client as BotClient;
        const target = interaction.options.getUser('target', true);
        const reason = interaction.options.getString('reason') || 'No reason provided';

        const moderator = interaction.member as GuildMember;
        const targetMember = interaction.guild.members.cache.get(target.id);

        try {
            // Basic validation
            if (target.id === moderator.id) {
                await interaction.reply({
                    content: '❌ You cannot kick yourself!',
                    ephemeral: true,
                });
                return;
            }

            if (target.id === client.user?.id) {
                await interaction.reply({
                    content: '❌ I cannot kick myself!',
                    ephemeral: true,
                });
                return;
            }

            if (!targetMember) {
                await interaction.reply({
                    content: '❌ User is not in this server!',
                    ephemeral: true,
                });
                return;
            }

            // Permission checks
            if (!canModerate(moderator, targetMember)) {
                await interaction.reply({
                    content: '❌ You cannot kick someone with a higher or equal role!',
                    ephemeral: true,
                });
                return;
            }

            if (!botCanModerate(interaction.guild.members.me!, targetMember)) {
                await interaction.reply({
                    content: '❌ I cannot kick this user! They may have a higher role than me.',
                    ephemeral: true,
                });
                return;
            }

            if (!targetMember.kickable) {
                await interaction.reply({
                    content: '❌ I cannot kick this user due to role hierarchy or permissions!',
                    ephemeral: true,
                });
                return;
            }

            // Try to DM the user before kicking
            try {
                const dmEmbed = new EmbedBuilder()
                    .setTitle('👢 You have been kicked')
                    .setColor(0xff8c00)
                    .addFields([
                        { name: 'Server', value: interaction.guild.name, inline: true },
                        { name: 'Reason', value: reason, inline: true },
                        { name: 'Moderator', value: moderator.user.tag, inline: true },
                    ])
                    .setTimestamp();

                await target.send({ embeds: [dmEmbed] });
            } catch (error) {
                // User has DMs disabled or blocked the bot
                client.logger.debug(`Could not DM user ${target.tag} about kick`);
            }

            // Execute the kick
            await targetMember.kick(`${reason} | Moderator: ${moderator.user.tag}`);

            // Log to database
            const modLog = await client.db.moderationLog.create({
                data: {
                    guildId: interaction.guild.id,
                    action: ModerationAction.KICK,
                    targetId: target.id,
                    moderatorId: moderator.id,
                    reason,
                    metadata: {
                        targetUsername: target.username,
                        targetDisplayName: getDisplayName(targetMember),
                        moderatorUsername: moderator.user.username,
                    },
                },
            });

            // Send confirmation
            const confirmEmbed = new EmbedBuilder()
                .setTitle('👢 User Kicked')
                .setColor(0xff8c00)
                .addFields([
                    { name: 'User', value: `${target.tag} (${target.id})`, inline: true },
                    { name: 'Moderator', value: moderator.user.tag, inline: true },
                    { name: 'Reason', value: reason, inline: false },
                    { name: 'Case ID', value: modLog.id, inline: true },
                ])
                .setThumbnail(target.displayAvatarURL())
                .setTimestamp()
                .setFooter({
                    text: `Kicked by ${moderator.user.tag}`,
                    iconURL: moderator.user.displayAvatarURL(),
                });

            await interaction.reply({ embeds: [confirmEmbed] });

            // Send to moderation log channel if configured
            const guild = await client.db.guild.findUnique({
                where: { id: interaction.guild.id },
            });

            const modLogChannelId = guild?.settings?.moderation?.logChannelId;
            if (modLogChannelId) {
                const modLogChannel = interaction.guild.channels.cache.get(modLogChannelId);
                if (modLogChannel?.isTextBased()) {
                    const logEmbed = new EmbedBuilder()
                        .setTitle('🚨 Moderation Action: Kick')
                        .setColor(0xff8c00)
                        .addFields([
                            { name: 'Target', value: `${target} (${target.tag})`, inline: true },
                            { name: 'Moderator', value: `${moderator} (${moderator.user.tag})`, inline: true },
                            { name: 'Channel', value: `${interaction.channel}`, inline: true },
                            { name: 'Reason', value: reason, inline: false },
                            { name: 'Case ID', value: modLog.id, inline: true },
                            { name: 'Timestamp', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                        ])
                        .setThumbnail(target.displayAvatarURL())
                        .setTimestamp();

                    try {
                        await modLogChannel.send({ embeds: [logEmbed] });
                    } catch (error) {
                        client.logger.warn(`Failed to send to mod log channel: ${error}`);
                    }
                }
            }

            client.logger.info(`${moderator.user.tag} kicked ${target.tag} in ${interaction.guild.name}: ${reason}`, {
                guildId: interaction.guild.id,
                moderatorId: moderator.id,
                targetId: target.id,
                caseId: modLog.id,
            });

        } catch (error) {
            client.logger.error('Error executing kick command:', error);

            const errorMessage = {
                content: '❌ An error occurred while trying to kick the user!',
                ephemeral: true,
            };

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(errorMessage);
            } else {
                await interaction.reply(errorMessage);
            }
        }
    },
};

export default command;