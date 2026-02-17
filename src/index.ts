import { Client, GatewayIntentBits } from 'discord.js';
import { config } from './config.js';
import { handleReady } from './events/ready.js';
import { handleInteraction } from './events/interactionCreate.js';
import { handleGuildMemberAdd } from './events/guildMemberAdd.js';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildPresences,
  ],
});

client.once('ready', () => handleReady(client));
client.on('interactionCreate', (interaction) => handleInteraction(client, interaction));
client.on('guildMemberAdd', (member) => handleGuildMemberAdd(member));

client.login(config.discord.token);
