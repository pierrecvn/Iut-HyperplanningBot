const { SlashCommandBuilder, EmbedBuilder, time, discordSort } = require('discord.js');
const package = require('../../../package.json');

const userDB = require('../../schemas/user');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('info')
		.setDescription('Montre les informations sur le bot / le serveur / l\'utilisateur')
		.addSubcommand((subcommand) => subcommand.setName('bot').setDescription('Montre les informations sur le bot'))
		.addSubcommand((subcommand) => subcommand.setName('server').setDescription('Montre les informations sur le serveur'))
		.addSubcommand((subcommand) => subcommand.setName('user').setDescription('Montre les informations sur l\'utilisateur')
			.addUserOption(option => option.setName('utilisateur').setDescription('L\'utilisateur cible')))
		.toJSON(),
	userPermissions: [],
	botPermissions: [],
	sendDM : false,
	run: async (client, interaction) => {
		await interaction.deferReply({ ephemeral: true });

		const { options, guild } = interaction;
		const subcommand = options.getSubcommand();


		const infoEmbed = new EmbedBuilder()
			.setColor('#00FF00')


		switch (subcommand) {
			case 'user':

				const user = options.getUser('utilisateur') || interaction.user;
				const member = guild.members.cache.get(user.id);

				const classe = await userDB.findOne({ UserId: user.id });

				if (member.presence && member.presence.status === null) {
					console.log('null');
				}
				let statusText = 'Hors ligne'; // Par défaut, le statut est 'Hors ligne'
				if (member.presence) {
					statusText = getStatusText(member.presence.status);
				}
				let groupValue = 'Aucun groupe défini par défaut'; // Par défaut, le groupe est 'Aucun groupe défini par défaut'
				if (classe) {
					groupValue = classe.Group;
				}
				let NbCommandValue = classe.NbCommand;
	
				// console.log(member.presence.status);
				infoEmbed.setAuthor({ name: `${user.tag}`, iconURL: user.displayAvatarURL({ dynamic: true }) })
				infoEmbed.addFields(
					{ name: 'User ID', value: user.id, inline: true },
					{ name: 'Surnom', value: member.nickname || 'Aucun', inline: true },
					{ name: 'Username', value: user.username, inline: true },
					{ name: 'Status', value: statusText, inline: true },
					{ name: 'A rejoint le serveur ', value: time(member.joinedAt, 'R'), inline: true },
					{ name: 'A rejoint Discord', value: time(user.createdAt, 'R'), inline: true },
					{ name: 'Haut Role', value: discordSort(member.roles.cache).last().toString() || 'Pas de role supérieur', inline: true },
					{ name: 'Groupe', value: groupValue, inline: true },
					{ name: 'Nb cmd utilisé', value: `${NbCommandValue}`, inline: true }
				);
				infoEmbed.setThumbnail(user.displayAvatarURL({ dynamic: true }));
				break;


			case 'server':
				infoEmbed.setAuthor({ name: guild.name, iconURL: guild.iconURL({ dynamic: true }) });
				infoEmbed.setFields(
					{ name: 'Créateur', value: `<@${guild.ownerId}>`, inline: true },
					{ name: 'Membres', value: `${guild.memberCount}`, inline: true },
					{ name: 'Roles', value: `${guild.roles.cache.size}`, inline: true },
					{ name: 'Salons', value: `${guild.channels.cache.size}`, inline: true },
					{ name: 'Créé', value: time(guild.createdAt, 'R'), inline: true },
					{ name: 'Boost', value: `${guild.premiumSubscriptionCount}` || '0', inline: true }
				);
				infoEmbed.setThumbnail(guild.iconURL({ dynamic: true }));
				break;

			case 'bot':
				const uptime = new Date(Date.now() - client.uptime);

				infoEmbed.setAuthor({ name: client.user.tag, iconURL: client.user.displayAvatarURL({ dynamic: true }) });
				infoEmbed.setFields(
					{ name: 'Ping', value: `${Math.round(client.ws.ping)}ms`, inline: true },
					{ name: 'Uptime', value: time(uptime, 'R'), inline: true },
					{ name: 'RAM', value: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB / ${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)} MB`, inline: true },
					{ name: 'CPU', value: `${(process.cpuUsage().system / 1024 / 1024).toFixed(2)}%`, inline: true },
					{ name: 'Node JS Version', value: process.version, inline: true },
					{ name: 'Discord js Version', value: package.dependencies['discord.js'].substring(1), inline: true }
				);
				infoEmbed.setThumbnail(client.user.displayAvatarURL({ dynamic: true }));
		};

		await interaction.editReply({ embeds: [infoEmbed] });
	}
};


function getStatusText(status) {
	switch (status) {
		case 'online':
			return 'En ligne';
		case 'idle':
			return 'Absent';
		case 'dnd':
			return 'Ne pas déranger';
		case null:
		case undefined:
			return 'Hors ligne';
	}
}