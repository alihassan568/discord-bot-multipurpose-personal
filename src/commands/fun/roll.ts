import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Command, BotClient } from '../../types';

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('roll')
        .setDescription('Roll dice')
        .addStringOption(option =>
            option
                .setName('dice')
                .setDescription('Dice notation (e.g., 1d6, 2d20, 3d10+5)')
                .setRequired(false)
        )
        .addIntegerOption(option =>
            option
                .setName('sides')
                .setDescription('Number of sides on the die (if using simple mode)')
                .setRequired(false)
                .setMinValue(2)
                .setMaxValue(100)
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        const client = interaction.client as BotClient;
        const diceNotation = interaction.options.getString('dice');
        const sides = interaction.options.getInteger('sides');

        let rolls: number[] = [];
        let modifier = 0;
        let diceExpression = '';

        if (diceNotation) {
            // Parse dice notation like "2d6+3"
            const match = diceNotation.match(/^(\d+)?d(\d+)([+-]\d+)?$/i);
            if (!match) {
                await interaction.reply({
                    content: '❌ Invalid dice notation! Use format like `1d6`, `2d20`, or `3d10+5`',
                    ephemeral: true,
                });
                return;
            }

            const count = parseInt(match[1] || '1');
            const diceSides = parseInt(match[2] || '6');
            modifier = parseInt(match[3] || '0');

            if (count > 20 || diceSides > 100) {
                await interaction.reply({
                    content: '❌ Maximum 20 dice with 100 sides each!',
                    ephemeral: true,
                });
                return;
            }

            diceExpression = diceNotation;
            for (let i = 0; i < count; i++) {
                rolls.push(Math.floor(Math.random() * diceSides) + 1);
            }
        } else {
            // Simple single die roll
            const diceSides = sides || 6;
            rolls.push(Math.floor(Math.random() * diceSides) + 1);
            diceExpression = `1d${diceSides}`;
        }

        const sum = rolls.reduce((a, b) => a + b, 0);
        const total = sum + modifier;

        const embed = new EmbedBuilder()
            .setTitle('🎲 Dice Roll')
            .setColor(0x5865f2)
            .addFields({
                name: '🎯 Expression',
                value: diceExpression,
                inline: true,
            });

        if (rolls.length === 1) {
            embed.addFields({
                name: '📊 Result',
                value: `**${total}**`,
                inline: true,
            });
        } else {
            let resultText = `Rolls: [${rolls.join(', ')}]`;
            if (modifier !== 0) {
                resultText += `\nModifier: ${modifier > 0 ? '+' : ''}${modifier}`;
            }
            resultText += `\n**Total: ${total}**`;

            embed.addFields({
                name: '📊 Results',
                value: resultText,
                inline: false,
            });
        }

        // Add some fun reactions for special rolls
        if (rolls.length === 1) {
            const maxRoll = diceNotation ? parseInt(diceNotation.match(/d(\d+)/)?.[1] || '6') : (sides || 6);
            if (rolls[0] === 1) {
                embed.setDescription('💀 Critical failure!');
                embed.setColor(0xff0000);
            } else if (rolls[0] === maxRoll) {
                embed.setDescription('🎉 Critical success!');
                embed.setColor(0x00ff00);
            }
        }

        embed.setFooter({
            text: `Rolled by ${interaction.user.tag}`,
            iconURL: interaction.user.displayAvatarURL(),
        })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });

        client.logger.info(`Dice roll: ${diceExpression} = ${total} by ${interaction.user.tag}`, {
            guildId: interaction.guildId,
            userId: interaction.user.id,
            expression: diceExpression,
            rolls: rolls,
            modifier: modifier,
            total: total,
        });
    },
};

export default command;