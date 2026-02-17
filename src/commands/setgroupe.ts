import { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';
import type { BotCommand } from '../types/index.js';
import { getGroupKeys } from '../lib/icalUrl.js';

export const setgroupeCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('setgroupe')
    .setDescription('Definir votre groupe par defaut')
    .toJSON(),
  sendDM: true,

  run: async (_client, interaction) => {
    const choices = getGroupKeys();

    const select = new StringSelectMenuBuilder()
      .setCustomId('setgroupe_select')
      .setPlaceholder('Choisissez votre groupe')
      .addOptions(choices.map(c => ({ label: c, value: c })));

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);

    await interaction.reply({ content: 'Veuillez choisir votre groupe :', components: [row], ephemeral: true });
  },
};
