import { EmbedBuilder, Message } from "discord.js";
import { BotClient } from "../types";

export default {
  name: "messageCreate",
  async execute(message: Message, client: BotClient) {
    if (!message.guild) return;
    if (message.author.bot) return;

    // ✅ safer: use message.client.user instead of client.user
    const botUser = message.client.user;
    if (!botUser) return;

    if (message.mentions.has(botUser, { ignoreEveryone: true, ignoreRoles: true })) {
      const embed = new EmbedBuilder()
        .setTitle("🤖 Bot Information")
        .setDescription(`Hello ${message.author}, I’m online and ready!`)
        .setColor("Blue");

      await message.reply({ embeds: [embed] });
    }
  },
};
