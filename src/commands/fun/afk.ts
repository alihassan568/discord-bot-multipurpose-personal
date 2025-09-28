import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Command, BotClient } from '../../types';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('afk')
    .setDescription('Set your AFK status')
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason for going AFK')
        .setRequired(false)
    ),

async execute(interaction: ChatInputCommandInteraction) {
    const client = interaction.client as BotClient;
    const reason = interaction.options.getString('reason') || 'No reason provided.';

    try {
      await client.db.afk.upsert({
        where: { userId: interaction.user.id },
        update: {
          reason,
          since: new Date(),
        },
        create: {
          userId: interaction.user.id,
          reason,
          since: new Date(),
        },
      });

      const embed = new EmbedBuilder()
        .setTitle('🌙 AFK Mode Enabled')
        .setDescription(
          `You are now marked as **AFK**.\n\n` +
          `📋 **Reason:** ${reason}\n` +
          `⏰ **Since:** <t:${Math.floor(Date.now() / 1000)}:R>`
        )
        .setColor('#5865F2')
        .setThumbnail(interaction.user.displayAvatarURL({ size: 128 }))
        .setFooter({ text: 'Type in chat to remove AFK automatically.' })
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      client.logger.error('Error setting AFK:', error);

      const errorEmbed = new EmbedBuilder()
        .setTitle('❌ Failed to Set AFK')
        .setDescription('Something went wrong while setting your AFK status.')
        .setColor('#FF0000');

      if (!interaction.replied) {
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
      } else {
        await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
      }
    }
  },
};

export default command;
