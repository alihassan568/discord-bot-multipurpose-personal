import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, GuildMember } from 'discord.js';
import { Command, BotClient } from '../../types';

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('untimeout')
        .setDescription('Remove timeout from a user')
        .addUserOption(option =>
            option
                .setName('target')
                .setDescription('The user to remove timeout from')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('Reason for removing the timeout')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guild) return;

        const client = interaction.client as BotClient;
        const target = interaction.options.getMember('target') as GuildMember;
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const moderator = interaction.member as GuildMember;

        // Validation checks
        if (!target) {
            await interaction.reply({
                content: '❌ User not found or not a member of this server.',
                ephemeral: true,
            });
            return;
        }

        if (target.id === interaction.user.id) {
            await interaction.reply({
                content: '❌ You cannot untimeout yourself.',
                ephemeral: true,
            });
            return;
        }

        // Check if user is timed out
        if (!target.communicationDisabledUntil || target.communicationDisabledUntil <= new Date()) {
            await interaction.reply({
                content: `❌ ${target.user.tag} is not currently timed out.`,
                ephemeral: true,
            });
            return;
        }

        // Check role hierarchy
        if (target.roles.highest.position >= moderator.roles.highest.position) {
            await interaction.reply({
                content: '❌ You cannot manage timeout for someone with a role equal to or higher than yours.',
                ephemeral: true,
            });
            return;
        }

        // Check if bot can manage the target
        const botMember = interaction.guild.members.me!;
        if (target.roles.highest.position >= botMember.roles.highest.position) {
            await interaction.reply({
                content: '❌ I cannot manage timeout for someone with a role equal to or higher than mine.',
                ephemeral: true,
            });
            return;
        }

        try {
            // Remove timeout
            await target.timeout(null, reason);

            // Log to database
            await client.db.moderationLog.create({
                data: {
                    guildId: interaction.guildId!,
                    userId: target.id,
                    moderatorId: moderator.id,
                    action: 'UNTIMEOUT',
                    reason,
                },
            });

            // Send success message
            await interaction.reply({
                content: `✅ **${target.user.tag}** has been un-timed out.\n**Reason:** ${reason}`,
            });

            // Try to DM the user
            try {
                await target.send({
                    content: `Your timeout has been removed in **${interaction.guild.name}**.\n**Reason:** ${reason}`,
                });
            } catch (error) {
                // User has DMs disabled or blocked the bot
            }

            // Log the action
            client.logger.info(`User un-timed out: ${target.user.tag} (${target.id}) by ${moderator.user.tag} (${moderator.id}) in ${interaction.guild.name}`, {
                guildId: interaction.guildId,
                userId: target.id,
                moderatorId: moderator.id,
                reason,
            });

        } catch (error) {
            client.logger.error('Error removing timeout:', error);
            await interaction.reply({
                content: '❌ An error occurred while trying to remove the timeout. Please check my permissions and try again.',
                ephemeral: true,
            });
        }
    },
};

export default command;