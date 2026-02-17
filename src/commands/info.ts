import { SlashCommandBuilder, EmbedBuilder, time, GuildMember } from 'discord.js';
import type { BotCommand } from '../types/index.js';
import { getUserGroup } from '../services/userService.js';
import pkg from '../../package.json' with { type: 'json' };

function getStatusText(status: string | undefined | null): string {
  switch (status) {
    case 'online': return 'En ligne';
    case 'idle': return 'Absent';
    case 'dnd': return 'Ne pas deranger';
    default: return 'Hors ligne';
  }
}

export const infoCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('info')
    .setDescription("Informations sur le bot, le serveur ou un utilisateur")
    .addSubcommand(sub => sub.setName('bot').setDescription('Informations sur le bot'))
    .addSubcommand(sub => sub.setName('server').setDescription('Informations sur le serveur'))
    .addSubcommand(sub => sub
      .setName('user')
      .setDescription("Informations sur un utilisateur")
      .addUserOption(opt => opt.setName('utilisateur').setDescription("L'utilisateur cible")),
    )
    .toJSON(),
  sendDM: false,

  run: async (client, interaction) => {
    await interaction.deferReply({ ephemeral: true });
    const sub = interaction.options.getSubcommand();
    const guild = interaction.guild!;
    const embed = new EmbedBuilder().setColor(0x00ff00);

    switch (sub) {
      case 'user': {
        const user = interaction.options.getUser('utilisateur') ?? interaction.user;
        const member = guild.members.cache.get(user.id) as GuildMember | undefined;
        const group = await getUserGroup(user.id);
        const statusText = member?.presence ? getStatusText(member.presence.status) : 'Hors ligne';

        embed.setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() });
        embed.addFields(
          { name: 'User ID', value: user.id, inline: true },
          { name: 'Surnom', value: member?.nickname ?? 'Aucun', inline: true },
          { name: 'Username', value: user.username, inline: true },
          { name: 'Status', value: statusText, inline: true },
          { name: 'A rejoint le serveur', value: member ? time(member.joinedAt!, 'R') : 'Inconnu', inline: true },
          { name: 'A rejoint Discord', value: time(user.createdAt, 'R'), inline: true },
          { name: 'Groupe', value: group ?? 'Aucun', inline: true },
        );
        embed.setThumbnail(user.displayAvatarURL());
        break;
      }

      case 'server': {
        embed.setAuthor({ name: guild.name, iconURL: guild.iconURL() ?? undefined });
        embed.setFields(
          { name: 'Createur', value: `<@${guild.ownerId}>`, inline: true },
          { name: 'Membres', value: `${guild.memberCount}`, inline: true },
          { name: 'Roles', value: `${guild.roles.cache.size}`, inline: true },
          { name: 'Salons', value: `${guild.channels.cache.size}`, inline: true },
          { name: 'Cree', value: time(guild.createdAt, 'R'), inline: true },
          { name: 'Boost', value: `${guild.premiumSubscriptionCount ?? 0}`, inline: true },
        );
        if (guild.iconURL()) embed.setThumbnail(guild.iconURL()!);
        break;
      }

      case 'bot': {
        const uptime = new Date(Date.now() - client.uptime!);
        embed.setAuthor({ name: client.user!.tag, iconURL: client.user!.displayAvatarURL() });
        embed.setFields(
          { name: 'Ping', value: `${Math.round(client.ws.ping)}ms`, inline: true },
          { name: 'Uptime', value: time(uptime, 'R'), inline: true },
          { name: 'RAM', value: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`, inline: true },
          { name: 'Node.js', value: process.version, inline: true },
          { name: 'discord.js', value: pkg.dependencies['discord.js'], inline: true },
        );
        embed.setThumbnail(client.user!.displayAvatarURL());
        break;
      }
    }

    await interaction.editReply({ embeds: [embed] });
  },
};
