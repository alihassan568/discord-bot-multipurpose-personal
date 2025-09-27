import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Command, BotClient } from '../../types';

const dadJokes = [
    "Why don't scientists trust atoms? Because they make up everything!",
    "I told my wife she was drawing her eyebrows too high. She looked surprised.",
    "What do you call a fake noodle? An impasta!",
    "Why did the scarecrow win an award? He was outstanding in his field!",
    "I made a pencil with two erasers. It was pointless.",
    "What do you call a bear with no teeth? A gummy bear!",
    "Why don't eggs tell jokes? They'd crack each other up!",
    "What's the best thing about Switzerland? I don't know, but the flag is a big plus.",
    "I'm reading a book about anti-gravity. It's impossible to put down!",
    "Did you hear about the mathematician who's afraid of negative numbers? He'll stop at nothing to avoid them!",
    "Why do we tell actors to 'break a leg?' Because every play has a cast!",
    "I used to hate facial hair, but then it grew on me.",
    "What did the ocean say to the beach? Nothing, it just waved.",
    "Why don't skeletons fight each other? They don't have the guts.",
    "What do you call a sleeping bull? A bulldozer!",
    "I only know 25 letters of the alphabet. I don't know Y.",
    "What's orange and sounds like a parrot? A carrot!",
    "Why did the coffee file a police report? It got mugged!",
    "How do you organize a space party? You planet!",
    "What do you call a fish wearing a crown? A king fish!"
];

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('dadjoke')
        .setDescription('Get a random dad joke'),

    async execute(interaction: ChatInputCommandInteraction) {
        const client = interaction.client as BotClient;

        const randomJoke = dadJokes[Math.floor(Math.random() * dadJokes.length)] || "Why don't scientists trust atoms? Because they make up everything!";

        const embed = new EmbedBuilder()
            .setTitle('😂 Dad Joke')
            .setDescription(randomJoke)
            .setColor(0xffaa00)
            .setFooter({
                text: `Requested by ${interaction.user.tag} • Joke ${Math.floor(Math.random() * 999) + 1}`,
                iconURL: interaction.user.displayAvatarURL(),
            })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });

        client.logger.info(`Dad joke requested by ${interaction.user.tag}`, {
            guildId: interaction.guildId,
            userId: interaction.user.id,
            joke: randomJoke.substring(0, 100), // Log first 100 chars
        });
    },
};

export default command;