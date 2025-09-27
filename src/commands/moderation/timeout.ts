import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, GuildMember } from 'discord.js';
import { Command, BotClient } from '../../types';

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('timeout')
        .setDescription('Timeout a user for a specified duration')
        .addUserOption(option =>
            option
                .setName('target')
                .setDescription('The user to timeout')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option
                .setName('duration')
                .setDescription('Duration in minutes (max 28 days = 40320 minutes)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(40320)
        )
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('Reason for the timeout')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guild) return;

        const client = interaction.client as BotClient;

        const target = interaction.options.getMember('target') as GuildMember;
        const duration = interaction.options.getInteger('duration', true);
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
                content: '❌ You cannot timeout yourself.',
                ephemeral: true,
            });
            return;
        }

        if (target.id === client.user?.id) {
            await interaction.reply({
                content: '❌ I cannot timeout myself.',
                ephemeral: true,
            });
            return;
        }

        // Check role hierarchy
        if (target.roles.highest.position >= moderator.roles.highest.position) {
            await interaction.reply({
                content: '❌ You cannot timeout someone with a role equal to or higher than yours.',
                ephemeral: true,
            });
            return;
        }

        // Check if bot can timeout the target
        const botMember = interaction.guild.members.me!;
        if (target.roles.highest.position >= botMember.roles.highest.position) {
            await interaction.reply({
                content: '❌ I cannot timeout someone with a role equal to or higher than mine.',
                ephemeral: true,
            });
            return;
        }

        // Check if user is already timed out
        if (target.communicationDisabledUntil && target.communicationDisabledUntil > new Date()) {
            await interaction.reply({
                content: `❌ ${target.user.tag} is already timed out until <t:${Math.floor(target.communicationDisabledUntil.getTime() / 1000)}:F>.`,
                ephemeral: true,
            });
            return;
        }

        try {
            // Calculate timeout duration
            const timeoutUntil = new Date(Date.now() + duration * 60 * 1000);

            // Timeout the user
            await target.timeout(duration * 60 * 1000, reason);

            // Log to database
            await client.db.moderationLog.create({
                data: {
                    guildId: interaction.guildId!,
                    userId: target.id,
                    moderatorId: moderator.id,
                    action: 'TIMEOUT',
                    reason,
                    expiresAt: timeoutUntil,
                },
            });

            // Send success message
            const durationText = duration === 1 ? '1 minute' : `${duration} minutes`;
            await interaction.reply({
                content: `✅ **${target.user.tag}** has been timed out for **${durationText}**.\n**Reason:** ${reason}\n**Expires:** <t:${Math.floor(timeoutUntil.getTime() / 1000)}:R>`,
            });

            // Try to DM the user
            try {
                await target.send({
                    content: `You have been timed out in **${interaction.guild.name}** for **${durationText}**.\n**Reason:** ${reason}\n**Expires:** <t:${Math.floor(timeoutUntil.getTime() / 1000)}:F>`,
                });
            } catch (error) {
                // User has DMs disabled or blocked the bot
            }

            // Log the action
            client.logger.info(`User timed out: ${target.user.tag} (${target.id}) by ${moderator.user.tag} (${moderator.id}) for ${duration} minutes in ${interaction.guild.name}`, {
                guildId: interaction.guildId,
                userId: target.id,
                moderatorId: moderator.id,
                duration,
                reason,
            });

        } catch (error) {
            client.logger.error('Error timing out user:', error);
            await interaction.reply({
                content: '❌ An error occurred while trying to timeout the user. Please check my permissions and try again.',
                ephemeral: true,
            });
        }
    },
};

export default command;