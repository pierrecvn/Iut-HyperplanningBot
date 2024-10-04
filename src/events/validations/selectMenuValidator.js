require("colors");

const { EmbedBuilder } = require("discord.js");
const { developersId, testServerId } = require("../../config.json");
const mConfig = require("../../messageConfig.json");
const getSelects = require("../../utils/getSelects");

module.exports = async (client, interaction) => {
	if (!interaction.isAnySelectMenu()) return;
	const selects = getSelects();

	try {
		const selectsObject = selects.find(
			(select) => select.customId === interaction.customId
		);
		if (!selectsObject) return;

		if (selectsObject.devOnly) {
			if (!developersId.includes(interaction.user.id)) {
				const rEmbed = new EmbedBuilder()
					.setColor(`${mConfig.embedColorError}`)
					.setDescription(`${mConfig.commandDevOnly}`);
				interaction.reply({ embeds: [rEmbed], ephemeral: true });
				return;
			}
		}

		if (selectsObject.testMode) {
			if (interaction.guild.id !== testServerId) {
				const rEmbed = new EmbedBuilder()
					.setColor(`${mConfig.embedColorError}`)
					.setDescription(`${mConfig.commandTestMode}`);
				interaction.reply({ embeds: [rEmbed], ephemeral: true });
				return;
			}
		}

		if (selectsObject.userPermissions?.length) {
			for (const permission of selectsObject.userPermissions) {
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

		if (selectsObject.botPermissions?.length) {
			for (const permission of selectsObject.botPermissions) {
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

		if (interaction.message.interaction) {
			if (interaction.message.interaction.user.id !== interaction.user.id) {
				const rEmbed = new EmbedBuilder()
					.setColor(`${mConfig.embedColorError}`)
					.setDescription(`${mConfig.cannotUseSelet}`);
				interaction.reply({ embeds: [rEmbed], ephemeral: true });
				return;
			};
		};

		await selectsObject.run(client, interaction);
	} catch (err) {
		console.log(
			`An error occurred while validating select Menu ! ${err}`.red
		);
	}
};
