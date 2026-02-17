import { Client, ButtonInteraction, ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';
import { getGroupKeys } from '../lib/icalUrl.js';
import { executeSetup } from '../commands/setup.js';
import { config } from '../config.js';
import messages from '../data/messages.json' with { type: 'json' };

type ButtonHandler = (client: Client, interaction: ButtonInteraction) => Promise<void>;

export const buttonHandlers = new Map<string, ButtonHandler>();

// Onboarding: user clicks "Configurer mon profil"
buttonHandlers.set('onboarding_start', async (_client, interaction) => {
  const choices = getGroupKeys();

  const select = new StringSelectMenuBuilder()
    .setCustomId('onboarding_group')
    .setPlaceholder(messages.onboardingSelectPlaceholder)
    .addOptions(choices.map(c => ({ label: c, value: c })));

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);

  await interaction.reply({
    content: 'Choisissez votre groupe :',
    components: [row],
    ephemeral: true,
  });
});

// Setup: confirm server setup
buttonHandlers.set('setup_confirm', async (_client, interaction) => {
  if (!config.discord.developerIds.includes(interaction.user.id)) {
    await interaction.reply({ content: 'Action reservee aux developpeurs.', ephemeral: true });
    return;
  }
  await executeSetup(interaction);
});
