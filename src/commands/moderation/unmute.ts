import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits, GuildMember } from 'discord.js';
import { Command, BotClient, ModerationAction } from '../../types';
import { canModerate, botCanModerate, getDisplayName } from '../../utils/helpers';

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('unmute')
        .setDescription('Remove timeout from a user')
        .addUserOption(option =>
            option
                .setName('target')
                .setDescription('The user to unmute')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('Reason for the unmute')
                .setRequired(false)
        ),

    permissions: [PermissionFlagsBits.ModerateMembers],
    guildOnly: true,

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guild) return;

        const client = interaction.client as BotClient;
        const target = interaction.options.getUser('target', true);
        const reason = interaction.options.getString('reason') || 'No reason provided';

        const moderator = interaction.member as GuildMember;
        const targetMember = interaction.guild.members.cache.get(target.id);

        try {
            if (!targetMember) {
                await interaction.reply({
                    content: '❌ User is not in this server!',
                    ephemeral: true,
                });
                return;
            }

            // Check if user is actually muted
            if (!targetMember.communicationDisabledUntilTimestamp) {
                await interaction.reply({
                    content: '❌ This user is not currently muted!',
                    ephemeral: true,
                });
                return;
            }

            // Permission checks
            if (!canModerate(moderator, targetMember)) {
                await interaction.reply({
                    content: '❌ You cannot unmute someone with a higher or equal role!',
                    ephemeral: true,
                });
                return;
            }

            if (!botCanModerate(interaction.guild.members.me!, targetMember)) {
                await interaction.reply({
                    content: '❌ I cannot unmute this user! They may have a higher role than me.',
                    ephemeral: true,
                });
                return;
            }

            // Try to DM the user
            try {
                const dmEmbed = new EmbedBuilder()
                    .setTitle('🔊 You have been unmuted')
                    .setColor(0x00ff00)
                    .addFields([
                        { name: 'Server', value: interaction.guild.name, inline: true },
                        { name: 'Reason', value: reason, inline: true },
                        { name: 'Moderator', value: moderator.user.tag, inline: true },
                    ])
                    .setTimestamp();

                await target.send({ embeds: [dmEmbed] });
            } catch (error) {
                client.logger.debug(`Could not DM user ${target.tag} about unmute`);
            }

            // Remove the timeout
            await targetMember.timeout(null, `${reason} | Moderator: ${moderator.user.tag}`);

            // Log to database
            const modLog = await client.db.moderationLog.create({
                data: {
                    guildId: interaction.guild.id,
                    action: ModerationAction.UNMUTE,
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
                .setTitle('🔊 User Unmuted')
                .setColor(0x00ff00)
                .addFields([
                    { name: 'User', value: `${target.tag} (${target.id})`, inline: true },
                    { name: 'Moderator', value: moderator.user.tag, inline: true },
                    { name: 'Reason', value: reason, inline: false },
                    { name: 'Case ID', value: modLog.id, inline: true },
                ])
                .setThumbnail(target.displayAvatarURL())
                .setTimestamp()
                .setFooter({
                    text: `Unmuted by ${moderator.user.tag}`,
                    iconURL: moderator.user.displayAvatarURL(),
                });

            await interaction.reply({ embeds: [confirmEmbed] });

            client.logger.info(`${moderator.user.tag} unmuted ${target.tag} in ${interaction.guild.name}: ${reason}`, {
                guildId: interaction.guild.id,
                moderatorId: moderator.id,
                targetId: target.id,
                caseId: modLog.id,
            });

        } catch (error) {
            client.logger.error('Error executing unmute command:', error);

            const errorMessage = {
                content: '❌ An error occurred while trying to unmute the user!',
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