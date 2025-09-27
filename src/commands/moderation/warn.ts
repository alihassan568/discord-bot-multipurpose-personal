import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits, GuildMember } from 'discord.js';
import { Command, BotClient, ModerationAction } from '../../types';
import { canModerate, getDisplayName } from '../../utils/helpers';

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Add a warning to a user')
        .addUserOption(option =>
            option
                .setName('target')
                .setDescription('The user to warn')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('Reason for the warning')
                .setRequired(true)
        )
        .addBooleanOption(option =>
            option
                .setName('silent')
                .setDescription('Do not DM the user about this warning')
                .setRequired(false)
        ),

    permissions: [PermissionFlagsBits.ModerateMembers],
    guildOnly: true,

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guild) return;

        const client = interaction.client as BotClient;
        const target = interaction.options.getUser('target', true);
        const reason = interaction.options.getString('reason', true);
        const silent = interaction.options.getBoolean('silent') || false;

        const moderator = interaction.member as GuildMember;
        const targetMember = interaction.guild.members.cache.get(target.id);

        try {
            // Basic validation
            if (target.id === moderator.id) {
                await interaction.reply({
                    content: '❌ You cannot warn yourself!',
                    ephemeral: true,
                });
                return;
            }

            if (target.id === client.user?.id) {
                await interaction.reply({
                    content: '❌ I cannot warn myself!',
                    ephemeral: true,
                });
                return;
            }

            // Permission checks (allow warning users not in server for logging)
            if (targetMember && !canModerate(moderator, targetMember)) {
                await interaction.reply({
                    content: '❌ You cannot warn someone with a higher or equal role!',
                    ephemeral: true,
                });
                return;
            }

            // Get previous warnings count
            const previousWarnings = await client.db.moderationLog.count({
                where: {
                    guildId: interaction.guild.id,
                    targetId: target.id,
                    action: ModerationAction.WARN,
                },
            });

            // Log to database
            const modLog = await client.db.moderationLog.create({
                data: {
                    guildId: interaction.guild.id,
                    action: ModerationAction.WARN,
                    targetId: target.id,
                    moderatorId: moderator.id,
                    reason,
                    metadata: {
                        warningNumber: previousWarnings + 1,
                        targetUsername: target.username,
                        targetDisplayName: targetMember ? getDisplayName(targetMember) : target.globalName || target.username,
                        moderatorUsername: moderator.user.username,
                        silent,
                    },
                },
            });

            // Try to DM the user if not silent
            if (!silent) {
                try {
                    const dmEmbed = new EmbedBuilder()
                        .setTitle('⚠️ You have received a warning')
                        .setColor(0xffaa00)
                        .addFields([
                            { name: 'Server', value: interaction.guild.name, inline: true },
                            { name: 'Warning #', value: `${previousWarnings + 1}`, inline: true },
                            { name: 'Reason', value: reason, inline: false },
                            { name: 'Moderator', value: moderator.user.tag, inline: true },
                        ])
                        .setFooter({ text: 'Please follow the server rules to avoid further action.' })
                        .setTimestamp();

                    await target.send({ embeds: [dmEmbed] });
                } catch (error) {
                    client.logger.debug(`Could not DM user ${target.tag} about warning`);
                }
            }

            // Send confirmation
            const confirmEmbed = new EmbedBuilder()
                .setTitle('⚠️ Warning Issued')
                .setColor(0xffaa00)
                .addFields([
                    { name: 'User', value: `${target.tag} (${target.id})`, inline: true },
                    { name: 'Moderator', value: moderator.user.tag, inline: true },
                    { name: 'Warning #', value: `${previousWarnings + 1}`, inline: true },
                    { name: 'Reason', value: reason, inline: false },
                    { name: 'Case ID', value: modLog.id, inline: true },
                    { name: 'Silent', value: silent ? 'Yes' : 'No', inline: true },
                ])
                .setThumbnail(target.displayAvatarURL())
                .setTimestamp()
                .setFooter({
                    text: `Warning issued by ${moderator.user.tag}`,
                    iconURL: moderator.user.displayAvatarURL(),
                });

            // Check for automatic punishment based on warning count
            const newWarningCount = previousWarnings + 1;
            if (newWarningCount >= 3 && targetMember) {
                confirmEmbed.addFields({
                    name: '🚨 Auto-Action Triggered',
                    value: `User has reached ${newWarningCount} warnings. Consider escalating moderation action.`,
                    inline: false,
                });
            }

            await interaction.reply({ embeds: [confirmEmbed] });

            client.logger.info(`${moderator.user.tag} warned ${target.tag} in ${interaction.guild.name} (Warning #${newWarningCount}): ${reason}`, {
                guildId: interaction.guild.id,
                moderatorId: moderator.id,
                targetId: target.id,
                caseId: modLog.id,
                warningCount: newWarningCount,
                silent,
            });

        } catch (error) {
            client.logger.error('Error executing warn command:', error);

            const errorMessage = {
                content: '❌ An error occurred while trying to warn the user!',
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