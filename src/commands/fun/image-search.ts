import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} from 'discord.js';
import { Command, BotClient } from '../../types';

interface UnsplashImage {
    id: string;
    urls: {
        regular: string;
        small: string;
        thumb: string;
    };
    alt_description: string | null;
    description: string | null;
    user: {
        name: string;
        username: string;
    };
    width: number;
    height: number;
    color: string;
}

interface UnsplashResponse {
    results: UnsplashImage[];
    total: number;
    total_pages: number;
}

// Fallback images for when API is unavailable
const fallbackImages = [
    {
        url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4',
        description: 'Beautiful mountain landscape',
        photographer: 'Unsplash'
    },
    {
        url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e',
        description: 'Forest path in nature',
        photographer: 'Unsplash'
    },
    {
        url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4',
        description: 'Ocean waves at sunset',
        photographer: 'Unsplash'
    }
];

async function searchImages(query: string): Promise<UnsplashImage[]> {
    try {
        // Note: In a real implementation, you would need an Unsplash API key
        // For demonstration purposes, this will use fallback images
        const response = await fetch(
            `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=10&orientation=landscape`,
            {
                headers: {
                    'Authorization': 'Client-ID YOUR_UNSPLASH_ACCESS_KEY'
                }
            }
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json() as UnsplashResponse;
        return data.results || [];
    } catch (error) {
        console.error('Error fetching images:', error);
        return [];
    }
}

function createFallbackResult(query: string) {
    const fallback = fallbackImages[Math.floor(Math.random() * fallbackImages.length)];
    return {
        id: 'fallback',
        urls: {
            regular: fallback?.url || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4',
            small: fallback?.url || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4',
            thumb: fallback?.url || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4'
        },
        alt_description: fallback?.description || `Image related to ${query}`,
        description: null,
        user: {
            name: fallback?.photographer || 'Unsplash',
            username: 'unsplash'
        },
        width: 1920,
        height: 1080,
        color: '#000000'
    };
}

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('image-search')
        .setDescription('Search for high-quality images')
        .addStringOption(option =>
            option
                .setName('query')
                .setDescription('What to search for')
                .setRequired(true)
                .setMaxLength(100)
        )
        .addStringOption(option =>
            option
                .setName('category')
                .setDescription('Image category filter')
                .setRequired(false)
                .addChoices(
                    { name: 'Nature', value: 'nature' },
                    { name: 'Architecture', value: 'architecture' },
                    { name: 'Animals', value: 'animals' },
                    { name: 'Travel', value: 'travel' },
                    { name: 'Technology', value: 'technology' },
                    { name: 'Food', value: 'food' },
                    { name: 'Abstract', value: 'abstract' },
                    { name: 'People', value: 'people' }
                )
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        const client = interaction.client as BotClient;
        const query = interaction.options.getString('query', true);
        const category = interaction.options.getString('category');

        // Combine query and category if both provided
        const searchQuery = category ? `${query} ${category}` : query;

        // Content filter for inappropriate searches
        const inappropriateWords = ['nsfw', 'nude', 'explicit', 'adult', 'porn'];
        if (inappropriateWords.some(word => searchQuery.toLowerCase().includes(word))) {
            await interaction.reply({
                content: '❌ Please keep your search queries appropriate for all audiences!',
                ephemeral: true,
            });
            return;
        }

        await interaction.deferReply();

        try {
            let images = await searchImages(searchQuery);

            // If no results or API fails, use fallback
            if (images.length === 0) {
                images = [createFallbackResult(searchQuery)];
            }

            const currentIndex = 0;
            const currentImage = images[currentIndex];

            if (!currentImage) {
                await interaction.editReply({
                    content: '❌ No images found for your search query. Please try a different search term!',
                });
                return;
            }

            // Create navigation buttons if multiple results
            const components = [];
            if (images.length > 1) {
                const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`image_prev_${interaction.user.id}`)
                        .setLabel('◀️ Previous')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(true), // First image, so previous is disabled
                    new ButtonBuilder()
                        .setCustomId(`image_next_${interaction.user.id}`)
                        .setLabel('▶️ Next')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(images.length <= 1),
                    new ButtonBuilder()
                        .setCustomId(`image_info_${interaction.user.id}`)
                        .setLabel('ℹ️ Info')
                        .setStyle(ButtonStyle.Primary)
                );
                components.push(row);
            }

            const embed = new EmbedBuilder()
                .setTitle(`🖼️ Image Search: "${query}"`)
                .setImage(currentImage.urls.regular)
                .setColor(parseInt(currentImage.color.replace('#', ''), 16) || 0x00aaff)
                .addFields(
                    {
                        name: '📸 Photographer',
                        value: currentImage.user.name,
                        inline: true,
                    },
                    {
                        name: '📊 Results',
                        value: `${currentIndex + 1} of ${images.length}`,
                        inline: true,
                    }
                )
                .setFooter({
                    text: `Requested by ${interaction.user.tag} • Powered by Unsplash`,
                    iconURL: interaction.user.displayAvatarURL(),
                })
                .setTimestamp();

            if (currentImage.alt_description || currentImage.description) {
                embed.setDescription(currentImage.alt_description || currentImage.description || '');
            }

            const reply = await interaction.editReply({
                embeds: [embed],
                components
            });

            if (images.length > 1) {
                // Set up collector for navigation
                const filter = (i: any) =>
                    i.customId.startsWith('image_') &&
                    i.user.id === interaction.user.id;

                const collector = reply.createMessageComponentCollector({
                    filter,
                    time: 300000, // 5 minutes
                });

                let imageIndex = 0;

                collector.on('collect', async (buttonInteraction) => {
                    const action = buttonInteraction.customId.split('_')[1];

                    if (action === 'prev' && imageIndex > 0) {
                        imageIndex--;
                    } else if (action === 'next' && imageIndex < images.length - 1) {
                        imageIndex++;
                    } else if (action === 'info') {
                        const image = images[imageIndex];
                        const infoEmbed = new EmbedBuilder()
                            .setTitle('🔍 Image Details')
                            .addFields(
                                {
                                    name: '📸 Photographer',
                                    value: `${image?.user.name} (@${image?.user.username})`,
                                    inline: true,
                                },
                                {
                                    name: '📏 Dimensions',
                                    value: `${image?.width} × ${image?.height}`,
                                    inline: true,
                                },
                                {
                                    name: '🎨 Dominant Color',
                                    value: image?.color || '#000000',
                                    inline: true,
                                }
                            )
                            .setColor(0x00aaff)
                            .setTimestamp();

                        if (image?.description || image?.alt_description) {
                            infoEmbed.setDescription(image.description || image.alt_description || 'No description available');
                        }

                        await buttonInteraction.reply({
                            embeds: [infoEmbed],
                            ephemeral: true
                        });
                        return;
                    }

                    const updatedImage = images[imageIndex];
                    if (!updatedImage) return;

                    const updatedEmbed = new EmbedBuilder()
                        .setTitle(`🖼️ Image Search: "${query}"`)
                        .setImage(updatedImage.urls.regular)
                        .setColor(parseInt(updatedImage.color.replace('#', ''), 16) || 0x00aaff)
                        .addFields(
                            {
                                name: '📸 Photographer',
                                value: updatedImage.user.name,
                                inline: true,
                            },
                            {
                                name: '📊 Results',
                                value: `${imageIndex + 1} of ${images.length}`,
                                inline: true,
                            }
                        )
                        .setFooter({
                            text: `Requested by ${interaction.user.tag} • Powered by Unsplash`,
                            iconURL: interaction.user.displayAvatarURL(),
                        })
                        .setTimestamp();

                    if (updatedImage.alt_description || updatedImage.description) {
                        updatedEmbed.setDescription(updatedImage.alt_description || updatedImage.description || '');
                    }

                    const updatedRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
                        new ButtonBuilder()
                            .setCustomId(`image_prev_${interaction.user.id}`)
                            .setLabel('◀️ Previous')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(imageIndex === 0),
                        new ButtonBuilder()
                            .setCustomId(`image_next_${interaction.user.id}`)
                            .setLabel('▶️ Next')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(imageIndex === images.length - 1),
                        new ButtonBuilder()
                            .setCustomId(`image_info_${interaction.user.id}`)
                            .setLabel('ℹ️ Info')
                            .setStyle(ButtonStyle.Primary)
                    );

                    await buttonInteraction.update({
                        embeds: [updatedEmbed],
                        components: [updatedRow]
                    });
                });

                collector.on('end', async () => {
                    try {
                        await interaction.editReply({
                            components: []
                        });
                    } catch (error) {
                        // Interaction might have been deleted
                    }
                });
            }

            client.logger.info(`Image search by ${interaction.user.tag}`, {
                guildId: interaction.guildId,
                userId: interaction.user.id,
                query: searchQuery,
                resultsCount: images.length,
            });

        } catch (error) {
            client.logger.error('Error in image-search command', {
                error: error instanceof Error ? error.message : 'Unknown error',
                guildId: interaction.guildId,
                userId: interaction.user.id,
                query: searchQuery,
            });

            await interaction.editReply({
                content: '❌ An error occurred while searching for images. Please try again later!',
            });
        }
    },
};

export default command;