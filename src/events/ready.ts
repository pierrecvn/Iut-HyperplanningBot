import { Client, REST, Routes, ActivityType } from 'discord.js';
import { config } from '../config.js';
import { commands, commandsJSON } from '../commands/index.js';
import { getBrowser } from '../lib/puppeteer.js';
import { startReminderLoop } from '../services/reminderService.js';

const PRESENCES = [
  { name: '/edt pour ton EDT', type: ActivityType.Playing as const },
  { name: '/help pour les commandes', type: ActivityType.Watching as const },
  { name: 'Hyperplanning', type: ActivityType.Competing as const },
];

export async function handleReady(client: Client): Promise<void> {
  console.log(`[Bot] ${client.user?.username} est en ligne.`);

  // Register slash commands
  const rest = new REST({ version: '10' }).setToken(config.discord.token);
  try {
    console.log(`[Bot] Enregistrement de ${commandsJSON.length} commandes...`);
    await rest.put(
      Routes.applicationGuildCommands(config.discord.clientId, config.discord.guildId),
      { body: commandsJSON },
    );
    console.log('[Bot] Commandes enregistrees.');
  } catch (err) {
    console.error('[Bot] Erreur enregistrement commandes:', err);
  }

  // Launch Puppeteer
  try {
    await getBrowser();
  } catch (err) {
    console.error('[Bot] Erreur lancement Puppeteer:', err);
  }

  // Start reminder loop
  startReminderLoop(client);

  // Presence rotation
  let presenceIndex = 0;
  const updatePresence = () => {
    const p = PRESENCES[presenceIndex % PRESENCES.length];
    client.user?.setActivity(p.name, { type: p.type });
    presenceIndex++;
  };
  updatePresence();
  setInterval(updatePresence, 60_000);
}
