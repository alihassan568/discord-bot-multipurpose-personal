import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} from 'discord.js';
import { Command, BotClient } from '../../types';

interface TriviaQuestion {
    question: string;
    correct: string;
    incorrect: string[];
    category: string;
    difficulty: string;
}

const triviaQuestions: TriviaQuestion[] = [
    {
        question: "What is the capital of Australia?",
        correct: "Canberra",
        incorrect: ["Sydney", "Melbourne", "Brisbane"],
        category: "Geography",
        difficulty: "Medium"
    },
    {
        question: "Which planet is known as the Red Planet?",
        correct: "Mars",
        incorrect: ["Venus", "Jupiter", "Saturn"],
        category: "Science",
        difficulty: "Easy"
    },
    {
        question: "What year did World War II end?",
        correct: "1945",
        incorrect: ["1944", "1946", "1943"],
        category: "History",
        difficulty: "Easy"
    },
    {
        question: "Who painted the Mona Lisa?",
        correct: "Leonardo da Vinci",
        incorrect: ["Pablo Picasso", "Vincent van Gogh", "Michelangelo"],
        category: "Art",
        difficulty: "Easy"
    },
    {
        question: "What is the largest mammal in the world?",
        correct: "Blue Whale",
        incorrect: ["African Elephant", "Giraffe", "Polar Bear"],
        category: "Nature",
        difficulty: "Easy"
    },
    {
        question: "Which programming language is known as the 'language of the web'?",
        correct: "JavaScript",
        incorrect: ["Python", "Java", "C++"],
        category: "Technology",
        difficulty: "Medium"
    },
    {
        question: "How many hearts does an octopus have?",
        correct: "3",
        incorrect: ["2", "4", "8"],
        category: "Science",
        difficulty: "Hard"
    },
    {
        question: "What is the smallest country in the world?",
        correct: "Vatican City",
        incorrect: ["Monaco", "San Marino", "Liechtenstein"],
        category: "Geography",
        difficulty: "Medium"
    }
];

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('trivia')
        .setDescription('Play a trivia game')
        .addStringOption(option =>
            option
                .setName('difficulty')
                .setDescription('Choose difficulty level')
                .setRequired(false)
                .addChoices(
                    { name: 'Easy', value: 'Easy' },
                    { name: 'Medium', value: 'Medium' },
                    { name: 'Hard', value: 'Hard' }
                )
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        const client = interaction.client as BotClient;
        const difficulty = interaction.options.getString('difficulty');

        // Filter questions by difficulty if specified
        let filteredQuestions = triviaQuestions;
        if (difficulty) {
            filteredQuestions = triviaQuestions.filter(q => q.difficulty === difficulty);
        }

        if (filteredQuestions.length === 0) {
            await interaction.reply({
                content: '❌ No trivia questions found for that difficulty level!',
                ephemeral: true,
            });
            return;
        }

        const question = filteredQuestions[Math.floor(Math.random() * filteredQuestions.length)] || triviaQuestions[0];

        if (!question) {
            await interaction.reply({
                content: '❌ No trivia questions available!',
                ephemeral: true,
            });
            return;
        }

        // Shuffle all answers
        const allAnswers = [question.correct, ...question.incorrect];
        const shuffledAnswers = allAnswers.sort(() => Math.random() - 0.5);
        const correctIndex = shuffledAnswers.indexOf(question.correct);

        // Create answer buttons
        const buttons = shuffledAnswers.map((answer, index) => {
            return new ButtonBuilder()
                .setCustomId(`trivia_${index}_${correctIndex}_${interaction.user.id}`)
                .setLabel(answer)
                .setStyle(ButtonStyle.Primary);
        });

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(buttons);

        const embed = new EmbedBuilder()
            .setTitle('🧠 Trivia Time!')
            .setDescription(question.question)
            .addFields(
                {
                    name: '📚 Category',
                    value: question.category,
                    inline: true,
                },
                {
                    name: '⚡ Difficulty',
                    value: question.difficulty,
                    inline: true,
                }
            )
            .setColor(0x00aaff)
            .setFooter({
                text: `Question for ${interaction.user.tag} • You have 30 seconds to answer!`,
                iconURL: interaction.user.displayAvatarURL(),
            })
            .setTimestamp();

        await interaction.reply({
            embeds: [embed],
            components: [row]
        });

        // Set up collector for button interactions
        const filter = (i: any) => i.customId.startsWith('trivia_') && i.user.id === interaction.user.id;
        const collector = interaction.channel?.createMessageComponentCollector({
            filter,
            time: 30000, // 30 seconds
            max: 1
        });

        collector?.on('collect', async (buttonInteraction) => {
            const parts = buttonInteraction.customId.split('_');
            const selectedIndex = parts[1] || '0';
            const correctIndexStr = parts[2] || '0';
            const isCorrect = parseInt(selectedIndex) === parseInt(correctIndexStr);

            const resultEmbed = new EmbedBuilder()
                .setTitle(isCorrect ? '🎉 Correct!' : '❌ Incorrect!')
                .setDescription(question.question)
                .addFields(
                    {
                        name: '✅ Correct Answer',
                        value: question.correct,
                        inline: true,
                    },
                    {
                        name: '📊 Your Answer',
                        value: shuffledAnswers[parseInt(selectedIndex)] || 'Unknown',
                        inline: true,
                    }
                )
                .setColor(isCorrect ? 0x00ff00 : 0xff0000)
                .setFooter({
                    text: `Answered by ${interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL(),
                })
                .setTimestamp();

            if (isCorrect) {
                resultEmbed.addFields({
                    name: '🏆 Result',
                    value: 'Well done! You got it right!',
                });
            } else {
                resultEmbed.addFields({
                    name: '📖 Result',
                    value: 'Better luck next time!',
                });
            }

            await buttonInteraction.update({
                embeds: [resultEmbed],
                components: [] // Remove buttons
            });

            client.logger.info(`Trivia answered by ${interaction.user.tag}`, {
                guildId: interaction.guildId,
                userId: interaction.user.id,
                correct: isCorrect,
                category: question.category,
                difficulty: question.difficulty,
            });
        });

        collector?.on('end', async (collected) => {
            if (collected.size === 0) {
                // Time expired
                const timeoutEmbed = new EmbedBuilder()
                    .setTitle('⏰ Time\'s Up!')
                    .setDescription(question.question)
                    .addFields({
                        name: '✅ Correct Answer',
                        value: question.correct,
                    })
                    .setColor(0xffaa00)
                    .setFooter({
                        text: 'You ran out of time!',
                    })
                    .setTimestamp();

                try {
                    await interaction.editReply({
                        embeds: [timeoutEmbed],
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