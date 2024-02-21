const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const mConfig = require('../../messageConfig.json');
const moderationSchema = require('../../schemas/moderation');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('moderate')
		.setDescription('Modérer un membre')
		.addUserOption(option => option
			.setName('user')
			.setDescription('L\'utilisateur à modérer')
			.setRequired(true)
		)
		.toJSON(),
	userPermissions: [PermissionFlagsBits.ManageMessages],
	botPermissions: [],

	run: async (client, interaction) => {

		const { options, guildId, guild ,member} = interaction;
		const user = options.getUser("user");
		const targetMember = await guild.members.fetch(user);

		const rEmbed = new EmbedBuilder()
			.setColor("FFFFFF")
			.setFooter({ text: `${client.user.username} | Modérer un utilisateur` });

		let data = await moderationSchema.findOne({ GuildID: guildId });
		if (!data) {
			rEmbed
				.setColor(mConfig.embedColorError)
				.setDescription(
					`Le système de modération n'est pas configuré pour ce serveur.`);
			return interaction.reply({ embeds: [rEmbed], ephemeral: true });
		}

		if (targetMember.id === member.id) {
			rEmbed
				.setColor(mConfig.embedColorError)
				.setDescription(`${mConfig.unableToInteractWithYourself}`);
			return interaction.reply({ embeds: [rEmbed], ephemeral: true });
		}

		if (targetMember.roles.highest.position >= member.roles.highest.position) {
			rEmbed
				.setColor(mConfig.embedColorError)
				.setDescription(`${mConfig.hasHigherRolePosition}`);
			return interaction.reply({ embeds: [rEmbed], ephemeral: true });
		}

		const moderateButtons = new ActionRowBuilder().setComponents(
			new ButtonBuilder().setCustomId("banBtn").setLabel("Bannir").setStyle(ButtonStyle.Danger),
			new ButtonBuilder().setCustomId("kickBtn").setLabel("Kick").setStyle(ButtonStyle.Danger),
			new ButtonBuilder().setCustomId("cancelBtn").setLabel("Annuler").setStyle(ButtonStyle.Secondary)
		)

		rEmbed
			.setAuthor({
				name: `${targetMember.user.tag}`,
				iconURL: targetMember.user.displayAvatarURL({ dynamic: true })
			})
			.setDescription(`Veuillez choisir une action à effectuer sur ${targetMember.user.tag}`)

		interaction.reply({ embeds: [rEmbed], components: [moderateButtons] });
	}
}

