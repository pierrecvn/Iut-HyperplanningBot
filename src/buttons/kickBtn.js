const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const moderationSchema = require('../schemas/moderation');
const mConfig = require('../messageConfig.json');


module.exports = {

	customId: "kickBtn",
	userPermissions: [],
	botPermissions: [PermissionFlagsBits.KickMembers],

	run: async (client, interaction) => {

		const { message, channel, guildId, guild, user } = interaction;

		const embedAuthor = message.embeds[0].author;
		const fetchMembers = await guild.members.fetch({ query: embedAuthor.name, limit: 1 });
		const targetMember = fetchMembers.first();

		const rEmbed = new EmbedBuilder()
			.setColor("FFFFFF")
			.setFooter({ text: `${client.user.username} | Modérer un utilisateur` })
			.setAuthor({
				name: `${targetMember.user.username}`,
				iconURL: targetMember.user.displayAvatarURL({ dynamic: true })
			})
			.setDescription(`Quelle raison voulez-vous donner pour kicker ${targetMember.user.tag} ? (Répondez dans les 15 secondes !) continuer sans raison avec "-"`);

		message.edit({ embeds: [rEmbed], components: [] });

		const filter = (m) => m.author.id === user.id;
		const raisonCollector = await channel.awaitMessages({ filter, max: 1, time: 15_000, errors: ["time"] }).then((raison) => {

			if (raison.first().content.toLowerCase() === "annuler") {
				raison.first().delete();
				rEmbed
					.setColor(mConfig.embedColorError)
					.setDescription(`Modération annulée.`)
					.setFooter({ text: `${client.user.username} | Kick un utilisateur` });
				message.edit({ embeds: [rEmbed], components: [] });
				setTimeout(() => {
					message.delete();
				}, 2_000);
				return;
			}
			return raison;
		}).catch((err) => {
			rEmbed
				.setColor(mConfig.embedColorError)
				.setDescription(`Modération annulée.`)
				.setFooter({ text: `${client.user.username} | Kick un utilisateur` });
			message.edit({ embeds: [rEmbed], components: [] });
			setTimeout(() => {
				message.delete();
			}, 2_000);
			return;
		});

		const raisonObj = raisonCollector?.first();
		if (!raisonObj) return;

		let raison = raisonObj.content;
		if (raison === "-") raison = "Aucune raison donnée.";
		raisonObj.delete();

		targetMember.kick(raison);


		let dataGD = await moderationSchema.findOne({ GuildID: guildId });
		const { LogChannelID } = dataGD;
		const logChannel = guild.channels.cache.get(LogChannelID);


		const lEmbed = new EmbedBuilder()
			.setColor("FFFFFF")
			.setTitle("Utilisateur kické")
			.setAuthor({ name: targetMember.user.username, iconURL: targetMember.user.displayAvatarURL({ dynamic: true }) })
			.setDescription(`Pour réinviter ${targetMember.user.username}, utilisez /invite ${targetMember.user.id} pour annuler ce kick.`)
			.addFields(
				{ name: "Kické par", value: `<@${interaction.user.id}>`, inline: true },
				{ name: "Raison", value: `${raison}`, inline: true }
			)
			.setFooter({ iconURL: interaction.client.user.displayAvatarURL({ dynamic: true }), text: `${interaction.client.user.username} | Système de kick` })

		logChannel.send({ embeds: [lEmbed] });

		rEmbed
			.setColor(mConfig.embedColorSuccess)
			.setDescription(`**${targetMember.user.username} a été kické avec succès.**`);

		message.edit({ embeds: [rEmbed] });

		setTimeout(() => {
			message.delete();
		}, 2000);



	}



}
