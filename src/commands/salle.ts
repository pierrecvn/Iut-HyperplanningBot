import { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } from 'discord.js';
import type { BotCommand, ICalEvent } from '../types/index.js';
import { getSummary, getLocation, getMatiere } from '../types/ical.js';
import { getIcalUrlSalle, getSalleKeys } from '../lib/icalUrl.js';
import { fetchEvents, getEventsForDate } from '../lib/icalFetcher.js';
import { formaterHeure, formaterDuree, formaterDateCourte } from '../lib/formatters.js';
import { generateEdtImage } from '../services/edtImageService.js';
import { Colors } from '../config.js';
import ical from 'node-ical';

export const salleCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('salle')
    .setDescription('Salles disponibles ou EDT d\'une salle')
    .addStringOption(opt => opt
      .setName('numero')
      .setDescription('La salle')
      .setAutocomplete(true),
    )
    .toJSON(),
  cooldown: true,
  sendDM: true,

  runAutocomplete: async (_client, interaction) => {
    const focused = interaction.options.getFocused(true);
    const keys = getSalleKeys().filter(k => k.startsWith(focused.value));
    await interaction.respond(keys.slice(0, 25).map(k => ({ name: k.substring(0, 3), value: k })));
  },

  run: async (_client, interaction) => {
    const startTime = Date.now();
    await interaction.deferReply();

    const salle = interaction.options.getString('numero');

    if (salle) {
      await showSalleEdt(interaction, salle, startTime);
    } else {
      await showSallesLibres(interaction);
    }
  },
};

async function showSalleEdt(
  interaction: import('discord.js').ChatInputCommandInteraction,
  salle: string,
  startTime: number,
): Promise<void> {
  const url = getIcalUrlSalle(salle);
  if (!url) {
    await interaction.editReply({
      embeds: [new EmbedBuilder().setTitle('Salle non valide').setColor(Colors.error).setDescription('Cette salle est invalide.\nEx : /salle 602').setTimestamp()],
    });
    return;
  }

  let allEvents: ICalEvent[];
  try {
    allEvents = await fetchEvents(url);
  } catch {
    await interaction.editReply({ content: "Erreur lors de la recuperation des donnees." });
    return;
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const events = getEventsForDate(allEvents, now);

  if (events.length === 0) {
    await interaction.editReply({
      embeds: [new EmbedBuilder()
        .setTitle(`Emploi du temps du ${formaterDateCourte(now)}`)
        .setColor(Colors.info)
        .setDescription("Cette salle est libre, il n'y a aucun cours dedans")
        .setTimestamp()],
    });
    return;
  }

  const salleName = `Salle ${salle.substring(0, 3)}`;
  const { imagePath, currentEvent } = await generateEdtImage(events, now, salleName);
  const rnd = Math.floor(Math.random() * 1000000);
  const filename = `salle_${rnd}.png`;
  const attachment = new AttachmentBuilder(imagePath, { name: filename });
  const genTime = ((Date.now() - startTime) / 1000).toFixed(1);

  let embed: EmbedBuilder;
  if (currentEvent) {
    const start = new Date(currentEvent.start);
    const end = new Date(currentEvent.end);
    const timeToEnd = end.getTime() - Date.now();

    embed = new EmbedBuilder()
      .setTitle('Cours actuel :')
      .setDescription(getSummary(currentEvent))
      .setColor(Colors.active)
      .setImage(`attachment://${filename}`)
      .addFields(
        { name: 'Salle', value: getLocation(currentEvent), inline: true },
        { name: 'Matiere', value: getMatiere(currentEvent), inline: true },
        { name: '\u200B', value: '\u200B', inline: true },
        { name: 'Debut', value: formaterHeure(start), inline: true },
        { name: 'Fin', value: formaterHeure(end), inline: true },
        { name: '\u200B', value: '\u200B', inline: true },
        { name: 'Fin dans', value: timeToEnd > 0 ? formaterDuree(timeToEnd, true) : 'Termine', inline: true },
      )
      .setTimestamp()
      .setFooter({ text: `Generation : ${genTime}s` });
  } else {
    embed = new EmbedBuilder()
      .setTitle(`EDT Salle ${salle} - ${formaterDateCourte(now)}`)
      .setColor(Colors.info)
      .setImage(`attachment://${filename}`)
      .setDescription('Aucun cours en cours.')
      .setFooter({ text: `Generation : ${genTime}s` })
      .setTimestamp();
  }

  await interaction.editReply({ embeds: [embed], files: [attachment] });

  const fs = await import('fs');
  fs.unlink(imagePath, () => {});
}

async function showSallesLibres(interaction: import('discord.js').ChatInputCommandInteraction): Promise<void> {
  const salles = getSalleKeys();
  const sallesLibres: Array<{ salle: string; freeUntil: Date }> = [];

  for (const salle of salles) {
    const url = getIcalUrlSalle(salle);
    if (!url) continue;

    try {
      const data = await ical.async.fromURL(url);
      const events = Object.values(data)
        .filter(ev => (ev as Record<string, unknown>).type === 'VEVENT')
        .map(ev => ev as unknown as ICalEvent)
        .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

      const now = new Date();

      // Find free gaps
      for (let i = 0; i < events.length - 1; i++) {
        const gapStart = new Date(events[i].end);
        const gapEnd = new Date(events[i + 1].start);
        if (now >= gapStart && now <= gapEnd) {
          sallesLibres.push({ salle, freeUntil: gapEnd });
          break;
        }
      }
    } catch {
      // Skip failing rooms
    }
  }

  const embed = new EmbedBuilder().setTitle('Salles libres').setColor(Colors.info);

  if (sallesLibres.length === 0) {
    embed.setDescription('Aucune salle libre trouvee.');
  } else {
    for (const s of sallesLibres) {
      const h = s.freeUntil.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' });
      embed.addFields({
        name: s.salle.substring(0, 3),
        value: `Disponible jusqu'a\n${h}`,
        inline: true,
      });
    }
  }

  await interaction.editReply({ embeds: [embed] });
}
