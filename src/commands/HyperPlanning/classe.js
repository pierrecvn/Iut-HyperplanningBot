const { SlashCommandBuilder, PermissionFlagsBits, Activitygroup, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const user = require('../../schemas/user');
const edtInfo = require('../../utils/edtInfo.json');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('classe')
		.setDescription('Renvoie la liste des personnes dans une classe')
		.setDMPermission(false)
		.addStringOption(option => option
			.setName('groupe')
			.setDescription('Le group de la classe voulu')
			.setAutocomplete(true)
			.setRequired(true)
		)
		.toJSON(),
	userPermissions: [PermissionFlagsBits.SendMessages],
	botPermissions: [PermissionFlagsBits.SendMessages],
	devOnly: false,
	testMode: false,
	deleted: false,
	sendDM: true,
	runAutocomplete: async (client, interaction) => {
		const focusedOption = interaction.options.getFocused(true);
		const choices = Object.keys(edtInfo);
		const seen = {};
		const firstChars = choices.reduce((result, choice) => {
			const char = choice[0];
			if (!seen[char]) {
				seen[char] = true;
				result.push(char);
			}
			return result;
		}, []);
		const filtered = firstChars.filter(char => char.includes(focusedOption.value.toLowerCase()));
		const filteredLimit = filtered.slice(0, 25);
		await interaction.respond(filteredLimit.map(char => ({ name: 'INFO ' + char, value: char })));
	},

	run: async (client, interaction) => {
		const groupe = interaction.options.getString('groupe');
		const regex = new RegExp(`^${groupe}`, 'i');
		const classeData = await user.find({ Group: { $regex: regex } }).sort({ Group: 1 });

		const groups = {};
		classeData.forEach(user => {
			if (!groups[user.Group]) {
				groups[user.Group] = [];
			}
			groups[user.Group].push(user);
		});

		const embed = new EmbedBuilder()
			.setTitle(`INFO ${groupe}`)
			.setDescription(`Voici la liste des etudiants dans la classe ${groupe}`);

		const fields = [];

		for (const group in groups) {
			fields.push(
				{ name: `Groupe ${group}`, value: `${groups[group].map(user => `<@${user.UserId}>`).join('\n')}`, inline: true }
			);
		}

		embed.setFields(fields);

		embed.setFooter({ text: `Nombre d'èleve : ${classeData.length}`, iconURL: `${interaction.user.displayAvatarURL({ dynamic: true })}` })
			.setColor('#0099ff');

		// Si le groupe est "404", ajouter une image à l'embed
		if (groupe === '404') {
			const attachment = new AttachmentBuilder('./src/img/404.png', '404.png');
			embed.setImage('attachment://404.png');
			await interaction.reply({ embeds: [embed], files: [attachment] });
		} else {
			await interaction.reply({ embeds: [embed] });
		}

	}
}