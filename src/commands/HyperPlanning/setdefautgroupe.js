const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, EmbedBuilder, StringSelectMenuBuilder } = require('discord.js');
const edtInfo = require('../../utils/edtInfo.json');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('setdefautgroupe')
		.setDescription('Défini votre groupe par défaut pour l\'emploi du temps')
		// .addStringOption(option => option
		// 	.setName('groupe')
		// 	.setDescription('Le group de la présence')
		// 	.setAutocomplete(true)
		// 	.setRequired(true)
		// )
		.toJSON(),
	userPermissions: [PermissionFlagsBits.SendMessages],
	botPermissions: [PermissionFlagsBits.SendMessages],
	devOnly: false,
	sendDM: true,
	deleted: false,
	// runAutocomplete: async (client, interaction) => {

	// 	const focusedOption = interaction.options.getFocused(true);
	// 	const choices = Object.keys(edtInfo);
	// 	// console.log(choices.length);
	// 	const filtered = choices.filter(choice => choice.includes(focusedOption.value.toLowerCase()));
	// 	const filteredLimit = filtered.slice(0, 25);
	// 	await interaction.respond(filteredLimit.map(choice => ({ name: choice, value: choice })));
	// },

	run: async (client, interaction) => {
		

		const choices = Object.keys(edtInfo);


		const Select = new StringSelectMenuBuilder()
			.setCustomId("setDefautGroupeSelect")
			.setPlaceholder("Choisissez une option")
			.addOptions(
				choices.map(choice => ({
					label: choice,
					value: choice
				}))

			)

		const row = new ActionRowBuilder().addComponents(Select);


		interaction.reply({ content: "Veuillez entrer votre groupe par défaut", components: [row] });

		
	}
}	