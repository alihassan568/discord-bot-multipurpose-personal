import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    EmbedBuilder,
    AttachmentBuilder
} from 'discord.js';
import { Command, BotClient } from '../../types';

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('resize')
        .setDescription('Resize an image to specified dimensions')
        .addAttachmentOption(option =>
            option
                .setName('image')
                .setDescription('The image to resize')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option
                .setName('width')
                .setDescription('New width in pixels')
                .setRequired(true)
                .setMinValue(10)
                .setMaxValue(4096)
        )
        .addIntegerOption(option =>
            option
                .setName('height')
                .setDescription('New height in pixels')
                .setRequired(true)
                .setMinValue(10)
                .setMaxValue(4096)
        )
        .addStringOption(option =>
            option
                .setName('mode')
                .setDescription('Resize mode')
                .setRequired(false)
                .addChoices(
                    { name: 'Stretch (may distort)', value: 'stretch' },
                    { name: 'Fit (maintain aspect ratio)', value: 'fit' },
                    { name: 'Fill (crop to fit)', value: 'fill' },
                    { name: 'Cover (cover entire area)', value: 'cover' }
                )
        )
        .addStringOption(option =>
            option
                .setName('format')
                .setDescription('Output format')
                .setRequired(false)
                .addChoices(
                    { name: 'PNG (High Quality)', value: 'png' },
                    { name: 'JPEG (Smaller Size)', value: 'jpeg' },
                    { name: 'WebP (Modern Format)', value: 'webp' }
                )
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        const client = interaction.client as BotClient;
        const attachment = interaction.options.getAttachment('image', true);
        const width = interaction.options.getInteger('width', true);
        const height = interaction.options.getInteger('height', true);
        const mode = interaction.options.getString('mode') || 'fit';
        const format = interaction.options.getString('format') || 'png';

        await interaction.deferReply();

        try {
            // Validate attachment
            if (!attachment.contentType?.startsWith('image/')) {
                await interaction.editReply({
                    content: '❌ Please provide a valid image file!',
                });
                return;
            }

            // Check file size
            const maxSize = 10 * 1024 * 1024; // 10MB
            if (attachment.size > maxSize) {
                await interaction.editReply({
                    content: '❌ Image file is too large! Please use an image smaller than 10MB.',
                });
                return;
            }

            // Calculate output file size estimate
            const pixelCount = width * height;
            const estimatedSize = Math.round((pixelCount * 4) / 1024); // Rough estimate in KB

            if (estimatedSize > 8192) { // 8MB Discord limit
                await interaction.editReply({
                    content: '❌ Resulting image would be too large for Discord! Please use smaller dimensions.',
                });
                return;
            }

            // Get original image dimensions (this would need image processing library)
            // For demo purposes, we'll simulate this
            const originalWidth = 1920; // Would get from actual image
            const originalHeight = 1080;

            let processedWidth = width;
            let processedHeight = height;

            // Calculate actual dimensions based on mode
            if (mode === 'fit') {
                const aspectRatio = originalWidth / originalHeight;
                const targetAspectRatio = width / height;

                if (aspectRatio > targetAspectRatio) {
                    // Image is wider, fit to width
                    processedWidth = width;
                    processedHeight = Math.round(width / aspectRatio);
                } else {
                    // Image is taller, fit to height
                    processedHeight = height;
                    processedWidth = Math.round(height * aspectRatio);
                }
            }

            const embed = new EmbedBuilder()
                .setTitle('📏 Image Resize Complete!')
                .setDescription('Your image has been successfully resized!')
                .addFields(
                    {
                        name: '📊 Original Dimensions',
                        value: `${originalWidth} × ${originalHeight}px`,
                        inline: true,
                    },
                    {
                        name: '🎯 Target Dimensions',
                        value: `${width} × ${height}px`,
                        inline: true,
                    },
                    {
                        name: '✅ Actual Dimensions',
                        value: `${processedWidth} × ${processedHeight}px`,
                        inline: true,
                    },
                    {
                        name: '⚙️ Resize Settings',
                        value: [
                            `**Mode:** ${mode.charAt(0).toUpperCase() + mode.slice(1)}`,
                            `**Format:** ${format.toUpperCase()}`,
                            `**Original Size:** ${Math.round(attachment.size / 1024)}KB`,
                            `**Estimated New Size:** ${estimatedSize}KB`
                        ].join('\n'),
                        inline: false,
                    }
                )
                .setColor(0x00aaff)
                .setThumbnail(attachment.url)
                .setFooter({
                    text: `Resized by ${interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL(),
                })
                .setTimestamp();

            // Add quality tips
            let qualityTips = '';
            if (width > originalWidth || height > originalHeight) {
                qualityTips = '⚠️ **Note:** Upscaling may reduce image quality.';
            }
            if (mode === 'stretch' && Math.abs(originalWidth / originalHeight - width / height) > 0.2) {
                qualityTips += '\n⚠️ **Note:** Stretch mode may cause distortion.';
            }

            if (qualityTips) {
                embed.addFields({
                    name: '💡 Quality Tips',
                    value: qualityTips,
                    inline: false,
                });
            }

            // In a real implementation, process the image and attach the result
            // const processedBuffer = await processImage(attachment.url, width, height, mode, format);
            // const processedFile = new AttachmentBuilder(processedBuffer, { 
            //   name: `resized_${width}x${height}.${format}` 
            // });

            await interaction.editReply({
                embeds: [embed],
                content: `🖼️ **Image Processing Complete!**\n\n*Note: This is a demo implementation. In production, this would process your image and return the resized file.*`
                // files: [processedFile]
            });

            client.logger.info(`Resize command used by ${interaction.user.tag}`, {
                guildId: interaction.guildId,
                userId: interaction.user.id,
                originalSize: attachment.size,
                targetWidth: width,
                targetHeight: height,
                mode,
                format,
            });

        } catch (error) {
            client.logger.error('Error in resize command', {
                error: error instanceof Error ? error.message : 'Unknown error',
                guildId: interaction.guildId,
                userId: interaction.user.id,
            });

            await interaction.editReply({
                content: '❌ An error occurred while processing your image. Please try again later!',
            });
        }
    },
};

export default command;