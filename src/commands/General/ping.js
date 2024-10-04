


const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
module.exports = {
	data: new SlashCommandBuilder()
		.setName('ping')
		.setDescription('Montre le ping du bot'),
	
	devOnly: false,
	testMode: false,
	deleted: false,
	sendDM: true,
	run: async (client, interaction) => {

			const tryPong = await interaction.reply({
			content: "On essaye de pong... un instant!",
			fetchReply: true,
		});

		const embed = new EmbedBuilder()
			.setTitle("Pong! 🏓")
			.addFields(
				{
					name: "Latence API",
					value: `\`\`\`${client.ws.ping}ms\`\`\``,
					inline: true,
				},
				{
					name: "Latence BOT",
					value: `\`\`\`${tryPong.createdTimestamp - interaction.createdTimestamp
						}ms\`\`\``,
					inline: true,
				},
				{
					name: "Uptime",
					value: `<t:${parseInt(client.readyTimestamp / 1000)}:R>`,
					inline: false
				}
			)
			.setColor("#f00020")
			.setTimestamp()
			.setFooter({
				text: interaction.user.username,
				iconURL: interaction.user.displayAvatarURL(),
			});

		interaction.editReply({ content: " ", embeds: [embed] });
	}

}