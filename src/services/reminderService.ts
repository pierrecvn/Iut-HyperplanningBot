import { Client, EmbedBuilder } from 'discord.js';
import schedule from 'node-schedule';
import { getAllActiveReminders } from './userService.js';
import { getIcalUrlClass } from '../lib/icalUrl.js';
import { fetchEvents, getEventsForDate } from '../lib/icalFetcher.js';
import { formaterHeure } from '../lib/formatters.js';
import { getSummary, getLocation } from '../types/ical.js';
import { Colors, REMINDER_REFRESH_MS } from '../config.js';

export function startReminderLoop(client: Client): void {
  console.log('[Rappels] Demarrage du service de rappels...');
  scheduleReminders(client);
  setInterval(() => scheduleReminders(client), REMINDER_REFRESH_MS);
}

async function scheduleReminders(client: Client): Promise<void> {
  try {
    const grouped = await getAllActiveReminders();

    for (const [group, users] of grouped) {
      const url = getIcalUrlClass(group);
      if (!url) continue;

      let allEvents;
      try {
        allEvents = await fetchEvents(url);
      } catch {
        continue;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const events = getEventsForDate(allEvents, today);
      events.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

      // Find next event that hasn't started yet
      const now = new Date();
      const nextEvent = events.find(ev => new Date(ev.start) > now);
      if (!nextEvent) continue;

      for (const user of users) {
        const jobDate = new Date(nextEvent.start);
        jobDate.setMinutes(jobDate.getMinutes() - user.minutes);

        // Don't schedule in the past
        if (jobDate <= now) continue;

        const jobId = `${user.discordId}-${nextEvent.uid}`;

        // Cancel existing job with same ID
        const existing = schedule.scheduledJobs[jobId];
        if (existing) existing.cancel();

        const summary = getSummary(nextEvent);
        const location = getLocation(nextEvent);
        const startTime = formaterHeure(new Date(nextEvent.start));
        const endTime = formaterHeure(new Date(nextEvent.end));

        schedule.scheduleJob(jobId, jobDate, async () => {
          try {
            const discordUser = await client.users.fetch(user.discordId);
            const embed = new EmbedBuilder()
              .setTitle(`Prochain cours : ${summary}`)
              .setColor(Colors.info)
              .setDescription(`> Debut : ${startTime}\n> Fin : ${endTime}\n> Salle : ${location}`)
              .setFooter({ text: `Rappel ${user.minutes} min` });

            await discordUser.send({ embeds: [embed] });
          } catch (err) {
            console.error(`[Rappels] Impossible d'envoyer a ${user.discordId}:`, err);
          }
        });
      }
    }
  } catch (err) {
    console.error('[Rappels] Erreur:', err);
  }
}
