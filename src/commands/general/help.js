const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const buttonPagination = require("../../utils/buttonPagination");
const footerData = require('../../messageConfig.json');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('help')
		.setDescription('Montre toutes les commandes du bot disponibles'),

	devOnly: false,
	testMode: false,
	deleted: false,
	sendDM: false,
	run: async (client, interaction) => {
		try {
			const commandFolders = fs.readdirSync('./src/commands');
			const helpEmbeds = [];

			for (const folder of commandFolders) {

				if (folder === 'misc') {
					continue;
				}
				const commandFlles = fs.readdirSync(`./src/commands/${folder}/`).filter(file => file.endsWith('.js'));
				const categoryEmbed = new EmbedBuilder()
					.setTitle(folder)
					.setColor('Random')
					.setFooter({
						text: `${footerData.footerText}`
					})
					.setTimestamp()
					.setThumbnail(client.user.displayAvatarURL());

				const subcommands = [];


				for (const file of commandFlles) {
					const command = require(`./../${folder}/${file}`);

					if (command.deleted) {
						continue;
					}


					const description = `${command.data.description || "Pas de description"}`;

					if (command.data.type === 'SUB_COMMAND' || command.data.type === 'SUB_COMMAND_GROUP') {
						subcommands.push(command);
					} else {
						categoryEmbed.addFields({
							name: `/${command.data.name}`,
							value: `${description}`
						})
					}
				}

				if (subcommands.length > 0) {
					categoryEmbed.addFields({
						name: `Sous-commandes`,
						value: subcommands.map(subcommand => `/${subcommand.data.name}`).join('\n')
					})
				}


				helpEmbeds.push(categoryEmbed);

			}

			await buttonPagination(interaction, helpEmbeds);
		} catch (err) {
			console.log(err);
		}

	}

}