import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
} from 'discord.js';
import { Command, BotClient } from '../../types';
import { checkAuthorizationWithError } from '../../utils/permissions';
import { runBotSetup } from '../../utils/setup';

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('bot-setup')
        .setDescription('Automatically sets up the entire bot for your server.')
        .setDMPermission(false),

    guildOnly: true,

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.guild) return;

        const client = interaction.client as BotClient;

        const isAuthorized = await checkAuthorizationWithError(interaction, interaction.guild.ownerId, 'bot-setup');
        if (!isAuthorized) return;

        await interaction.deferReply({ ephemeral: true });

        const result = await runBotSetup(interaction.guild, client, interaction.user);

        await interaction.editReply({ embeds: [result.embed] });
    },
};

export default command;