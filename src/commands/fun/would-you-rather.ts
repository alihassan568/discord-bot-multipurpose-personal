import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Command, BotClient } from '../../types';

const wouldYouRatherQuestions = [
    {
        option1: "Have the ability to fly",
        option2: "Have the ability to turn invisible"
    },
    {
        option1: "Be able to speak all languages fluently",
        option2: "Be able to speak to animals"
    },
    {
        option1: "Have unlimited money",
        option2: "Have unlimited time"
    },
    {
        option1: "Live in the past",
        option2: "Live in the future"
    },
    {
        option1: "Always be 10 minutes late",
        option2: "Always be 20 minutes early"
    },
    {
        option1: "Have super strength",
        option2: "Have super speed"
    },
    {
        option1: "Never have to sleep",
        option2: "Never have to eat"
    },
    {
        option1: "Be famous for something embarrassing",
        option2: "Be unknown forever"
    },
    {
        option1: "Have telepathy",
        option2: "Have telekinesis"
    },
    {
        option1: "Live without music",
        option2: "Live without movies"
    }
];

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('would-you-rather')
        .setDescription('Get a would you rather question to discuss'),

    async execute(interaction: ChatInputCommandInteraction) {
        const client = interaction.client as BotClient;

        const randomQuestion = wouldYouRatherQuestions[Math.floor(Math.random() * wouldYouRatherQuestions.length)];

        if (!randomQuestion) {
            await interaction.reply({
                content: '❌ No would-you-rather questions available!',
                ephemeral: true,
            });
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle('🤔 Would You Rather?')
            .setDescription('Choose your option by clicking one of the buttons below!')
            .addFields(
                {
                    name: '🅰️ Option A',
                    value: randomQuestion.option1,
                    inline: false,
                },
                {
                    name: '🅱️ Option B',
                    value: randomQuestion.option2,
                    inline: false,
                }
            )

        await interaction.reply({ embeds: [embed] });

        // Add reaction buttons for voting
        const message = await interaction.fetchReply();
        await message.react('🅰️');
        await message.react('🅱️');

        client.logger.info(`Would you rather question by ${interaction.user.tag}`, {
            guildId: interaction.guildId,
            userId: interaction.user.id,
            questionIndex: wouldYouRatherQuestions.indexOf(randomQuestion),
        });
    },
};

export default command;