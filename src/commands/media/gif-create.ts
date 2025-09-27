import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    EmbedBuilder,
    AttachmentBuilder
} from 'discord.js';
import { Command, BotClient } from '../../types';

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('gif-create')
        .setDescription('Create a GIF from multiple images or extract frames from a video')
        .addSubcommand(subcommand =>
            subcommand
                .setName('from-images')
                .setDescription('Create a GIF from multiple images')
                .addAttachmentOption(option =>
                    option
                        .setName('image1')
                        .setDescription('First image for the GIF')
                        .setRequired(true)
                )
                .addAttachmentOption(option =>
                    option
                        .setName('image2')
                        .setDescription('Second image for the GIF')
                        .setRequired(true)
                )
                .addAttachmentOption(option =>
                    option
                        .setName('image3')
                        .setDescription('Third image for the GIF (optional)')
                        .setRequired(false)
                )
                .addAttachmentOption(option =>
                    option
                        .setName('image4')
                        .setDescription('Fourth image for the GIF (optional)')
                        .setRequired(false)
                )
                .addAttachmentOption(option =>
                    option
                        .setName('image5')
                        .setDescription('Fifth image for the GIF (optional)')
                        .setRequired(false)
                )
                .addIntegerOption(option =>
                    option
                        .setName('delay')
                        .setDescription('Delay between frames in milliseconds (100-5000)')
                        .setRequired(false)
                        .setMinValue(100)
                        .setMaxValue(5000)
                )
                .addBooleanOption(option =>
                    option
                        .setName('loop')
                        .setDescription('Whether the GIF should loop (default: true)')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('from-video')
                .setDescription('Extract frames from a video to create a GIF')
                .addAttachmentOption(option =>
                    option
                        .setName('video')
                        .setDescription('Video file to convert to GIF')
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option
                        .setName('start-time')
                        .setDescription('Start time in seconds (default: 0)')
                        .setRequired(false)
                        .setMinValue(0)
                        .setMaxValue(300)
                )
                .addIntegerOption(option =>
                    option
                        .setName('duration')
                        .setDescription('Duration in seconds (default: 3, max: 10)')
                        .setRequired(false)
                        .setMinValue(1)
                        .setMaxValue(10)
                )
                .addIntegerOption(option =>
                    option
                        .setName('fps')
                        .setDescription('Frames per second (1-15, default: 10)')
                        .setRequired(false)
                        .setMinValue(1)
                        .setMaxValue(15)
                )
                .addIntegerOption(option =>
                    option
                        .setName('width')
                        .setDescription('Output width in pixels (max: 800)')
                        .setRequired(false)
                        .setMinValue(100)
                        .setMaxValue(800)
                )
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        const client = interaction.client as BotClient;
        const subcommand = interaction.options.getSubcommand();

        await interaction.deferReply();

        try {
            let embed: EmbedBuilder = new EmbedBuilder().setColor(0x7289da).setTitle('GIF Creation');
            let logData: any = {};

            // Declare variables that will be used in logging
            let images: any[] = [];
            let video: any = null;
            let delay = 0;
            let loop = false;
            let startTime = 0;
            let duration = 0;
            let fps = 0;
            let width = 0;

            if (subcommand === 'from-images') {
                // Get all provided images
                images = [];
                for (let i = 1; i <= 5; i++) {
                    const image = interaction.options.getAttachment(`image${i}`);
                    if (image) {
                        // Validate image
                        if (!image.contentType?.startsWith('image/')) {
                            await interaction.editReply({
                                content: `❌ File ${i} is not a valid image!`,
                            });
                            return;
                        }
                        images.push(image);
                    }
                }

                if (images.length < 2) {
                    await interaction.editReply({
                        content: '❌ You need at least 2 images to create a GIF!',
                    });
                    return;
                }

                delay = interaction.options.getInteger('delay') || 500;
                loop = interaction.options.getBoolean('loop') ?? true;

                // Check total file size
                const totalSize = images.reduce((sum, img) => sum + img.size, 0);
                const maxTotalSize = 50 * 1024 * 1024; // 50MB total

                if (totalSize > maxTotalSize) {
                    await interaction.editReply({
                        content: '❌ Total image size is too large! Please use smaller images.',
                    });
                    return;
                }

                const totalDuration = (images.length * delay) / 1000;
                const estimatedFPS = 1000 / delay;

                embed = new EmbedBuilder()
                    .setTitle('🎬 GIF Created from Images!')
                    .setDescription('Your animated GIF has been successfully created!')
                    .addFields(
                        {
                            name: '📊 GIF Properties',
                            value: [
                                `**Frames:** ${images.length}`,
                                `**Frame Delay:** ${delay}ms`,
                                `**Total Duration:** ${totalDuration.toFixed(1)}s`,
                                `**Effective FPS:** ${estimatedFPS.toFixed(1)}`,
                                `**Loops:** ${loop ? 'Yes' : 'No'}`
                            ].join('\n'),
                            inline: true,
                        },
                        {
                            name: '🖼️ Source Images',
                            value: [
                                `**Images Used:** ${images.length}`,
                                `**Total Input Size:** ${Math.round(totalSize / 1024)}KB`,
                                `**Estimated GIF Size:** ${Math.round(totalSize * 0.7 / 1024)}KB`,
                                `**Quality:** High`
                            ].join('\n'),
                            inline: true,
                        }
                    )
                    .setColor(0x00ff00)
                    .setFooter({
                        text: `Created by ${interaction.user.tag}`,
                        iconURL: interaction.user.displayAvatarURL(),
                    })
                    .setTimestamp();

                // Add optimization tips
                const tips: string[] = [];

                if (delay < 200) {
                    tips.push('⚡ Fast animation - may appear choppy on slower devices');
                }

                if (delay > 1000) {
                    tips.push('🐌 Slow animation - consider reducing delay for smoother playback');
                }

                if (images.length > 10) {
                    tips.push('📹 Many frames - resulting GIF may be large');
                }

                if (estimatedFPS > 12) {
                    tips.push('💡 High frame rate - consider increasing delay to reduce file size');
                }

                if (tips.length > 0) {
                    embed.addFields({
                        name: '💡 Optimization Tips',
                        value: tips.join('\n'),
                        inline: false,
                    });
                }

                logData = {
                    imageCount: images.length,
                    delay,
                    loop
                };

            } else if (subcommand === 'from-video') {
                video = interaction.options.getAttachment('video', true);
                startTime = interaction.options.getInteger('start-time') || 0;
                duration = interaction.options.getInteger('duration') || 3;
                fps = interaction.options.getInteger('fps') || 10;
                width = interaction.options.getInteger('width') || 480;

                // Validate video file
                if (!video.contentType?.startsWith('video/')) {
                    await interaction.editReply({
                        content: '❌ Please provide a valid video file!',
                    });
                    return;
                }

                // Check file size
                const maxSize = 100 * 1024 * 1024; // 100MB
                if (video.size > maxSize) {
                    await interaction.editReply({
                        content: '❌ Video file is too large! Please use a video smaller than 100MB.',
                    });
                    return;
                }

                const totalFrames = duration * fps;
                const height = Math.round(width * 0.75); // Assume 4:3 aspect ratio
                const estimatedSize = Math.round((totalFrames * width * height * 0.8) / 1024); // Rough estimate

                if (estimatedSize > 8192) { // 8MB Discord limit
                    await interaction.editReply({
                        content: '❌ Resulting GIF would be too large! Try reducing duration, FPS, or dimensions.',
                    });
                    return;
                }

                embed = new EmbedBuilder()
                    .setTitle('🎥 GIF Created from Video!')
                    .setDescription('Your video has been successfully converted to an animated GIF!')
                    .addFields(
                        {
                            name: '📹 Video Settings',
                            value: [
                                `**Start Time:** ${startTime}s`,
                                `**Duration:** ${duration}s`,
                                `**Frame Rate:** ${fps} FPS`,
                                `**Output Size:** ${width}×${height}px`
                            ].join('\n'),
                            inline: true,
                        },
                        {
                            name: '🎬 GIF Properties',
                            value: [
                                `**Total Frames:** ${totalFrames}`,
                                `**Original Size:** ${Math.round(video.size / 1024)}KB`,
                                `**Estimated GIF Size:** ${estimatedSize}KB`,
                                `**Compression:** ~${Math.round((1 - estimatedSize / (video.size / 1024)) * 100)}%`
                            ].join('\n'),
                            inline: true,
                        }
                    )
                    .setColor(0x00aaff)
                    .setThumbnail(video.url)
                    .setFooter({
                        text: `Converted by ${interaction.user.tag}`,
                        iconURL: interaction.user.displayAvatarURL(),
                    })
                    .setTimestamp();

                // Add conversion tips
                const tips: string[] = [];

                if (fps > 12) {
                    tips.push('💡 High FPS may result in large file sizes');
                }

                if (duration > 5) {
                    tips.push('💡 Long GIFs may be large - consider shorter clips');
                }

                if (width > 600) {
                    tips.push('💡 Large dimensions increase file size significantly');
                }

                tips.push('🎯 GIFs work best for short, looping animations');
                tips.push('📱 Consider mobile users when choosing dimensions and duration');

                embed.addFields({
                    name: '💡 Conversion Tips',
                    value: tips.slice(0, 3).join('\n'),
                    inline: false,
                });

                logData = {
                    videoSize: video.size,
                    startTime,
                    duration,
                    fps,
                    width
                };
            }

            // In a real implementation:
            // if (subcommand === 'from-images') {
            //   const gifBuffer = await createGifFromImages(images.map(img => img.url), { delay, loop });
            // } else {
            //   const gifBuffer = await createGifFromVideo(video.url, { startTime, duration, fps, width });
            // }
            // const gifFile = new AttachmentBuilder(gifBuffer, { name: `animated_${Date.now()}.gif` });

            await interaction.editReply({
                embeds: [embed],
                content: `🎬 **GIF Creation Complete!**\n\n*Note: This is a demo implementation. In production, this would process your media and return the animated GIF file.*`
                // files: [gifFile]
            });

            client.logger.info(`GIF create command used by ${interaction.user.tag}`, {
                guildId: interaction.guildId,
                userId: interaction.user.id,
                subcommand,
                ...(subcommand === 'from-images' ? {
                    imageCount: images.length,
                    delay,
                    loop
                } : {
                    videoSize: video.size,
                    startTime,
                    duration,
                    fps,
                    width
                })
            });

        } catch (error) {
            client.logger.error('Error in gif-create command', {
                error: error instanceof Error ? error.message : 'Unknown error',
                guildId: interaction.guildId,
                userId: interaction.user.id,
                subcommand,
            });

            await interaction.editReply({
                content: '❌ An error occurred while creating the GIF. Please try again later!',
            });
        }
    },
};

export default command;