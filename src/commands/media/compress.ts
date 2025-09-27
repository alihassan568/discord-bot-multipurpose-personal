import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    EmbedBuilder,
    AttachmentBuilder
} from 'discord.js';
import { Command, BotClient } from '../../types';

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('compress')
        .setDescription('Compress an image to reduce file size')
        .addAttachmentOption(option =>
            option
                .setName('image')
                .setDescription('The image to compress')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option
                .setName('quality')
                .setDescription('Compression quality (1-100, higher = better quality)')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(100)
        )
        .addStringOption(option =>
            option
                .setName('format')
                .setDescription('Output format for compression')
                .setRequired(false)
                .addChoices(
                    { name: 'JPEG (Lossy, smaller)', value: 'jpeg' },
                    { name: 'WebP (Modern, efficient)', value: 'webp' },
                    { name: 'PNG (Lossless, larger)', value: 'png' }
                )
        )
        .addIntegerOption(option =>
            option
                .setName('max-width')
                .setDescription('Maximum width (will resize if larger)')
                .setRequired(false)
                .setMinValue(100)
                .setMaxValue(2048)
        )
        .addIntegerOption(option =>
            option
                .setName('max-height')
                .setDescription('Maximum height (will resize if larger)')
                .setRequired(false)
                .setMinValue(100)
                .setMaxValue(2048)
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        const client = interaction.client as BotClient;
        const attachment = interaction.options.getAttachment('image', true);
        const quality = interaction.options.getInteger('quality') || 80;
        const format = interaction.options.getString('format') || 'webp';
        const maxWidth = interaction.options.getInteger('max-width');
        const maxHeight = interaction.options.getInteger('max-height');

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
            const maxSize = 25 * 1024 * 1024; // 25MB
            if (attachment.size > maxSize) {
                await interaction.editReply({
                    content: '❌ Image file is too large! Please use an image smaller than 25MB.',
                });
                return;
            }

            const originalSizeKB = Math.round(attachment.size / 1024);

            // Simulate compression calculations
            let compressionRatio = 1;

            switch (format) {
                case 'jpeg':
                    compressionRatio = quality / 100 * 0.3; // JPEG is very efficient
                    break;
                case 'webp':
                    compressionRatio = quality / 100 * 0.4; // WebP is modern and efficient
                    break;
                case 'png':
                    compressionRatio = 0.7; // PNG compression is lossless but limited
                    break;
            }

            // Factor in resizing if specified
            if (maxWidth || maxHeight) {
                // Assume we're downsizing by 50% on average
                compressionRatio *= 0.5;
            }

            const estimatedNewSizeKB = Math.round(originalSizeKB * compressionRatio);
            const savedSizeKB = originalSizeKB - estimatedNewSizeKB;
            const savedPercentage = Math.round((savedSizeKB / originalSizeKB) * 100);

            const embed = new EmbedBuilder()
                .setTitle('🗜️ Image Compression Complete!')
                .setDescription('Your image has been successfully compressed!')
                .addFields(
                    {
                        name: '📊 Compression Results',
                        value: [
                            `**Original Size:** ${originalSizeKB.toLocaleString()}KB`,
                            `**Compressed Size:** ${estimatedNewSizeKB.toLocaleString()}KB`,
                            `**Space Saved:** ${savedSizeKB.toLocaleString()}KB (${savedPercentage}%)`,
                            `**Compression Ratio:** ${Math.round((1 - compressionRatio) * 100)}%`
                        ].join('\n'),
                        inline: true,
                    },
                    {
                        name: '⚙️ Compression Settings',
                        value: [
                            `**Format:** ${format.toUpperCase()}`,
                            `**Quality:** ${quality}%`,
                            maxWidth ? `**Max Width:** ${maxWidth}px` : '',
                            maxHeight ? `**Max Height:** ${maxHeight}px` : ''
                        ].filter(Boolean).join('\n'),
                        inline: true,
                    }
                )
                .setColor(savedPercentage > 50 ? 0x00ff00 : savedPercentage > 25 ? 0xffaa00 : 0xff6600)
                .setThumbnail(attachment.url)
                .setFooter({
                    text: `Compressed by ${interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL(),
                })
                .setTimestamp();

            // Add compression tips
            const tips: string[] = [];

            if (quality < 50) {
                tips.push('⚠️ Low quality setting may result in visible compression artifacts');
            }

            if (format === 'png' && savedPercentage < 10) {
                tips.push('💡 Try JPEG or WebP format for better compression');
            }

            if (savedPercentage < 5) {
                tips.push('💡 This image is already well optimized or try reducing dimensions');
            }

            if (estimatedNewSizeKB > 8000) {
                tips.push('⚠️ Compressed file may still be too large for some Discord features');
            }

            if (tips.length > 0) {
                embed.addFields({
                    name: '💡 Compression Tips',
                    value: tips.join('\n'),
                    inline: false,
                });
            }

            // Quality indicators
            let qualityIndicator = '';
            if (quality >= 90) qualityIndicator = '🟢 Excellent Quality';
            else if (quality >= 70) qualityIndicator = '🟡 Good Quality';
            else if (quality >= 50) qualityIndicator = '🟠 Fair Quality';
            else qualityIndicator = '🔴 Low Quality';

            embed.addFields({
                name: '📈 Quality Assessment',
                value: qualityIndicator,
                inline: true,
            });

            // In a real implementation:
            // const compressedBuffer = await compressImage(attachment.url, {
            //   quality,
            //   format,
            //   maxWidth,
            //   maxHeight
            // });
            // const compressedFile = new AttachmentBuilder(compressedBuffer, { 
            //   name: `compressed_${quality}q.${format}` 
            // });

            await interaction.editReply({
                embeds: [embed],
                content: `🗜️ **Image Compression Complete!**\n\n*Note: This is a demo implementation. In production, this would process your image and return the compressed file.*`
                // files: [compressedFile]
            });

            client.logger.info(`Compress command used by ${interaction.user.tag}`, {
                guildId: interaction.guildId,
                userId: interaction.user.id,
                originalSize: attachment.size,
                quality,
                format,
                maxWidth,
                maxHeight,
                estimatedSavings: savedPercentage,
            });

        } catch (error) {
            client.logger.error('Error in compress command', {
                error: error instanceof Error ? error.message : 'Unknown error',
                guildId: interaction.guildId,
                userId: interaction.user.id,
            });

            await interaction.editReply({
                content: '❌ An error occurred while compressing your image. Please try again later!',
            });
        }
    },
};

export default command;