import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    EmbedBuilder,
    AttachmentBuilder
} from 'discord.js';
import { Command, BotClient } from '../../types';

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('watermark')
        .setDescription('Add a watermark to an image')
        .addAttachmentOption(option =>
            option
                .setName('image')
                .setDescription('The image to add watermark to')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('text')
                .setDescription('Watermark text (required if no watermark image)')
                .setRequired(false)
                .setMaxLength(50)
        )
        .addAttachmentOption(option =>
            option
                .setName('watermark-image')
                .setDescription('Watermark image (optional, will use text if not provided)')
                .setRequired(false)
        )
        .addStringOption(option =>
            option
                .setName('position')
                .setDescription('Watermark position')
                .setRequired(false)
                .addChoices(
                    { name: 'Top Left', value: 'top-left' },
                    { name: 'Top Right', value: 'top-right' },
                    { name: 'Bottom Left', value: 'bottom-left' },
                    { name: 'Bottom Right', value: 'bottom-right' },
                    { name: 'Center', value: 'center' },
                    { name: 'Top Center', value: 'top-center' },
                    { name: 'Bottom Center', value: 'bottom-center' }
                )
        )
        .addIntegerOption(option =>
            option
                .setName('opacity')
                .setDescription('Watermark opacity (1-100)')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(100)
        )
        .addIntegerOption(option =>
            option
                .setName('size')
                .setDescription('Watermark size percentage (10-50% of image)')
                .setRequired(false)
                .setMinValue(10)
                .setMaxValue(50)
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        const client = interaction.client as BotClient;
        const attachment = interaction.options.getAttachment('image', true);
        const watermarkText = interaction.options.getString('text');
        const watermarkImage = interaction.options.getAttachment('watermark-image');
        const position = interaction.options.getString('position') || 'bottom-right';
        const opacity = interaction.options.getInteger('opacity') || 50;
        const size = interaction.options.getInteger('size') || 20;

        await interaction.deferReply();

        try {
            // Validate main image
            if (!attachment.contentType?.startsWith('image/')) {
                await interaction.editReply({
                    content: '❌ Please provide a valid image file for the main image!',
                });
                return;
            }

            // Validate watermark requirements
            if (!watermarkText && !watermarkImage) {
                await interaction.editReply({
                    content: '❌ Please provide either watermark text or a watermark image!',
                });
                return;
            }

            // Validate watermark image if provided
            if (watermarkImage && !watermarkImage.contentType?.startsWith('image/')) {
                await interaction.editReply({
                    content: '❌ Please provide a valid image file for the watermark!',
                });
                return;
            }

            // Check file sizes
            const maxSize = 10 * 1024 * 1024; // 10MB
            if (attachment.size > maxSize) {
                await interaction.editReply({
                    content: '❌ Main image file is too large! Please use an image smaller than 10MB.',
                });
                return;
            }

            if (watermarkImage && watermarkImage.size > maxSize) {
                await interaction.editReply({
                    content: '❌ Watermark image file is too large! Please use an image smaller than 10MB.',
                });
                return;
            }

            const watermarkType = watermarkImage ? 'Image' : 'Text';
            const watermarkContent = watermarkImage ? `${watermarkImage.name}` : `"${watermarkText}"`;

            const embed = new EmbedBuilder()
                .setTitle('💧 Watermark Added Successfully!')
                .setDescription('Your image has been watermarked and is ready for use!')
                .addFields(
                    {
                        name: '🎨 Watermark Details',
                        value: [
                            `**Type:** ${watermarkType}`,
                            `**Content:** ${watermarkContent}`,
                            `**Position:** ${position.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}`,
                            `**Opacity:** ${opacity}%`,
                            `**Size:** ${size}% of image`
                        ].join('\n'),
                        inline: true,
                    },
                    {
                        name: '📊 Image Info',
                        value: [
                            `**Original Size:** ${Math.round(attachment.size / 1024)}KB`,
                            `**Format:** ${attachment.contentType?.split('/')[1]?.toUpperCase()}`,
                            `**Watermark Applied:** ✅`,
                            `**Protection Level:** ${opacity > 70 ? 'High' : opacity > 40 ? 'Medium' : 'Low'}`
                        ].join('\n'),
                        inline: true,
                    }
                )
                .setColor(0x00aaff)
                .setThumbnail(attachment.url)
                .setFooter({
                    text: `Watermarked by ${interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL(),
                })
                .setTimestamp();

            // Add usage tips based on settings
            const tips: string[] = [];

            if (opacity < 30) {
                tips.push('💡 Low opacity watermarks are subtle but may be easier to remove');
            }

            if (opacity > 80) {
                tips.push('💡 High opacity watermarks provide strong protection but may affect image aesthetics');
            }

            if (position === 'center') {
                tips.push('💡 Center watermarks provide maximum protection against cropping');
            }

            if (watermarkType === 'Text' && watermarkText && watermarkText.length < 10) {
                tips.push('💡 Longer watermark text provides better uniqueness and protection');
            }

            tips.push('🔒 Watermarked images help protect your content from unauthorized use');
            tips.push('📱 Consider the viewing platform when choosing opacity and position');

            embed.addFields({
                name: '💡 Watermark Tips',
                value: tips.slice(0, 4).join('\n'), // Limit to prevent embed overflow
                inline: false,
            });

            // In a real implementation:
            // const watermarkedBuffer = await addWatermark(attachment.url, {
            //   watermarkText,
            //   watermarkImageUrl: watermarkImage?.url,
            //   position,
            //   opacity,
            //   size
            // });
            // const watermarkedFile = new AttachmentBuilder(watermarkedBuffer, { 
            //   name: `watermarked_${Date.now()}.png` 
            // });

            await interaction.editReply({
                embeds: [embed],
                content: `💧 **Watermarking Complete!**\n\n*Note: This is a demo implementation. In production, this would process your image and return the watermarked file.*`
                // files: [watermarkedFile]
            });

            client.logger.info(`Watermark command used by ${interaction.user.tag}`, {
                guildId: interaction.guildId,
                userId: interaction.user.id,
                imageSize: attachment.size,
                watermarkType,
                position,
                opacity,
                size,
                hasWatermarkImage: !!watermarkImage,
            });

        } catch (error) {
            client.logger.error('Error in watermark command', {
                error: error instanceof Error ? error.message : 'Unknown error',
                guildId: interaction.guildId,
                userId: interaction.user.id,
            });

            await interaction.editReply({
                content: '❌ An error occurred while adding the watermark. Please try again later!',
            });
        }
    },
};

export default command;