const { ActivityType } = require('discord.js');
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
		const botSchemaData = await botSchema.findOne({ ClientID: client.user.id });
		const presences = botSchemaData.Presences;
		const presence = presences[Math.floor(Math.random() * presences.length)];

		client.user.setPresence({
			activities: [{ name: presence.Activity[0].Name, type: presence.Activity[0].Type }], status: presence.Status
		});
	}, 10_000)
}
