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
        .setName('volume')
        .setDescription('Set or view the music volume')
        .addIntegerOption(option =>
            option
                .setName('level')
                .setDescription('Volume level (0-100)')
                .setRequired(false)
                .setMinValue(0)
                .setMaxValue(100)
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guild) return;

        const client = interaction.client as BotClient;
        const member = interaction.member as GuildMember;
        const volume = interaction.options.getInteger('level');

        // Get music queue
        const musicQueue = await client.db.musicQueue.findUnique({
            where: { guildId: interaction.guildId! },
        });

        if (!musicQueue) {
            await interaction.reply({
                content: '❌ No music session found for this server!',
                ephemeral: true,
            });
            return;
        }

        // If no volume specified, show current volume
        if (volume === null) {
            const embed = new EmbedBuilder()
                .setTitle('🔊 Current Volume')
                .setDescription(`Volume is set to **${musicQueue.volume || 50}%**`)
                .setColor(0x5865f2)
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
            return;
        }

        // Check permissions for volume change
        const voiceChannel = member.voice.channel as VoiceChannel;
        if (!voiceChannel) {
            await interaction.reply({
                content: '❌ You need to be in a voice channel to control volume!',
                ephemeral: true,
            });
            return;
        }

        if (musicQueue.voiceChannelId !== voiceChannel.id) {
            await interaction.reply({
                content: '❌ You need to be in the same voice channel as the bot!',
                ephemeral: true,
            });
            return;
        }

        // Check if user has DJ permissions or manage channels
        const hasManageChannels = member.permissions.has(PermissionFlagsBits.ManageChannels);
        const isDJ = member.roles.cache.some(role =>
            role.name.toLowerCase().includes('dj') || role.name.toLowerCase().includes('music')
        );

        if (!hasManageChannels && !isDJ && volume > 75) {
            await interaction.reply({
                content: '❌ You need DJ role or Manage Channels permission to set volume above 75%!',
                ephemeral: true,
            });
            return;
        }

        try {
            await client.db.musicQueue.update({
                where: { guildId: interaction.guildId! },
                data: { volume: volume },
            });

            let volumeEmoji = '🔊';
            if (volume === 0) volumeEmoji = '🔇';
            else if (volume < 30) volumeEmoji = '🔉';
            else if (volume < 70) volumeEmoji = '🔊';
            else volumeEmoji = '📢';

            const embed = new EmbedBuilder()
                .setTitle(`${volumeEmoji} Volume Changed`)
                .setDescription(`Volume set to **${volume}%**`)
                .setColor(0x00ff00)
                .addFields({
                    name: '👤 Changed by',
                    value: member.toString(),
                    inline: true,
                })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

            client.logger.info(`Volume changed to ${volume}% by ${member.user.tag} in ${interaction.guild.name}`, {
                guildId: interaction.guildId,
                userId: member.id,
                newVolume: volume,
            });

        } catch (error) {
            client.logger.error('Error changing volume:', error);
            await interaction.reply({
                content: '❌ An error occurred while changing the volume.',
                ephemeral: true,
            });
        }
    },
};

export default command;