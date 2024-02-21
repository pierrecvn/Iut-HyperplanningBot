// fait moi une base de commande 


// Path: src/commands/moderation/unban.js

const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const mConfig = require('../../messageConfig.json');
const moderationSchema = require('../../schemas/moderation');

module.exports = {

	data : new SlashCommandBuilder()
		.setName('unban')
		.setDescription('Débannir un membre')
		.addUserOption(option => option
			.setName('user_id')
			.setDescription('L\'ID de l\'utilisateur à débannir')
			.setRequired(true)
		)
		.toJSON(),
	userPermissions: [PermissionFlagsBits.BanMembers],
	botPermissions: [PermissionFlagsBits.BanMembers],

	run: async (client, interaction) => {
		const { options, guildId, guild, member } = interaction;

		const userid = options.getUser("user_id");


		let data = await moderationSchema.findOne({ GuildID: guildId });
		if (!data) {
			rEmbed
				.setColor(mConfig.embedColorError)
				.setDescription(
					`Le système de modération n'est pas configuré pour ce serveur.`);
			return interaction.reply({ embeds: [rEmbed], ephemeral: true });
		}

		if (userid === member.id) {
			rEmbed
				.setColor(mConfig.embedColorError)
				.setDescription(`${mConfig.unableToInteractWithYourself}`);
			return interaction.reply({ embeds: [rEmbed], ephemeral: true });
		}

		guild.members.unban(userid);

		const rEmbed = new EmbedBuilder()
			.setColor(mConfig.embedColorSuccess)
			.setDescription(`L'utilisateur a été débanni avec succès.`)
			.setFooter({ text: `${client.user.username} | Débannir un utilisateur` });

		interaction.reply({ embeds: [rEmbed], ephemeral: true});




	}



}