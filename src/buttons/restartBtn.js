const { PermissionFlagsBits } = require("discord.js");

module.exports = {
	customId: "restartBtn",

	userPermissions: [],
	botPermissions: [],

	run: async (client, interaction) => {

		// const { message, channel, guildId, guild, user } = interaction;

		// // channel.send({ content: "Annulation en cours..." });

		// const dmChannel = await interaction.user.createDM();
		// await dmChannel.send({
		// 	content: "Annulation en cours..." ,
		// 	// embeds: [embed], files: [attachment],
		// 	// components: [row],
		// 	ephemeral: true,
		// });
	},
};
