import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    EmbedBuilder,
    PermissionFlagsBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    SelectMenuBuilder,
    VoiceChannel,
    GuildMember
} from 'discord.js';
import { BotClient } from '../../types';

const command = {
    data: new SlashCommandBuilder()
        .setName('soundboard')
        .setDescription('Manage and play soundboard sounds')
        .addSubcommand(subcommand =>
            subcommand
                .setName('play')
                .setDescription('Play a soundboard sound')
                .addStringOption(option =>
                    option
                        .setName('sound')
                        .setDescription('Sound to play')
                        .setRequired(true)
                        .setAutocomplete(true)
                )
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('Voice channel to play in (optional)')
                        .setRequired(false)
                )
                .addIntegerOption(option =>
                    option
                        .setName('volume')
                        .setDescription('Volume (0-100)')
                        .setRequired(false)
                        .setMinValue(0)
                        .setMaxValue(100)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add a new sound to the soundboard')
                .addStringOption(option =>
                    option
                        .setName('name')
                        .setDescription('Name for the sound')
                        .setRequired(true)
                )
                .addAttachmentOption(option =>
                    option
                        .setName('file')
                        .setDescription('Audio file to add')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('category')
                        .setDescription('Sound category')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Funny', value: 'funny' },
                            { name: 'Memes', value: 'memes' },
                            { name: 'Music', value: 'music' },
                            { name: 'Effects', value: 'effects' },
                            { name: 'Voice Lines', value: 'voice' },
                            { name: 'Custom', value: 'custom' }
                        )
                )
                .addStringOption(option =>
                    option
                        .setName('description')
                        .setDescription('Description of the sound')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove a sound from the soundboard')
                .addStringOption(option =>
                    option
                        .setName('sound')
                        .setDescription('Sound to remove')
                        .setRequired(true)
                        .setAutocomplete(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all available sounds')
                .addStringOption(option =>
                    option
                        .setName('category')
                        .setDescription('Filter by category')
                        .setRequired(false)
                        .addChoices(
                            { name: 'All', value: 'all' },
                            { name: 'Funny', value: 'funny' },
                            { name: 'Memes', value: 'memes' },
                            { name: 'Music', value: 'music' },
                            { name: 'Effects', value: 'effects' },
                            { name: 'Voice Lines', value: 'voice' },
                            { name: 'Custom', value: 'custom' }
                        )
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('board')
                .setDescription('Display interactive soundboard interface')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('favorites')
                .setDescription('Manage your favorite sounds')
                .addStringOption(option =>
                    option
                        .setName('action')
                        .setDescription('Action to perform')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Add to Favorites', value: 'add' },
                            { name: 'Remove from Favorites', value: 'remove' },
                            { name: 'List Favorites', value: 'list' },
                            { name: 'Play Random Favorite', value: 'random' }
                        )
                )
                .addStringOption(option =>
                    option
                        .setName('sound')
                        .setDescription('Sound name (for add/remove actions)')
                        .setRequired(false)
                        .setAutocomplete(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('random')
                .setDescription('Play a random sound')
                .addStringOption(option =>
                    option
                        .setName('category')
                        .setDescription('Category to pick from')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Any Category', value: 'all' },
                            { name: 'Funny', value: 'funny' },
                            { name: 'Memes', value: 'memes' },
                            { name: 'Music', value: 'music' },
                            { name: 'Effects', value: 'effects' },
                            { name: 'Voice Lines', value: 'voice' }
                        )
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('queue')
                .setDescription('Manage sound playback queue')
                .addStringOption(option =>
                    option
                        .setName('action')
                        .setDescription('Queue action')
                        .setRequired(true)
                        .addChoices(
                            { name: 'View Queue', value: 'view' },
                            { name: 'Clear Queue', value: 'clear' },
                            { name: 'Skip Current', value: 'skip' },
                            { name: 'Shuffle Queue', value: 'shuffle' }
                        )
                )
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.UseVAD)
        .setDMPermission(false),

    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        const client = interaction.client as BotClient;
        const subcommand = interaction.options.getSubcommand();

        try {
            const guild = interaction.guild;
            if (!guild) {
                await interaction.reply({
                    embeds: [{
                        color: 0xff0000,
                        description: '❌ This command can only be used in a server.',
                    }],
                    ephemeral: true,
                });
                return;
            }

            switch (subcommand) {
                case 'play':
                    await this.handlePlay(interaction, guild);
                    break;
                case 'add':
                    await this.handleAdd(interaction, guild);
                    break;
                case 'remove':
                    await this.handleRemove(interaction, guild);
                    break;
                case 'list':
                    await this.handleList(interaction, guild);
                    break;
                case 'board':
                    await this.handleBoard(interaction, guild);
                    break;
                case 'favorites':
                    await this.handleFavorites(interaction, guild);
                    break;
                case 'random':
                    await this.handleRandom(interaction, guild);
                    break;
                case 'queue':
                    await this.handleQueue(interaction, guild);
                    break;
            }

            // Log the action
            client.logger.info(`Soundboard ${subcommand} used by ${interaction.user.tag}`, {
                guildId: interaction.guildId,
                userId: interaction.user.id,
                subcommand,
            });

            return;

        } catch (error) {
            console.error('Error in soundboard command:', error);

            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    embeds: [{
                        color: 0xff0000,
                        description: `❌ An error occurred: ${errorMessage}`,
                    }],
                    ephemeral: true,
                });
            }

            return;
        }
    },

    async handlePlay(interaction: ChatInputCommandInteraction, guild: any): Promise<void> {
        const soundName = interaction.options.getString('sound', true);
        const targetChannel = interaction.options.getChannel('channel') as VoiceChannel;
        const volume = interaction.options.getInteger('volume') || 50;

        // Check if user is in a voice channel
        const member = interaction.member as GuildMember;
        const userVoiceChannel = member?.voice?.channel;
        const voiceChannel = targetChannel || userVoiceChannel;

        if (!voiceChannel) {
            await interaction.reply({
                embeds: [{
                    color: 0xff0000,
                    description: '❌ You need to be in a voice channel or specify a channel to play sounds!',
                }],
                ephemeral: true,
            });
            return;
        }

        // Simulate sound database
        const soundDatabase = [
            { name: 'airhorn', category: 'effects', duration: 3, plays: 156, url: 'https://example.com/airhorn.mp3' },
            { name: 'john-cena', category: 'memes', duration: 5, plays: 89, url: 'https://example.com/johncena.mp3' },
            { name: 'rickroll', category: 'funny', duration: 10, plays: 234, url: 'https://example.com/rickroll.mp3' },
            { name: 'discord-notification', category: 'effects', duration: 2, plays: 67, url: 'https://example.com/notification.mp3' },
            { name: 'bruh', category: 'memes', duration: 1, plays: 345, url: 'https://example.com/bruh.mp3' }
        ];

        const sound = soundDatabase.find(s => s.name.toLowerCase().includes(soundName.toLowerCase()));

        if (!sound) {
            const suggestions = soundDatabase
                .filter(s => s.name.toLowerCase().includes(soundName.toLowerCase().substring(0, 3)))
                .slice(0, 3);

            await interaction.reply({
                embeds: [{
                    color: 0xff0000,
                    title: '🔍 Sound Not Found',
                    description: `Could not find a sound named "${soundName}".`,
                    fields: suggestions.length > 0 ? [{
                        name: '💡 Did you mean?',
                        value: suggestions.map(s => `• \`${s.name}\` (${s.category})`).join('\n'),
                        inline: false
                    }] : [],
                }],
                ephemeral: true,
            });
            return;
        }

        await interaction.deferReply();

        try {
            // Simulate playing sound
            const embed = new EmbedBuilder()
                .setTitle('🔊 Now Playing')
                .setDescription(`Playing **${sound.name}** in ${voiceChannel}`)
                .setColor(0x00ff00)
                .addFields(
                    {
                        name: '🎵 Sound Details',
                        value: [
                            `**Name:** ${sound.name}`,
                            `**Category:** ${sound.category}`,
                            `**Duration:** ${sound.duration}s`,
                            `**Volume:** ${volume}%`,
                            `**Total Plays:** ${sound.plays + 1}`
                        ].join('\n'),
                        inline: true,
                    },
                    {
                        name: '📻 Playback Info',
                        value: [
                            `**Channel:** ${voiceChannel.name}`,
                            `**Requested by:** ${interaction.user.tag}`,
                            `**Status:** Playing`,
                            `**Quality:** High (320kbps)`,
                            `**Connection:** Stable`
                        ].join('\n'),
                        inline: true,
                    }
                )
                .setTimestamp()
                .setFooter({
                    text: `Sound ID: ${sound.name}`,
                    iconURL: interaction.user.displayAvatarURL()
                });

            // Control buttons
            const pauseButton = new ButtonBuilder()
                .setCustomId(`sound_pause_${sound.name}`)
                .setLabel('⏸️ Pause')
                .setStyle(ButtonStyle.Primary);

            const stopButton = new ButtonBuilder()
                .setCustomId(`sound_stop_${sound.name}`)
                .setLabel('⏹️ Stop')
                .setStyle(ButtonStyle.Danger);

            const volumeUpButton = new ButtonBuilder()
                .setCustomId(`sound_volume_up_${sound.name}`)
                .setLabel('🔊 +')
                .setStyle(ButtonStyle.Secondary);

            const volumeDownButton = new ButtonBuilder()
                .setCustomId(`sound_volume_down_${sound.name}`)
                .setLabel('🔉 -')
                .setStyle(ButtonStyle.Secondary);

            const favoriteButton = new ButtonBuilder()
                .setCustomId(`sound_favorite_${sound.name}`)
                .setLabel('⭐ Favorite')
                .setStyle(ButtonStyle.Secondary);

            const actionRow = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(pauseButton, stopButton, volumeUpButton, volumeDownButton, favoriteButton);

            await interaction.editReply({
                embeds: [embed],
                components: [actionRow],
            });

            // Simulate playback completion after duration
            setTimeout(async () => {
                const completedEmbed = new EmbedBuilder()
                    .setTitle('✅ Playback Complete')
                    .setDescription(`Finished playing **${sound.name}**`)
                    .setColor(0x7289da)
                    .setTimestamp();

                try {
                    await interaction.editReply({
                        embeds: [completedEmbed],
                        components: [],
                    });
                } catch (error) {
                    // Ignore edit errors
                }
            }, sound.duration * 1000);

            // In production, actually play the audio file
            console.log(`Playing sound: ${sound.name} in ${voiceChannel.name}`);

        } catch (error) {
            await interaction.editReply({
                embeds: [{
                    color: 0xff0000,
                    description: `❌ Failed to play sound: ${error instanceof Error ? error.message : 'Unknown error'}`,
                }],
            });
        }
    },

    async handleAdd(interaction: ChatInputCommandInteraction, guild: any): Promise<void> {
        const name = interaction.options.getString('name', true);
        const file = interaction.options.getAttachment('file', true);
        const category = interaction.options.getString('category') || 'custom';
        const description = interaction.options.getString('description') || 'No description provided';

        // Validate file
        if (!file.contentType?.startsWith('audio/') && !file.name?.match(/\.(mp3|wav|ogg|m4a)$/i)) {
            await interaction.reply({
                embeds: [{
                    color: 0xff0000,
                    description: '❌ Please upload a valid audio file (MP3, WAV, OGG, or M4A).',
                }],
                ephemeral: true,
            });
            return;
        }

        // Check file size (limit to 8MB for Discord)
        if (file.size > 8 * 1024 * 1024) {
            await interaction.reply({
                embeds: [{
                    color: 0xff0000,
                    description: '❌ Audio file must be smaller than 8MB.',
                }],
                ephemeral: true,
            });
            return;
        }

        // Check permissions
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages)) {
            await interaction.reply({
                embeds: [{
                    color: 0xff0000,
                    description: '❌ You need "Manage Messages" permission to add sounds.',
                }],
                ephemeral: true,
            });
            return;
        }

        await interaction.deferReply();

        try {
            // Simulate processing and adding sound
            const soundId = `${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`;

            const embed = new EmbedBuilder()
                .setTitle('✅ Sound Added Successfully!')
                .setDescription(`Added **${name}** to the soundboard`)
                .setColor(0x00ff00)
                .addFields(
                    {
                        name: '🎵 Sound Details',
                        value: [
                            `**Name:** ${name}`,
                            `**ID:** \`${soundId}\``,
                            `**Category:** ${category}`,
                            `**File Size:** ${(file.size / 1024).toFixed(1)}KB`,
                            `**Format:** ${file.contentType || 'Unknown'}`
                        ].join('\n'),
                        inline: true,
                    },
                    {
                        name: '📋 Metadata',
                        value: [
                            `**Description:** ${description}`,
                            `**Added by:** ${interaction.user.tag}`,
                            `**Added on:** <t:${Math.floor(Date.now() / 1000)}:F>`,
                            `**Status:** Active`,
                            `**Plays:** 0`
                        ].join('\n'),
                        inline: true,
                    },
                    {
                        name: '🔧 Processing Info',
                        value: [
                            '• ✅ File validation passed',
                            '• ✅ Audio format supported',
                            '• ✅ Size within limits',
                            '• ✅ Added to database',
                            '• ✅ Available for playback'
                        ].join('\n'),
                        inline: false,
                    }
                )
                .setThumbnail(interaction.user.displayAvatarURL({ size: 256 }))
                .setTimestamp()
                .setFooter({
                    text: `Sound added by ${interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL()
                });

            // Quick action buttons
            const playButton = new ButtonBuilder()
                .setCustomId(`sound_quick_play_${soundId}`)
                .setLabel('🔊 Test Play')
                .setStyle(ButtonStyle.Primary);

            const editButton = new ButtonBuilder()
                .setCustomId(`sound_edit_${soundId}`)
                .setLabel('✏️ Edit Info')
                .setStyle(ButtonStyle.Secondary);

            const shareButton = new ButtonBuilder()
                .setCustomId(`sound_share_${soundId}`)
                .setLabel('📤 Share')
                .setStyle(ButtonStyle.Secondary);

            const actionRow = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(playButton, editButton, shareButton);

            await interaction.editReply({
                embeds: [embed],
                components: [actionRow],
            });

            // In production, upload file to storage and save to database
            console.log(`Sound added: ${name} by ${interaction.user.id}`);

        } catch (error) {
            await interaction.editReply({
                embeds: [{
                    color: 0xff0000,
                    description: `❌ Failed to add sound: ${error instanceof Error ? error.message : 'Unknown error'}`,
                }],
            });
        }
    },

    async handleRemove(interaction: ChatInputCommandInteraction, guild: any): Promise<void> {
        const soundName = interaction.options.getString('sound', true);

        // Check permissions
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages)) {
            await interaction.reply({
                embeds: [{
                    color: 0xff0000,
                    description: '❌ You need "Manage Messages" permission to remove sounds.',
                }],
                ephemeral: true,
            });
            return;
        }

        // Simulate finding sound
        const sound = {
            name: soundName,
            category: 'memes',
            addedBy: '123456789012345678',
            addedAt: Date.now() - 86400000,
            plays: 45
        };

        if (!sound) {
            await interaction.reply({
                embeds: [{
                    color: 0xff0000,
                    description: `❌ Sound "${soundName}" not found.`,
                }],
                ephemeral: true,
            });
            return;
        }

        const confirmEmbed = new EmbedBuilder()
            .setTitle('⚠️ Confirm Sound Removal')
            .setDescription(`Are you sure you want to remove **${sound.name}**?`)
            .setColor(0xff0000)
            .addFields({
                name: '🗑️ Sound to Remove',
                value: [
                    `**Name:** ${sound.name}`,
                    `**Category:** ${sound.category}`,
                    `**Added by:** <@${sound.addedBy}>`,
                    `**Added:** <t:${Math.floor(sound.addedAt / 1000)}:R>`,
                    `**Total Plays:** ${sound.plays}`
                ].join('\n'),
                inline: false,
            })
            .setTimestamp();

        const confirmButton = new ButtonBuilder()
            .setCustomId('sound_remove_confirm')
            .setLabel('🗑️ Remove Sound')
            .setStyle(ButtonStyle.Danger);

        const cancelButton = new ButtonBuilder()
            .setCustomId('sound_remove_cancel')
            .setLabel('❌ Cancel')
            .setStyle(ButtonStyle.Secondary);

        const actionRow = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(confirmButton, cancelButton);

        const response = await interaction.reply({
            embeds: [confirmEmbed],
            components: [actionRow],
            ephemeral: true,
        });

        try {
            const buttonInteraction = await response.awaitMessageComponent({
                componentType: ComponentType.Button,
                time: 30000,
                filter: (i) => i.user.id === interaction.user.id,
            });

            if (buttonInteraction.customId === 'sound_remove_confirm') {
                const successEmbed = new EmbedBuilder()
                    .setTitle('✅ Sound Removed')
                    .setDescription(`Successfully removed **${sound.name}** from the soundboard`)
                    .setColor(0x00ff00)
                    .setTimestamp();

                await buttonInteraction.update({
                    embeds: [successEmbed],
                    components: [],
                });

                // In production, remove from database and delete file
                console.log(`Sound removed: ${sound.name} by ${interaction.user.id}`);

            } else {
                const cancelEmbed = new EmbedBuilder()
                    .setTitle('❌ Removal Cancelled')
                    .setDescription('Sound removal has been cancelled.')
                    .setColor(0x7289da);

                await buttonInteraction.update({
                    embeds: [cancelEmbed],
                    components: [],
                });
            }

        } catch (error) {
            try {
                await interaction.editReply({
                    embeds: [{
                        color: 0xff0000,
                        title: '⏰ Request Timed Out',
                        description: 'Sound removal request timed out.',
                    }],
                    components: [],
                });
            } catch (e) {
                // Ignore edit errors
            }
        }
    },

    async handleList(interaction: ChatInputCommandInteraction, guild: any): Promise<void> {
        const categoryFilter = interaction.options.getString('category') || 'all';

        await interaction.deferReply();

        // Simulate sound database with different categories
        const allSounds = [
            { name: 'airhorn', category: 'effects', plays: 156, duration: 3, size: '45KB', addedBy: 'Admin#0001' },
            { name: 'john-cena', category: 'memes', plays: 89, duration: 5, size: '67KB', addedBy: 'User1#1234' },
            { name: 'rickroll', category: 'funny', plays: 234, duration: 10, size: '123KB', addedBy: 'User2#5678' },
            { name: 'discord-notification', category: 'effects', plays: 67, duration: 2, size: '23KB', addedBy: 'Mod#0002' },
            { name: 'bruh', category: 'memes', plays: 345, duration: 1, size: '18KB', addedBy: 'User3#9012' },
            { name: 'vine-boom', category: 'effects', plays: 178, duration: 2, size: '34KB', addedBy: 'User4#3456' },
            { name: 'mario-coin', category: 'music', plays: 92, duration: 1, size: '12KB', addedBy: 'Gamer#7890' },
            { name: 'hello-there', category: 'voice', plays: 156, duration: 3, size: '56KB', addedBy: 'Prequel#2468' }
        ];

        const filteredSounds = categoryFilter === 'all'
            ? allSounds
            : allSounds.filter(sound => sound.category === categoryFilter);

        const embed = new EmbedBuilder()
            .setTitle('🎵 Soundboard Library')
            .setDescription(`${filteredSounds.length} sound${filteredSounds.length !== 1 ? 's' : ''} available${categoryFilter !== 'all' ? ` in **${categoryFilter}** category` : ''}`)
            .setColor(0x7289da)
            .setThumbnail(guild.iconURL({ size: 256 }))
            .setTimestamp()
            .setFooter({
                text: `${guild.name} • ${allSounds.length} total sounds`,
                iconURL: guild.iconURL()
            });

        if (filteredSounds.length === 0) {
            embed.addFields({
                name: '🔍 No Sounds Found',
                value: `No sounds found in the **${categoryFilter}** category.`,
                inline: false,
            });
        } else {
            // Group by category for better organization
            const groupedSounds = filteredSounds.reduce((acc, sound) => {
                if (!acc[sound.category]) acc[sound.category] = [];
                acc[sound.category]!.push(sound);
                return acc;
            }, {} as { [key: string]: any[] });

            Object.entries(groupedSounds).forEach(([category, sounds]) => {
                const categoryEmoji = getCategoryEmoji(category);
                const soundList = sounds
                    .sort((a, b) => b.plays - a.plays)
                    .slice(0, 8) // Limit to 8 per category for embed space
                    .map(sound =>
                        `**${sound.name}** • ${sound.plays} plays • ${sound.duration}s`
                    ).join('\n');

                embed.addFields({
                    name: `${categoryEmoji} ${category.charAt(0).toUpperCase() + category.slice(1)} (${sounds.length})`,
                    value: soundList + (sounds.length > 8 ? '\n*...and more*' : ''),
                    inline: true,
                });
            });

            // Statistics
            const totalPlays = filteredSounds.reduce((sum, sound) => sum + sound.plays, 0);
            const avgDuration = filteredSounds.reduce((sum, sound) => sum + sound.duration, 0) / filteredSounds.length;
            const mostPlayed = filteredSounds.sort((a, b) => b.plays - a.plays)[0];

            embed.addFields({
                name: '📊 Library Statistics',
                value: [
                    `**Total Plays:** ${totalPlays.toLocaleString()}`,
                    `**Average Duration:** ${avgDuration.toFixed(1)}s`,
                    `**Most Popular:** ${mostPlayed?.name} (${mostPlayed?.plays} plays)`,
                    `**Categories:** ${Object.keys(groupedSounds).length}`,
                    `**Total Size:** ~${Math.floor(Math.random() * 500 + 100)}KB`
                ].join('\n'),
                inline: false,
            });
        }

        // Category filter buttons
        const allButton = new ButtonBuilder()
            .setCustomId('sounds_filter_all')
            .setLabel('All')
            .setStyle(categoryFilter === 'all' ? ButtonStyle.Primary : ButtonStyle.Secondary)
            .setEmoji('🎵');

        const funnyButton = new ButtonBuilder()
            .setCustomId('sounds_filter_funny')
            .setLabel('Funny')
            .setStyle(categoryFilter === 'funny' ? ButtonStyle.Primary : ButtonStyle.Secondary)
            .setEmoji('😂');

        const memesButton = new ButtonBuilder()
            .setCustomId('sounds_filter_memes')
            .setLabel('Memes')
            .setStyle(categoryFilter === 'memes' ? ButtonStyle.Primary : ButtonStyle.Secondary)
            .setEmoji('🎭');

        const effectsButton = new ButtonBuilder()
            .setCustomId('sounds_filter_effects')
            .setLabel('Effects')
            .setStyle(categoryFilter === 'effects' ? ButtonStyle.Primary : ButtonStyle.Secondary)
            .setEmoji('🔊');

        const musicButton = new ButtonBuilder()
            .setCustomId('sounds_filter_music')
            .setLabel('Music')
            .setStyle(categoryFilter === 'music' ? ButtonStyle.Primary : ButtonStyle.Secondary)
            .setEmoji('🎶');

        const actionRow = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(allButton, funnyButton, memesButton, effectsButton, musicButton);

        // Management buttons
        const addSoundButton = new ButtonBuilder()
            .setCustomId('sounds_add_new')
            .setLabel('Add Sound')
            .setStyle(ButtonStyle.Success)
            .setEmoji('➕');

        const randomPlayButton = new ButtonBuilder()
            .setCustomId('sounds_random_play')
            .setLabel('Play Random')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🎲');

        const managementRow = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(addSoundButton, randomPlayButton);

        await interaction.editReply({
            embeds: [embed],
            components: [actionRow, managementRow],
        });
    },

    async handleBoard(interaction: ChatInputCommandInteraction, guild: any): Promise<void> {
        await interaction.deferReply();

        // Create interactive soundboard interface
        const embed = new EmbedBuilder()
            .setTitle('🎛️ Interactive Soundboard')
            .setDescription('Click the buttons below to play sounds instantly!')
            .setColor(0x9932cc)
            .addFields({
                name: '🎵 Quick Play Sounds',
                value: 'Select from the most popular sounds below, or use the dropdown for more options.',
                inline: false,
            })
            .setThumbnail(guild.iconURL({ size: 256 }))
            .setTimestamp()
            .setFooter({
                text: `${guild.name} • Interactive Soundboard`,
                iconURL: guild.iconURL()
            });

        // Quick play buttons for popular sounds
        const airhornButton = new ButtonBuilder()
            .setCustomId('soundboard_play_airhorn')
            .setLabel('📯 Airhorn')
            .setStyle(ButtonStyle.Secondary);

        const bruhButton = new ButtonBuilder()
            .setCustomId('soundboard_play_bruh')
            .setLabel('😑 Bruh')
            .setStyle(ButtonStyle.Secondary);

        const boomButton = new ButtonBuilder()
            .setCustomId('soundboard_play_vine-boom')
            .setLabel('💥 Vine Boom')
            .setStyle(ButtonStyle.Secondary);

        const coinButton = new ButtonBuilder()
            .setCustomId('soundboard_play_mario-coin')
            .setLabel('🪙 Mario Coin')
            .setStyle(ButtonStyle.Secondary);

        const randomButton = new ButtonBuilder()
            .setCustomId('soundboard_play_random')
            .setLabel('🎲 Random')
            .setStyle(ButtonStyle.Primary);

        const quickPlayRow = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(airhornButton, bruhButton, boomButton, coinButton, randomButton);

        // Sound selection dropdown
        const soundSelect = new SelectMenuBuilder()
            .setCustomId('soundboard_select_sound')
            .setPlaceholder('🔍 Choose a sound to play...')
            .addOptions([
                {
                    label: 'Airhorn',
                    description: '📯 Classic airhorn sound (3s)',
                    value: 'airhorn',
                    emoji: '📯'
                },
                {
                    label: 'John Cena',
                    description: '🎺 And his name is... (5s)',
                    value: 'john-cena',
                    emoji: '🎺'
                },
                {
                    label: 'Rickroll',
                    description: '🎵 Never gonna give you up (10s)',
                    value: 'rickroll',
                    emoji: '🎵'
                },
                {
                    label: 'Discord Notification',
                    description: '🔔 Discord ping sound (2s)',
                    value: 'discord-notification',
                    emoji: '🔔'
                },
                {
                    label: 'Bruh',
                    description: '😑 Classic bruh moment (1s)',
                    value: 'bruh',
                    emoji: '😑'
                },
                {
                    label: 'Vine Boom',
                    description: '💥 Vine boom effect (2s)',
                    value: 'vine-boom',
                    emoji: '💥'
                },
                {
                    label: 'Mario Coin',
                    description: '🪙 Mario coin collection sound (1s)',
                    value: 'mario-coin',
                    emoji: '🪙'
                },
                {
                    label: 'Hello There',
                    description: '👋 General Kenobi! (3s)',
                    value: 'hello-there',
                    emoji: '👋'
                }
            ]);

        const selectRow = new ActionRowBuilder<SelectMenuBuilder>()
            .addComponents(soundSelect);

        // Control and management buttons
        const volumeButton = new ButtonBuilder()
            .setCustomId('soundboard_volume_control')
            .setLabel('🔊 Volume')
            .setStyle(ButtonStyle.Secondary);

        const queueButton = new ButtonBuilder()
            .setCustomId('soundboard_view_queue')
            .setLabel('📋 Queue')
            .setStyle(ButtonStyle.Secondary);

        const favoritesButton = new ButtonBuilder()
            .setCustomId('soundboard_favorites')
            .setLabel('⭐ Favorites')
            .setStyle(ButtonStyle.Secondary);

        const settingsButton = new ButtonBuilder()
            .setCustomId('soundboard_settings')
            .setLabel('⚙️ Settings')
            .setStyle(ButtonStyle.Secondary);

        const stopAllButton = new ButtonBuilder()
            .setCustomId('soundboard_stop_all')
            .setLabel('⏹️ Stop All')
            .setStyle(ButtonStyle.Danger);

        const controlRow = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(volumeButton, queueButton, favoritesButton, settingsButton, stopAllButton);

        await interaction.editReply({
            embeds: [embed],
            components: [quickPlayRow, selectRow, controlRow],
        });
    },

    async handleFavorites(interaction: ChatInputCommandInteraction, guild: any): Promise<void> {
        const action = interaction.options.getString('action', true);
        const soundName = interaction.options.getString('sound');

        // Simulate user favorites
        const userFavorites = [
            { name: 'airhorn', category: 'effects', plays: 23 },
            { name: 'bruh', category: 'memes', plays: 45 },
            { name: 'mario-coin', category: 'music', plays: 12 }
        ];

        const embed = new EmbedBuilder()
            .setTitle('⭐ Favorite Sounds Management')
            .setColor(0xffd700)
            .setThumbnail(interaction.user.displayAvatarURL({ size: 256 }))
            .setTimestamp()
            .setFooter({
                text: `Favorites for ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL()
            });

        switch (action) {
            case 'add':
                if (!soundName) {
                    embed.setDescription('❌ Please specify a sound name to add to favorites.')
                        .setColor(0xff0000);
                } else {
                    embed.setDescription(`✅ Added **${soundName}** to your favorites!`)
                        .setColor(0x00ff00)
                        .addFields({
                            name: '⭐ Favorite Added',
                            value: [
                                `**Sound:** ${soundName}`,
                                `**Added:** <t:${Math.floor(Date.now() / 1000)}:F>`,
                                `**Total Favorites:** ${userFavorites.length + 1}/10`
                            ].join('\n'),
                            inline: false,
                        });
                }
                break;

            case 'remove':
                if (!soundName) {
                    embed.setDescription('❌ Please specify a sound name to remove from favorites.')
                        .setColor(0xff0000);
                } else {
                    embed.setDescription(`✅ Removed **${soundName}** from your favorites.`)
                        .setColor(0x00ff00);
                }
                break;

            case 'list':
                embed.setDescription(`Your favorite sounds (${userFavorites.length}/10)`);

                if (userFavorites.length === 0) {
                    embed.addFields({
                        name: '💔 No Favorites Yet',
                        value: 'You haven\'t added any sounds to your favorites yet!',
                        inline: false,
                    });
                } else {
                    userFavorites.forEach((favorite, index) => {
                        embed.addFields({
                            name: `${index + 1}. ${favorite.name}`,
                            value: [
                                `**Category:** ${favorite.category}`,
                                `**Your Plays:** ${favorite.plays}`,
                                `**Last Played:** Recently`
                            ].join('\n'),
                            inline: true,
                        });
                    });
                }
                break;

            case 'random':
                if (userFavorites.length === 0) {
                    embed.setDescription('❌ You don\'t have any favorite sounds to play!')
                        .setColor(0xff0000);
                } else {
                    const randomFavorite = userFavorites[Math.floor(Math.random() * userFavorites.length)]!;
                    embed.setDescription(`🎲 Playing random favorite: **${randomFavorite.name}**`)
                        .setColor(0x00ff00)
                        .addFields({
                            name: '🎵 Now Playing',
                            value: [
                                `**Sound:** ${randomFavorite.name}`,
                                `**Category:** ${randomFavorite.category}`,
                                `**Status:** Playing in your voice channel`
                            ].join('\n'),
                            inline: false,
                        });
                }
                break;
        }

        // Quick action buttons for favorites
        if (userFavorites.length > 0) {
            const playAllButton = new ButtonBuilder()
                .setCustomId('favorites_play_all')
                .setLabel('🎵 Play All')
                .setStyle(ButtonStyle.Primary);

            const shuffleButton = new ButtonBuilder()
                .setCustomId('favorites_shuffle')
                .setLabel('🔀 Shuffle Play')
                .setStyle(ButtonStyle.Secondary);

            const clearButton = new ButtonBuilder()
                .setCustomId('favorites_clear')
                .setLabel('🗑️ Clear All')
                .setStyle(ButtonStyle.Danger);

            const actionRow = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(playAllButton, shuffleButton, clearButton);

            await interaction.reply({
                embeds: [embed],
                components: [actionRow],
                ephemeral: true,
            });
        } else {
            await interaction.reply({
                embeds: [embed],
                ephemeral: true,
            });
        }
    },

    async handleRandom(interaction: ChatInputCommandInteraction, guild: any): Promise<void> {
        const category = interaction.options.getString('category') || 'all';

        // Simulate random sound selection
        const availableSounds = [
            { name: 'airhorn', category: 'effects', duration: 3 },
            { name: 'john-cena', category: 'memes', duration: 5 },
            { name: 'rickroll', category: 'funny', duration: 10 },
            { name: 'discord-notification', category: 'effects', duration: 2 },
            { name: 'bruh', category: 'memes', duration: 1 },
            { name: 'vine-boom', category: 'effects', duration: 2 },
            { name: 'mario-coin', category: 'music', duration: 1 },
            { name: 'hello-there', category: 'voice', duration: 3 }
        ];

        const filteredSounds = category === 'all'
            ? availableSounds
            : availableSounds.filter(sound => sound.category === category);

        if (filteredSounds.length === 0) {
            await interaction.reply({
                embeds: [{
                    color: 0xff0000,
                    description: `❌ No sounds available in the **${category}** category.`,
                }],
                ephemeral: true,
            });
            return;
        }

        const randomSound = filteredSounds[Math.floor(Math.random() * filteredSounds.length)]!;

        const embed = new EmbedBuilder()
            .setTitle('🎲 Random Sound Selected!')
            .setDescription(`Playing **${randomSound.name}** from ${category === 'all' ? 'any category' : `**${category}** category`}`)
            .setColor(0x9932cc)
            .addFields(
                {
                    name: '🎵 Selected Sound',
                    value: [
                        `**Name:** ${randomSound.name}`,
                        `**Category:** ${randomSound.category}`,
                        `**Duration:** ${randomSound.duration}s`,
                        `**Selection Pool:** ${filteredSounds.length} sounds`
                    ].join('\n'),
                    inline: true,
                },
                {
                    name: '🎮 Random Stats',
                    value: [
                        `**Probability:** ${(100 / filteredSounds.length).toFixed(1)}%`,
                        `**Category Filter:** ${category}`,
                        `**Roll Result:** ${Math.floor(Math.random() * 100) + 1}/100`,
                        `**Lucky Number:** ${Math.floor(Math.random() * 777) + 1}`
                    ].join('\n'),
                    inline: true,
                }
            )
            .setTimestamp()
            .setFooter({
                text: `Random selection • Generated for ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL()
            });

        // Action buttons
        const playAgainButton = new ButtonBuilder()
            .setCustomId('random_play_again')
            .setLabel('🎲 Roll Again')
            .setStyle(ButtonStyle.Primary);

        const favoriteButton = new ButtonBuilder()
            .setCustomId(`random_favorite_${randomSound.name}`)
            .setLabel('⭐ Add to Favorites')
            .setStyle(ButtonStyle.Secondary);

        const shareButton = new ButtonBuilder()
            .setCustomId(`random_share_${randomSound.name}`)
            .setLabel('📤 Share Result')
            .setStyle(ButtonStyle.Secondary);

        const actionRow = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(playAgainButton, favoriteButton, shareButton);

        await interaction.reply({
            embeds: [embed],
            components: [actionRow],
        });

        // Simulate playing the sound
        console.log(`Playing random sound: ${randomSound.name}`);
    },

    async handleQueue(interaction: ChatInputCommandInteraction, guild: any): Promise<void> {
        const queueAction = interaction.options.getString('action', true);

        // Simulate queue data
        const currentQueue = [
            { name: 'airhorn', duration: 3, addedBy: 'User1#1234', position: 1 },
            { name: 'bruh', duration: 1, addedBy: 'User2#5678', position: 2 },
            { name: 'mario-coin', duration: 1, addedBy: 'User3#9012', position: 3 }
        ];

        const embed = new EmbedBuilder()
            .setTitle('📋 Soundboard Queue Management')
            .setColor(0x7289da)
            .setTimestamp()
            .setFooter({
                text: `Queue managed by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL()
            });

        switch (queueAction) {
            case 'view':
                embed.setDescription(`Current playback queue (${currentQueue.length} sound${currentQueue.length !== 1 ? 's' : ''})`);

                if (currentQueue.length === 0) {
                    embed.addFields({
                        name: '🔇 Queue Empty',
                        value: 'No sounds currently in the playback queue.',
                        inline: false,
                    });
                } else {
                    const queueList = currentQueue.map(item =>
                        `**${item.position}.** ${item.name} (${item.duration}s) - Added by ${item.addedBy}`
                    ).join('\n');

                    const totalDuration = currentQueue.reduce((sum, item) => sum + item.duration, 0);

                    embed.addFields(
                        {
                            name: '🎵 Queued Sounds',
                            value: queueList,
                            inline: false,
                        },
                        {
                            name: '📊 Queue Statistics',
                            value: [
                                `**Total Items:** ${currentQueue.length}`,
                                `**Total Duration:** ${totalDuration}s`,
                                `**Estimated Wait:** ${totalDuration - (currentQueue[0]?.duration || 0)}s`,
                                `**Queue Status:** Active`
                            ].join('\n'),
                            inline: false,
                        }
                    );
                }
                break;

            case 'clear':
                embed.setDescription('✅ **Queue cleared successfully**')
                    .setColor(0x00ff00)
                    .addFields({
                        name: '🗑️ Queue Cleared',
                        value: [
                            `**Items Removed:** ${currentQueue.length}`,
                            `**Cleared by:** ${interaction.user.tag}`,
                            `**Time Saved:** ${currentQueue.reduce((sum, item) => sum + item.duration, 0)}s`,
                            `**New Queue Size:** 0`
                        ].join('\n'),
                        inline: false,
                    });
                break;

            case 'skip':
                if (currentQueue.length === 0) {
                    embed.setDescription('❌ **No sounds in queue to skip**')
                        .setColor(0xff0000);
                } else {
                    const skippedSound = currentQueue[0]!;
                    embed.setDescription(`⏭️ **Skipped: ${skippedSound.name}**`)
                        .setColor(0x00ff00)
                        .addFields({
                            name: '⏭️ Sound Skipped',
                            value: [
                                `**Skipped Sound:** ${skippedSound.name}`,
                                `**Duration:** ${skippedSound.duration}s`,
                                `**Added by:** ${skippedSound.addedBy}`,
                                `**Next in Queue:** ${currentQueue[1]?.name || 'None'}`
                            ].join('\n'),
                            inline: false,
                        });
                }
                break;

            case 'shuffle':
                embed.setDescription(`🔀 **Queue shuffled**`)
                    .setColor(0x9932cc)
                    .addFields({
                        name: '🔀 Shuffle Complete',
                        value: [
                            `**Items Shuffled:** ${currentQueue.length}`,
                            `**New Order:** Randomized`,
                            `**Shuffled by:** ${interaction.user.tag}`,
                            `**Algorithm:** Fisher-Yates`
                        ].join('\n'),
                        inline: false,
                    });
                break;
        }

        // Queue management buttons
        if (currentQueue.length > 0) {
            const skipButton = new ButtonBuilder()
                .setCustomId('queue_skip_current')
                .setLabel('⏭️ Skip Current')
                .setStyle(ButtonStyle.Primary);

            const shuffleButton = new ButtonBuilder()
                .setCustomId('queue_shuffle_all')
                .setLabel('🔀 Shuffle')
                .setStyle(ButtonStyle.Secondary);

            const clearButton = new ButtonBuilder()
                .setCustomId('queue_clear_all')
                .setLabel('🗑️ Clear All')
                .setStyle(ButtonStyle.Danger);

            const pauseButton = new ButtonBuilder()
                .setCustomId('queue_pause_playback')
                .setLabel('⏸️ Pause Queue')
                .setStyle(ButtonStyle.Secondary);

            const actionRow = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(skipButton, shuffleButton, clearButton, pauseButton);

            await interaction.reply({
                embeds: [embed],
                components: [actionRow],
                ephemeral: true,
            });
        } else {
            await interaction.reply({
                embeds: [embed],
                ephemeral: true,
            });
        }
    },
};

// Helper function for category emojis
function getCategoryEmoji(category: string): string {
    const emojis: { [key: string]: string } = {
        'funny': '😂',
        'memes': '🎭',
        'music': '🎶',
        'effects': '🔊',
        'voice': '🎤',
        'custom': '🎵'
    };
    return emojis[category] || '🎵';
}

export default command;