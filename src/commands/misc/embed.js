const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const buttonPagination = require('../../utils/buttonPagination');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('embed')
		.setDescription('Send an embed')
		.setDMPermission(true)
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
	userPermissions: [PermissionFlagsBits.Administrator],
	bot: [],
	devOnly: true,
	testMode: false,
	deleted: true,
	run: async (client, interaction) => {
		try {
			const embeds = [];
			for (let i = 0; i < 4; i++) {
				embeds.push(new EmbedBuilder().setDescription(`Page Numéro ${i + 1}`));
			}

			await buttonPagination(interaction, embeds);
		} catch (err) {
			console.log(err);
		}
	},
};
