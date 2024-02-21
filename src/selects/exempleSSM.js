const { StringSelectMenuBuilder} = require ("discord.js");	

module.exports = {
	customId: "exempleSelect",
	devOnly : false,
	testMode : false,
	sendDM : true,
	userPermissions : [],
	botPermissions : [],

	run: async( client, interaction) => {


		await interaction.deferUpdate();
		await interaction.editReply({content: "Vous avez choisi l'option : " + interaction.values[0], components: []});


	}

}