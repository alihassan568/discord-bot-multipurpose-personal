import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    EmbedBuilder,
    PermissionFlagsBits,
    ChannelType,
    TextChannel
} from 'discord.js';
import { Command, BotClient } from '../../types';

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('setup-welcome')
        .setDescription('Configure the welcome message system.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('enable')
                .setDescription('Enable the welcome message system.')
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('The channel where welcome messages will be sent.')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('disable')
                .setDescription('Disable the welcome message system.')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('message')
                .setDescription('Set a custom welcome message.')
                .addStringOption(option =>
                    option
                        .setName('text')
                        .setDescription('The welcome message. Use {user} for mention and {server} for server name.')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('View the current welcome message configuration.')
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guild) return;

        const client = interaction.client as BotClient;
        const subcommand = interaction.options.getSubcommand();

        try {
            switch (subcommand) {
                case 'enable': {
                    const channel = interaction.options.getChannel('channel', true) as TextChannel;

                    await client.db.guild.upsert({
                        where: { id: interaction.guild.id },
                        update: { welcomeChannelId: channel.id, welcomeEnabled: true },
                        create: {
                            id: interaction.guild.id,
                            name: interaction.guild.name,
                            welcomeChannelId: channel.id,
                            welcomeEnabled: true,
                        },
                    });

                    const embed = new EmbedBuilder()
                        .setTitle('✅ Welcome Messages Enabled')
                        .setDescription(`Welcome messages will now be sent to ${channel}.`)
                        .setColor(0x00ff00)
                        .setTimestamp();

                    await interaction.reply({ embeds: [embed] });
                    break;
                }

                case 'disable': {
                    await client.db.guild.upsert({
                        where: { id: interaction.guild.id },
                        update: { welcomeEnabled: false },
                        create: {
                            id: interaction.guild.id,
                            name: interaction.guild.name,
                            welcomeEnabled: false,
                        }
                    });

                    const embed = new EmbedBuilder()
                        .setTitle('❌ Welcome Messages Disabled')
                        .setDescription('Welcome messages have been turned off.')
                        .setColor(0xff0000)
                        .setTimestamp();

                    await interaction.reply({ embeds: [embed] });
                    break;
                }

                case 'message': {
                    const message = interaction.options.getString('text', true);

                    await client.db.guild.upsert({
                        where: { id: interaction.guild.id },
                        update: { welcomeMessage: message },
                        create: {
                            id: interaction.guild.id,
                            name: interaction.guild.name,
                            welcomeMessage: message,
                        },
                    });

                    const embed = new EmbedBuilder()
                        .setTitle('📝 Welcome Message Updated')
                        .setDescription(`The welcome message has been set to:\n\
\
\
${message}\
\
\
`)
                        .setColor(0x00aaff)
                        .setTimestamp();

                    await interaction.reply({ embeds: [embed] });
                    break;
                }

                case 'view': {
                    const guildConfig = await client.db.guild.findUnique({
                        where: { id: interaction.guild.id },
                    });

                    const channel = guildConfig?.welcomeChannelId ? interaction.guild.channels.cache.get(guildConfig.welcomeChannelId) : null;
                    const welcomeMessage = guildConfig?.welcomeMessage || "Welcome {user} to {server}! We're glad to have you.";

                    const embed = new EmbedBuilder()
                        .setTitle('👋 Welcome Message Configuration')
                        .setColor(0x7289da)
                        .addFields(
                            { name: 'Status', value: guildConfig?.welcomeEnabled ? '✅ Enabled' : '❌ Disabled', inline: true },
                            { name: 'Channel', value: channel ? channel.toString() : 'Not set', inline: true },
                            { name: 'Message', value: `\
\
\
${welcomeMessage}\
\
\
` }
                        )
                        .setTimestamp();

                    await interaction.reply({ embeds: [embed] });
                    break;
                }
            }
        } catch (error) {
            client.logger.error('Error executing setup-welcome command:', error);
            await interaction.reply({ content: 'An error occurred while configuring the welcome message system.', ephemeral: true });
        }
    },
};

export default command;