import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import type { BotCommand } from '../types/index.js';
import { getGroupKeys } from '../lib/icalUrl.js';
import { getUsersByGroup } from '../services/userService.js';
import { Colors } from '../config.js';

export const classeCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('classe')
    .setDescription('Liste des etudiants dans un groupe')
    .addStringOption(opt => opt
      .setName('groupe')
      .setDescription('Le groupe de la classe')
      .setAutocomplete(true)
      .setRequired(true),
    )
    .toJSON(),
  sendDM: true,

  runAutocomplete: async (_client, interaction) => {
    const focused = interaction.options.getFocused(true);
    const keys = getGroupKeys();
    // Get unique first letters
    const seen = new Set<string>();
    const firstChars = keys.reduce<string[]>((acc, k) => {
      const c = k[0];
      if (!seen.has(c)) { seen.add(c); acc.push(c); }
      return acc;
    }, []);
    const filtered = firstChars.filter(c => c.toLowerCase().includes(focused.value.toLowerCase()));
    await interaction.respond(filtered.slice(0, 25).map(c => ({ name: `INFO ${c}`, value: c })));
  },

  run: async (_client, interaction) => {
    const groupe = interaction.options.getString('groupe', true);
    const users = await getUsersByGroup(groupe);

    // Group by sub-group
    const groups: Record<string, string[]> = {};
    for (const u of users) {
      if (!groups[u.group]) groups[u.group] = [];
      groups[u.group].push(`<@${u.discordId}>`);
    }

    const embed = new EmbedBuilder()
      .setTitle(`INFO ${groupe}`)
      .setDescription(`Etudiants dans le groupe ${groupe}`)
      .setColor(Colors.info);

    for (const [grp, mentions] of Object.entries(groups)) {
      embed.addFields({ name: `Groupe ${grp}`, value: mentions.join('\n') || 'Aucun', inline: true });
    }

    embed.setFooter({
      text: `Nombre d'eleves : ${users.length}`,
      iconURL: interaction.user.displayAvatarURL(),
    });

    await interaction.reply({ embeds: [embed] });
  },
};
