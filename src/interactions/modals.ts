import { Client, Guild, ModalSubmitInteraction, EmbedBuilder } from 'discord.js';
import { upsertUtilisateur } from '../services/userService.js';
import { assignGroupRole, assignVerifiedRole } from '../services/roleService.js';
import { Colors, config } from '../config.js';

type ModalHandler = (client: Client, interaction: ModalSubmitInteraction) => Promise<void>;

export const modalHandlers = new Map<string, ModalHandler>();

export function getModalHandler(customId: string): ModalHandler | undefined {
  const direct = modalHandlers.get(customId);
  if (direct) return direct;

  if (customId.startsWith('onboarding_modal_')) return handleOnboardingModal;
  if (customId.startsWith('setgroupe_modal_')) return handleSetgroupeModal;

  return undefined;
}

/** Resolve the guild — use interaction.guild if available, otherwise fetch from config */
function resolveGuild(client: Client, interaction: ModalSubmitInteraction): Guild | undefined {
  return interaction.guild ?? client.guilds.cache.get(config.discord.guildId) ?? undefined;
}

// Onboarding modal (new member)
async function handleOnboardingModal(client: Client, interaction: ModalSubmitInteraction): Promise<void> {
  const group = interaction.customId.replace('onboarding_modal_', '');
  const prenom = interaction.fields.getTextInputValue('prenom').trim();
  const nom = interaction.fields.getTextInputValue('nom').trim();
  const fullName = `${prenom} ${nom}`;
  const guild = resolveGuild(client, interaction);

  await upsertUtilisateur(interaction.user.id, fullName, group);

  let renamed = false;
  if (guild) {
    try {
      const member = await guild.members.fetch(interaction.user.id);
      await member.setNickname(`[${group}] - ${fullName}`);
      renamed = true;
      await assignGroupRole(guild, member, group);
      await assignVerifiedRole(guild, member);
    } catch (err) {
      console.error(`[Onboarding] Erreur rename ${interaction.user.tag}:`, err);
    }
  }

  const embed = new EmbedBuilder()
    .setTitle('Profil configure !')
    .setColor(Colors.success)
    .setDescription(`**Groupe :** ${group}\n**Nom :** ${fullName}${renamed ? '' : '\n\n:warning: Impossible de changer le pseudo.'}`)
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

// /setgroupe modal (existing member changing group)
async function handleSetgroupeModal(client: Client, interaction: ModalSubmitInteraction): Promise<void> {
  const group = interaction.customId.replace('setgroupe_modal_', '');
  const prenom = interaction.fields.getTextInputValue('prenom').trim();
  const nom = interaction.fields.getTextInputValue('nom').trim();
  const fullName = `${prenom} ${nom}`;
  const guild = resolveGuild(client, interaction);

  await upsertUtilisateur(interaction.user.id, fullName, group);

  let renamed = false;
  if (guild) {
    try {
      const member = await guild.members.fetch(interaction.user.id);
      const nickname = `[${group}] - ${fullName}`;
      console.log(`[Setgroupe] Rename ${interaction.user.tag} -> "${nickname}"`);
      await member.setNickname(nickname);
      renamed = true;
      await assignGroupRole(guild, member, group);
      await assignVerifiedRole(guild, member);
    } catch (err) {
      console.error(`[Setgroupe] Erreur rename ${interaction.user.tag}:`, err);
    }
  } else {
    console.warn(`[Setgroupe] Pas de guild disponible (DM sans GUILD_ID ?)`);
  }

  const embed = new EmbedBuilder()
    .setTitle(`Groupe defini : ${group}`)
    .setColor(Colors.success)
    .setDescription(`**Nom :** ${fullName}${renamed ? '' : '\n\n:warning: Impossible de changer le pseudo (verifiez les permissions du bot).'}`)
    .setFooter({ text: 'setgroupe', iconURL: interaction.user.displayAvatarURL() });

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
