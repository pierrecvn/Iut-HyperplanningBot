const { StringSelectMenuBuilder, EmbedBuilder, } = require("discord.js");
const user = require('../schemas/user');

module.exports = {
	customId: "setDefautGroupeSelect",
	devOnly: false,
	testMode: false,
	sendDM: true,
	userPermissions: [],
	botPermissions: [],

	run: async (client, interaction) => {

		await interaction.deferUpdate();


		const data = await user.findOne({ UserId: interaction.user.id });
		const groupe = interaction.values[0]

		if (!data) {
			await user.create({
				UserId: interaction.user.id,
				Group: groupe
			});

			const rEmbed = new EmbedBuilder()
				.setTitle(`Ajout au groupe : ${interaction.user.username}`)
				.setColor('#00FF00')
				.setFooter({
					text: ` setdefautgroupe `,
					iconURL: `${interaction.user.displayAvatarURL({ dynamic: true })}`,
				});

			rEmbed.addFields({
				name: `**Groupe : ** ${groupe}`, value: ` `, inline: true
			})

			return interaction.editReply({ content: "", embeds: [rEmbed], ephemeral: true, components: [] });
		} else {

			await user.findOneAndUpdate({ UserId: interaction.user.id }, { Group: groupe });
			const rEmbed = new EmbedBuilder()
				.setTitle(`Changement de groupe : ${interaction.user.username}`)
				.setColor('#00FF00')
				.setFooter({
					text: ` setdefautgroupe`,
					iconURL: `${interaction.user.displayAvatarURL({ dynamic: true })}`,
				});

			rEmbed.addFields({
				name: `**Groupe : ** ${groupe}`, value: ` `, inline: true
			})

			return interaction.editReply({ content: "", embeds: [rEmbed], ephemeral: true, components: [] });

		}


	}

}