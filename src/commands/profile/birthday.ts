import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    EmbedBuilder,
    PermissionFlagsBits
} from 'discord.js';
import { Command, BotClient } from '../../types';

function isValidDate(month: number, day: number, year?: number): boolean {
    if (month < 1 || month > 12) return false;
    if (day < 1) return false;

    const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

    // Handle leap years
    if (year && month === 2) {
        const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
        return day <= (isLeapYear ? 29 : 28);
    }

    return day <= (daysInMonth[month - 1] || 31);
}

function getAgeFromBirthdate(month: number, day: number, year?: number): number | null {
    if (!year) return null;

    const today = new Date();
    const birthdate = new Date(year, month - 1, day);
    let age = today.getFullYear() - birthdate.getFullYear();

    if (today.getMonth() < birthdate.getMonth() ||
        (today.getMonth() === birthdate.getMonth() && today.getDate() < birthdate.getDate())) {
        age--;
    }

    return age;
}

function getDaysUntilBirthday(month: number, day: number): number {
    const today = new Date();
    const currentYear = today.getFullYear();
    let birthday = new Date(currentYear, month - 1, day);

    // If birthday has passed this year, check next year
    if (birthday < today) {
        birthday = new Date(currentYear + 1, month - 1, day);
    }

    return Math.ceil((birthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('birthday')
        .setDescription('Manage birthday settings and view upcoming birthdays')
        .addSubcommand(subcommand =>
            subcommand
                .setName('set')
                .setDescription('Set your birthday')
                .addIntegerOption(option =>
                    option
                        .setName('month')
                        .setDescription('Birth month (1-12)')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(12)
                )
                .addIntegerOption(option =>
                    option
                        .setName('day')
                        .setDescription('Birth day (1-31)')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(31)
                )
                .addIntegerOption(option =>
                    option
                        .setName('year')
                        .setDescription('Birth year (optional, for age calculation)')
                        .setRequired(false)
                        .setMinValue(1900)
                        .setMaxValue(new Date().getFullYear())
                )
                .addStringOption(option =>
                    option
                        .setName('timezone')
                        .setDescription('Your timezone (optional, e.g. America/New_York)')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove your birthday from the system')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('View your or someone else\'s birthday')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('User to view birthday for (defaults to yourself)')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List upcoming birthdays in the server')
                .addIntegerOption(option =>
                    option
                        .setName('days')
                        .setDescription('Number of days to look ahead (default: 30)')
                        .setRequired(false)
                        .setMinValue(1)
                        .setMaxValue(365)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('opt-out')
                .setDescription('Opt out of birthday notifications')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('opt-in')
                .setDescription('Opt back in to birthday notifications')
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        const client = interaction.client as BotClient;
        const subcommand = interaction.options.getSubcommand();

        if (!interaction.guild) {
            await interaction.reply({
                content: '❌ This command can only be used in a server!',
                ephemeral: true,
            });
            return;
        }

        try {
            switch (subcommand) {
                case 'set': {
                    const month = interaction.options.getInteger('month', true);
                    const day = interaction.options.getInteger('day', true);
                    const year = interaction.options.getInteger('year');
                    const timezone = interaction.options.getString('timezone');

                    // Validate date
                    if (!isValidDate(month, day, year || undefined)) {
                        await interaction.reply({
                            content: '❌ Invalid date! Please check your month and day values.',
                            ephemeral: true,
                        });
                        return;
                    }

                    // Check if birthday exists and update or create
                    const existingBirthday = await client.db.birthday.findUnique({
                        where: {
                            guildId_userId: {
                                userId: interaction.user.id,
                                guildId: interaction.guild.id,
                            },
                        },
                    });

                    const birthdayData = {
                        userId: interaction.user.id,
                        guildId: interaction.guild.id,
                        month,
                        day,
                        year: year || null,
                        timezone: timezone || null,
                        optIn: true,
                    };

                    if (existingBirthday) {
                        await client.db.birthday.update({
                            where: {
                                guildId_userId: {
                                    userId: interaction.user.id,
                                    guildId: interaction.guild.id,
                                },
                            },
                            data: birthdayData,
                        });
                    } else {
                        await client.db.birthday.create({
                            data: birthdayData,
                        });
                    }

                    const age = getAgeFromBirthdate(month, day, year || undefined);
                    const daysUntil = getDaysUntilBirthday(month, day);

                    const embed = new EmbedBuilder()
                        .setTitle('🎂 Birthday Set Successfully!')
                        .setColor(0x00ff00)
                        .addFields(
                            {
                                name: '📅 Your Birthday',
                                value: `${month}/${day}${year ? `/${year}` : ''}`,
                                inline: true,
                            },
                            {
                                name: '🎉 Days Until Birthday',
                                value: daysUntil === 0 ? '🎉 Today!' : `${daysUntil} days`,
                                inline: true,
                            }
                        )
                        .setFooter({
                            text: `Set by ${interaction.user.tag}`,
                            iconURL: interaction.user.displayAvatarURL(),
                        })
                        .setTimestamp();

                    if (age !== null) {
                        embed.addFields({
                            name: '🎈 Age',
                            value: daysUntil === 0 ? `${age + 1} (Happy Birthday!)` : `${age} (turning ${age + 1})`,
                            inline: true,
                        });
                    }

                    if (timezone) {
                        embed.addFields({
                            name: '🌍 Timezone',
                            value: timezone,
                            inline: true,
                        });
                    }

                    await interaction.reply({ embeds: [embed] });
                    break;
                }

                case 'remove': {
                    const deleted = await client.db.birthday.deleteMany({
                        where: {
                            userId: interaction.user.id,
                            guildId: interaction.guild.id,
                        },
                    });

                    if (deleted.count === 0) {
                        await interaction.reply({
                            content: '❌ You don\'t have a birthday set in this server!',
                            ephemeral: true,
                        });
                        return;
                    }

                    await interaction.reply({
                        content: '✅ Your birthday has been removed from this server.',
                        ephemeral: true,
                    });
                    break;
                }

                case 'view': {
                    const targetUser = interaction.options.getUser('user') || interaction.user;

                    const birthday = await client.db.birthday.findUnique({
                        where: {
                            guildId_userId: {
                                userId: targetUser.id,
                                guildId: interaction.guild.id,
                            },
                        },
                    });

                    if (!birthday || !birthday.optIn) {
                        const message = targetUser.id === interaction.user.id
                            ? '❌ You don\'t have a birthday set in this server!'
                            : '❌ This user doesn\'t have a birthday set or has opted out!';

                        await interaction.reply({
                            content: message,
                            ephemeral: true,
                        });
                        return;
                    }

                    const age = getAgeFromBirthdate(birthday.month, birthday.day, birthday.year || undefined);
                    const daysUntil = getDaysUntilBirthday(birthday.month, birthday.day);

                    const embed = new EmbedBuilder()
                        .setTitle(`🎂 ${targetUser.username}'s Birthday`)
                        .setColor(0x00aaff)
                        .setThumbnail(targetUser.displayAvatarURL())
                        .addFields(
                            {
                                name: '📅 Birthday',
                                value: `${birthday.month}/${birthday.day}${birthday.year ? `/${birthday.year}` : ''}`,
                                inline: true,
                            },
                            {
                                name: '🎉 Days Until',
                                value: daysUntil === 0 ? '🎉 Today!' : `${daysUntil} days`,
                                inline: true,
                            }
                        )
                        .setTimestamp();

                    if (age !== null) {
                        embed.addFields({
                            name: '🎈 Age',
                            value: daysUntil === 0 ? `${age + 1} (Happy Birthday!)` : `${age} (turning ${age + 1})`,
                            inline: true,
                        });
                    }

                    if (birthday.timezone) {
                        embed.addFields({
                            name: '🌍 Timezone',
                            value: birthday.timezone,
                            inline: true,
                        });
                    }

                    await interaction.reply({ embeds: [embed] });
                    break;
                }

                case 'list': {
                    const daysAhead = interaction.options.getInteger('days') || 30;

                    const birthdays = await client.db.birthday.findMany({
                        where: {
                            guildId: interaction.guild.id,
                            optIn: true,
                        },
                        include: {
                            user: {
                                select: {
                                    username: true,
                                }
                            }
                        },
                    });

                    if (birthdays.length === 0) {
                        await interaction.reply({
                            content: '❌ No birthdays found in this server!',
                            ephemeral: true,
                        });
                        return;
                    }

                    // Filter and sort birthdays by days until
                    const upcomingBirthdays = birthdays
                        .map((birthday: any) => ({
                            ...birthday,
                            daysUntil: getDaysUntilBirthday(birthday.month, birthday.day),
                        }))
                        .filter((birthday: any) => birthday.daysUntil <= daysAhead)
                        .sort((a: any, b: any) => a.daysUntil - b.daysUntil);

                    if (upcomingBirthdays.length === 0) {
                        await interaction.reply({
                            content: `❌ No birthdays in the next ${daysAhead} days!`,
                            ephemeral: true,
                        });
                        return;
                    }

                    const birthdayList = upcomingBirthdays
                        .slice(0, 15) // Limit to 15 entries
                        .map((birthday: any) => {
                            const username = birthday.user?.username || 'Unknown User';
                            const dateStr = `${birthday.month}/${birthday.day}`;
                            const daysStr = birthday.daysUntil === 0 ? '**Today!** 🎉' :
                                birthday.daysUntil === 1 ? '**Tomorrow!** 🎂' :
                                    `${birthday.daysUntil} days`;

                            return `**${username}** - ${dateStr} (${daysStr})`;
                        })
                        .join('\n');

                    const embed = new EmbedBuilder()
                        .setTitle(`🎂 Upcoming Birthdays (${daysAhead} days)`)
                        .setDescription(birthdayList)
                        .setColor(0x00aaff)
                        .setFooter({
                            text: `${upcomingBirthdays.length} birthdays found`,
                        })
                        .setTimestamp();

                    await interaction.reply({ embeds: [embed] });
                    break;
                }

                case 'opt-out': {
                    const updated = await client.db.birthday.updateMany({
                        where: {
                            userId: interaction.user.id,
                            guildId: interaction.guild.id,
                        },
                        data: {
                            optIn: false,
                        },
                    });

                    if (updated.count === 0) {
                        await interaction.reply({
                            content: '❌ You don\'t have a birthday set in this server!',
                            ephemeral: true,
                        });
                        return;
                    }

                    await interaction.reply({
                        content: '✅ You have opted out of birthday notifications. Your birthday is now private.',
                        ephemeral: true,
                    });
                    break;
                }

                case 'opt-in': {
                    const updated = await client.db.birthday.updateMany({
                        where: {
                            userId: interaction.user.id,
                            guildId: interaction.guild.id,
                        },
                        data: {
                            optIn: true,
                        },
                    });

                    if (updated.count === 0) {
                        await interaction.reply({
                            content: '❌ You don\'t have a birthday set in this server! Use `/birthday set` first.',
                            ephemeral: true,
                        });
                        return;
                    }

                    await interaction.reply({
                        content: '✅ You have opted back in to birthday notifications!',
                        ephemeral: true,
                    });
                    break;
                }
            }

            client.logger.info(`Birthday command used by ${interaction.user.tag}`, {
                guildId: interaction.guildId,
                userId: interaction.user.id,
                subcommand,
            });

        } catch (error) {
            client.logger.error('Error in birthday command', {
                error: error instanceof Error ? error.message : 'Unknown error',
                guildId: interaction.guildId,
                userId: interaction.user.id,
                subcommand,
            });

            await interaction.reply({
                content: '❌ An error occurred while processing your birthday command. Please try again later!',
                ephemeral: true,
            });
        }
    },
};

export default command;