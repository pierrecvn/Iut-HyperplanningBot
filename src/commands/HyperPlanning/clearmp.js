const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, DMChannel, ChannelType } = require('discord.js');
const mConfig = require('../../messageConfig.json');

module.exports = {

	data: new SlashCommandBuilder()
		.setName('clearmp')
		.setDescription('Supprime un nombre spécifique de messages')
		.setDMPermission(true),

	userPermissions: [PermissionFlagsBits.ManageMessages],
	botPermissions: [PermissionFlagsBits.ManageMessages],
	deleted: false,
	sendDM: true,
	run: async (client, interaction) => {

		const { options, guildId, member, channel } = interaction;


		try {

			if (channel) {
				// console.log('channel type:', channel.type);
				// console.log(channel.type !== ChannelType.DM)
				if (channel.type !== ChannelType.DM) {
					return await interaction.reply({
						content: 'Cette commande peut être utilisée que dans les Messages privés.', ephemeral: true
					});
				}
			}

			let user = client.users.cache.get(interaction.user.id);
			let dmChannel = user.dmChannel;
			if (!dmChannel) {
				dmChannel = await user.createDM();
			}

			await interaction.reply({ content: 'Début de la suppression des messages.', ephemeral: true });
			const messages = await dmChannel.messages.fetch({ limit: 100 });

			let deletedCount = 0;
			for (let message of messages.values()) {
				if (message.deletable) {
					await message.delete();
					await interaction.editReply({ content: `Suppression de **${deletedCount}** messages` });
					deletedCount++;
				}
			}
			// console.log(`Deleted ${deletedCount} messages.`);

			const initialMessage = await interaction.fetchReply().catch(() => null);
			if (initialMessage) {
				await interaction.editReply({ content: `Suppréssion de **${deletedCount}** messages de ${client.user.username} \n (J'ai l'incapacité de supprimer les messages de l'utilisateur, veuillez le faire manuellement.)` });
			}
		} catch (error) {
			console.error('Error:', error);
			await interaction.reply({ content: 'Une erreur est survenue lors de la suppression des messages.', ephemeral: true });
		}
	}
}
