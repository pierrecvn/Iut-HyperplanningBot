const { SlashCommandBuilder, PermissionFlagsBits, ActivityType, EmbedBuilder } = require('discord.js');
const botSchema = require('../../schemas/botPresence');
const { defaultArgs } = require('puppeteer');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('presence')
		.setDescription('Change la présence du bot')
		.addSubcommand(sub => sub
			.setName('add')
			.setDescription('Ajoute une présence au bot')
			.addStringOption(option => option
				.setName('name')
				.setDescription('Le nom de la présence')
				.setRequired(true)
			)
			.addStringOption(option => option
				.setName('type')
				.setDescription('Le type de la présence')
				.setChoices(
					{ name: 'Playing', value: `${ActivityType.Playing}` },
					{ name: 'Streaming', value: `${ActivityType.Streaming}` },
					{ name: 'Listening', value: `${ActivityType.Listening}` },
					{ name: 'Watching', value: `${ActivityType.Watching}` },
					{ name: 'Custom', value: `${ActivityType.Custom}` },
					{ name: 'Competing', value: `${ActivityType.Competing}` }
				)
				.setRequired(true)
			)

			.addStringOption(option => option
				.setName('status')
				.setDescription('Le status de la présence')
				.setChoices(
					{ name: 'Online', value: 'online' },
					{ name: 'Idle', value: 'idle' },
					{ name: 'DND', value: 'dnd' },
					{ name: 'Invisible', value: 'invisible' }
				)
				.setRequired(true)
			)
		)
		.addSubcommand(sub => sub.setName('remove').setDescription('Supprime la dernière présence du bot'))
		.addSubcommand(sub => sub.setName('list').setDescription('Montre toutes les présences du bot'))

		.toJSON(),
	userPermissions: [PermissionFlagsBits.SendMessages],
	botPermissions: [PermissionFlagsBits.SendMessages],
	devOnly: true,
	run: async (client, interaction) => {

		const subs = interaction.options.getSubcommand();
		const data = await botSchema.findOne({ ClientID: client.user.id });

		switch (subs) {
			case "add":

				const name = interaction.options.getString('name');
				const type = interaction.options.getString('type');
				const status = interaction.options.getString('status');

				if (!data) {
					await botSchema.create({
						ClientID: client.user.id,
						Presences: [{
								Activity: [
									{
										Name: name,
										Type: parseInt(type)
									}
								],
								Status: status
							}
						]
					})
				} else {
					await botSchema.findOneAndUpdate({ ClientID: client.user.id }, {
						$push: {
							Presences: {
								Activity: [
									{
										Name: name,
										Type: parseInt(type)
									}
								],
								Status: status
							}
						}
					})
				}

				return interaction.reply({ content: 'La présence a été ajoutée avec succès', ephemeral: true });

			case "remove":

				if (!data) {
					return interaction.reply({
						content: 'Aucune présence à supprimer',
						ephemeral: true
					});
				} else {
					await botSchema.findOneAndUpdate(
						{ ClientID: client.user.id },
						{
							$pop: {
								Presences: 1
							}
						}
					)
				}

				return interaction.reply({ content: 'La dernière présence a été supprimée avec succès', ephemeral: true });

			case "list":

				if (!data) {
					return interaction.reply({
						content: 'Aucune présence à afficher',
						ephemeral: true
					});
				}

				const presences = data.Presences;
				const rEmbed = new EmbedBuilder()
					.setTitle('Presences du bot')
					.setColor('White')
					.setFooter({
						text: ` ${client.user.unsername} - Activités list`,
						iconURL: `${client.user.displayAvatarURL({ dynamic: true })}`,
					});

				const activityType = ["Playing", "Streaming", "Listening", "Watching", "Custom", "Competing"];

				const activitiyStatus = {
					online: "Online",
					idle: "Idle",
					dnd: "Do Not Disturb",
					invisible: "Invisible"
				};


				presences.forEach((presence, index) => {
					return rEmbed.addFields({
						name: `\`${index + 1}\` - \`${presence.Activity[0].Name}\``,
						value: `**Type:** ${activityType[presence.Activity[0].Type]}\n**Status:** ${activitiyStatus[presence.Status]}`
					})
				})

				return interaction.reply({ embeds: [rEmbed], ephemeral: true });
		}
	}
}	