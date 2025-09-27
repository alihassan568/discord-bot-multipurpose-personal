import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Command } from '../../types';

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Show all available commands and features')
        .addStringOption(option =>
            option
                .setName('category')
                .setDescription('Show commands from a specific category')
                .addChoices(
                    { name: 'Moderation', value: 'moderation' },
                    { name: 'Music', value: 'music' },
                    { name: 'Tickets', value: 'tickets' },
                    { name: 'Fun', value: 'fun' },
                    { name: 'Utility', value: 'utility' },
                )
        ) as SlashCommandBuilder,

    async execute(interaction: ChatInputCommandInteraction) {
        const category = interaction.options.getString('category');

        if (category) {
            await showCategoryHelp(interaction, category);
        } else {
            await showGeneralHelp(interaction);
        }
    },
};

async function showGeneralHelp(interaction: ChatInputCommandInteraction): Promise<void> {
    const embed = new EmbedBuilder()
        .setTitle('🤖 Bot Help - All Commands')
        .setDescription('Here are all the available command categories. Use `/help category:<name>` for detailed commands in each category.')
        .setColor(0x5865f2)
        .addFields([
            {
                name: '🛡️ Moderation',
                value: '`/help category:moderation`\nBan, kick, mute, and other moderation tools',
                inline: true,
            },
            {
                name: '🎵 Music',
                value: '`/help category:music`\nPlay music, manage queue, and audio controls',
                inline: true,
            },
            {
                name: '🎫 Tickets',
                value: '`/help category:tickets`\nSupport ticket system for staff and users',
                inline: true,
            },
            {
                name: '🎉 Fun',
                value: '`/help category:fun`\n8ball, games, memes, and entertainment',
                inline: true,
            },
            {
                name: '🔧 Utility',
                value: '`/help category:utility`\nServer info, user profiles, and utilities',
                inline: true,
            },
            {
                name: '⚙️ Setup',
                value: '`/setup` - Configure bot settings for your server',
                inline: true,
            },
        ])
        .setFooter({
            text: 'Use /setup to configure the bot for your server',
        })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function showCategoryHelp(interaction: ChatInputCommandInteraction, category: string): Promise<void> {
    const embeds: Record<string, EmbedBuilder> = {
        moderation: new EmbedBuilder()
            .setTitle('🛡️ Moderation Commands')
            .setColor(0xff4444)
            .setDescription('Powerful moderation tools with logging and auto-moderation')
            .addFields([
                { name: '/ban <user> [reason] [duration]', value: 'Ban a user from the server', inline: false },
                { name: '/kick <user> [reason]', value: 'Kick a user from the server', inline: false },
                { name: '/mute <user> [reason] [duration]', value: 'Mute a user (timeout or role)', inline: false },
                { name: '/unmute <user>', value: 'Remove mute from a user', inline: false },
                { name: '/warn <user> <reason>', value: 'Add a warning to a user', inline: false },
                { name: '/clear <amount> [user]', value: 'Clear messages from channel', inline: false },
                { name: '/modlogs <user>', value: 'View moderation history for a user', inline: false },
                { name: '/setup moderation', value: 'Configure moderation settings', inline: false },
            ]),

        music: new EmbedBuilder()
            .setTitle('🎵 Music Commands')
            .setColor(0x1db954)
            .setDescription('High-quality music streaming with queue management')
            .addFields([
                { name: '/play <song>', value: 'Play a song or add to queue', inline: false },
                { name: '/pause', value: 'Pause the current song', inline: false },
                { name: '/resume', value: 'Resume playback', inline: false },
                { name: '/skip [amount]', value: 'Skip current song or multiple songs', inline: false },
                { name: '/queue', value: 'View the music queue', inline: false },
                { name: '/volume <1-100>', value: 'Set playback volume', inline: false },
                { name: '/loop <none|track|queue>', value: 'Set loop mode', inline: false },
                { name: '/shuffle', value: 'Shuffle the queue', inline: false },
                { name: '/nowplaying', value: 'Show currently playing song', inline: false },
                { name: '/leave', value: 'Leave voice channel and clear queue', inline: false },
            ]),

        tickets: new EmbedBuilder()
            .setTitle('🎫 Ticket System')
            .setColor(0xffa500)
            .setDescription('Professional support ticket system with transcripts')
            .addFields([
                { name: '/ticket create <reason>', value: 'Create a new support ticket', inline: false },
                { name: '/ticket close [reason]', value: 'Close your ticket', inline: false },
                { name: '/ticket add <user>', value: 'Add user to ticket (Staff)', inline: false },
                { name: '/ticket remove <user>', value: 'Remove user from ticket (Staff)', inline: false },
                { name: '/ticket transcript', value: 'Generate ticket transcript (Staff)', inline: false },
                { name: '/setup tickets', value: 'Configure ticket settings', inline: false },
            ]),

        fun: new EmbedBuilder()
            .setTitle('🎉 Fun Commands')
            .setColor(0xff69b4)
            .setDescription('Entertainment and engagement commands')
            .addFields([
                { name: '/8ball <question>', value: 'Ask the magic 8-ball', inline: false },
                { name: '/coinflip', value: 'Flip a coin', inline: false },
                { name: '/roll [sides]', value: 'Roll a dice', inline: false },
                { name: '/meme', value: 'Get a random meme', inline: false },
                { name: '/joke', value: 'Get a random joke', inline: false },
                { name: '/trivia', value: 'Start a trivia game', inline: false },
                { name: '/profile [user]', value: 'View user profile and stats', inline: false },
                { name: '/birthday set <date>', value: 'Set your birthday', inline: false },
            ]),

        utility: new EmbedBuilder()
            .setTitle('🔧 Utility Commands')
            .setColor(0x36393f)
            .setDescription('Server management and information tools')
            .addFields([
                { name: '/serverinfo', value: 'Show server information', inline: false },
                { name: '/userinfo [user]', value: 'Show user information', inline: false },
                { name: '/roleinfo <role>', value: 'Show role information', inline: false },
                { name: '/avatar [user]', value: 'Get user avatar', inline: false },
                { name: '/ping', value: 'Check bot latency', inline: false },
                { name: '/stats', value: 'Show bot statistics', inline: false },
                { name: '/setup', value: 'Configure bot settings', inline: false },
            ]),
    };

    const embed = embeds[category];
    if (!embed) {
        await interaction.reply({
            content: 'Invalid category! Use `/help` to see all categories.',
            ephemeral: true,
        });
        return;
    }

    await interaction.reply({ embeds: [embed] });
}

export default command;