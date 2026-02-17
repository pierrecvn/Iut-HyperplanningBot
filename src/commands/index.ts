import type { BotCommand } from '../types/index.js';
import { pingCommand } from './ping.js';
import { helpCommand } from './help.js';
import { infoCommand } from './info.js';
import { edtCommand } from './edt.js';
import { setgroupeCommand } from './setgroupe.js';
import { classeCommand } from './classe.js';
import { salleCommand } from './salle.js';
import { rappelCommand } from './rappel.js';
import { setupCommand } from './setup.js';

const allCommands: BotCommand[] = [
  pingCommand,
  helpCommand,
  infoCommand,
  edtCommand,
  setgroupeCommand,
  classeCommand,
  salleCommand,
  rappelCommand,
  setupCommand,
];

export const commands = new Map<string, BotCommand>();
export const commandsJSON: object[] = [];

for (const cmd of allCommands) {
  commands.set(cmd.data.name, cmd);
  commandsJSON.push(cmd.data);
}
