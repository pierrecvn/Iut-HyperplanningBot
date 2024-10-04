const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, EmbedBuilder, StringSelectMenuBuilder } = require('discord.js');


const ajoutSchema = require('../../schemas/ajouts');


module.exports = {
	data: new SlashCommandBuilder()
		.setName('ajouts')
		.setDescription('Vous avez une idée à ajouter au bot ?')
		.addSubcommand(sub => sub
			.setName('add')
			.setDescription('Votre idée pour le bot')
			.addStringOption(option => option
				.setName('idée')
				.setDescription('Votre idée pour le bot')
				.setRequired(true)
			)
		)
		.addSubcommand(sub => sub.setName('list').setDescription('Montre toutes les idées'))
		
		.toJSON(),
	devOnly: false,
	sendDM: true,
	deleted: false,


	run: async (client, interaction) => {


		const idée = interaction.options.getString('idée');

		const subs = interaction.options.getSubcommand();


		switch (subs) {

			case "add":
				
				const newAjout = new ajoutSchema({
					UserId: interaction.user.id,
					Ajout: idée
				});

				await newAjout.save();
				interaction.reply({ content: "Votre ajout à bien été pris en compte", ephemeral: true});

				break;

			case "list":

				const allAjouts = await ajoutSchema.find({});

				const embed = new EmbedBuilder()
					.setTitle("Liste des demande d'ajouts au bot")
					.setColor("Random");

				let fields = [];
				let index = 1;
				for (const ajout of allAjouts) {
					fields.push({ name: `\`\`${index} / ${allAjouts.length}\`\``, value: `${ajout.Ajout}\nDe <@${ajout.UserId}>` });
					index++;
				}

				embed.setFields(fields);

				interaction.reply({ embeds: [embed] });

				break;

			}

	}
}	