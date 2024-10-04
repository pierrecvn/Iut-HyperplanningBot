
require("colors");

const { EmbedBuilder } = require("discord.js");
const { developersId, testServerId } = require("../../config.json");
const mConfig = require("../../messageConfig.json");
const getLocalCommands = require("../../utils/getLocalCommands");

module.exports = async (client, message) => {
	//console.log("Un message a été recu.".yellow);
	
	if (message.content === "Klément") {
	message.reply(":warning: **Attention** :warning: \n\n**klément** -> Merci de ne pas le mentionner sous peine de le vexer (il fouette ce con)... \non t'aime quand meme hein :heart:");
	}

};
