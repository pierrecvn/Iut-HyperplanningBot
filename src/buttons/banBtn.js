const {PermissionFlagsBits, EmbedBuilder} = require('discord.js');
const moderationSchema = require('../schemas/moderation');
const mConfig = require('../messageConfig.json');
const { data } = require('../contextmenus/moderateCTM');


module.exports = {

	customId: "banBtn",
	userPermissions: [],
	botPermissions: [PermissionFlagsBits.BanMembers],

	run: async (client, interaction) => {

		const {message, channel, guildId, guild, user} = interaction;

		const embedAuthor = message.embeds[0].author;
		const fetchedMembers = await guild.members.fetch({ query: embedAuthor.name, limit: 1 });
		const targetMember = fetchedMembers.first();

		const rEmbed = new EmbedBuilder()
			.setColor("FFFFFF")
			.setFooter({ text: `${client.user.username} | Modérer un utilisateur` })
			.setAuthor({
				name: `${targetMember.user.tag} | Bannir`,
				iconURL: targetMember.user.displayAvatarURL({ dynamic: true })
			})
			.setDescription(`Quelle raison voulez-vous donner pour bannir ${targetMember.user.tag} ? (Répondez dans les 15 secondes !) continuer sans raison avec "-"`);

		message.edit({ embeds: [rEmbed], components: [] });

		const filter = (m) => m.author.id === user.id;
		const raisonCollector = await channel.awaitMessages({ filter, max: 1, time: 15_000, errors: ["time"] }).then((raison) => {

			if (raison.first().content.toLowerCase() === "annuler") {
				raison.first().delete();
				rEmbed
					.setColor(mConfig.embedColorError)
					.setDescription(`Modération annulée.`)
					.setFooter({ text: `${client.user.username} | Bannir un utilisateur` });
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
				.setFooter({ text: `${client.user.username} | Bannir un utilisateur` });
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

		targetMember.ban({ reason: raison, deleteMessageSeconds: 60*60*24*7 });


		let dataGD = await moderationSchema.findOne({ GuildID : guildId }); 
		const { LogChannelID } = dataGD;
		const logChannel = guild.channels.cache.get(LogChannelID);


		const lEmbed = new EmbedBuilder()
			.setColor("FFFFFF")
			.setTitle("Utilisateur banni")
			.setAuthor({ name: targetMember.user.username, iconURL: targetMember.user.displayAvatarURL({ dynamic: true }) })
			.setDescription(`Pour débannir ${targetMember.user.username}, utilisez /unban ${targetMember.user.id} pour annuler ce bannissement.`)
			.addFields(
				{ name: "Banni par", value: `<@${interaction.user.id}>`, inline: true },
				{ name: "Raison", value: `${raison}`, inline: true }
			)
			.setFooter({ iconURL: interaction.client.user.displayAvatarURL({ dynamic: true }), text: `${interaction.client.user.username} | Système de bannissement` })

		logChannel.send({ embeds: [lEmbed] });

		rEmbed
			.setColor(mConfig.embedColorSuccess)
			.setDescription(`**${targetMember.user.username} a été banni avec succès.**`);

		message.edit({ embeds: [rEmbed] });

		setTimeout(() => {
			message.delete();
		}, 2000);



	}



}
