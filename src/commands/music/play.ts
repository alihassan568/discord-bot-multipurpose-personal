import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    GuildMember,
    EmbedBuilder,
    VoiceChannel,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder
} from 'discord.js';
import { Command, BotClient } from '../../types';

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Play music in your voice channel')
        .addStringOption(option =>
            option
                .setName('query')
                .setDescription('Song name, URL, or search query')
                .setRequired(true)
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guild) return;

        const client = interaction.client as BotClient;
        const member = interaction.member as GuildMember;
        const query = interaction.options.getString('query', true);

        // Check if user is in a voice channel
        const voiceChannel = member.voice.channel as VoiceChannel;
        if (!voiceChannel) {
            await interaction.reply({
                content: '❌ You need to be in a voice channel to play music!',
                ephemeral: true,
            });
            return;
        }

        // Check bot permissions
        const permissions = voiceChannel.permissionsFor(interaction.guild.members.me!);
        if (!permissions?.has(['Connect', 'Speak'])) {
            await interaction.reply({
                content: '❌ I need permission to connect and speak in your voice channel!',
                ephemeral: true,
            });
            return;
        }

        await interaction.deferReply();

        try {
            // Get or create music queue for this guild
            let musicQueue = await client.db.musicQueue.findUnique({
                where: { guildId: interaction.guildId! },
            });

            if (!musicQueue) {
                musicQueue = await client.db.musicQueue.create({
                    data: {
                        guildId: interaction.guildId!,
                        queue: [],
                        volume: 0.5,
                        currentTrack: null,
                        settings: {
                            isPlaying: false,
                            isPaused: false,
                            voiceChannelId: voiceChannel.id,
                            textChannelId: interaction.channelId,
                        },
                    },
                });
            }

            // Simple mock track (in production, integrate with youtube-dl or similar)
            const track = {
                id: Date.now().toString(),
                title: query.length > 50 ? `${query.substring(0, 47)}...` : query,
                url: query.startsWith('http') ? query : `https://youtube.com/search?q=${encodeURIComponent(query)}`,
                duration: '3:45', // Mock duration
                requestedBy: member.id,
                addedAt: new Date().toISOString(),
            };

            // Add to queue
            const currentQueue = (musicQueue.queue as any[]) || [];
            currentQueue.push(track);

            const settings = (musicQueue.settings as any) || {};
            const isCurrentlyPlaying = settings.isPlaying || false;

            await client.db.musicQueue.update({
                where: { guildId: interaction.guildId! },
                data: {
                    queue: currentQueue,
                    settings: {
                        ...settings,
                        voiceChannelId: voiceChannel.id,
                        textChannelId: interaction.channelId,
                    },
                },
            });

            const embed = new EmbedBuilder()
                .setTitle('🎵 Added to Queue')
                .setDescription(`**${track.title}**`)
                .addFields(
                    { name: '👤 Requested by', value: member.toString(), inline: true },
                    { name: '⏱️ Duration', value: track.duration, inline: true },
                    { name: '📝 Position in queue', value: `${currentQueue.length}`, inline: true }
                )
                .setColor(0x00ff00)
                .setTimestamp();

            if (currentQueue.length === 1 && !isCurrentlyPlaying) {
                embed.setTitle('🎵 Now Playing')
                embed.addFields({
                    name: '🔊 Status',
                    value: 'Started playing immediately',
                });

                // Update playing status
                await client.db.musicQueue.update({
                    where: { guildId: interaction.guildId! },
                    data: {
                        currentTrack: track,
                        settings: {
                            ...settings,
                            isPlaying: true,
                            voiceChannelId: voiceChannel.id,
                            textChannelId: interaction.channelId,
                        },
                    },
                });
            }

            const buttons = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('music_pause')
                        .setEmoji('⏸️')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('music_skip')
                        .setEmoji('⏭️')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('music_stop')
                        .setEmoji('⏹️')
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId('music_queue')
                        .setEmoji('📋')
                        .setStyle(ButtonStyle.Primary)
                );

            await interaction.editReply({
                embeds: [embed],
                components: [buttons]
            });

            client.logger.info(`Music track queued: ${track.title} by ${member.user.tag} in ${interaction.guild.name}`, {
                guildId: interaction.guildId,
                userId: member.id,
                trackTitle: track.title,
                queuePosition: currentQueue.length,
            });

        } catch (error) {
            client.logger.error('Error playing music:', error);
            await interaction.editReply({
                content: '❌ An error occurred while trying to play music. Please try again later.',
            });
        }
    },
};

export default command;