import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { Command, BotClient } from '../../types';

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Configure bot settings for your server')
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('View current server settings')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('prefix')
                .setDescription('Set the command prefix for this server')
                .addStringOption(option =>
                    option
                        .setName('new_prefix')
                        .setDescription('The new prefix (1-3 characters)')
                        .setRequired(true)
                        .setMaxLength(3)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('modlog')
                .setDescription('Set the moderation log channel')
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('Channel for moderation logs')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('reset')
                .setDescription('Reset all bot settings to default')
        ),

    permissions: [PermissionFlagsBits.ManageGuild],
    guildOnly: true,

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guild) return;

        const client = interaction.client as BotClient;
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'view':
                await handleView(interaction, client);
                break;
            case 'prefix':
                await handlePrefix(interaction, client);
                break;
            case 'modlog':
                await handleModlog(interaction, client);
                break;
            case 'reset':
                await handleReset(interaction, client);
                break;
        }
    },
};

async function handleView(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
    const guild = await client.db.guild.findUnique({
        where: { id: interaction.guild!.id },
    });

    const settings = guild?.settings || {};
    const prefix = guild?.prefix || client.config.defaultPrefix;

    const embed = new EmbedBuilder()
        .setTitle(`⚙️ Server Settings - ${interaction.guild!.name}`)
        .setColor(0x5865f2)
        .addFields([
            {
                name: '🔧 Basic Settings',
                value: [
                    `**Prefix:** \`${prefix}\``,
                    `**Bot Enabled:** ${settings.enabled !== false ? '✅' : '❌'}`,
                ].join('\n'),
                inline: false,
            },
            {
                name: '🛡️ Moderation',
                value: [
                    `**Moderation:** ${settings.moderation?.enabled !== false ? '✅' : '❌'}`,
                    `**Log Channel:** ${settings.moderation?.logChannelId ? `<#${settings.moderation.logChannelId}>` : 'Not set'}`,
                    `**Auto-mod:** ${settings.moderation?.automodEnabled ? '✅' : '❌'}`,
                ].join('\n'),
                inline: true,
            },
            {
                name: '🎫 Tickets',
                value: [
                    `**Tickets:** ${settings.tickets?.enabled !== false ? '✅' : '❌'}`,
                    `**Category:** ${settings.tickets?.categoryId ? `<#${settings.tickets.categoryId}>` : 'Not set'}`,
                    `**Staff Roles:** ${settings.tickets?.staffRoleIds?.length || 0}`,
                ].join('\n'),
                inline: true,
            },
            {
                name: '🎵 Music',
                value: [
                    `**Music:** ${settings.music?.enabled !== false ? '✅' : '❌'}`,
                    `**Max Queue:** ${settings.music?.maxQueueSize || 50}`,
                    `**DJ Roles:** ${settings.music?.djRoleIds?.length || 0}`,
                ].join('\n'),
                inline: true,
            },
            {
                name: '🔒 Anti-Nuke',
                value: [
                    `**Protection:** ${settings.antiNuke?.enabled !== false ? '✅' : '❌'}`,
                    `**Whitelisted:** ${settings.antiNuke?.whitelistedUserIds?.length || 0}`,
                    `**Auto-actions:** ${settings.antiNuke?.actions?.revertActions ? '✅' : '❌'}`,
                ].join('\n'),
                inline: true,
            },
        ])
        .setFooter({
            text: 'Use /setup <option> to configure specific settings',
        })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handlePrefix(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
    const newPrefix = interaction.options.getString('new_prefix', true);

    if (newPrefix.length > 3) {
        await interaction.reply({
            content: '❌ Prefix cannot be longer than 3 characters!',
            ephemeral: true,
        });
        return;
    }

    try {
        await client.db.guild.upsert({
            where: { id: interaction.guild!.id },
            update: { prefix: newPrefix },
            create: {
                id: interaction.guild!.id,
                name: interaction.guild!.name,
                prefix: newPrefix,
                settings: {},
                antiNukeSettings: {},
            },
        });

        const embed = new EmbedBuilder()
            .setTitle('✅ Prefix Updated')
            .setColor(0x00ff00)
            .setDescription(`Server prefix has been changed to: \`${newPrefix}\``)
            .setFooter({
                text: `Changed by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL(),
            })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    } catch (error) {
        client.logger.error('Failed to update prefix:', error);
        await interaction.reply({
            content: '❌ Failed to update prefix. Please try again.',
            ephemeral: true,
        });
    }
}

async function handleModlog(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
    const channel = interaction.options.getChannel('channel', true);

    if (channel.type !== 0) { // 0 = GUILD_TEXT
        await interaction.reply({
            content: '❌ Please select a text channel!',
            ephemeral: true,
        });
        return;
    }

    try {
        const guild = await client.db.guild.findUnique({
            where: { id: interaction.guild!.id },
        });

        const currentSettings = guild?.settings || {};
        const newSettings = {
            ...currentSettings,
            moderation: {
                ...currentSettings.moderation,
                enabled: true,
                logChannelId: channel.id,
            },
        };

        await client.db.guild.upsert({
            where: { id: interaction.guild!.id },
            update: { settings: newSettings },
            create: {
                id: interaction.guild!.id,
                name: interaction.guild!.name,
                settings: newSettings,
                antiNukeSettings: {},
            },
        });

        const embed = new EmbedBuilder()
            .setTitle('✅ Moderation Log Channel Set')
            .setColor(0x00ff00)
            .setDescription(`Moderation logs will now be sent to ${channel}`)
            .setFooter({
                text: `Set by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL(),
            })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    } catch (error) {
        client.logger.error('Failed to set modlog channel:', error);
        await interaction.reply({
            content: '❌ Failed to set moderation log channel. Please try again.',
            ephemeral: true,
        });
    }
}

async function handleReset(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
    try {
        await client.db.guild.upsert({
            where: { id: interaction.guild!.id },
            update: {
                prefix: client.config.defaultPrefix,
                settings: {},
                antiNukeSettings: {},
            },
            create: {
                id: interaction.guild!.id,
                name: interaction.guild!.name,
                prefix: client.config.defaultPrefix,
                settings: {},
                antiNukeSettings: {},
            },
        });

        const embed = new EmbedBuilder()
            .setTitle('✅ Settings Reset')
            .setColor(0x00ff00)
            .setDescription('All bot settings have been reset to default values.')
            .setFooter({
                text: `Reset by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL(),
            })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    } catch (error) {
        client.logger.error('Failed to reset settings:', error);
        await interaction.reply({
            content: '❌ Failed to reset settings. Please try again.',
            ephemeral: true,
        });
    }
}

export default command;