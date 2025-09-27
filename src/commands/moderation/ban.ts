import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits, User, GuildMember } from 'discord.js';
import { Command, BotClient, ModerationAction } from '../../types';

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Ban a user from the server')
        .addUserOption(option =>
            option
                .setName('target')
                .setDescription('The user to ban')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('Reason for the ban')
                .setRequired(false)
        )
        .addIntegerOption(option =>
            option
                .setName('days')
                .setDescription('Number of days to delete messages (0-7)')
                .setMinValue(0)
                .setMaxValue(7)
                .setRequired(false)
        )
        .addStringOption(option =>
            option
                .setName('duration')
                .setDescription('Duration of the ban (e.g., 1h, 1d, 1w). Leave empty for permanent')
                .setRequired(false)
        ),

    permissions: [PermissionFlagsBits.BanMembers],
    guildOnly: true,

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guild) return;

        const client = interaction.client as BotClient;
        const target = interaction.options.getUser('target', true);
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const deleteDays = interaction.options.getInteger('days') || 0;
        const duration = interaction.options.getString('duration');

        const moderator = interaction.user;
        const member = interaction.member as GuildMember;

        try {
            // Check if target is bannable
            const targetMember = interaction.guild.members.cache.get(target.id);

            if (target.id === moderator.id) {
                await interaction.reply({
                    content: '❌ You cannot ban yourself!',
                    ephemeral: true,
                });
                return;
            }

            if (target.id === client.user?.id) {
                await interaction.reply({
                    content: '❌ I cannot ban myself!',
                    ephemeral: true,
                });
                return;
            }

            if (targetMember) {
                // Check role hierarchy
                if (targetMember.roles.highest.position >= member.roles.highest.position) {
                    await interaction.reply({
                        content: '❌ You cannot ban someone with a higher or equal role!',
                        ephemeral: true,
                    });
                    return;
                }

                // Check if bot can ban the user
                if (!targetMember.bannable) {
                    await interaction.reply({
                        content: '❌ I cannot ban this user! They may have a higher role than me.',
                        ephemeral: true,
                    });
                    return;
                }
            }

            // Parse duration if provided
            let expiresAt: Date | null = null;
            if (duration) {
                const parsedDuration = parseDuration(duration);
                if (!parsedDuration) {
                    await interaction.reply({
                        content: '❌ Invalid duration format! Use formats like: 1h, 1d, 1w, 30m',
                        ephemeral: true,
                    });
                    return;
                }
                expiresAt = new Date(Date.now() + parsedDuration);
            }

            // Try to DM the user before banning
            try {
                const dmEmbed = new EmbedBuilder()
                    .setTitle('🔨 You have been banned')
                    .setColor(0xff0000)
                    .addFields([
                        { name: 'Server', value: interaction.guild.name, inline: true },
                        { name: 'Reason', value: reason, inline: true },
                        { name: 'Duration', value: expiresAt ? `Until ${expiresAt.toLocaleString()}` : 'Permanent', inline: true },
                        { name: 'Moderator', value: moderator.tag, inline: true },
                    ])
                    .setTimestamp();

                await target.send({ embeds: [dmEmbed] });
            } catch (error) {
                // User has DMs disabled or blocked the bot
                client.logger.debug(`Could not DM user ${target.tag} about ban`);
            }

            // Execute the ban
            await interaction.guild.members.ban(target, {
                deleteMessageDays: deleteDays,
                reason: `${reason} | Moderator: ${moderator.tag}`,
            });

            // Log to database
            await client.db.moderationLog.create({
                data: {
                    guildId: interaction.guild.id,
                    action: ModerationAction.BAN,
                    targetId: target.id,
                    moderatorId: moderator.id,
                    reason,
                    expiresAt,
                    metadata: {
                        deleteDays,
                        duration: duration || 'permanent',
                    },
                },
            });

            // Send confirmation
            const confirmEmbed = new EmbedBuilder()
                .setTitle('🔨 User Banned')
                .setColor(0xff0000)
                .addFields([
                    { name: 'User', value: `${target.tag} (${target.id})`, inline: true },
                    { name: 'Moderator', value: moderator.tag, inline: true },
                    { name: 'Reason', value: reason, inline: false },
                    { name: 'Duration', value: expiresAt ? `Until ${expiresAt.toLocaleString()}` : 'Permanent', inline: true },
                    { name: 'Message Deletion', value: `${deleteDays} days`, inline: true },
                ])
                .setTimestamp();

            await interaction.reply({ embeds: [confirmEmbed] });

            // Schedule unban if temporary
            if (expiresAt) {
                await scheduleUnban(client, interaction.guild.id, target.id, expiresAt);
            }

            client.logger.info(`${moderator.tag} banned ${target.tag} in ${interaction.guild.name}: ${reason}`);

        } catch (error) {
            client.logger.error('Error executing ban command:', error);

            await interaction.reply({
                content: '❌ An error occurred while trying to ban the user!',
                ephemeral: true,
            });
        }
    },
};

function parseDuration(duration: string): number | null {
    const match = duration.match(/^(\d+)([smhdw])$/i);
    if (!match) return null;

    const [, amount, unit] = match;
    if (!amount || !unit) return null;

    const num = parseInt(amount);
    if (isNaN(num)) return null;

    const multipliers: Record<string, number> = {
        s: 1000,
        m: 60 * 1000,
        h: 60 * 60 * 1000,
        d: 24 * 60 * 60 * 1000,
        w: 7 * 24 * 60 * 60 * 1000,
    };

    return num * (multipliers[unit.toLowerCase()] || 0);
}

async function scheduleUnban(client: BotClient, guildId: string, userId: string, expiresAt: Date): Promise<void> {
    const delay = expiresAt.getTime() - Date.now();

    if (delay <= 0) return; // Already expired

    // Store in Redis for persistence across restarts
    await client.redis.setEx(
        `scheduled_unban:${guildId}:${userId}`,
        Math.ceil(delay / 1000),
        JSON.stringify({ guildId, userId, expiresAt: expiresAt.toISOString() })
    );

    // If delay is reasonable, schedule immediate timeout
    if (delay <= 24 * 60 * 60 * 1000) { // 24 hours or less
        setTimeout(async () => {
            await executeScheduledUnban(client, guildId, userId);
        }, delay);
    }
}

async function executeScheduledUnban(client: BotClient, guildId: string, userId: string): Promise<void> {
    try {
        const guild = client.guilds.cache.get(guildId);
        if (!guild) return;

        await guild.members.unban(userId, 'Temporary ban expired');

        // Log the unban
        await client.db.moderationLog.create({
            data: {
                guildId,
                action: ModerationAction.UNBAN,
                targetId: userId,
                moderatorId: client.user?.id || '',
                reason: 'Temporary ban expired (automatic)',
                metadata: { automatic: true },
            },
        });

        // Clean up Redis
        await client.redis.del(`scheduled_unban:${guildId}:${userId}`);

        client.logger.info(`Automatically unbanned user ${userId} in guild ${guildId}`);
    } catch (error) {
        client.logger.error(`Failed to execute scheduled unban for ${userId} in ${guildId}:`, error);
    }
}

export default command;