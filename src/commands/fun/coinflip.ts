import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Command, BotClient } from '../../types';

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('coinflip')
        .setDescription('Flip a coin')
        .addStringOption(option =>
            option
                .setName('call')
                .setDescription('Call heads or tails')
                .setRequired(false)
                .addChoices(
                    { name: 'Heads', value: 'heads' },
                    { name: 'Tails', value: 'tails' }
                )
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        const client = interaction.client as BotClient;
        const call = interaction.options.getString('call');

        const result = Math.random() < 0.5 ? 'heads' : 'tails';
        const emoji = result === 'heads' ? '🪙' : '🪙';

        let description = `The coin landed on **${result.toUpperCase()}**!`;
        let color = 0x5865f2;

        if (call) {
            const won = call === result;
            description += won ? ' 🎉 You won!' : ' 😢 You lost!';
            color = won ? 0x00ff00 : 0xff0000;
        }

        const embed = new EmbedBuilder()
            .setTitle(`${emoji} Coin Flip`)
            .setDescription(description)
            .setColor(color)
            .setFooter({
                text: `Flipped by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL(),
            })
            .setTimestamp();

        if (call) {
            embed.addFields({
                name: 'Your Call',
                value: call.toUpperCase(),
                inline: true,
            });
        }

        await interaction.reply({ embeds: [embed] });

        client.logger.info(`Coin flip: ${result} by ${interaction.user.tag}`, {
            guildId: interaction.guildId,
            userId: interaction.user.id,
            result: result,
            call: call,
            won: call ? call === result : null,
        });
    },
};

export default command;