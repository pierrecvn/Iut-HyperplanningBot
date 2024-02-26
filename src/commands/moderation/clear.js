const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const mConfig = require('../../messageConfig.json');

module.exports = {

	data: new SlashCommandBuilder()
		.setName('clear')
		.setDescription('Supprime un nombre spécifique de messages')
		.addIntegerOption(option => option
			.setName('nombre')
			.setDescription('Le nombre de messages à supprimer')
			.setMinValue(1)
			.setMaxValue(100)
			.setRequired(true)
		)
		.addUserOption(option => option
			.setName('utilisateur')
			.setDescription('Messages de l\'utilisateur à supprimer')
		),

	userPermissions: [PermissionFlagsBits.ManageMessages],
	botPermissions: [PermissionFlagsBits.ManageMessages],
	deleted: true,
	run: async (client, interaction) => {
		const { options, guildId, member, channel } = interaction;
		const amount = options.getInteger('nombre');
		const target = options.getUser('utilisateur');
		const multiMsg = amount === 1 ? 'message' : 'messages';

		if (!amount || amount < 1 || amount > 100) {
			return await interaction.reply({
				content: 'Veuillez entrer un nombre entre 1 et 100.', ephemeral: true
			});
		}

		try {
			const channelMesssages = await channel.messages.fetch();

			if (channelMesssages.size === 0) {
				return await interaction.reply({
					content: 'Il n\'y a pas de messages à supprimer dans ce canal.', ephemeral: true
				});
			}

			if (amount > channelMesssages.size) amount = channelMesssages.size;

			const clearEmbed = new EmbedBuilder().setColor(mConfig.embedColorSuccess);

			await interaction.deferReply({ ephemeral: true });

			let messsagesToDelete = [];

			if (target) {
				let i = 0;
				channelMesssages.forEach((message) => {
					if (message.author.id === target.id && messsagesToDelete.length < amount) {
						messsagesToDelete.push(message);
						i++;
					}
				});

				clearEmbed.setDescription(`Suppression de ${messsagesToDelete.length} ${multiMsg} de ${target} dans ${channel}`);
			} else {
				messsagesToDelete = channelMesssages.first(amount);
				clearEmbed.setDescription(`Suppression de ${messsagesToDelete.length} ${multiMsg} dans ${channel}`);
			}

			if (messsagesToDelete.length > 0) {
				await channel.bulkDelete(messsagesToDelete);
			}

			await interaction.editReply({ embeds: [clearEmbed] });

		} catch (error) {
			console.error(error);
			await interaction.followUp({ content : 'Une erreur s\'est produite lors de la suppression des messages.', ephemeral: true});



		}
	}
}
