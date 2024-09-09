const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, EmbedBuilder, StringSelectMenuBuilder } = require('discord.js');
const mongoose = require('mongoose');
const Rappel = require('../../schemas/rappel');
const schedule = require('node-schedule');

const user = require("../../schemas/user");

module.exports = {

	data: new SlashCommandBuilder()
		.setName('rappel')
		.setDescription('Vous rappelle un temps choisi pour le début d\'un cours')

		.addBooleanOption(option => option
			.setName('activer')
			.setDescription('Active ou désactive les tâches')
			.setRequired(true)
		)
		.addStringOption(option => option
			.setName('choix')
			.setDescription('Le temps pour lequel vous souhaitez définir un rappel')
			.setAutocomplete(true)
			.setRequired(false)
		)
		.toJSON(),
	devOnly: false,
	sendDM: true,
	deleted: false,
	runAutocomplete: async (client, interaction) => {

		const focusedOption = interaction.options.getFocused(true);
		const choices = ["5 min avant le cours", "10 min avant le cours", "15 min avant le cours", "20 min avant le cours", "25 min avant le cours", "30 min avant le cours", "35 min avant le cours", "40 min avant le cours", "45 min avant le cours", "50 min avant le cours", "55 min avant le cours", "1h avant le cours"]
		const filtered = choices.filter(choice => choice.includes(focusedOption.value.toLowerCase()));
		const filteredLimit = filtered.slice(0, 25);
		await interaction.respond(filteredLimit.map(choice => ({ name: choice, value: choice })));
	},

	run: async (client, interaction) => {

		const activer = interaction.options.getBoolean('activer');
		let choix = interaction.options.getString('choix');

		if (!choix) choix = "5 min avant le cours";


		const member = await user.findOne({ UserId: interaction.user.id });
		try {

			if (!member.Group) {
				return interaction.reply({
					embeds: [new EmbedBuilder()
						.setTitle('Groupe par défaut non défini')
						.setColor('#0099ff')
						.setDescription("Guide d'utilisation:\n Vous avez la possibilité d'utilser la commande ``/edt texte`` ou ``/edt image`` pour obtenir l'emploi du temps de votre classe par defaut.")
						.setFields(
							{ name: ':warning: Pensez à définir votre classe par défaut', value: '``/setdefautgroupe``', inline: false },
							{ name: 'Pour avoir l\'emploi du temps d\'une autre classe : ', value: '``/edtimage <la classe> ``', inline: false },
							{ name: 'Ajouter les rappels de cours : ', value: '``/rappel <temps> <vrai/faux> ``', inline: false },

						)
						.setTimestamp()]
					,
				});
			}





			await Rappel.findOneAndUpdate({ userId: interaction.user.id }, { active: activer, time: choix }, { upsert: true, new: true });



			await interaction.reply({ content: `Les rappels on été ${activer ? `\`Activé\`` + " :white_check_mark:" : `\`Désactivé\`` + ":x:"} à ${choix}`, ephemeral: true });

			// if (rappel && rappel.active) {
			// 	await interaction.user.send(`Les rappels on été ${activer ? `\`Activé\`` + " :white_check_mark:" : `\`Désactivé\`` + ":x:"} à ${choix}`);
			// }
			// Si 'activer' est défini sur false, annuler les tâches planifiées pour cet utilisateur
			if (!activer) {
				schedule.cancelJob(interaction.user.id);
			}

		} catch (error) {
			console.error(error);
			await interaction.reply('Une erreur s\'est produite lors de la mise à jour du rappel.');
		}
	}
}