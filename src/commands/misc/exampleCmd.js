const { SlashCommandBuilder, PermissionFlagsBits, StringSelectMenuBuilder, ActionRowBuilder } = require("discord.js");

const edtInfo = require('../../utils/edtInfo.json');

module.exports = {
	data: new SlashCommandBuilder()
		.setName("test")
		.setDescription("Test if everything works.")
		.setDMPermission(true),
	/*	.addSubcommandGroup((subbcommandgroup) => subbcommandgroup
			.setName("user")
			.setDescription("Coucou je suis la commande test")
			.addSubcommand((subcommand) => subcommand
				.setName("message")
				.setDescription("Configure un message")
				.addStringOption((option) => option
					.setName("message")
					.setDescription("Le message que vous voulez mettre")
					.setRequired(true)
				)
			)
			.addSubcommand((subcommand) => subcommand
				.setName("coucou")
				.setDescription("Configure un message")
				.addStringOption((option) => option
					.setName("hey")
					.setDescription("Le message que vous voulez mettre")
					.setRequired(true)
				)
				.addStringOption((option) => option
					.setName("heydqzdqzdqzdqzdqzd")
					.setDescription("Le message que vous voulez mettrdqzdqzdqzde")
					.setRequired(false)
				)
			)
		)
		.addSubcommand ((subcommand) => subcommand
			.setName("coucououououououou")
			.setDescription("Configure un message")
			.addStringOption((option) => option
				.setName("hey")
				.setDescription("Le message que vous voulez mettre")
				.setRequired(true)
			)
		)*/
		// .toJSON(),
	userPermissions: [PermissionFlagsBits.ManageMessages],
	botPermissions: [PermissionFlagsBits.Connect],
	sendDM : true,
	deleted: true,

	run: (client, interaction) => {

		const choices = Object.keys(edtInfo);


		const exempleSelect = new StringSelectMenuBuilder()
			.setCustomId("setDefautGroupeSelect")
			.setPlaceholder("Choisissez une option")
			.addOptions(
				choices.map(choice => ({
					label: choice,
					value: choice
				}))

			)

		const row = new ActionRowBuilder().addComponents(exempleSelect);


		interaction.reply({ content: "Coucou", components: [row] });





	}
};