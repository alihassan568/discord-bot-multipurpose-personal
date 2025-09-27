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
        .setName('resume')
        .setDescription('Resume the paused music'),

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

        const settings = (musicQueue?.settings as any) || {};
        const isPaused = settings.isPaused || false;

        if (!musicQueue || !isPaused) {
            await interaction.reply({
                content: '❌ No music is currently paused!',
                ephemeral: true,
            });
            return;
        }

        // Check if user is in the same voice channel as bot
        if (settings.voiceChannelId !== voiceChannel.id) {
            await interaction.reply({
                content: '❌ You need to be in the same voice channel as the bot!',
                ephemeral: true,
            });
            return;
        }

        try {
            await client.db.musicQueue.update({
                where: { guildId: interaction.guildId! },
                data: {
                    settings: {
                        ...settings,
                        isPaused: false,
                        isPlaying: true,
                    }
                },
            });

            const embed = new EmbedBuilder()
                .setTitle('▶️ Music Resumed')
                .setDescription('Music playback has been resumed')
                .setColor(0x00ff00)
                .addFields({
                    name: '👤 Resumed by',
                    value: member.toString(),
                    inline: true,
                })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

            client.logger.info(`Music resumed by ${member.user.tag} in ${interaction.guild.name}`, {
                guildId: interaction.guildId,
                userId: member.id,
            });

        } catch (error) {
            client.logger.error('Error resuming music:', error);
            await interaction.reply({
                content: '❌ An error occurred while resuming music.',
                ephemeral: true,
            });
        }
    },
};

export default command;