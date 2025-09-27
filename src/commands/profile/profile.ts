import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    EmbedBuilder,
    User
} from 'discord.js';
import { Command, BotClient } from '../../types';

function calculateLevel(xp: number): number {
    // Level formula: level = floor(sqrt(xp / 100))
    return Math.floor(Math.sqrt(xp / 100));
}

function getXpForLevel(level: number): number {
    return level * level * 100;
}

function getXpForNextLevel(level: number): number {
    return getXpForLevel(level + 1);
}

function formatNumber(num: number): string {
    return num.toLocaleString();
}

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('profile')
        .setDescription('View a user\'s profile and statistics')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('The user to view the profile of (defaults to you)')
                .setRequired(false)
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        const client = interaction.client as BotClient;
        const targetUser = interaction.options.getUser('user') || interaction.user;

        if (!interaction.guild) {
            await interaction.reply({
                content: '❌ This command can only be used in a server!',
                ephemeral: true,
            });
            return;
        }

        await interaction.deferReply();

        try {
            // Get or create user profile
            let userProfile = await client.db.userProfile.findUnique({
                where: {
                    guildId_userId: {
                        userId: targetUser.id,
                        guildId: interaction.guild.id,
                    },
                },
            });

            if (!userProfile) {
                userProfile = await client.db.userProfile.create({
                    data: {
                        userId: targetUser.id,
                        guildId: interaction.guild.id,
                        messageCount: 0,
                        voiceMinutes: 0,
                        xp: 0,
                        level: 1,
                    },
                });
            }

            // Calculate current level and progress based on XP
            const calculatedLevel = calculateLevel(userProfile.xp);
            const currentLevelXp = getXpForLevel(calculatedLevel);
            const nextLevelXp = getXpForNextLevel(calculatedLevel);
            const progressXp = userProfile.xp - currentLevelXp;
            const neededXp = nextLevelXp - currentLevelXp;
            const progressPercent = Math.round((progressXp / neededXp) * 100);

            // Get user's rank in the server
            const userRank = await client.db.userProfile.count({
                where: {
                    guildId: interaction.guild.id,
                    xp: {
                        gt: userProfile.xp,
                    },
                },
            }) + 1;

            // Create progress bar
            const progressBarLength = 20;
            const filledLength = Math.round((progressPercent / 100) * progressBarLength);
            const emptyLength = progressBarLength - filledLength;
            const progressBar = '█'.repeat(filledLength) + '░'.repeat(emptyLength);

            const embed = new EmbedBuilder()
                .setTitle(`👤 ${targetUser.username}'s Profile`)
                .setColor(0x00aaff)
                .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
                .addFields(
                    {
                        name: '📊 Statistics',
                        value: [
                            `**Level:** ${calculatedLevel}`,
                            `**Experience:** ${formatNumber(userProfile.xp)} XP`,
                            `**Messages:** ${formatNumber(userProfile.messageCount)}`,
                            `**Voice Time:** ${Math.round(userProfile.voiceMinutes / 60)} hours`,
                            `**Server Rank:** #${userRank}`
                        ].join('\n'),
                        inline: true,
                    },
                    {
                        name: '🔥 Activity',
                        value: [
                            `**Last Seen:** <t:${Math.floor(userProfile.lastSeen.getTime() / 1000)}:R>`,
                            `**Profile Created:** <t:${Math.floor(userProfile.lastSeen.getTime() / 1000)}:R>`,
                            `**Discord Since:** <t:${Math.floor(targetUser.createdTimestamp / 1000)}:R>`,
                            `**Badges:** ${userProfile.badges.length > 0 ? userProfile.badges.join(' ') : 'None'}`
                        ].join('\n'),
                        inline: true,
                    },
                    {
                        name: `📈 Progress to Level ${calculatedLevel + 1}`,
                        value: [
                            `\`${progressBar}\` ${progressPercent}%`,
                            `${formatNumber(progressXp)} / ${formatNumber(neededXp)} XP`,
                            `${formatNumber(nextLevelXp - userProfile.xp)} XP needed`
                        ].join('\n'),
                        inline: false,
                    }
                )
                .setFooter({
                    text: `User ID: ${targetUser.id}`,
                })
                .setTimestamp();

            // Add bio if available
            if (userProfile.bio) {
                embed.addFields({
                    name: '📝 Bio',
                    value: userProfile.bio.substring(0, 1024),
                    inline: false,
                });
            }

            // Add bio if available
            if (userProfile.bio && userProfile.bio.trim().length > 0) {
                embed.addFields({
                    name: '📝 Bio',
                    value: userProfile.bio.substring(0, 1024),
                    inline: false,
                });
            }

            // Check for birthday info from birthday table
            try {
                const birthday = await client.db.birthday.findUnique({
                    where: {
                        guildId_userId: {
                            userId: targetUser.id,
                            guildId: interaction.guild.id,
                        },
                    },
                });

                if (birthday && birthday.optIn) {
                    const today = new Date();
                    const currentYear = today.getFullYear();
                    const birthdayThisYear = new Date(currentYear, birthday.month - 1, birthday.day);
                    const birthdayNextYear = new Date(currentYear + 1, birthday.month - 1, birthday.day);

                    const nextBirthday = birthdayThisYear >= today ? birthdayThisYear : birthdayNextYear;
                    const daysUntilBirthday = Math.ceil((nextBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

                    const birthdayInfo = [];
                    birthdayInfo.push(`**Birthday:** ${birthday.month}/${birthday.day}${birthday.year ? `/${birthday.year}` : ''}`);

                    if (daysUntilBirthday === 0) {
                        birthdayInfo.push(`🎉 **Today is their birthday!**`);
                    } else if (daysUntilBirthday === 1) {
                        birthdayInfo.push(`🎂 **Birthday tomorrow!**`);
                    } else {
                        birthdayInfo.push(`**Next Birthday:** ${daysUntilBirthday} days`);
                    }

                    embed.addFields({
                        name: '🎂 Birthday Info',
                        value: birthdayInfo.join('\n'),
                        inline: false,
                    });
                }
            } catch (error) {
                // Birthday info not critical, continue without it
            }

            // Add guild member info if available
            const guildMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
            if (guildMember) {
                const memberInfo = [];

                if (guildMember.joinedAt) {
                    memberInfo.push(`**Joined Server:** <t:${Math.floor(guildMember.joinedAt.getTime() / 1000)}:R>`);
                }

                if (guildMember.premiumSince) {
                    memberInfo.push(`**Boosting Since:** <t:${Math.floor(guildMember.premiumSince.getTime() / 1000)}:R>`);
                }

                const roles = guildMember.roles.cache
                    .filter(role => role.id !== interaction.guild?.id)
                    .sort((a, b) => b.position - a.position)
                    .first(5);

                if (roles && roles.length > 0) {
                    memberInfo.push(`**Top Roles:** ${roles.join(', ')}`);
                }

                if (memberInfo.length > 0) {
                    embed.addFields({
                        name: '👥 Server Member Info',
                        value: memberInfo.join('\n'),
                        inline: false,
                    });
                }
            }

            await interaction.editReply({ embeds: [embed] });

            client.logger.info(`Profile viewed by ${interaction.user.tag}`, {
                guildId: interaction.guildId,
                userId: interaction.user.id,
                targetUserId: targetUser.id,
                level: calculatedLevel,
                xp: userProfile.xp,
                rank: userRank,
            });

        } catch (error) {
            client.logger.error('Error in profile command', {
                error: error instanceof Error ? error.message : 'Unknown error',
                guildId: interaction.guildId,
                userId: interaction.user.id,
                targetUserId: targetUser.id,
            });

            await interaction.editReply({
                content: '❌ An error occurred while fetching the profile. Please try again later!',
            });
        }
    },
};

export default command;