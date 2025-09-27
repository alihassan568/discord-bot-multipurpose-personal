import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits, GuildMember } from 'discord.js';
import { Command, BotClient, ModerationAction } from '../../types';
import { canModerate, botCanModerate, getDisplayName, parseDuration } from '../../utils/helpers';

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('mute')
        .setDescription('Mute a user (timeout)')
        .addUserOption(option =>
            option
                .setName('target')
                .setDescription('The user to mute')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('duration')
                .setDescription('Duration of the mute (e.g., 10m, 1h, 1d)')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('Reason for the mute')
                .setRequired(false)
        ),

    permissions: [PermissionFlagsBits.ModerateMembers],
    guildOnly: true,

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guild) return;

        const client = interaction.client as BotClient;
        const target = interaction.options.getUser('target', true);
        const durationStr = interaction.options.getString('duration', true);
        const reason = interaction.options.getString('reason') || 'No reason provided';

        const moderator = interaction.member as GuildMember;
        const targetMember = interaction.guild.members.cache.get(target.id);

        try {
            // Basic validation
            if (target.id === moderator.id) {
                await interaction.reply({
                    content: '❌ You cannot mute yourself!',
                    ephemeral: true,
                });
                return;
            }

            if (target.id === client.user?.id) {
                await interaction.reply({
                    content: '❌ I cannot mute myself!',
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

            // Parse duration
            const duration = parseDuration(durationStr);
            if (!duration) {
                await interaction.reply({
                    content: '❌ Invalid duration format! Use formats like: 10m, 1h, 1d',
                    ephemeral: true,
                });
                return;
            }

            // Discord timeout limit is 28 days
            const maxDuration = 28 * 24 * 60 * 60 * 1000;
            if (duration > maxDuration) {
                await interaction.reply({
                    content: '❌ Maximum timeout duration is 28 days!',
                    ephemeral: true,
                });
                return;
            }

            // Permission checks
            if (!canModerate(moderator, targetMember)) {
                await interaction.reply({
                    content: '❌ You cannot mute someone with a higher or equal role!',
                    ephemeral: true,
                });
                return;
            }

            if (!botCanModerate(interaction.guild.members.me!, targetMember)) {
                await interaction.reply({
                    content: '❌ I cannot mute this user! They may have a higher role than me.',
                    ephemeral: true,
                });
                return;
            }

            if (!targetMember.moderatable) {
                await interaction.reply({
                    content: '❌ I cannot mute this user due to role hierarchy or permissions!',
                    ephemeral: true,
                });
                return;
            }

            // Try to DM the user before muting
            try {
                const dmEmbed = new EmbedBuilder()
                    .setTitle('🔇 You have been muted')
                    .setColor(0xff8c00)
                    .addFields([
                        { name: 'Server', value: interaction.guild.name, inline: true },
                        { name: 'Duration', value: durationStr, inline: true },
                        { name: 'Reason', value: reason, inline: true },
                        { name: 'Moderator', value: moderator.user.tag, inline: true },
                    ])
                    .setTimestamp();

                await target.send({ embeds: [dmEmbed] });
            } catch (error) {
                client.logger.debug(`Could not DM user ${target.tag} about mute`);
            }

            // Execute the timeout
            await targetMember.timeout(duration, `${reason} | Moderator: ${moderator.user.tag}`);

            // Log to database
            const expiresAt = new Date(Date.now() + duration);
            const modLog = await client.db.moderationLog.create({
                data: {
                    guildId: interaction.guild.id,
                    action: ModerationAction.MUTE,
                    targetId: target.id,
                    moderatorId: moderator.id,
                    reason,
                    expiresAt,
                    metadata: {
                        duration: durationStr,
                        targetUsername: target.username,
                        targetDisplayName: getDisplayName(targetMember),
                        moderatorUsername: moderator.user.username,
                    },
                },
            });

            // Send confirmation
            const confirmEmbed = new EmbedBuilder()
                .setTitle('🔇 User Muted')
                .setColor(0xff8c00)
                .addFields([
                    { name: 'User', value: `${target.tag} (${target.id})`, inline: true },
                    { name: 'Moderator', value: moderator.user.tag, inline: true },
                    { name: 'Duration', value: durationStr, inline: true },
                    { name: 'Expires', value: `<t:${Math.floor(expiresAt.getTime() / 1000)}:F>`, inline: true },
                    { name: 'Reason', value: reason, inline: false },
                    { name: 'Case ID', value: modLog.id, inline: true },
                ])
                .setThumbnail(target.displayAvatarURL())
                .setTimestamp()
                .setFooter({
                    text: `Muted by ${moderator.user.tag}`,
                    iconURL: moderator.user.displayAvatarURL(),
                });

            await interaction.reply({ embeds: [confirmEmbed] });

            client.logger.info(`${moderator.user.tag} muted ${target.tag} in ${interaction.guild.name} for ${durationStr}: ${reason}`, {
                guildId: interaction.guild.id,
                moderatorId: moderator.id,
                targetId: target.id,
                caseId: modLog.id,
                duration,
            });

        } catch (error) {
            client.logger.error('Error executing mute command:', error);

            const errorMessage = {
                content: '❌ An error occurred while trying to mute the user!',
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