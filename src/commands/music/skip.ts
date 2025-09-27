import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    GuildMember,
    EmbedBuilder,
    VoiceChannel
} from 'discord.js';
import { Command, BotClient } from '../../types';

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Skip the current song'),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guild) return;

        const client = interaction.client as BotClient;
        const member = interaction.member as GuildMember;

        // Check if user is in a voice channel
        const voiceChannel = member.voice.channel as VoiceChannel;
        if (!voiceChannel) {
            await interaction.reply({
                content: '❌ You need to be in a voice channel to control music!',
                ephemeral: true,
            });
            return;
        }

        // Get music queue
        const musicQueue = await client.db.musicQueue.findUnique({
            where: { guildId: interaction.guildId! },
        });

        if (!musicQueue || !musicQueue.isPlaying) {
            await interaction.reply({
                content: '❌ No music is currently playing!',
                ephemeral: true,
            });
            return;
        }

        // Check if user is in the same voice channel as bot
        if (musicQueue.voiceChannelId !== voiceChannel.id) {
            await interaction.reply({
                content: '❌ You need to be in the same voice channel as the bot!',
                ephemeral: true,
            });
            return;
        }

        try {
            const currentQueue = (musicQueue.queue as any[]) || [];
            const currentTrack = musicQueue.currentTrack as any;

            // Remove current track from queue
            if (currentQueue.length > 0) {
                currentQueue.shift();
            }

            let nextTrack = null;
            let isPlaying = false;

            if (currentQueue.length > 0) {
                nextTrack = currentQueue[0];
                isPlaying = true;
            }

            await client.db.musicQueue.update({
                where: { guildId: interaction.guildId! },
                data: {
                    queue: currentQueue,
                    currentTrack: nextTrack,
                    isPlaying: isPlaying,
                    isPaused: false,
                },
            });

            const embed = new EmbedBuilder()
                .setTitle('⏭️ Song Skipped')
                .setColor(0x00aaff)
                .addFields({
                    name: '👤 Skipped by',
                    value: member.toString(),
                    inline: true,
                })
                .setTimestamp();

            if (currentTrack) {
                embed.addFields({
                    name: '🎵 Skipped track',
                    value: currentTrack.title || 'Unknown',
                    inline: true,
                });
            }

            if (nextTrack) {
                embed.addFields({
                    name: '▶️ Now playing',
                    value: nextTrack.title || 'Unknown',
                    inline: false,
                });
                embed.setDescription('Skipped to next song in queue');
            } else {
                embed.setDescription('Queue is now empty');
            }

            await interaction.reply({ embeds: [embed] });

            client.logger.info(`Song skipped by ${member.user.tag} in ${interaction.guild.name}`, {
                guildId: interaction.guildId,
                userId: member.id,
                skippedTrack: currentTrack?.title || 'Unknown',
                nextTrack: nextTrack?.title || null,
            });

        } catch (error) {
            client.logger.error('Error skipping song:', error);
            await interaction.reply({
                content: '❌ An error occurred while skipping the song.',
                ephemeral: true,
            });
        }
    },
};

export default command;