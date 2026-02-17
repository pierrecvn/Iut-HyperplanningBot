import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import type { BotCommand } from '../types/index.js';
import { commands } from './index.js';
import messages from '../data/messages.json' with { type: 'json' };

export const helpCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Montre toutes les commandes du bot disponibles')
    .toJSON(),
  sendDM: true,

  run: async (_client, interaction) => {
    const embeds: EmbedBuilder[] = [];

    const commandList = [...commands.values()];
    const pageSize = 5;

    for (let i = 0; i < commandList.length; i += pageSize) {
      const page = commandList.slice(i, i + pageSize);
      const embed = new EmbedBuilder()
        .setTitle('Commandes disponibles')
        .setColor(0x0099ff)
        .setFooter({ text: `Page ${Math.floor(i / pageSize) + 1}/${Math.ceil(commandList.length / pageSize)} - ${messages.footerText}` })
        .setTimestamp();

      for (const cmd of page) {
        embed.addFields({ name: `/${cmd.data.name}`, value: cmd.data.description || 'Pas de description' });
      }

      embeds.push(embed);
    }

    if (embeds.length <= 1) {
      await interaction.reply({ embeds, ephemeral: false });
      return;
    }

    // Pagination
    await interaction.deferReply();

    let index = 0;
    const prev = new ButtonBuilder().setCustomId('help_prev').setEmoji('\u2b05\ufe0f').setStyle(ButtonStyle.Primary).setDisabled(true);
    const home = new ButtonBuilder().setCustomId('help_home').setEmoji('\ud83c\udfe0').setStyle(ButtonStyle.Secondary).setDisabled(true);
    const next = new ButtonBuilder().setCustomId('help_next').setEmoji('\u27a1\ufe0f').setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(prev, home, next);

    const msg = await interaction.editReply({ embeds: [embeds[index]], components: [row] });

    const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60_000 });

    collector.on('collect', async (i) => {
      if (i.user.id !== interaction.user.id) {
        await i.reply({ content: 'Ce menu ne vous appartient pas.', ephemeral: true });
        return;
      }
      await i.deferUpdate();

      if (i.customId === 'help_prev' && index > 0) index--;
      else if (i.customId === 'help_home') index = 0;
      else if (i.customId === 'help_next' && index < embeds.length - 1) index++;

      prev.setDisabled(index === 0);
      home.setDisabled(index === 0);
      next.setDisabled(index === embeds.length - 1);

      await msg.edit({ embeds: [embeds[index]], components: [row] });
      collector.resetTimer();
    });

    collector.on('end', async () => {
      await msg.edit({ embeds: [embeds[index]], components: [] }).catch(() => {});
    });
  },
};
