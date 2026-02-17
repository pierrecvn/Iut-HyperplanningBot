import {
  Client,
  StringSelectMenuInteraction,
  ModalBuilder,
  ActionRowBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import messages from '../data/messages.json' with { type: 'json' };

type SelectHandler = (client: Client, interaction: StringSelectMenuInteraction) => Promise<void>;

export const selectMenuHandlers = new Map<string, SelectHandler>();

// /setgroupe select -> open modal for name
selectMenuHandlers.set('setgroupe_select', async (_client, interaction) => {
  const group = interaction.values[0];

  const modal = new ModalBuilder()
    .setCustomId(`setgroupe_modal_${group}`)
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

  await interaction.showModal(modal);
});

// Onboarding: user selects group -> show name modal
selectMenuHandlers.set('onboarding_group', async (_client, interaction) => {
  const group = interaction.values[0];

  const modal = new ModalBuilder()
    .setCustomId(`onboarding_modal_${group}`)
    .setTitle(messages.onboardingModalTitle);

  const prenomInput = new TextInputBuilder()
    .setCustomId('prenom')
    .setLabel(messages.onboardingModalFirstName)
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(30);

  const nomInput = new TextInputBuilder()
    .setCustomId('nom')
    .setLabel(messages.onboardingModalLastName)
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(30);

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(prenomInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(nomInput),
  );

  await interaction.showModal(modal);
});
