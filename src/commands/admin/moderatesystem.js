const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } = require('discord.js');
const moderationSchema = require('../../schemas/moderation');
const messageConfig = require('../../messageConfig.json');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('moderatesystem')
		.setDescription('System de moderation du serveur')
		.addSubcommand(subcommand => subcommand
				.setName('configure')
				.setDescription('Configurer :')
				.addChannelOption(option => option
						.setName('logchannel')
						.setDescription('Definir le salon des logs')
						.setRequired(true)
						.addChannelTypes(ChannelType.GuildText)
				)
		)
		.addSubcommand(subcommand => subcommand
			.setName('supp')
			.setDescription('Supprimer la config du serv')
		)
		.toJSON(),
	userPermissions: [PermissionFlagsBits.Administrator],
	botPermissions: [],//[PermissionFlagsBits.ManageGuild],

	deleted: false,
	run: async (client, interaction) => {
		const { options, guildId, guild } = interaction;
		const subcmd = options.getSubcommand();
		if (!["configure", "supp"].includes(subcmd)) return;

		const rEmbed = new EmbedBuilder()
			.setFooter({
				iconURL: client.user.displayAvatarURL({ dynamic: true }),
				text: `${client.user.username} - System de Moderation`
			});

		switch (subcmd) {

			case "configure":
				const logChannel = options.getChannel('logchannel');

				let dataGD = await moderationSchema.findOne({ GuildID: guildId });
				if (!dataGD) {
					rEmbed
						.setColor(messageConfig.embedColorWarning)
						.setDescription(`Ajout d'un nouveau serveur : Configuration... `);

					await interaction.reply({ embeds: [rEmbed], fetchReply: true, ephemeral: true });
					dataGD = new moderationSchema({
						GuildID: guildId,
						LogChannelID: logChannel.id
					});
					dataGD.save();

					rEmbed
						.setColor(messageConfig.embedColorSuccess)
						.setDescription(`Configuration terminée !`)
						.addFields(
							{ name: "Salon de logs", value: `${logChannel}`, inline: true }
						);
					setTimeout(() => interaction.editReply({ embeds: [rEmbed], ephemeral: true }), 2_000);
				} else {
					await moderationSchema.findOneAndUpdate({ GuildID: guildId, }, { LogChannelID: logChannel.id });

					rEmbed
						.setColor(messageConfig.embedColorSuccess)
						.setDescription(`Mise a jour terminée !`)
						.addFields(
							{ name: "Salon de logs", value: `${logChannel}`, inline: true }
						);

					await interaction.reply({ embeds: [rEmbed], ephemeral: true });
				}
				break
			case "supp":

				const removed = await moderationSchema.findOneAndDelete({ GuildID: guildId });
				if (removed) {
					rEmbed
						.setColor(messageConfig.embedColorSuccess)
						.setDescription(`Suppression du systeme de modération terminée !`)
				} else {
					rEmbed
						.setColor(messageConfig.embedColorError)
						.setDescription(`Aucune configuration trouvée !`)

				}
				await interaction.reply({ embeds: [rEmbed], ephemeral: true });
				break;
		}
	}
};