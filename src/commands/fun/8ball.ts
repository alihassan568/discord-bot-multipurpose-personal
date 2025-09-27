import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Command } from '../../types';
import { randomElement } from '../../utils/helpers';

const responses = [
    // Positive responses
    "🟢 It is certain",
    "🟢 It is decidedly so",
    "🟢 Without a doubt",
    "🟢 Yes definitely",
    "🟢 You may rely on it",
    "🟢 As I see it, yes",
    "🟢 Most likely",
    "🟢 Outlook good",
    "🟢 Yes",
    "🟢 Signs point to yes",

    // Neutral responses
    "🟡 Reply hazy, try again",
    "🟡 Ask again later",
    "🟡 Better not tell you now",
    "🟡 Cannot predict now",
    "🟡 Concentrate and ask again",

    // Negative responses
    "🔴 Don't count on it",
    "🔴 My reply is no",
    "🔴 My sources say no",
    "🔴 Outlook not so good",
    "🔴 Very doubtful",
];

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('8ball')
        .setDescription('Ask the magic 8-ball a question')
        .addStringOption(option =>
            option
                .setName('question')
                .setDescription('Your question for the magic 8-ball')
                .setRequired(true)
                .setMaxLength(200)
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        const question = interaction.options.getString('question', true);
        const answer = randomElement(responses);

        // Determine embed color based on answer type
        let color = 0x36393f; // Default gray
        if (answer.includes('🟢')) color = 0x00ff00; // Green for positive
        else if (answer.includes('🟡')) color = 0xffff00; // Yellow for neutral  
        else if (answer.includes('🔴')) color = 0xff0000; // Red for negative

        const embed = new EmbedBuilder()
            .setTitle('🎱 Magic 8-Ball')
            .setColor(color)
            .addFields([
                {
                    name: '❓ Question',
                    value: question,
                    inline: false,
                },
                {
                    name: '💫 Answer',
                    value: answer,
                    inline: false,
                },
            ])
            .setFooter({
                text: `Asked by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL(),
            })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};

export default command;