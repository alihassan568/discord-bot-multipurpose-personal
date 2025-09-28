import { WebhookClient, EmbedBuilder } from "discord.js";

export async function logCommand({
    userTag,
    userId,
    guildId,
    guildName,
    command,
    args,
}: {
    userTag: string;
    userId: string;
    guildId?: string;
    guildName?: string;
    command: string;
    args: string[];
}) {
    const embed = new EmbedBuilder()
        .setColor("Purple")
        .setTitle("📜 Command Executed")
        .addFields(
            { name: "👤 User", value: `${userTag} (${userId})`, inline: false },
            { name: "🏠 Server", value: guildName ? `${guildName} (${guildId})` : "DM", inline: false },
            { name: "⚙️ Command", value: `\`${command}\``, inline: true },
            { name: "📋 Arguments", value: args.length ? args.join(" ") : "None", inline: true },
        )
        .setTimestamp();

    if (process.env.GLOBAL_COMMAND_LOG_WEBHOOK) {
        const globalHook = new WebhookClient({ url: process.env.GLOBAL_COMMAND_LOG_WEBHOOK });
        await globalHook.send({ embeds: [embed] }).catch(() => null);
    }

    // Send to guild-specific webhook
    if (guildId) {
        const guildEnvKey = `GUILD_LOG_WEBHOOK_${guildId}`;
        const guildHookUrl = process.env[guildEnvKey];
        if (guildHookUrl) {
            const guildHook = new WebhookClient({ url: guildHookUrl });
            await guildHook.send({ embeds: [embed] }).catch(() => null);
        }
    }
}