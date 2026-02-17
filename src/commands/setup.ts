import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits,
} from 'discord.js';
import type { BotCommand } from '../types/index.js';
import { Colors } from '../config.js';
import { VERIFIED_ROLE_NAME } from '../services/roleService.js';
import messages from '../data/messages.json' with { type: 'json' };

const GROUPS = [
  'A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'D1', 'D2',
  'E1', 'E2', 'F1', 'F2', 'G1', 'G2', 'H1', 'H2',
  'I1', 'I2', 'J1', 'J2', 'K1', 'K2', 'L1', 'L2',
];

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'] as const;

const LETTER_COLORS: Record<string, number> = {
  A: 0xFF6B6B, // rouge
  B: 0x4ECDC4, // turquoise
  C: 0x45B7D1, // bleu
  D: 0x96CEB4, // vert
  E: 0xFFEAA7, // jaune
  F: 0xDDA0DD, // violet
  G: 0xFFA502, // orange
  H: 0xFF6348, // corail
  I: 0x7BED9F, // vert clair
  J: 0x70A1FF, // bleu clair
  K: 0x5352ED, // indigo
  L: 0xFF4757, // rose
};

export const setupCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Configure la structure du serveur (roles, salons, categories)')
    .toJSON(),
  devOnly: true,

  run: async (_client, interaction) => {
    const embed = new EmbedBuilder()
      .setTitle(':warning: Setup du serveur')
      .setColor(Colors.warning)
      .setDescription(
        '**Cette action va supprimer TOUS les salons et roles du serveur, puis recreer toute la structure.**\n\n' +
        '- Role Verifie + 24 roles de groupe (A1-L2)\n' +
        '- Salon #bienvenue (visible par les non-verifies)\n' +
        '- Categorie Commun + salons\n' +
        '- 12 categories par lettre (A-L) avec permissions\n' +
        '- Categorie BDE\n\n' +
        '**Cette action est irreversible. Continuer ?**',
      );

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('setup_confirm')
        .setLabel('Confirmer le setup')
        .setStyle(ButtonStyle.Danger),
    );

    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
  },
};

export async function executeSetup(interaction: import('discord.js').ButtonInteraction): Promise<void> {
  const guild = interaction.guild;
  if (!guild) return;

  await interaction.deferUpdate();

  const botMember = guild.members.me;
  if (!botMember) return;

  // Check bot has Administrator — required for full server wipe
  if (!botMember.permissions.has(PermissionFlagsBits.Administrator)) {
    const errorEmbed = new EmbedBuilder()
      .setTitle(':x: Permissions insuffisantes')
      .setColor(Colors.error)
      .setDescription('Le bot doit avoir la permission **Administrateur** pour executer le setup.\nModifiez le role du bot et reessayez.');
    await interaction.editReply({ embeds: [errorEmbed], components: [] });
    return;
  }

  // Acknowledge the button click, then inform the user — the message will be lost once channels are deleted
  await interaction.editReply({
    embeds: [new EmbedBuilder().setTitle('Setup en cours...').setColor(Colors.info).setDescription('Le setup a demarre. Le resultat sera poste dans le nouveau salon #general.')],
    components: [],
  });

  const skippedChannels: string[] = [];

  // 1. Delete all channels (interaction message will be destroyed here)
  console.log('[Setup] Suppression des salons...');
  for (const channel of guild.channels.cache.values()) {
    try {
      await channel.delete();
    } catch {
      skippedChannels.push(channel.name);
    }
  }

  // 2. Delete all roles (except @everyone and roles above the bot)
  console.log('[Setup] Suppression des roles...');
  const botHighestRole = botMember.roles.highest;
  for (const role of guild.roles.cache.values()) {
    if (role.id === guild.id) continue; // @everyone
    if (role.position >= botHighestRole.position) continue;
    if (role.managed) continue; // bot integration roles
    try {
      await role.delete();
    } catch {
      // skip unremovable roles
    }
  }

  // 3. Create "Verifie" role (before group roles)
  console.log('[Setup] Creation du role Verifie...');
  const verifiedRole = await guild.roles.create({
    name: VERIFIED_ROLE_NAME,
    color: 0x99AAB5, // gris neutre
    reason: 'Setup serveur — role pour les membres verifies',
  });

  // 4. Create group roles
  console.log('[Setup] Creation des roles de groupe...');
  const createdRoles = new Map<string, import('discord.js').Role>();
  for (const group of GROUPS) {
    const letter = group[0];
    try {
      const role = await guild.roles.create({
        name: group,
        color: LETTER_COLORS[letter],
        reason: 'Setup serveur',
      });
      createdRoles.set(group, role);
    } catch (err) {
      console.error(`[Setup] Erreur creation role ${group}:`, err);
    }
  }

  // 5. Create #bienvenue channel (hors categorie)
  console.log('[Setup] Creation du salon #bienvenue...');
  const bienvenueChannel = await guild.channels.create({
    name: 'bienvenue',
    type: ChannelType.GuildText,
    permissionOverwrites: [
      {
        id: guild.id, // @everyone: can view, cannot send
        allow: [PermissionFlagsBits.ViewChannel],
        deny: [PermissionFlagsBits.SendMessages],
      },
      {
        id: verifiedRole.id, // Verifie: cannot view
        deny: [PermissionFlagsBits.ViewChannel],
      },
    ],
  });

  // Send permanent welcome embed with onboarding button
  const welcomeEmbed = new EmbedBuilder()
    .setTitle(messages.onboardingWelcomeTitle)
    .setColor(Colors.info)
    .setDescription(messages.bienvenueChannelDescription)
    .setTimestamp();

  const welcomeButton = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('onboarding_start')
      .setLabel(messages.onboardingButtonLabel)
      .setStyle(ButtonStyle.Primary),
  );

  await bienvenueChannel.send({ embeds: [welcomeEmbed], components: [welcomeButton] });

  // 6. Create "Commun" category + channels (Verifie only)
  console.log('[Setup] Creation categorie Commun...');
  const communCategory = await guild.channels.create({
    name: 'Commun',
    type: ChannelType.GuildCategory,
    permissionOverwrites: [
      {
        id: guild.id, // @everyone: cannot view
        deny: [PermissionFlagsBits.ViewChannel],
      },
      {
        id: verifiedRole.id, // Verifie: can view
        allow: [PermissionFlagsBits.ViewChannel],
      },
    ],
  });

  const communTextChannels = ['annonces', 'general', 'regles', 'aide', 'mise-en-relation', 'recherche-alternance-stage'];
  for (const name of communTextChannels) {
    await guild.channels.create({
      name,
      type: ChannelType.GuildText,
      parent: communCategory.id,
    });
  }
  await guild.channels.create({
    name: 'vocal-general',
    type: ChannelType.GuildVoice,
    parent: communCategory.id,
  });

  // 7. Create "BDE" category + channels (Verifie only) — before letter categories
  console.log('[Setup] Creation categorie BDE...');
  const bdeCategory = await guild.channels.create({
    name: 'BDE',
    type: ChannelType.GuildCategory,
    permissionOverwrites: [
      {
        id: guild.id, // @everyone: cannot view
        deny: [PermissionFlagsBits.ViewChannel],
      },
      {
        id: verifiedRole.id, // Verifie: can view
        allow: [PermissionFlagsBits.ViewChannel],
      },
    ],
  });

  for (const name of ['annonces-bde', 'evenements', 'suggestions']) {
    await guild.channels.create({
      name,
      type: ChannelType.GuildText,
      parent: bdeCategory.id,
    });
  }

  // 8. Create letter categories with permissions
  console.log('[Setup] Creation des categories par lettre...');
  for (const letter of LETTERS) {
    const role1 = createdRoles.get(`${letter}1`);
    const role2 = createdRoles.get(`${letter}2`);

    const permissionOverwrites = [
      {
        id: guild.id, // @everyone
        deny: [PermissionFlagsBits.ViewChannel],
      },
      ...(role1 ? [{
        id: role1.id,
        allow: [PermissionFlagsBits.ViewChannel],
      }] : []),
      ...(role2 ? [{
        id: role2.id,
        allow: [PermissionFlagsBits.ViewChannel],
      }] : []),
    ];

    const category = await guild.channels.create({
      name: letter,
      type: ChannelType.GuildCategory,
      permissionOverwrites,
    });

    await guild.channels.create({
      name: `general-${letter.toLowerCase()}`,
      type: ChannelType.GuildText,
      parent: category.id,
    });

    await guild.channels.create({
      name: `entraide-${letter.toLowerCase()}`,
      type: ChannelType.GuildText,
      parent: category.id,
    });

    await guild.channels.create({
      name: `planning`,
      type: ChannelType.GuildText,
      parent: category.id,
    });

    await guild.channels.create({
      name: `vocal-${letter.toLowerCase()}`,
      type: ChannelType.GuildVoice,
      parent: category.id,
    });
  }

  // 9. Final embed in #general
  const generalChannel = guild.channels.cache.find(c => c.name === 'general');

  let description =
    `**Roles crees :** ${createdRoles.size + 1}/25 (Verifie + 24 groupes)\n` +
    `**Categories :** ${1 + LETTERS.length + 1} (Commun + ${LETTERS.length} lettres + BDE)\n` +
    `**Salons communs :** ${communTextChannels.length + 1}\n` +
    `**Salons par lettre :** ${LETTERS.length * 3}\n` +
    `**Salons BDE :** 3\n` +
    `**Salon #bienvenue :** cree`;

  if (skippedChannels.length > 0) {
    description += `\n\n:warning: **Salons non supprimes (${skippedChannels.length}) :** ${skippedChannels.join(', ')}`;
  }

  const finalEmbed = new EmbedBuilder()
    .setTitle('Setup termine !')
    .setColor(Colors.success)
    .setDescription(description)
    .setTimestamp();

  if (generalChannel?.isTextBased()) {
    await generalChannel.send({ embeds: [finalEmbed] });
  }

  console.log('[Setup] Termine !');
}
