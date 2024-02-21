
require("colors");

const { EmbedBuilder } = require("discord.js");
const { developersId, testServerId } = require("../../config.json");
const mConfig = require("../../messageConfig.json");
const getLocalCommands = require("../../utils/getLocalCommands");

const user = require("../../schemas/user");
const commandCooldown = 5000;

module.exports = async (client, interaction) => {
	if (!interaction.isChatInputCommand()) return;
	const localCommands = getLocalCommands();

	try {

		// ajoute un +1 au compteur de commandes utilisées							



		const commandObject = localCommands.find(
			(cmd) => cmd.data.name === interaction.commandName
		);
		if (!commandObject) return;



		const userStats = await user.findOne({ UserId: interaction.user.id });

		if (commandObject.couldDown) {
			if (userStats) {
				const now = Date.now();
				if (userStats.LastCommand && now - userStats.LastCommand < commandCooldown) {
					const rEmbed = new EmbedBuilder()
						.setColor(`${mConfig.embedColorError}`)
						.setDescription(`${mConfig.commandTimeOut}`);
					interaction.reply({ embeds: [rEmbed], ephemeral: true });
					return;
				}
				userStats.NbCommand++;
				userStats.LastCommand = now;
				userStats.save();
			} else {
				const newUser = new user({
					UserId: interaction.user.id,
					NbCommand: 1,
					LastCommand: Date.now()
				});
				newUser.save();
			}
		} else {
			if (userStats) {
				userStats.NbCommand++;
				userStats.save();
			} else {
				const newUser = new user({
					UserId: interaction.user.id,
					NbCommand: 1,
					LastCommand: Date.now()
				});
				newUser.save();
			}
		}

		if (commandObject.devOnly) {
			if (!developersId.includes(interaction.user.id)) {
				const rEmbed = new EmbedBuilder()
					.setColor(`${mConfig.embedColorError}`)
					.setDescription(`${mConfig.commandDevOnly}`);
				interaction.reply({ embeds: [rEmbed], ephemeral: true });
				return;
			}
		}

		if (commandObject.testMode) {
			if (interaction.guild.id !== testServerId) {
				const rEmbed = new EmbedBuilder()
					.setColor(`${mConfig.embedColorError}`)
					.setDescription(`${mConfig.commandTestMode}`);
				interaction.reply({ embeds: [rEmbed], ephemeral: true });
				return;
			}
		}




		if (!interaction.inGuild()) {
			// console.log("Cette interaction a lieu dans une guilde.");
			if (!commandObject.sendDM) {
				console.log(commandObject.sendDM);
				const rEmbed = new EmbedBuilder()
					.setColor(`${mConfig.embedColorError}`)
					.setDescription(`${mConfig.commandDmOnly}`);
				interaction.reply({ embeds: [rEmbed], ephemeral: true });
				return;
			} else {
				// console.log("Cette interaction a lieu dans un DM. " + commandObject.sendDM)
			}

		} else {

			if (commandObject.userPermissions?.length) {
				for (const permission of commandObject.userPermissions) {
					if (interaction.member.permissions.has(permission)) {
						continue;
					}
					const rEmbed = new EmbedBuilder()
						.setColor(`${mConfig.embedColorError}`)
						.setDescription(`${mConfig.userNoPermissions}`);
					interaction.reply({ embeds: [rEmbed], ephemeral: true });
					return;
				}
			}

			if (commandObject.botPermissions?.length) {
				for (const permission of commandObject.botPermissions) {
					const bot = interaction.guild.members.me;
					if (bot.permissions.has(permission)) {
						continue;
					}
					const rEmbed = new EmbedBuilder()
						.setColor(`${mConfig.embedColorError}`)
						.setDescription(`${mConfig.botNoPermissions}`);
					interaction.reply({ embeds: [rEmbed], ephemeral: true });
					return;
				}
			}
		}

		await commandObject.run(client, interaction);
	} catch (err) {
		// console.log(`Une erreur s'est produite lors de la validation des commandes de saisie de chat ! ${err}`.red);
		console.log(err);
	}
};