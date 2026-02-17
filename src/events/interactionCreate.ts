import { Client, Interaction, EmbedBuilder } from 'discord.js';
import { commands } from '../commands/index.js';
import { buttonHandlers } from '../interactions/buttons.js';
import { modalHandlers, getModalHandler } from '../interactions/modals.js';
import { selectMenuHandlers } from '../interactions/selectMenus.js';
import { Colors, COOLDOWN_MS, config } from '../config.js';
import messages from '../data/messages.json' with { type: 'json' };
import type { BotCommand } from '../types/index.js';

const cooldowns = new Map<string, number>();

export async function handleInteraction(client: Client, interaction: Interaction): Promise<void> {
  try {
    // Slash commands
    if (interaction.isChatInputCommand()) {
      const command = commands.get(interaction.commandName);
      if (!command) return;

      // Dev only check
      if (command.devOnly && !config.discord.developerIds.includes(interaction.user.id)) {
        await interaction.reply({ embeds: [new EmbedBuilder().setColor(Colors.error).setDescription(messages.commandDevOnly)], ephemeral: true });
        return;
      }

      // DM check
      if (!interaction.inGuild() && !command.sendDM) {
        await interaction.reply({ embeds: [new EmbedBuilder().setColor(Colors.error).setDescription(messages.commandDmOnly)], ephemeral: true });
        return;
      }

      // Permissions (guild only)
      if (interaction.inGuild()) {
        if (command.userPermissions?.length) {
          for (const perm of command.userPermissions) {
            if (!interaction.memberPermissions?.has(perm)) {
              await interaction.reply({ embeds: [new EmbedBuilder().setColor(Colors.error).setDescription(messages.userNoPermissions)], ephemeral: true });
              return;
            }
          }
        }
        if (command.botPermissions?.length) {
          const bot = interaction.guild?.members.me;
          if (bot) {
            for (const perm of command.botPermissions) {
              if (!bot.permissions.has(perm)) {
                await interaction.reply({ embeds: [new EmbedBuilder().setColor(Colors.error).setDescription(messages.botNoPermissions)], ephemeral: true });
                return;
              }
            }
          }
        }
      }

      // Cooldown
      if (command.cooldown) {
        const key = `${interaction.user.id}-${interaction.commandName}`;
        const last = cooldowns.get(key);
        if (last && Date.now() - last < COOLDOWN_MS) {
          await interaction.reply({ embeds: [new EmbedBuilder().setColor(Colors.error).setDescription(messages.commandTimeOut)], ephemeral: true });
          return;
        }
        cooldowns.set(key, Date.now());
      }

      await command.run(client, interaction);
      return;
    }

    // Autocomplete
    if (interaction.isAutocomplete()) {
      const command = commands.get(interaction.commandName);
      if (command?.runAutocomplete) {
        await command.runAutocomplete(client, interaction);
      }
      return;
    }

    // Buttons
    if (interaction.isButton()) {
      const handler = buttonHandlers.get(interaction.customId);
      if (handler) await handler(client, interaction);
      return;
    }

    // Select menus
    if (interaction.isStringSelectMenu()) {
      const handler = selectMenuHandlers.get(interaction.customId);
      if (handler) await handler(client, interaction);
      return;
    }

    // Modals
    if (interaction.isModalSubmit()) {
      const handler = getModalHandler(interaction.customId);
      if (handler) await handler(client, interaction);
      return;
    }
  } catch (err) {
    console.error('[InteractionCreate] Erreur:', err);
    const reply = { embeds: [new EmbedBuilder().setColor(Colors.error).setDescription(messages.embedErrorMessage)], ephemeral: true };
    if (interaction.isRepliable()) {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(reply).catch(() => {});
      } else {
        await interaction.reply(reply).catch(() => {});
      }
    }
  }
}
