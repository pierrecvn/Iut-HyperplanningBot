import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import type { BotCommand } from '../types/index.js';
import { getUserGroup, setRappelPrefs } from '../services/userService.js';
import { noGroupEmbed } from '../lib/embedBuilder.js';
import { Colors } from '../config.js';

const CHOICES = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60];

export const rappelCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('rappel')
    .setDescription('Active ou desactive les rappels de cours en DM')
    .addBooleanOption(opt => opt
      .setName('activer')
      .setDescription('Activer ou desactiver les rappels')
      .setRequired(true),
    )
    .addIntegerOption(opt => opt
      .setName('temps')
      .setDescription('Minutes avant le cours (defaut: 15)')
      .setAutocomplete(true),
    )
    .toJSON(),
  sendDM: true,

  runAutocomplete: async (_client, interaction) => {
    const focused = interaction.options.getFocused(true);
    const filtered = CHOICES
      .map(c => ({ name: `${c} min avant le cours`, value: c }))
      .filter(c => c.name.includes(focused.value));
    await interaction.respond(filtered.slice(0, 25).map(c => ({ name: c.name, value: c.value })));
  },

  run: async (_client, interaction) => {
    const active = interaction.options.getBoolean('activer', true);
    const minutes = interaction.options.getInteger('temps') ?? 15;

    const group = await getUserGroup(interaction.user.id);
    if (!group) {
      await interaction.reply({ embeds: [noGroupEmbed()], ephemeral: true });
      return;
    }

    await setRappelPrefs(interaction.user.id, active ? minutes : 0);

    const status = active ? '`Active` :white_check_mark:' : '`Desactive` :x:';
    await interaction.reply({
      embeds: [new EmbedBuilder()
        .setColor(active ? Colors.success : Colors.error)
        .setDescription(`Rappels ${status} - ${minutes} min avant le cours`)],
      ephemeral: true,
    });
  },
};
