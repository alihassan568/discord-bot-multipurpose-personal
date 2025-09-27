import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} from 'discord.js';
import { Command, BotClient } from '../../types';

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('avatar')
        .setDescription('Get a user\'s avatar or server icon')
        .addSubcommand(subcommand =>
            subcommand
                .setName('user')
                .setDescription('Get a user\'s avatar')
                .addUserOption(option =>
                    option
                        .setName('target')
                        .setDescription('The user to get the avatar of (defaults to you)')
                        .setRequired(false)
                )
                .addStringOption(option =>
                    option
                        .setName('size')
                        .setDescription('Avatar size')
                        .setRequired(false)
                        .addChoices(
                            { name: '64x64', value: '64' },
                            { name: '128x128', value: '128' },
                            { name: '256x256', value: '256' },
                            { name: '512x512', value: '512' },
                            { name: '1024x1024', value: '1024' },
                            { name: '2048x2048', value: '2048' },
                            { name: '4096x4096', value: '4096' }
                        )
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('server')
                .setDescription('Get the server icon')
                .addStringOption(option =>
                    option
                        .setName('size')
                        .setDescription('Icon size')
                        .setRequired(false)
                        .addChoices(
                            { name: '64x64', value: '64' },
                            { name: '128x128', value: '128' },
                            { name: '256x256', value: '256' },
                            { name: '512x512', value: '512' },
                            { name: '1024x1024', value: '1024' },
                            { name: '2048x2048', value: '2048' },
                            { name: '4096x4096', value: '4096' }
                        )
                )
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        const client = interaction.client as BotClient;
        const subcommand = interaction.options.getSubcommand();
        const size = parseInt(interaction.options.getString('size') || '1024');

        if (!interaction.guild) {
            await interaction.reply({
                content: '❌ This command can only be used in a server!',
                ephemeral: true,
            });
            return;
        }

        try {
            if (subcommand === 'user') {
                const targetUser = interaction.options.getUser('target') || interaction.user;

                // Get both global and server-specific avatars if they exist
                const globalAvatarUrl = targetUser.displayAvatarURL({
                    size: size as any,
                    extension: 'png',
                    forceStatic: false
                });

                const globalAvatarStatic = targetUser.displayAvatarURL({
                    size: size as any,
                    extension: 'png',
                    forceStatic: true
                });

                // Try to get server-specific avatar
                let guildMember = null;
                let serverAvatarUrl = null;
                let serverAvatarStatic = null;

                try {
                    guildMember = await interaction.guild.members.fetch(targetUser.id);
                    if (guildMember.avatar) {
                        serverAvatarUrl = guildMember.displayAvatarURL({
                            size: size as any,
                            extension: 'png',
                            forceStatic: false
                        });
                        serverAvatarStatic = guildMember.displayAvatarURL({
                            size: size as any,
                            extension: 'png',
                            forceStatic: true
                        });
                    }
                } catch (error) {
                    // User might not be in the server
                }

                const embed = new EmbedBuilder()
                    .setTitle(`🖼️ ${targetUser.username}'s Avatar`)
                    .setImage(serverAvatarUrl || globalAvatarUrl)
                    .setColor(0x00aaff)
                    .addFields({
                        name: '📊 Avatar Info',
                        value: [
                            `**User:** ${targetUser.tag}`,
                            `**Size:** ${size}x${size}px`,
                            `**Type:** ${serverAvatarUrl ? 'Server Avatar' : 'Global Avatar'}`,
                            `**Animated:** ${globalAvatarUrl.includes('.gif') ? 'Yes' : 'No'}`
                        ].join('\n'),
                        inline: true,
                    })
                    .setFooter({
                        text: `Requested by ${interaction.user.tag}`,
                        iconURL: interaction.user.displayAvatarURL(),
                    })
                    .setTimestamp();

                // Add download links
                const downloadLinks: string[] = [];
                if (serverAvatarUrl) {
                    downloadLinks.push(`[Server Avatar (Animated)](<${serverAvatarUrl}>)`);
                    if (serverAvatarStatic !== serverAvatarUrl) {
                        downloadLinks.push(`[Server Avatar (Static)](<${serverAvatarStatic}>)`);
                    }
                }
                downloadLinks.push(`[Global Avatar (Animated)](<${globalAvatarUrl}>)`);
                if (globalAvatarStatic !== globalAvatarUrl) {
                    downloadLinks.push(`[Global Avatar (Static)](<${globalAvatarStatic}>)`);
                }

                embed.addFields({
                    name: '🔗 Download Links',
                    value: downloadLinks.join('\n'),
                    inline: false,
                });

                // Create buttons for switching between avatars and sizes
                const components: ActionRowBuilder<ButtonBuilder>[] = [];

                if (serverAvatarUrl) {
                    const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
                        new ButtonBuilder()
                            .setCustomId(`avatar_server_${targetUser.id}_${interaction.user.id}`)
                            .setLabel('Server Avatar')
                            .setStyle(ButtonStyle.Primary),
                        new ButtonBuilder()
                            .setCustomId(`avatar_global_${targetUser.id}_${interaction.user.id}`)
                            .setLabel('Global Avatar')
                            .setStyle(ButtonStyle.Secondary)
                    );
                    components.push(row1);
                }

                // Size selection buttons
                const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`avatar_size_256_${targetUser.id}_${interaction.user.id}`)
                        .setLabel('256px')
                        .setStyle(size === 256 ? ButtonStyle.Success : ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId(`avatar_size_512_${targetUser.id}_${interaction.user.id}`)
                        .setLabel('512px')
                        .setStyle(size === 512 ? ButtonStyle.Success : ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId(`avatar_size_1024_${targetUser.id}_${interaction.user.id}`)
                        .setLabel('1024px')
                        .setStyle(size === 1024 ? ButtonStyle.Success : ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId(`avatar_size_2048_${targetUser.id}_${interaction.user.id}`)
                        .setLabel('2048px')
                        .setStyle(size === 2048 ? ButtonStyle.Success : ButtonStyle.Secondary)
                );
                components.push(row2);

                const reply = await interaction.reply({
                    embeds: [embed],
                    components
                });

                // Set up collector for button interactions
                const filter = (i: any) =>
                    i.customId.startsWith('avatar_') &&
                    i.user.id === interaction.user.id;

                const collector = reply.createMessageComponentCollector({
                    filter,
                    time: 300000, // 5 minutes
                });

                collector.on('collect', async (buttonInteraction) => {
                    await buttonInteraction.deferUpdate();

                    const parts = buttonInteraction.customId.split('_');
                    const action = parts[1]; // 'server', 'global', or 'size'
                    const value = parts[2]; // size value or user id

                    let newSize = size;
                    let showServerAvatar = serverAvatarUrl !== null;

                    if (action === 'size') {
                        newSize = parseInt(value || '1024');
                    } else if (action === 'server') {
                        showServerAvatar = true;
                    } else if (action === 'global') {
                        showServerAvatar = false;
                    }

                    // Update embed with new settings
                    const newGlobalUrl = targetUser.displayAvatarURL({
                        size: newSize as any,
                        extension: 'png',
                        forceStatic: false
                    });
                    const newServerUrl = guildMember?.displayAvatarURL({
                        size: newSize as any,
                        extension: 'png',
                        forceStatic: false
                    });

                    const updatedEmbed = EmbedBuilder.from(embed)
                        .setImage(showServerAvatar && newServerUrl ? newServerUrl : newGlobalUrl)
                        .setFields(
                            {
                                name: '📊 Avatar Info',
                                value: [
                                    `**User:** ${targetUser.tag}`,
                                    `**Size:** ${newSize}x${newSize}px`,
                                    `**Type:** ${showServerAvatar && newServerUrl ? 'Server Avatar' : 'Global Avatar'}`,
                                    `**Animated:** ${(showServerAvatar && newServerUrl ? newServerUrl : newGlobalUrl).includes('.gif') ? 'Yes' : 'No'}`
                                ].join('\n'),
                                inline: true,
                            },
                            {
                                name: '🔗 Download Links',
                                value: downloadLinks.join('\n'),
                                inline: false,
                            }
                        );

                    // Update button styles
                    const updatedComponents = components.map((row) => {
                        const newRow = new ActionRowBuilder<ButtonBuilder>();
                        row.components.forEach((button: any) => {
                            const newButton = ButtonBuilder.from(button);
                            const buttonId = (button.data as any).custom_id || '';

                            if (buttonId.includes('_size_')) {
                                const buttonSize = parseInt(buttonId.split('_')[2] || '1024');
                                newButton.setStyle(buttonSize === newSize ? ButtonStyle.Success : ButtonStyle.Secondary);
                            } else if (buttonId.includes('_server_')) {
                                newButton.setStyle(showServerAvatar ? ButtonStyle.Primary : ButtonStyle.Secondary);
                            } else if (buttonId.includes('_global_')) {
                                newButton.setStyle(!showServerAvatar ? ButtonStyle.Primary : ButtonStyle.Secondary);
                            }

                            newRow.addComponents(newButton);
                        });
                        return newRow;
                    });

                    await buttonInteraction.editReply({
                        embeds: [updatedEmbed],
                        components: updatedComponents
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

            } else if (subcommand === 'server') {
                if (!interaction.guild.iconURL()) {
                    await interaction.reply({
                        content: '❌ This server doesn\'t have an icon!',
                        ephemeral: true,
                    });
                    return;
                }

                const serverIconUrl = interaction.guild.iconURL({
                    size: size as any,
                    extension: 'png',
                    forceStatic: false
                });

                const serverIconStatic = interaction.guild.iconURL({
                    size: size as any,
                    extension: 'png',
                    forceStatic: true
                });

                if (!serverIconUrl) {
                    await interaction.reply({
                        content: '❌ Could not retrieve server icon!',
                        ephemeral: true,
                    });
                    return;
                }

                const embed = new EmbedBuilder()
                    .setTitle(`🏰 ${interaction.guild.name}'s Icon`)
                    .setImage(serverIconUrl)
                    .setColor(0x00aaff)
                    .addFields(
                        {
                            name: '📊 Server Info',
                            value: [
                                `**Server:** ${interaction.guild.name}`,
                                `**Members:** ${interaction.guild.memberCount?.toLocaleString() || 'Unknown'}`,
                                `**Size:** ${size}x${size}px`,
                                `**Animated:** ${serverIconUrl.includes('.gif') ? 'Yes' : 'No'}`
                            ].join('\n'),
                            inline: true,
                        },
                        {
                            name: '🔗 Download Links',
                            value: [
                                `[Server Icon (Animated)](<${serverIconUrl}>)`,
                                serverIconStatic !== serverIconUrl ? `[Server Icon (Static)](<${serverIconStatic}>)` : null
                            ].filter(Boolean).join('\n'),
                            inline: false,
                        }
                    )
                    .setFooter({
                        text: `Requested by ${interaction.user.tag}`,
                        iconURL: interaction.user.displayAvatarURL(),
                    })
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });
            }

            client.logger.info(`Avatar command used by ${interaction.user.tag}`, {
                guildId: interaction.guildId,
                userId: interaction.user.id,
                subcommand,
                size,
            });

        } catch (error) {
            client.logger.error('Error in avatar command', {
                error: error instanceof Error ? error.message : 'Unknown error',
                guildId: interaction.guildId,
                userId: interaction.user.id,
                subcommand,
            });

            await interaction.reply({
                content: '❌ An error occurred while processing the avatar command. Please try again later!',
                ephemeral: true,
            });
        }
    },
};

export default command;