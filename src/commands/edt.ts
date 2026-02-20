import { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } from 'discord.js';
import type { BotCommand, ICalEvent } from '../types/index.js';
import { getSummary, getLocation, getMatiere } from '../types/ical.js';
import { getUserGroup } from '../services/userService.js';
import { getIcalUrlClass, getGroupKeys } from '../lib/icalUrl.js';
import { fetchEvents, getEventsForDate } from '../lib/icalFetcher.js';
import { formaterHeure, formaterDuree, calculerTempsRestant, formaterDateFr, formaterDateCourte } from '../lib/formatters.js';
import { noGroupEmbed } from '../lib/embedBuilder.js';
import { generateEdtImage } from '../services/edtImageService.js';
import { Colors } from '../config.js';

export const edtCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('edt')
    .setDescription('Emploi du temps')
    .addSubcommand(sub => sub
      .setName('texte')
      .setDescription("Emploi du temps en texte")
      .addStringOption(opt => opt.setName('classe').setDescription('La classe').setAutocomplete(true))
      .addStringOption(opt => opt.setName('date').setDescription('La date (JJ/MM)').setAutocomplete(true))
      .addUserOption(opt => opt.setName('utilisateur').setDescription("L'utilisateur cible")),
    )
    .addSubcommand(sub => sub
      .setName('image')
      .setDescription("Emploi du temps en image")
      .addStringOption(opt => opt.setName('classe').setDescription('La classe').setAutocomplete(true))
      .addStringOption(opt => opt.setName('date').setDescription('La date (JJ/MM)').setAutocomplete(true))
      .addUserOption(opt => opt.setName('utilisateur').setDescription("L'utilisateur cible")),
    )
    .toJSON(),
  cooldown: true,
  sendDM: true,

  runAutocomplete: async (_client, interaction) => {
    const focused = interaction.options.getFocused(true);

    if (focused.name === 'classe') {
      const choices = getGroupKeys().filter(k => k.startsWith(focused.value.toUpperCase()));
      await interaction.respond(choices.slice(0, 25).map(c => ({ name: c, value: c })));
    } else if (focused.name === 'date') {
      const choices = Array.from({ length: 25 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() + i);
        const val = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
        const label = d.toLocaleDateString('fr-FR', { weekday: 'long', month: 'long', day: 'numeric' });
        return { name: `${val} : ${label.charAt(0).toUpperCase() + label.slice(1)}`, value: val };
      }).filter(c => c.value.startsWith(focused.value));
      await interaction.respond(choices.slice(0, 25));
    }
  },

  run: async (_client, interaction) => {
    const startTime = Date.now();
    await interaction.deferReply();

    const targetUser = interaction.options.getUser('utilisateur') ?? interaction.user;
    const specifiedClass = interaction.options.getString('classe');
    const group = specifiedClass ?? await getUserGroup(targetUser.id);

    // --- MODE TEST : /edt image classe:TEST ---
    if (specifiedClass?.toUpperCase() === 'TEST') {
      const now = new Date();
      const make = (offStart: number, offEnd: number, summary: string, location: string): ICalEvent => ({
        type: 'VEVENT', uid: Math.random().toString(), description: '',
        summary, location,
        start: new Date(now.getTime() + offStart * 60000),
        end: new Date(now.getTime() + offEnd * 60000),
      });
      const events: ICalEvent[] = [
        make(-180, -120, 'R1.01 Initiation au developpement', 'Salle A201'),
        make(-120, -60, 'Cours annule : R1.02 Dev Web', 'Salle B102'),
        make(-30, 60, 'R2.03 Qualite de developpement', 'Salle C305'),
        make(120, 180, 'R3.04 Base de donnees', 'Amphi B'),
        make(180, 240, 'R4.05 Mathematiques', 'Salle D110'),
      ];
      const sub = interaction.options.getSubcommand();
      if (sub === 'texte') {
        await sendTextEdt(interaction, events);
      } else {
        await sendImageEdt(interaction, events, now, 'TEST MODE', startTime);
      }
      return;
    }
    // --- FIN MODE TEST ---

    if (!group) {
      await interaction.editReply({ embeds: [noGroupEmbed()] });
      return;
    }

    const url = getIcalUrlClass(group.toUpperCase());
    if (!url) {
      await interaction.editReply({ content: 'Classe invalide.' });
      return;
    }

    let allEvents: ICalEvent[];
    try {
      allEvents = await fetchEvents(url);
    } catch {
      await interaction.editReply({ content: "Erreur lors de la recuperation de l'emploi du temps." });
      return;
    }

    // Parse date
    const dateStr = interaction.options.getString('date');
    const targetDate = dateStr
      ? (() => { const [d, m] = dateStr.split('/'); const dt = new Date(); dt.setMonth(parseInt(m) - 1); dt.setDate(parseInt(d)); dt.setHours(0, 0, 0, 0); return dt; })()
      : (() => { const dt = new Date(); dt.setHours(0, 0, 0, 0); return dt; })();

    const events = getEventsForDate(allEvents, targetDate);

    if (events.length === 0) {
      await interaction.editReply({
        embeds: [new EmbedBuilder()
          .setTitle(`Emploi du temps du ${formaterDateCourte(targetDate)}`)
          .setColor(Colors.info)
          .setDescription("Aucun cours aujourd'hui !")
          .setTimestamp()],
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'texte') {
      await sendTextEdt(interaction, events);
    } else {
      await sendImageEdt(interaction, events, targetDate, `Info ${group.toUpperCase()}`, startTime);
    }
  },
};

async function sendTextEdt(interaction: import('discord.js').ChatInputCommandInteraction, events: ICalEvent[]): Promise<void> {
  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    const start = new Date(ev.start);
    const end = new Date(ev.end);
    const now = new Date();
    const summary = getSummary(ev);
    const location = getLocation(ev);
    const matiere = getMatiere(ev);

    const color = now > end ? Colors.ended : (now >= start && now <= end) ? Colors.active : Colors.info;
    const timeBeforeStart = start.getTime() - now.getTime();
    const timeBeforeEnd = end.getTime() - now.getTime();

    const embed = new EmbedBuilder().setTimestamp();

    if (summary.startsWith('Cours annule')) {
      embed.setTitle(`~~${summary}~~`).setColor(Colors.ended);
    } else {
      const startText = timeBeforeStart > 0 ? `${Math.floor(timeBeforeStart / 60000)} minutes` : timeBeforeStart < 0 && timeBeforeEnd > 0 ? 'Le cours a commence' : 'Le cours est termine';
      const endText = timeBeforeEnd > 0 ? `${Math.floor(timeBeforeEnd / 60000)} minutes restantes` : 'Le cours est termine';

      embed.setTitle(summary)
        .setColor(color)
        .addFields(
          { name: 'Salle', value: location, inline: true },
          { name: 'Matiere', value: matiere, inline: true },
          { name: '\u200B', value: '\u200B', inline: true },
          { name: 'Debut', value: formaterHeure(start), inline: true },
          { name: 'Fin', value: formaterHeure(end), inline: true },
          { name: '\u200B', value: '\u200B', inline: true },
          { name: 'Temps avant debut', value: startText, inline: true },
          { name: 'Temps avant fin', value: endText, inline: true },
        );
    }

    if (i === events.length - 1) {
      embed.setFooter({ text: 'Fin de journee' });
    }

    await interaction.followUp({ embeds: [embed] });
  }
}

async function sendImageEdt(
  interaction: import('discord.js').ChatInputCommandInteraction,
  events: ICalEvent[],
  date: Date,
  groupName: string,
  startTime: number,
): Promise<void> {
  const { imagePath, currentEvent } = await generateEdtImage(events, date, groupName);
  const rnd = Math.floor(Math.random() * 1000000);
  const filename = `edt_${rnd}.png`;
  const attachment = new AttachmentBuilder(imagePath, { name: filename });
  const genTime = ((Date.now() - startTime) / 1000).toFixed(1);

  let embed: EmbedBuilder;
  if (currentEvent) {
    const start = new Date(currentEvent.start);
    const end = new Date(currentEvent.end);
    const now = new Date();
    const timeToEnd = end.getTime() - now.getTime();

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
      .setTitle(`Emploi du temps du ${formaterDateCourte(date)}`)
      .setColor(Colors.info)
      .setImage(`attachment://${filename}`)
      .setDescription('Aucun cours en cours.')
      .setFooter({ text: `Generation : ${genTime}s` })
      .setTimestamp();
  }

  await interaction.editReply({ embeds: [embed], files: [attachment] });

  // Cleanup temp file
  const fs = await import('fs');
  fs.unlink(imagePath, () => {});
}
