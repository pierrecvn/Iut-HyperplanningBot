import { GuildMember, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { Colors } from '../config.js';
import { getUserInfo } from '../services/userService.js';
import { assignGroupRole, assignVerifiedRole } from '../services/roleService.js';
import messages from '../data/messages.json' with { type: 'json' };

export async function handleGuildMemberAdd(member: GuildMember): Promise<void> {
  try {
    // Check if user already has a group in utilisateur table
    const userInfo = await getUserInfo(member.id);

    if (userInfo?.group && userInfo.fullName) {
      // Auto-rename + assign group role + Verifie role
      const nickname = `[${userInfo.group}] - ${userInfo.fullName}`;
      await member.setNickname(nickname).catch(() => {});
      await assignGroupRole(member.guild, member, userInfo.group).catch(() => {});
      await assignVerifiedRole(member.guild, member).catch(() => {});
      console.log(`[Onboarding] ${member.user.tag} auto-rename -> ${nickname}`);
      return;
    }

    // DM fallback: send welcome embed with setup button
    const embed = new EmbedBuilder()
      .setTitle(messages.onboardingWelcomeTitle)
      .setColor(Colors.info)
      .setDescription(messages.onboardingWelcomeDescription)
      .setThumbnail(member.user.displayAvatarURL())
      .setTimestamp();

    const button = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('onboarding_start')
        .setLabel(messages.onboardingButtonLabel)
        .setStyle(ButtonStyle.Primary),
    );

    await member.send({ embeds: [embed], components: [button] }).catch(() => {
      console.warn(`[Onboarding] Impossible d'envoyer un DM a ${member.user.tag}`);
    });
  } catch (err) {
    console.error('[Onboarding] Erreur:', err);
  }
}
