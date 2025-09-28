import {
  EmbedBuilder,
  Message,
  TextChannel,
  NewsChannel,
  DMChannel,
  ThreadChannel,
} from 'discord.js';
import { BotClient } from '../../types';

type SendableChannel = TextChannel | NewsChannel | DMChannel | ThreadChannel;

export default async function afkHandler(message: Message, client: BotClient) {
  if (message.author.bot) return;

  for (const user of message.mentions.users.values()) {
    const afk = await client.db.afk.findUnique({
      where: { userId: user.id },
    });

    if (afk) {
      message.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('🌙 AFK Notice')
            .setDescription(
              `${user} is currently AFK.\n\n📋 **Reason:** ${afk.reason}\n⏰ **Since:** <t:${Math.floor(
                afk.since.getTime() / 1000
              )}:R>`
            )
            .setColor('#FFA500'),
        ],
      });
    }
  }

  const afk = await client.db.afk.findUnique({
    where: { userId: message.author.id },
  });

  if (afk) {
    await client.db.afk.delete({ where: { userId: message.author.id } });

    const channel = message.channel;
    if (channel.isTextBased() && 'send' in channel) {
      (channel as SendableChannel).send({
        embeds: [
          new EmbedBuilder()
            .setTitle('👋 Welcome Back!')
            .setDescription(`${message.author} is no longer AFK.`)
            .setColor('#00FF00'),
        ],
      });
    }
  }
}
