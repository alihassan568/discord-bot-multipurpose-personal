import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    GuildMember,
    EmbedBuilder
} from 'discord.js';
import { Command, BotClient } from '../../types';

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('View the current music queue')
        .addIntegerOption(option =>
            option
                .setName('page')
                .setDescription('Page number to view')
                .setRequired(false)
                .setMinValue(1)
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guild) return;

        const client = interaction.client as BotClient;
        const page = interaction.options.getInteger('page') || 1;
        const itemsPerPage = 10;

        // Get music queue
        const musicQueue = await client.db.musicQueue.findUnique({
            where: { guildId: interaction.guildId! },
        });

        if (!musicQueue) {
            await interaction.reply({
                content: '❌ No music queue found for this server!',
                ephemeral: true,
            });
            return;
        }

        const currentQueue = (musicQueue.queue as any[]) || [];
        const currentTrack = musicQueue.currentTrack as any;

        if (!currentTrack && currentQueue.length === 0) {
            await interaction.reply({
                content: '📭 The music queue is empty! Use `/play` to add songs.',
                ephemeral: true,
            });
            return;
        }

        const totalPages = Math.ceil(currentQueue.length / itemsPerPage);
        const startIndex = (page - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const pageQueue = currentQueue.slice(startIndex, endIndex);

        const embed = new EmbedBuilder()
            .setTitle('🎵 Music Queue')
            .setColor(0x5865f2);

        // Show currently playing track
        if (currentTrack) {
            const status = musicQueue.isPaused ? '⏸️ Paused' : '▶️ Playing';
            embed.addFields({
                name: `${status} - Now Playing`,
                value: `**${currentTrack.title}**\nRequested by: <@${currentTrack.requestedBy}>`,
                inline: false,
            });
        }

        // Show queue
        if (pageQueue.length > 0) {
            const queueText = pageQueue
                .map((track, index) => {
                    const position = startIndex + index + 1;
                    return `**${position}.** ${track.title}\n└ Requested by: <@${track.requestedBy}>`;
                })
                .join('\n\n');

            embed.addFields({
                name: `📋 Up Next (${currentQueue.length} song${currentQueue.length === 1 ? '' : 's'})`,
                value: queueText.length > 1024 ? queueText.substring(0, 1021) + '...' : queueText,
                inline: false,
            });
        }

        // Add pagination info
        if (totalPages > 1) {
            embed.setFooter({
                text: `Page ${page} of ${totalPages} • Total duration: ~${Math.floor(currentQueue.length * 3.75)} minutes`,
            });
        } else {
            embed.setFooter({
                text: `${currentQueue.length} song${currentQueue.length === 1 ? '' : 's'} in queue`,
            });
        }

        // Add volume info
        if (musicQueue.volume) {
            embed.addFields({
                name: '🔊 Volume',
                value: `${musicQueue.volume}%`,
                inline: true,
            });
        }

        // Add loop status if applicable
        if (musicQueue.isLooping) {
            embed.addFields({
                name: '🔁 Loop',
                value: 'Enabled',
                inline: true,
            });
        }

        embed.setTimestamp();

        await interaction.reply({ embeds: [embed] });

        client.logger.info(`Queue viewed by ${interaction.user.tag} in ${interaction.guild.name}`, {
            guildId: interaction.guildId,
            userId: interaction.user.id,
            queueLength: currentQueue.length,
            page: page,
        });
    },
};

export default command;