import { Events, Interaction, ChatInputCommandInteraction } from 'discord.js';
import { Event, BotClient } from '../types';
import { defaultRateLimits } from '../middleware/rateLimiter';

function getCommandCategory(commandName: string): string {
    // Map commands to their categories for rate limiting
    const moderationCommands = ['ban', 'kick', 'mute', 'unmute', 'warn', 'clear', 'timeout'];
    const musicCommands = ['play', 'pause', 'skip', 'queue', 'volume', 'loop', 'shuffle'];
    const funCommands = ['8ball', 'meme', 'joke', 'trivia', 'coinflip', 'roll'];
    const utilityCommands = ['ping', 'serverinfo', 'userinfo', 'avatar'];

    if (moderationCommands.includes(commandName)) return 'moderation';
    if (musicCommands.includes(commandName)) return 'music';
    if (funCommands.includes(commandName)) return 'fun';
    if (utilityCommands.includes(commandName)) return 'utility';

    return 'general';
}

const event: Event = {
    name: Events.InteractionCreate,
    execute: async (interaction: Interaction) => {
        // Only handle slash commands for now
        if (!interaction.isChatInputCommand()) return;

        const client = interaction.client as BotClient;
        const command = client.commands.get(interaction.commandName);

        if (!command) {
            client.logger.warn(`Command ${interaction.commandName} not found`);
            return;
        }

        try {
            // Check if command is guild-only
            if (command.guildOnly && !interaction.guild) {
                await interaction.reply({
                    content: 'This command can only be used in a server!',
                    ephemeral: true,
                });
                return;
            }

            // Check if command is owner-only
            if (command.ownerOnly && !client.config.ownerIds.includes(interaction.user.id)) {
                await interaction.reply({
                    content: 'This command can only be used by bot owners!',
                    ephemeral: true,
                });
                return;
            }

            // Check permissions
            if (command.permissions && interaction.guild && interaction.member) {
                const memberPermissions = (interaction.member as any).permissions;

                for (const permission of command.permissions) {
                    if (!memberPermissions.has(permission)) {
                        await interaction.reply({
                            content: `You need the \`${permission}\` permission to use this command!`,
                            ephemeral: true,
                        });
                        return;
                    }
                }
            }

            // Check rate limits
            const category = getCommandCategory(interaction.commandName);
            const rateLimitConfig = defaultRateLimits[category] || defaultRateLimits.general;
            const rateLimitResult = await client.rateLimiter.isRateLimited(interaction, rateLimitConfig);

            if (rateLimitResult.limited) {
                const resetTime = rateLimitResult.resetTime ? new Date(rateLimitResult.resetTime) : new Date(Date.now() + 60000);
                await interaction.reply({
                    content: `${rateLimitConfig?.message || 'You are being rate limited.'} Try again <t:${Math.floor(resetTime.getTime() / 1000)}:R>`,
                    ephemeral: true,
                });
                return;
            }

            // Check cooldowns (additional per-command cooldowns)
            if (command.cooldown) {
                const cooldownKey = `cooldown:${interaction.commandName}:${interaction.user.id}`;
                const lastUsed = await client.redis.get(cooldownKey);

                if (lastUsed) {
                    const timeLeft = command.cooldown - (Date.now() - parseInt(lastUsed));
                    if (timeLeft > 0) {
                        await interaction.reply({
                            content: `You need to wait ${Math.ceil(timeLeft / 1000)} seconds before using this command again!`,
                            ephemeral: true,
                        });
                        return;
                    }
                }

                await client.redis.setEx(cooldownKey, Math.ceil(command.cooldown / 1000), Date.now().toString());
            }

            // Execute the command
            await command.execute(interaction);

            client.logger.info(`Command ${interaction.commandName} executed by ${interaction.user.tag} in ${interaction.guild?.name || 'DM'}`);
        } catch (error) {
            client.logger.error(`Error executing command ${interaction.commandName}:`, error);

            const errorMessage = {
                content: 'There was an error while executing this command!',
                ephemeral: true,
            };

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(errorMessage);
            } else {
                await interaction.reply(errorMessage);
            }
        }
    },
};

export default event;