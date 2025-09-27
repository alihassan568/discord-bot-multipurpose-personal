import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    GuildMember,
    EmbedBuilder,
    VoiceChannel,
    PermissionFlagsBits
} from 'discord.js';
import { Command, BotClient } from '../../types';

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Stop music and clear the queue'),

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

        if (!musicQueue || (!musicQueue.isPlaying && !musicQueue.isPaused)) {
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

        // Check permissions - only DJ or manage channels can stop
        const hasManageChannels = member.permissions.has(PermissionFlagsBits.ManageChannels);
        const isDJ = member.roles.cache.some(role =>
            role.name.toLowerCase().includes('dj') || role.name.toLowerCase().includes('music')
        );

        if (!hasManageChannels && !isDJ) {
            await interaction.reply({
                content: '❌ You need DJ role or Manage Channels permission to stop music!',
                ephemeral: true,
            });
            return;
        }

        try {
            const currentTrack = musicQueue.currentTrack as any;
            const queueLength = ((musicQueue.queue as any[]) || []).length;

            // Clear the queue and stop playing
            await client.db.musicQueue.update({
                where: { guildId: interaction.guildId! },
                data: {
                    queue: [],
                    currentTrack: null,
                    isPlaying: false,
                    isPaused: false,
                    isLooping: false,
                },
            });

            const embed = new EmbedBuilder()
                .setTitle('⏹️ Music Stopped')
                .setDescription('Music playback has been stopped and queue cleared')
                .setColor(0xff0000)
                .addFields({
                    name: '👤 Stopped by',
                    value: member.toString(),
                    inline: true,
                })
                .setTimestamp();

            if (currentTrack) {
                embed.addFields({
                    name: '🎵 Last playing',
                    value: currentTrack.title || 'Unknown',
                    inline: true,
                });
            }

            if (queueLength > 0) {
                embed.addFields({
                    name: '🗑️ Cleared queue',
                    value: `${queueLength} song${queueLength === 1 ? '' : 's'}`,
                    inline: true,
                });
            }

            await interaction.reply({ embeds: [embed] });

            client.logger.info(`Music stopped by ${member.user.tag} in ${interaction.guild.name}`, {
                guildId: interaction.guildId,
                userId: member.id,
                clearedTracks: queueLength,
            });

        } catch (error) {
            client.logger.error('Error stopping music:', error);
            await interaction.reply({
                content: '❌ An error occurred while stopping music.',
                ephemeral: true,
            });
        }
    },
};

export default command;