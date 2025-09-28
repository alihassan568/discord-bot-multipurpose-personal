import { EmbedBuilder, Message } from 'discord.js';
import { BotClient } from '../types';
import os from 'os';

export default {
    name: 'messageCreate',
    async execute(message: Message, client: BotClient) {
        if (message.author.bot) return;

        if (message.mentions.has(client.user!, { ignoreEveryone: true, ignoreRoles: true })) {
          
            const cpus = os.cpus();
            const cpuModel = cpus[0]?.model || "Unknown CPU";
            const cpuSpeed = (cpus[0]?.speed || 0) / 1000; 
            const cores = os.availableParallelism?.() || cpus.length;

            const totalRam = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
            const usedRam = ((os.totalmem() - os.freemem()) / 1024 / 1024 / 1024).toFixed(2);

            const embed = new EmbedBuilder()
                .setTitle(`🤖 ${client.user?.username} Information`)
                .setThumbnail(client.user?.displayAvatarURL() || '')
                .setColor(0x5865f2)
                .addFields(
                    { name: '👑 Owner', value: `<@${client.config.ownerIds[0]}>`, inline: true },
                    { name: '🌐 Servers', value: `${client.guilds.cache.size}`, inline: true },
                    { name: '👥 Users', value: `${client.guilds.cache.reduce((a, g) => a + g.memberCount, 0)}`, inline: true },
                    { name: '⚙️ Commands', value: `${client.commands.size}`, inline: true },
                    { name: '📅 Created', value: `<t:${Math.floor(client.user!.createdTimestamp / 1000)}:D>`, inline: true },
                    { name: '⏱️ Uptime', value: `<t:${Math.floor((Date.now() - client.uptime!) / 1000)}:R>`, inline: true },
                )
                .addFields(
                    {
                        name: '🖥️ System',
                        value: `**Platform:** ${os.platform()}  
                        **CPU:** ${cpuModel} (${cores} cores @ ${cpuSpeed.toFixed(2)}GHz)  
                        **RAM:** ${usedRam} / ${totalRam} GB`,
                        inline: false,
                    }
                )
                .setFooter({ text: `Bot ID: ${client.user?.id}` })
                .setTimestamp();

            await message.reply({ embeds: [embed] });
        }
    },
};