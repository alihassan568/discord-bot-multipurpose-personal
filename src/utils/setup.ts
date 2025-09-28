import {
Guild,
EmbedBuilder,
ChannelType,
PermissionFlagsBits,
Client,
} from 'discord.js';
import { PrismaClient } from '@prisma/client';

export interface BotClient extends Client {
db: PrismaClient;
logger: {
    error: (msg: string, error?: any) => void;
    info?: (msg: string) => void;
};
}

export async function runBotSetup(guild: Guild, client: BotClient, initiator?: any) {
const summary = {
    automod: '',
    antinuke: '',
    tickets: '',
    welcome: '',
    birthday: '',
};

try {
    // --- Create Log Category ---
    const logsCategory = await guild.channels.create({
        name: '🔒 BOT LOGS',
        type: ChannelType.GuildCategory,
    });

    // --- Create Channels ---
    const automodLogsChannel = await guild.channels.create({
        name: 'automod-logs',
        type: ChannelType.GuildText,
        parent: logsCategory.id,
    });

    const antinukeLogsChannel = await guild.channels.create({
        name: 'antinuke-logs',
        type: ChannelType.GuildText,
        parent: logsCategory.id,
    });

    const ticketLogsChannel = await guild.channels.create({
        name: 'ticket-logs',
        type: ChannelType.GuildText,
        parent: logsCategory.id,
    });

    const welcomeChannel = await guild.channels.create({
        name: '👋-welcome',
        type: ChannelType.GuildText,
    });

    const ticketCategory = await guild.channels.create({
        name: '🎫 Tickets',
        type: ChannelType.GuildCategory,
        permissionOverwrites: [
            {
                id: guild.id, // @everyone
                deny: [PermissionFlagsBits.ViewChannel],
            },
            {
                id: client.user!.id,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ManageChannels],
            },
        ],
    });

    const supportRole = await guild.roles.create({
        name: 'Ticket Support',
        color: '#5865F2',
        reason: 'Bot Setup: For ticket system access.',
    });
    await client.db.guild.upsert({
        where: { id: guild.id },
        update: {
            automodEnabled: true,
            automodLogChannelId: automodLogsChannel.id,
            antiNukeEnabled: true,
            antiNukeLogChannelId: antinukeLogsChannel.id,
            ticketCategoryId: ticketCategory.id,
            ticketLogChannelId: ticketLogsChannel.id,
            ticketSupportRoleId: supportRole.id,
            welcomeChannelId: welcomeChannel.id,
            welcomeEnabled: true,
        },
        create: {
            id: guild.id,
            name: guild.name,
            automodEnabled: true,
            automodLogChannelId: automodLogsChannel.id,
            antiNukeEnabled: true,
            antiNukeLogChannelId: antinukeLogsChannel.id,
            ticketCategoryId: ticketCategory.id,
            ticketLogChannelId: ticketLogsChannel.id,
            ticketSupportRoleId: supportRole.id,
            welcomeChannelId: welcomeChannel.id,
            welcomeEnabled: true,
        },
    });

    // --- Update Summary ---
    summary.automod = `✅ Enabled | Logs: ${automodLogsChannel}`;
    summary.antinuke = `✅ Enabled | Logs: ${antinukeLogsChannel}`;
    summary.tickets = `✅ Enabled | Category: ${ticketCategory} | Role: ${supportRole}`;
    summary.welcome = `✅ Enabled | Channel: ${welcomeChannel}`;

    // --- Send Birthday Feature Announcement ---
    await welcomeChannel.send({
        embeds: [
            new EmbedBuilder()
                .setTitle('🎂 Birthday Feature Ready!')
                .setDescription(
                    'This server can now celebrate birthdays!\n\n' +
                    'To add your birthday, use the `/birthday set` command in any channel. ' +
                    'Your birthday will be announced here!'
                )
                .setColor('#FFC0CB'),
        ],
    });
    summary.birthday = '✅ Feature announced in welcome channel.';

    const finalEmbed = new EmbedBuilder()
        .setTitle('🚀 Bot Setup Complete!')
        .setDescription(
            `The bot has been successfully set up in **${guild.name}**.\n\nHere is a summary of the actions taken:`
        )
        .setColor('#00FF00')
        .addFields(
            { name: '🤖 Automod', value: summary.automod },
            { name: '🛡️ Anti-Nuke', value: summary.antinuke },
            { name: '🎫 Tickets', value: summary.tickets },
            { name: '👋 Welcome Messages', value: summary.welcome },
            { name: '🎂 Birthdays', value: summary.birthday }
        )
        .setTimestamp();

    if (initiator) {
        finalEmbed.setFooter({ text: `Setup initiated by ${initiator.tag}` });
    }

    return { success: true, embed: finalEmbed };
} catch (error) {
    client.logger.error('Error during bot-setup:', error);

    const errorEmbed = new EmbedBuilder()
        .setTitle('❌ Setup Failed')
        .setDescription(
            'An error occurred during the setup process.\n\n' +
            'Please ensure the bot has **Administrator** permissions and try again.'
        )
        .setColor('#FF0000')
        .addFields({
            name: 'Error Details',
            value: `${error instanceof Error ? error.message : 'An unknown error occurred.'}`,
        });

    return { success: false, embed: errorEmbed };
}
}
