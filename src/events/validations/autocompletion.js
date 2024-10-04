require("colors");

const { EmbedBuilder } = require("discord.js");
const { developersId, testServerId } = require("../../config.json");
const mConfig = require("../../messageConfig.json");
const getLocalCommands = require("../../utils/getLocalCommands");

module.exports = async (client, interaction) => {
	if (!interaction.isAutocomplete()) return;
	const localCommands = getLocalCommands();
try {
		const commandObject = localCommands.find(
			(cmd) => cmd.data.name === interaction.commandName
		);
		if (!commandObject) return;

		await commandObject.runAutocomplete(client, interaction);
	} catch (err) {
		console.log(err);
	}
};
