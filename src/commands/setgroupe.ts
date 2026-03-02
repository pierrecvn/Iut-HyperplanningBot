import { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import type { BotCommand } from '../types/index.js';
import { getGroupKeys } from '../lib/icalUrl.js';
import { SPECIAL_ROLES } from '../services/roleService.js';

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

    const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);

    const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      ...SPECIAL_ROLES.map(role =>
        new ButtonBuilder()
          .setCustomId(`setgroupe_special_${role}`)
          .setLabel(role)
          .setStyle(ButtonStyle.Secondary),
      ),
    );

    await interaction.reply({ content: 'Veuillez choisir votre groupe :', components: [selectRow, buttonRow], ephemeral: true });
  },
};
