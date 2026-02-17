import { EmbedBuilder } from 'discord.js';
import { Colors } from '../config.js';
import messages from '../data/messages.json' with { type: 'json' };

export function errorEmbed(description: string): EmbedBuilder {
  return new EmbedBuilder().setColor(Colors.error).setDescription(description);
}

export function successEmbed(description: string): EmbedBuilder {
  return new EmbedBuilder().setColor(Colors.success).setDescription(description);
}

export function infoEmbed(title: string, description?: string): EmbedBuilder {
  const embed = new EmbedBuilder().setColor(Colors.info).setTitle(title);
  if (description) embed.setDescription(description);
  return embed;
}

export function noGroupEmbed(): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle(messages.noGroupTitle)
    .setColor(Colors.info)
    .setDescription(
      "Guide d'utilisation:\nVous pouvez utiliser `/edt texte` ou `/edt image` pour obtenir l'emploi du temps de votre classe."
    )
    .addFields(
      { name: ':warning: Definir votre groupe', value: '`/setgroupe`', inline: false },
      { name: "EDT d'une autre classe", value: '`/edt texte <classe>`', inline: false },
      { name: 'Activer les rappels', value: '`/rappel activer`', inline: false },
    )
    .setTimestamp();
}
