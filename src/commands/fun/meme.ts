import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    EmbedBuilder
} from 'discord.js';
import { Command, BotClient } from '../../types';

interface MemeResponse {
    postLink: string;
    subreddit: string;
    title: string;
    url: string;
    nsfw: boolean;
    spoiler: boolean;
    author: string;
    ups: number;
}

const memeSubreddits = [
    'memes',
    'dankmemes',
    'wholesomememes',
    'programmerhumor',
    'prequelmemes',
    'funny',
    'me_irl',
    'memeeconomy',
    'historymemes',
    'animemes'
];

const fallbackMemes = [
    {
        title: "When you finally fix a bug that's been haunting you for hours",
        url: "https://i.imgflip.com/2/1bij.jpg",
        subreddit: "programmerhumor",
        author: "BotMemes",
        ups: 420
    },
    {
        title: "Me explaining my code to my rubber duck",
        url: "https://i.imgflip.com/2/5c7lwq.jpg",
        subreddit: "programmerhumor",
        author: "BotMemes",
        ups: 1337
    },
    {
        title: "It's not a bug, it's a feature",
        url: "https://i.imgflip.com/2/4t0m5.jpg",
        subreddit: "programmerhumor",
        author: "BotMemes",
        ups: 666
    }
];

async function fetchMeme(subreddit?: string): Promise<MemeResponse | null> {
    try {
        const targetSubreddit = subreddit || memeSubreddits[Math.floor(Math.random() * memeSubreddits.length)];
        const response = await fetch(`https://meme-api.herokuapp.com/gimme/${targetSubreddit}`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json() as MemeResponse;

        // Validate the response has required fields
        if (!data.url || !data.title) {
            throw new Error('Invalid meme data received');
        }

        return data;
    } catch (error) {
        console.error('Error fetching meme:', error);
        return null;
    }
}

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('meme')
        .setDescription('Get a random meme')
        .addStringOption(option =>
            option
                .setName('subreddit')
                .setDescription('Choose a specific subreddit for memes')
                .setRequired(false)
                .addChoices(
                    { name: 'General Memes', value: 'memes' },
                    { name: 'Dank Memes', value: 'dankmemes' },
                    { name: 'Wholesome Memes', value: 'wholesomememes' },
                    { name: 'Programming Humor', value: 'programmerhumor' },
                    { name: 'Prequel Memes', value: 'prequelmemes' },
                    { name: 'Funny', value: 'funny' },
                    { name: 'Me IRL', value: 'me_irl' },
                    { name: 'History Memes', value: 'historymemes' }
                )
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        const client = interaction.client as BotClient;
        const subreddit = interaction.options.getString('subreddit');

        await interaction.deferReply();

        try {
            let memeData = await fetchMeme(subreddit || undefined);

            // If API fails, use fallback memes
            if (!memeData) {
                const fallbackMeme = fallbackMemes[Math.floor(Math.random() * fallbackMemes.length)];
                if (!fallbackMeme) {
                    await interaction.editReply({
                        content: '❌ Sorry, I couldn\'t fetch a meme right now. Please try again later!',
                    });
                    return;
                }
                memeData = {
                    ...fallbackMeme,
                    postLink: '',
                    nsfw: false,
                    spoiler: false
                };
            }

            // Check if meme is NSFW and warn if needed
            if (memeData.nsfw) {
                const embed = new EmbedBuilder()
                    .setTitle('⚠️ NSFW Content Warning')
                    .setDescription('This meme contains NSFW content. Please use this command in an appropriate channel.')
                    .setColor(0xff6b00)
                    .setTimestamp();

                await interaction.editReply({ embeds: [embed] });
                return;
            }

            const embed = new EmbedBuilder()
                .setTitle(memeData.title.length > 256 ? memeData.title.substring(0, 253) + '...' : memeData.title)
                .setImage(memeData.url)
                .setColor(0x00aaff)
                .addFields(
                    {
                        name: '📱 Subreddit',
                        value: `r/${memeData.subreddit}`,
                        inline: true,
                    },
                    {
                        name: '👤 Author',
                        value: `u/${memeData.author}`,
                        inline: true,
                    },
                    {
                        name: '⬆️ Upvotes',
                        value: memeData.ups.toLocaleString(),
                        inline: true,
                    }
                )
                .setFooter({
                    text: `Requested by ${interaction.user.tag} • Powered by Reddit`,
                    iconURL: interaction.user.displayAvatarURL(),
                })
                .setTimestamp();

            // Add Reddit link if available
            if ('postLink' in memeData && memeData.postLink) {
                embed.setURL(memeData.postLink);
            }

            await interaction.editReply({ embeds: [embed] });

            client.logger.info(`Meme requested by ${interaction.user.tag}`, {
                guildId: interaction.guildId,
                userId: interaction.user.id,
                subreddit: memeData.subreddit,
                title: memeData.title.substring(0, 100),
            });

        } catch (error) {
            client.logger.error('Error in meme command', {
                error: error instanceof Error ? error.message : 'Unknown error',
                guildId: interaction.guildId,
                userId: interaction.user.id,
            });

            await interaction.editReply({
                content: '❌ An error occurred while fetching a meme. Please try again later!',
            });
        }
    },
};

export default command;