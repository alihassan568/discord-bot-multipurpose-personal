import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    EmbedBuilder,
    AttachmentBuilder
} from 'discord.js';
import { Command, BotClient } from '../../types';

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('stickerify')
        .setDescription('Convert an image to a sticker format')
        .addAttachmentOption(option =>
            option
                .setName('image')
                .setDescription('The image to convert to sticker format')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('name')
                .setDescription('Name for the sticker')
                .setRequired(false)
                .setMaxLength(30)
        )
        .addStringOption(option =>
            option
                .setName('format')
                .setDescription('Output format for the sticker')
                .setRequired(false)
                .addChoices(
                    { name: 'PNG (Transparent)', value: 'png' },
                    { name: 'WebP (Smaller file)', value: 'webp' },
                    { name: 'GIF (Animated)', value: 'gif' }
                )
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        const client = interaction.client as BotClient;
        const attachment = interaction.options.getAttachment('image', true);
        const stickerName = interaction.options.getString('name') || 'Custom Sticker';
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

            // Check file size (Discord limit is 8MB, but we'll be more conservative)
            const maxSize = 5 * 1024 * 1024; // 5MB
            if (attachment.size > maxSize) {
                await interaction.editReply({
                    content: '❌ Image file is too large! Please use an image smaller than 5MB.',
                });
                return;
            }

            // In a real implementation, you would:
            // 1. Download the image from attachment.url
            // 2. Process it with image manipulation library (like Sharp or Canvas)
            // 3. Resize to sticker dimensions (320x320 max)
            // 4. Convert to desired format
            // 5. Return the processed image

            // For demonstration, we'll create a mock response
            const embed = new EmbedBuilder()
                .setTitle('🏷️ Sticker Created Successfully!')
                .setDescription(`Your image has been converted to a sticker format!`)
                .addFields(
                    {
                        name: '📝 Sticker Details',
                        value: [
                            `**Name:** ${stickerName}`,
                            `**Format:** ${format.toUpperCase()}`,
                            `**Original Size:** ${Math.round(attachment.size / 1024)}KB`,
                            `**Dimensions:** Auto-resized to fit sticker requirements`
                        ].join('\n'),
                        inline: true,
                    },
                    {
                        name: '💡 How to Use',
                        value: [
                            '1. Download the sticker file below',
                            '2. Go to Server Settings > Stickers',
                            '3. Upload your new sticker',
                            '4. Use it in chat with the sticker picker!'
                        ].join('\n'),
                        inline: true,
                    }
                )
                .setColor(0x00ff00)
                .setThumbnail(attachment.url)
                .setFooter({
                    text: `Created by ${interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL(),
                })
                .setTimestamp();

            // In a real implementation, attach the processed file
            // const processedFile = new AttachmentBuilder(buffer, { name: `${stickerName}.${format}` });

            await interaction.editReply({
                embeds: [embed],
                content: `🎨 **Sticker Processing Complete!**\n\n*Note: This is a demo implementation. In production, this would process your image and return a sticker-ready file.*`
                // files: [processedFile]
            });

            client.logger.info(`Stickerify command used by ${interaction.user.tag}`, {
                guildId: interaction.guildId,
                userId: interaction.user.id,
                originalSize: attachment.size,
                format,
                stickerName,
            });

        } catch (error) {
            client.logger.error('Error in stickerify command', {
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