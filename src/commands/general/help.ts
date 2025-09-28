import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuInteraction,
    ComponentType,
} from 'discord.js';
import { Command } from '../../types';

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Show all available commands and features'),

    async execute(interaction: ChatInputCommandInteraction) {
        const embed = new EmbedBuilder()
            .setTitle('🤖 Bot Help Menu')
            .setDescription('Select a category from the dropdown below to view detailed commands.')
            .setColor(0x5865f2)
            .addFields([
                { name: '🛡️ Moderation', value: 'Ban, kick, mute, warn, clear messages', inline: true },
                { name: '🎵 Music', value: 'Play music, manage queue, volume, and more', inline: true },
                { name: '🎫 Tickets', value: 'Support ticket system with transcripts', inline: true },
                { name: '🎉 Fun', value: 'Games, memes, jokes, and more', inline: true },
                { name: '🔧 Utility', value: 'Server info, user info, stats, and setup', inline: true },
            ])
            .setFooter({ text: 'Use the dropdown below to navigate categories' })
            .setTimestamp();

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('help-menu')
            .setPlaceholder('📂 Select a category')
            .addOptions([
                { label: 'Moderation', value: 'moderation', description: 'Ban, kick, mute, warn...', emoji: '🛡️' },
                { label: 'Music', value: 'music', description: 'Play songs, queue system, volume...', emoji: '🎵' },
                { label: 'Tickets', value: 'tickets', description: 'Support ticket system', emoji: '🎫' },
                { label: 'Fun', value: 'fun', description: 'Games, memes, and fun stuff', emoji: '🎉' },
                { label: 'Utility', value: 'utility', description: 'Server info, stats, setup...', emoji: '🔧' },
            ]);

        const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

        await interaction.reply({
            embeds: [embed],
            components: [row],
            ephemeral: true,
        });

        const msg = await interaction.fetchReply();

        const collector = msg.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            time: 60_000, 
        });

        collector.on('collect', async (i: StringSelectMenuInteraction) => {
            if (i.customId !== 'help-menu') return;

            const category = i.values[0];
            const categoryEmbed = getCategoryEmbed(category as any);

            await i.update({
                embeds: [categoryEmbed],
                components: [row],
            });
        });

        collector.on('end', async () => {
            const disabledRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
                selectMenu.setDisabled(true),
            );

            await interaction.editReply({
                components: [disabledRow],
            });
        });
    },
};

function getCategoryEmbed(category: string): EmbedBuilder {
    const embeds: Record<string, EmbedBuilder> = {
        moderation: new EmbedBuilder()
            .setTitle('🛡️ Moderation Commands')
            .setColor(0xff4444)
            .setDescription('Moderation tools for managing your server')
            .addFields([
                { name: '/ban', value: 'Ban a user from the server', inline: false },
                { name: '/kick', value: 'Kick a user from the server', inline: false },
                { name: '/mute', value: 'Mute a user with timeout or role', inline: false },
                { name: '/unmute', value: 'Unmute a user', inline: false },
                { name: '/warn', value: 'Warn a user', inline: false },
                { name: '/clear', value: 'Clear messages', inline: false },
                { name: '/modlogs', value: 'View moderation logs of a user', inline: false },
            ]),

        music: new EmbedBuilder()
            .setTitle('🎵 Music Commands')
            .setColor(0x1db954)
            .setDescription('Music streaming & queue management')
            .addFields([
                { name: '/play', value: 'Play a song', inline: false },
                { name: '/pause', value: 'Pause the current song', inline: false },
                { name: '/resume', value: 'Resume music', inline: false },
                { name: '/skip', value: 'Skip the current track', inline: false },
                { name: '/queue', value: 'Show current queue', inline: false },
                { name: '/volume', value: 'Adjust playback volume', inline: false },
            ]),

        tickets: new EmbedBuilder()
            .setTitle('🎫 Ticket Commands')
            .setColor(0xffa500)
            .setDescription('Support ticket system')
            .addFields([
                { name: '/ticket create', value: 'Open a support ticket', inline: false },
                { name: '/ticket close', value: 'Close your ticket', inline: false },
                { name: '/ticket add', value: 'Add a user to ticket', inline: false },
                { name: '/ticket remove', value: 'Remove a user from ticket', inline: false },
                { name: '/ticket transcript', value: 'Generate ticket transcript', inline: false },
            ]),

        fun: new EmbedBuilder()
            .setTitle('🎉 Fun Commands')
            .setColor(0xff69b4)
            .setDescription('Have fun with these commands')
            .addFields([
                { name: '/8ball', value: 'Ask the magic 8-ball', inline: false },
                { name: '/coinflip', value: 'Flip a coin', inline: false },
                { name: '/meme', value: 'Get a random meme', inline: false },
                { name: '/joke', value: 'Get a random joke', inline: false },
                { name: '/trivia', value: 'Play trivia', inline: false },
            ]),

        utility: new EmbedBuilder()
            .setTitle('🔧 Utility Commands')
            .setColor(0x36393f)
            .setDescription('Server and bot utilities')
            .addFields([
                { name: '/serverinfo', value: 'Show server info', inline: false },
                { name: '/userinfo', value: 'Show user info', inline: false },
                { name: '/avatar', value: 'Get user avatar', inline: false },
                { name: '/ping', value: 'Check bot latency', inline: false },
                { name: '/stats', value: 'View bot statistics', inline: false },
            ]),
    };

    return embeds[category] ?? new EmbedBuilder().setDescription('❌ Invalid category');
}

export default command;
