import {
  ChatInputCommandInteraction,
  AutocompleteInteraction,
  SlashCommandBuilder,
  SlashCommandSubcommandsOnlyBuilder,
  PermissionFlagsBits,
  Client,
} from 'discord.js';

type PermissionFlag = typeof PermissionFlagsBits[keyof typeof PermissionFlagsBits];

export interface BotCommand {
  data: ReturnType<SlashCommandBuilder['toJSON']> | ReturnType<SlashCommandSubcommandsOnlyBuilder['toJSON']>;
  userPermissions?: PermissionFlag[];
  botPermissions?: PermissionFlag[];
  devOnly?: boolean;
  cooldown?: boolean;
  sendDM?: boolean;
  run: (client: Client, interaction: ChatInputCommandInteraction) => Promise<void>;
  runAutocomplete?: (client: Client, interaction: AutocompleteInteraction) => Promise<void>;
}
