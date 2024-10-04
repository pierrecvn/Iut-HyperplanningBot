const { ActivityType, ChannelType } = require('discord.js');
const botSchema = require('../../schemas/botPresence');

module.exports = async (client) => {


	const botSchemaData = await botSchema.findOne({ ClientID: client.user.id });

	if (!botSchemaData) {
		await botSchema.create({
			ClientID: client.user.id,
			Presences: [
				{
					Activity: [
						{
							Name: `Bot en développement`,
							Type: ActivityType.Playing
						}
					],
					Status: 'online'
				}
			]
		})
	}

	setInterval(async () => {
		// Générer un nombre aléatoire entre 0 et 99
		const chance = Math.floor(Math.random() * 100);

		if (chance < 90) {
			const IDSSalons = require('../../salonsCitation.json').idsTEST;
			let allMessages = [];

			// Récupérer tous les messages de chaque salon
			for (const idSalon of IDSSalons) {
				const salon = await client.channels.fetch(idSalon);
				if (salon && salon.type === ChannelType.GuildText) {
					const messages = await salon.messages.fetch({ limit: 100 });
					const filtreMessage = messages.filter(m => m.content.startsWith('"')).map(m => m.content);
					allMessages = allMessages.concat(filtreMessage);
				}
			}

			// Sélectionner un message aléatoire parmi tous
			if (allMessages.length > 0) {
				let randomMessage = allMessages[Math.floor(Math.random() * allMessages.length)];

				// Vérifier et remplacer les mentions d'utilisateur
				const mentionRegex = /<@(\d+)>/g;
				let match;
				while ((match = mentionRegex.exec(randomMessage)) !== null) {
					const userId = match[1];
					const user = await client.users.fetch(userId);
					const userName = user ? user.username : "un utilisateur";
					randomMessage = randomMessage.replace(new RegExp(`<@${userId}>`, 'g'), userName);
				}

				// Mettre à jour la présence du bot
				client.user.setPresence({
					activities: [{ name: randomMessage, type: ActivityType.Custom }],
					status: 'online'
				});
			}
		} else {
			const botSchemaData = await botSchema.findOne({ ClientID: client.user.id });
			const presences = botSchemaData.Presences;
			const presence = presences[Math.floor(Math.random() * presences.length)];

			client.user.setPresence({
				activities: [{ name: presence.Activity[0].Name, type: presence.Activity[0].Type }],
				status: presence.Status
			});
		}
	}, 10_000);

}



