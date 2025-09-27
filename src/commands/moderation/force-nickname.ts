import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits, GuildMember } from 'discord.js';
import { Command, BotClient, ModerationAction } from '../../types';
import { sanitizeInput } from '../../utils/helpers';

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('force-nickname')
        .setDescription('Force change a user\'s nickname')
        .addUserOption(option =>
            option
                .setName('target')
                .setDescription('The user whose nickname to change')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('nickname')
                .setDescription('New nickname (leave empty to remove nickname)')
                .setMaxLength(32)
                .setRequired(false)
        )
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('Reason for nickname change')
                .setRequired(false)
        ),

    permissions: [PermissionFlagsBits.ManageNicknames],
    guildOnly: true,

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guild) return;

        const client = interaction.client as BotClient;
        const target = interaction.options.getUser('target', true);
        const nickname = interaction.options.getString('nickname');
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

            // Basic validation
            if (target.id === moderator.id) {
                await interaction.reply({
                    content: '❌ You cannot change your own nickname with this command!',
                    ephemeral: true,
                });
                return;
            }

            if (target.id === client.user?.id) {
                await interaction.reply({
                    content: '❌ I cannot change my own nickname with this command!',
                    ephemeral: true,
                });
                return;
            }

            // Permission checks
            if (targetMember.roles.highest.position >= moderator.roles.highest.position && moderator.id !== interaction.guild.ownerId) {
                await interaction.reply({
                    content: '❌ You cannot change the nickname of someone with a higher or equal role!',
                    ephemeral: true,
                });
                return;
            }

            if (!targetMember.manageable) {
                await interaction.reply({
                    content: '❌ I cannot change this user\'s nickname due to role hierarchy!',
                    ephemeral: true,
                });
                return;
            }

            // Sanitize nickname if provided
            const sanitizedNickname = nickname ? sanitizeInput(nickname) : null;

            // Validate nickname
            if (sanitizedNickname && sanitizedNickname.length > 32) {
                await interaction.reply({
                    content: '❌ Nickname cannot be longer than 32 characters!',
                    ephemeral: true,
                });
                return;
            }

            // Store old nickname
            const oldNickname = targetMember.nickname || targetMember.user.username;

            // Change nickname
            await targetMember.setNickname(sanitizedNickname, `${reason} | Moderator: ${moderator.user.tag}`);

            // Log to database
            const modLog = await client.db.moderationLog.create({
                data: {
                    guildId: interaction.guild.id,
                    action: ModerationAction.NICKNAME_CHANGE,
                    targetId: target.id,
                    moderatorId: moderator.id,
                    reason,
                    metadata: {
                        oldNickname,
                        newNickname: sanitizedNickname || '[Removed]',
                        targetUsername: target.username,
                        moderatorUsername: moderator.user.username,
                    },
                },
            });

            // Try to DM the user
            try {
                const dmEmbed = new EmbedBuilder()
                    .setTitle('📝 Your nickname has been changed')
                    .setColor(0x3498db)
                    .addFields([
                        { name: 'Server', value: interaction.guild.name, inline: true },
                        { name: 'Old Nickname', value: oldNickname, inline: true },
                        { name: 'New Nickname', value: sanitizedNickname || '[Removed]', inline: true },
                        { name: 'Reason', value: reason, inline: false },
                        { name: 'Moderator', value: moderator.user.tag, inline: true },
                    ])
                    .setTimestamp();

                await target.send({ embeds: [dmEmbed] });
            } catch (error) {
                client.logger.debug(`Could not DM user ${target.tag} about nickname change`);
            }

            // Send confirmation
            const confirmEmbed = new EmbedBuilder()
                .setTitle('📝 Nickname Changed')
                .setColor(0x3498db)
                .addFields([
                    { name: 'User', value: `${target.tag} (${target.id})`, inline: true },
                    { name: 'Moderator', value: moderator.user.tag, inline: true },
                    { name: 'Old Nickname', value: oldNickname, inline: true },
                    { name: 'New Nickname', value: sanitizedNickname || '[Removed]', inline: true },
                    { name: 'Reason', value: reason, inline: false },
                    { name: 'Case ID', value: modLog.id, inline: true },
                ])
                .setThumbnail(target.displayAvatarURL())
                .setTimestamp()
                .setFooter({
                    text: `Changed by ${moderator.user.tag}`,
                    iconURL: moderator.user.displayAvatarURL(),
                });

            await interaction.reply({ embeds: [confirmEmbed] });

            client.logger.info(`${moderator.user.tag} changed nickname of ${target.tag} in ${interaction.guild.name} from "${oldNickname}" to "${sanitizedNickname || '[Removed]'}": ${reason}`, {
                guildId: interaction.guild.id,
                moderatorId: moderator.id,
                targetId: target.id,
                caseId: modLog.id,
                oldNickname,
                newNickname: sanitizedNickname,
            });

        } catch (error) {
            client.logger.error('Error executing force-nickname command:', error);

            const errorMessage = {
                content: '❌ An error occurred while trying to change the nickname!',
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