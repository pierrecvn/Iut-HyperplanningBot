import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import type { BotCommand } from '../types/index.js';

export const pingCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Montre le ping du bot')
    .toJSON(),
  sendDM: true,

  run: async (client, interaction) => {
    const sent = await interaction.reply({ content: 'Pong...', fetchReply: true });

    const embed = new EmbedBuilder()
      .setTitle('Pong!')
      .addFields(
        { name: 'Latence API', value: `\`\`\`${client.ws.ping}ms\`\`\``, inline: true },
        { name: 'Latence BOT', value: `\`\`\`${sent.createdTimestamp - interaction.createdTimestamp}ms\`\`\``, inline: true },
        { name: 'Uptime', value: `<t:${Math.floor(client.readyTimestamp! / 1000)}:R>`, inline: false },
      )
      .setColor(0xf00020)
      .setTimestamp()
      .setFooter({ text: interaction.user.username, iconURL: interaction.user.displayAvatarURL() });

    await interaction.editReply({ content: '', embeds: [embed] });
  },
};
