import {
  Client,
  ButtonInteraction,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import { getGroupKeys } from '../lib/icalUrl.js';
import { executeSetup } from '../commands/setup.js';
import { SPECIAL_ROLES } from '../services/roleService.js';
import { config } from '../config.js';
import messages from '../data/messages.json' with { type: 'json' };

type ButtonHandler = (client: Client, interaction: ButtonInteraction) => Promise<void>;

export const buttonHandlers = new Map<string, ButtonHandler>();

/** Build the name modal for a given prefix + group */
function buildNameModal(prefix: string, group: string): ModalBuilder {
  const modal = new ModalBuilder()
    .setCustomId(`${prefix}_modal_${group}`)
    .setTitle('Vos informations');

  const prenomInput = new TextInputBuilder()
    .setCustomId('prenom')
    .setLabel('Prenom')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(30);

  const nomInput = new TextInputBuilder()
    .setCustomId('nom')
    .setLabel('Nom')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(30);

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(prenomInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(nomInput),
  );

  return modal;
}

// Onboarding: user clicks "Configurer mon profil"
buttonHandlers.set('onboarding_start', async (_client, interaction) => {
  const choices = getGroupKeys();

  const select = new StringSelectMenuBuilder()
    .setCustomId('onboarding_group')
    .setPlaceholder(messages.onboardingSelectPlaceholder)
    .addOptions(choices.map(c => ({ label: c, value: c })));

  const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);

  const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    ...SPECIAL_ROLES.map(role =>
      new ButtonBuilder()
        .setCustomId(`onboarding_special_${role}`)
        .setLabel(role)
        .setStyle(ButtonStyle.Secondary),
    ),
  );

  await interaction.reply({
    content: 'Choisissez votre groupe :',
    components: [selectRow, buttonRow],
    ephemeral: true,
  });
});

// Onboarding: user clicks "Ancien" or "Prof" button
for (const role of SPECIAL_ROLES) {
  buttonHandlers.set(`onboarding_special_${role}`, async (_client, interaction) => {
    await interaction.showModal(buildNameModal('onboarding', role));
  });
}

// Setgroupe: user clicks "Ancien" or "Prof" button
for (const role of SPECIAL_ROLES) {
  buttonHandlers.set(`setgroupe_special_${role}`, async (_client, interaction) => {
    await interaction.showModal(buildNameModal('setgroupe', role));
  });
}

// Setup: confirm server setup
buttonHandlers.set('setup_confirm', async (_client, interaction) => {
  if (!config.discord.developerIds.includes(interaction.user.id)) {
    await interaction.reply({ content: 'Action reservee aux developpeurs.', ephemeral: true });
    return;
  }
  await executeSetup(interaction);
});
