import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} from 'discord.js';
import { Command, BotClient } from '../../types';

interface HangmanGame {
    word: string;
    guessedLetters: string[];
    wrongGuesses: number;
    isGameOver: boolean;
    isWinner: boolean;
}

const words = [
    'javascript', 'python', 'computer', 'discord', 'programming', 'developer',
    'github', 'typescript', 'database', 'algorithm', 'function', 'variable',
    'boolean', 'string', 'number', 'object', 'array', 'framework', 'library',
    'server', 'client', 'api', 'json', 'html', 'css', 'react', 'node',
    'express', 'mongodb', 'mysql', 'postgresql', 'redis', 'docker', 'kubernetes',
    'game', 'player', 'level', 'score', 'achievement', 'challenge', 'quest',
    'adventure', 'mystery', 'puzzle', 'solution', 'problem', 'answer',
    'question', 'knowledge', 'wisdom', 'learning', 'education', 'study'
];

const hangmanStages = [
    '```\n  +---+\n  |   |\n      |\n      |\n      |\n      |\n=========\n```',
    '```\n  +---+\n  |   |\n  O   |\n      |\n      |\n      |\n=========\n```',
    '```\n  +---+\n  |   |\n  O   |\n  |   |\n      |\n      |\n=========\n```',
    '```\n  +---+\n  |   |\n  O   |\n /|   |\n      |\n      |\n=========\n```',
    '```\n  +---+\n  |   |\n  O   |\n /|\\  |\n      |\n      |\n=========\n```',
    '```\n  +---+\n  |   |\n  O   |\n /|\\  |\n /    |\n      |\n=========\n```',
    '```\n  +---+\n  |   |\n  O   |\n /|\\  |\n / \\  |\n      |\n=========\n```'
];

// Store active games (in production, use Redis or database)
const activeGames = new Map<string, HangmanGame>();

function createAlphabet(): ActionRowBuilder<ButtonBuilder>[] {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const rows: ActionRowBuilder<ButtonBuilder>[] = [];

    for (let i = 0; i < alphabet.length; i += 5) {
        const row = new ActionRowBuilder<ButtonBuilder>();
        const letters = alphabet.slice(i, i + 5);

        letters.forEach(letter => {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`hangman_${letter}`)
                    .setLabel(letter)
                    .setStyle(ButtonStyle.Secondary)
            );
        });

        rows.push(row);
    }

    // Add quit button
    const quitRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId('hangman_quit')
            .setLabel('🏳️ Give Up')
            .setStyle(ButtonStyle.Danger)
    );
    rows.push(quitRow);

    return rows;
}

function getWordDisplay(word: string, guessedLetters: string[]): string {
    return word
        .split('')
        .map(letter => guessedLetters.includes(letter.toUpperCase()) ? letter.toUpperCase() : '_')
        .join(' ');
}

function updateButtons(rows: ActionRowBuilder<ButtonBuilder>[], guessedLetters: string[]): ActionRowBuilder<ButtonBuilder>[] {
    return rows.map(row => {
        const newRow = new ActionRowBuilder<ButtonBuilder>();
        row.components.forEach(button => {
            const newButton = ButtonBuilder.from(button);
            const customId = (button.data as any).custom_id;
            if (customId && customId.startsWith('hangman_')) {
                const letter = customId.split('_')[1];
                if (letter && letter !== 'quit' && guessedLetters.includes(letter)) {
                    newButton.setDisabled(true).setStyle(ButtonStyle.Primary);
                }
            }
            newRow.addComponents(newButton);
        });
        return newRow;
    });
}

function createGameEmbed(game: HangmanGame, userId: string): EmbedBuilder {
    const embed = new EmbedBuilder()
        .setTitle('🎮 Hangman Game')
        .setColor(game.isGameOver ? (game.isWinner ? 0x00ff00 : 0xff0000) : 0x00aaff)
        .setTimestamp();

    if (game.isGameOver) {
        embed
            .setDescription(game.isWinner ? '🎉 Congratulations! You won!' : '💀 Game Over! You lost!')
            .addFields(
                {
                    name: '📝 Word',
                    value: game.word.toUpperCase(),
                    inline: true,
                },
                {
                    name: '❌ Wrong Guesses',
                    value: `${game.wrongGuesses}/6`,
                    inline: true,
                }
            );
    } else {
        embed
            .setDescription(`Guess the word letter by letter!\n\n**Word:** ${getWordDisplay(game.word, game.guessedLetters)}`)
            .addFields(
                {
                    name: '🔤 Guessed Letters',
                    value: game.guessedLetters.length > 0 ? game.guessedLetters.join(', ') : 'None',
                    inline: true,
                },
                {
                    name: '❌ Wrong Guesses',
                    value: `${game.wrongGuesses}/6`,
                    inline: true,
                }
            );
    }

    if (game.wrongGuesses > 0) {
        embed.addFields({
            name: '🎨 Hangman',
            value: hangmanStages[game.wrongGuesses - 1] || hangmanStages[0] || '```\n  +---+\n  |   |\n      |\n      |\n      |\n      |\n=========\n```',
        });
    }

    embed.setFooter({
        text: `Game for User ID: ${userId}`,
    });

    return embed;
}

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('hangman')
        .setDescription('Play a game of hangman'),

    async execute(interaction: ChatInputCommandInteraction) {
        const client = interaction.client as BotClient;
        const userId = interaction.user.id;
        const gameKey = `${interaction.guildId}_${userId}`;

        // Check if user already has an active game
        if (activeGames.has(gameKey)) {
            await interaction.reply({
                content: '❌ You already have an active hangman game! Finish it first or use the give up button.',
                ephemeral: true,
            });
            return;
        }

        // Create new game
        const word = words[Math.floor(Math.random() * words.length)] || 'javascript';
        const game: HangmanGame = {
            word: word,
            guessedLetters: [],
            wrongGuesses: 0,
            isGameOver: false,
            isWinner: false,
        };

        activeGames.set(gameKey, game);

        const embed = createGameEmbed(game, userId);
        const rows = createAlphabet();

        await interaction.reply({
            embeds: [embed],
            components: rows
        });

        // Set up collector for button interactions
        const filter = (i: any) =>
            i.customId.startsWith('hangman_') &&
            i.user.id === userId;

        const collector = interaction.channel?.createMessageComponentCollector({
            filter,
            time: 300000, // 5 minutes
        });

        collector?.on('collect', async (buttonInteraction) => {
            const currentGame = activeGames.get(gameKey);
            if (!currentGame || currentGame.isGameOver) {
                await buttonInteraction.reply({
                    content: '❌ This game is no longer active!',
                    ephemeral: true,
                });
                return;
            }

            const action = buttonInteraction.customId.split('_')[1];

            if (action === 'quit') {
                currentGame.isGameOver = true;
                currentGame.isWinner = false;
                activeGames.delete(gameKey);

                const finalEmbed = createGameEmbed(currentGame, userId);
                await buttonInteraction.update({
                    embeds: [finalEmbed],
                    components: []
                });

                client.logger.info(`Hangman game quit by ${interaction.user.tag}`, {
                    guildId: interaction.guildId,
                    userId: interaction.user.id,
                    word: currentGame.word,
                });
                return;
            }

            const letter = action;
            if (!letter || currentGame.guessedLetters.includes(letter)) {
                await buttonInteraction.reply({
                    content: '❌ You already guessed that letter!',
                    ephemeral: true,
                });
                return;
            }

            // Add letter to guessed letters
            currentGame.guessedLetters.push(letter);

            // Check if letter is in the word
            if (currentGame.word.toUpperCase().includes(letter)) {
                // Check if word is complete
                const wordComplete = currentGame.word
                    .toUpperCase()
                    .split('')
                    .every(char => currentGame.guessedLetters.includes(char));

                if (wordComplete) {
                    currentGame.isGameOver = true;
                    currentGame.isWinner = true;
                    activeGames.delete(gameKey);
                }
            } else {
                currentGame.wrongGuesses++;
                if (currentGame.wrongGuesses >= 6) {
                    currentGame.isGameOver = true;
                    currentGame.isWinner = false;
                    activeGames.delete(gameKey);
                }
            }

            const updatedEmbed = createGameEmbed(currentGame, userId);
            const updatedRows = currentGame.isGameOver
                ? []
                : updateButtons(createAlphabet(), currentGame.guessedLetters);

            await buttonInteraction.update({
                embeds: [updatedEmbed],
                components: updatedRows
            });

            if (currentGame.isGameOver) {
                client.logger.info(`Hangman game completed by ${interaction.user.tag}`, {
                    guildId: interaction.guildId,
                    userId: interaction.user.id,
                    won: currentGame.isWinner,
                    word: currentGame.word,
                    wrongGuesses: currentGame.wrongGuesses,
                });
            }
        });

        collector?.on('end', async () => {
            const currentGame = activeGames.get(gameKey);
            if (currentGame && !currentGame.isGameOver) {
                activeGames.delete(gameKey);
                try {
                    await interaction.editReply({
                        content: '⏰ Game timed out after 5 minutes of inactivity.',
                        components: []
                    });
                } catch (error) {
                    // Interaction might have been handled already
                }
            }
        });
    },
};

export default command;