const { SlashCommandBuilder, PermissionFlagsBits, StringSelectMenuBuilder, EmbedBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');


const getIcalUrlClass = require('../../utils/getIcalUrlClass.js');
const getClass = require('../../utils/edtInfo.json');
const ical = require('node-ical');
const { getBrowser } = require('../../events/ready/consoleLog.js');

const fs = require('fs');
const path = require('path');

const user = require('../../schemas/user.js');
const edtInfo = require('../../utils/edtInfo.json');
const { start } = require('repl');

const formatTime = (date) => date.toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/Paris' });
const calculateTimeToEnd = (end, now) => (end - now > 0) ? `${Math.floor((end - now) / 1000 / 60)} minutes restantes` : 'Le cours est terminé';
const formatDuration = (duration, ms) => {
	const hours = Math.floor(duration / (1000 * 60 * 60));
	const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
	const seconds = Math.floor((duration % (1000 * 60)) / 1000);
	const milliseconds = duration % 1000;

	let sRet = `${hours} heures ${minutes} minutes`;

	if (ms === true) {
		sRet += ` ( ${seconds} s ${milliseconds} ms ) `;
	}

	return sRet;
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('vacances')
		.setDescription('Vous renvoie votre emploi du temps')
		.addStringOption(option => option
			.setName('classe')
			.setDescription('La classe dont vous voulez l\'emploi du temps')
			.setAutocomplete(true)
			.setRequired(false)
		)
		.addUserOption(option => option.setName('utilisateur').setDescription('L\'utilisateur cible'))
		.toJSON(),
	userPermissions: [PermissionFlagsBits.SendMessages],
	botPermissions: [PermissionFlagsBits.SendMessages],
	devOnly: false,
	testMode: false,
	deleted: false,
	sendDM: true,
	couldDown: true,
	runAutocomplete: async (client, interaction) => {

		const focusedOption = interaction.options.getFocused(true);
		let choices;

		if (focusedOption.name === 'classe') {
			choices = Object.keys(edtInfo);
		}

		if (focusedOption.name === 'date') {
			const date = new Date();
			choices = [];

			for (let i = 0; i < 25; i++) {
				let futureDate = new Date();
				futureDate.setDate(date.getDate() + i);
				const month = futureDate.getMonth() + 1;
				const day = futureDate.getDate();
				const formattedDate = `${day < 10 ? '0' + day : day}/${month < 10 ? '0' + month : month}`;
				choices.push(formattedDate);
			}
		}

		const filtered = choices.filter(choice => choice.startsWith(focusedOption.value));
		const response = filtered.map(choice => {
			if (focusedOption.name === 'classe') {
				return { name: choice, value: choice };
			}

			const [day, month] = choice.split('/');
			const date = new Date();
			date.setMonth(parseInt(month) - 1);
			date.setDate(parseInt(day));
			const options = { weekday: 'long', month: 'long', day: 'numeric' };
			const formatter = new Intl.DateTimeFormat('fr-FR', options);

			// Vérifier si la date est celle d'aujourd'hui
			const today = new Date();
			const isToday = date.getDate() === today.getDate() && date.getMonth() === today.getMonth();

			// Vérifier si la date est celle de demain
			const tomorrow = new Date(today);
			tomorrow.setDate(tomorrow.getDate() + 1);
			const isTomorrow = date.getDate() === tomorrow.getDate() && date.getMonth() === tomorrow.getMonth();

			let formattedName;
			if (isToday) {
				formattedName = 'Aujourd\'hui';
			} else if (isTomorrow) {
				formattedName = 'Demain';
			} else {
				formattedName = formatter.format(date);
			}

			return { name: `${choice} : ${formattedName.charAt(0).toUpperCase() + formattedName.slice(1)}`, value: choice };
		});


		await interaction.respond(response);

	},

	run: async (client, interaction) => {

		let startTime = Date.now();
		let classe;
		const { options, guildId, guild } = interaction;
		const iclasse = interaction.options.getString('classe');
		await interaction.deferReply({ content: 'Traitement en cours ...' });

		const utilisateur = interaction.options.getUser('utilisateur') || interaction.user;
		const dataDB = await user.findOne({ UserId: utilisateur.id });
		if (interaction.options.getUser('utilisateur')) {
			const userGroup = await user.findOne({ UserId: interaction.options.getUser('utilisateur').id });
			if (!iclasse && !userGroup.Group) { return interaction.editReply({ content: `${utilisateur} n'as pas de groupe par défaut` }); }
		}

		if (!iclasse && !dataDB || !dataDB.Group && !iclasse) {

			const choices = Object.keys(getClass);
			const Select = new StringSelectMenuBuilder()
				.setCustomId("setDefautGroupeSelect")
				.setPlaceholder("Choisissez une option")
				.addOptions(
					choices.map(choice => ({
						label: choice,
						value: choice
					}))

				)

			const row = new ActionRowBuilder().addComponents(Select);

			return interaction.editReply({
				embeds: [new EmbedBuilder()
					.setTitle('Attendez ! Votre groupe par défaut non défini')
					.setColor('#0099ff')
					.setDescription("Guide d'utilisation:\n Vous avez la possibilité d'utilser la commande ``/edt texte`` ou ``/edt image`` pour obtenir l'emploi du temps de votre classe par defaut.")
					.setFields(
						{ name: 'Pour avoir l\'emploi du temps d\'une autre classe : ', value: '``/edtimage <la classe> ``', inline: false },
						{ name: 'Ajouter les rappels de cours : ', value: '``/rappel <temps> <vrai/faux> ``', inline: false },
						{ name: ':warning: Pensez à définir votre classe par défaut', value: '``Avec l\'option si dessous :``', inline: false },

					)
					.setTimestamp()]
				, components: [row]
			});
		}

		classe = iclasse || dataDB.Group;


		

		// Récupérer les données du calendrier
		const url = getIcalUrlClass(classe.toUpperCase());
		const data = await ical.async.fromURL(url);

		// Obtenir la date actuelle
		let now = new Date();
		now.setHours(0, 0, 0, 0);

		// Trier les événements par date de début
		let sortedEvents = Object.values(data).sort((a, b) => new Date(a.start) - new Date(b.start));

		// Trouver le dernier événement avant maintenant
		let lastEvent = sortedEvents.reverse().find(ev => new Date(ev.start) <= now);

		// Trouver le prochain événement après maintenant
		let nextEvent = sortedEvents.find(ev => new Date(ev.start) > now);

		// Ignorer les jours fériés
		if (lastEvent.summary && lastEvent.summary.val === 'Férié') {
			lastEvent = [];
		}
		if (nextEvent.summary && nextEvent.summary.val === 'Férié') {
			nextEvent = [];
		}

		// Calculer le temps restant avant la fin des vacances
		let timeRemaining;
		if (nextEvent.start) {
			timeRemaining = new Date(nextEvent.start) - now;
		} else {
			console.log('Pas de prochain événement trouvé');
		}

		// Préparer la réponse
		if (timeRemaining) {
			console.log(`Temps restant avant la fin des vacances : ${Math.floor(timeRemaining / 1000 / 60)} minutes`);
		} else {
			console.log('Pas de vacances');
		}






// 		if (currentHoliday) {
// 			// Nous sommes en vacances, trouver le prochain jour de cours
// 			let nextCourseDay = Object.values(data).filter(ev => new Date(ev.start) > new Date(currentHoliday.end))[0];

// 			// Calculer le temps restant avant la fin des vacances
// 			let timeRemaining = new Date(currentHoliday.end) - now;

// 			// Préparer la réponse
// 			let start = new Date(nextCourseDay.start);
// 			let end = new Date(nextCourseDay.end);

// 			const timeFormat = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/Paris' };
// 			const startString = start.toLocaleString('fr-FR', timeFormat);
// 			const endString = end.toLocaleString('fr-FR', timeFormat);

// 			const embed = new EmbedBuilder()
// 				.setTitle(`Prochain jour de cours après les vacances`)
// 				.setColor('#0099ff')
// 				.addField('Début', startString, true)
// 				.addField('Fin', endString, true)
// 				.addField('Temps restant avant la fin des vacances', `${Math.floor(timeRemaining / 1000 / 60)} minutes`, true)
// 				.setTimestamp();

// 			interaction.editReply({ embeds: [embed] });
// 		} else {
// console.log('Pas de vacances');
// 		}





















		// // console.log(classe);
		// const url = getIcalUrlClass(classe.toUpperCase());
		// const data = await ical.async.fromURL(url);

		// let date = interaction.options.getString('date');
		// let now;
		// if (date) {
		// 	let currentYear = new Date().getFullYear();
		// 	date = date.split("/").reverse().join("/") + "/" + currentYear;

		// 	let parsedDate = new Date(date);
		// 	now = parsedDate;
		// } else {
		// 	now = new Date();
		// }

		// // console.log(now);
		// // 
		// now.setHours(0, 0, 0, 0);
		// let events = [];

		// events = Object.values(data).filter(ev => ev.type === 'VEVENT' && new Date(ev.start).setHours(0, 0, 0, 0) === now.setHours(0, 0, 0, 0));

		// console.log(events);
		// if (events.length === 0) {
		// 	return interaction.editReply({ embeds: [new EmbedBuilder().setTitle(`Emploi du temps du ${now.toLocaleDateString('fr-FR')}`).setColor('#0099ff').setDescription('Aucun cours ! Va dormir !').setTimestamp()] });
		// }
		// // --------------------------------------------------------------------------------------------------------------------------------------------------------------
		// // Assurez-vous qu'il y a au moins un événement dans le tableau
		// if (events.length > 0) {
		// 	// Copier le premier événement
		// 	let testEvent = { ...events[0] };

		// 	// Modifier l'heure de début et de fin
		// 	let pastDate = new Date();
		// 	pastDate.setMinutes(pastDate.getMinutes() - 60); // Définir à 60 minutes avant l'heure actuelle
		// 	testEvent.start = pastDate;

		// 	let pastEndDate = new Date(pastDate);
		// 	pastEndDate.setMinutes(pastEndDate.getMinutes() + 30); // Fin 30 minutes après le début
		// 	testEvent.end = pastEndDate;

		// 	// Ajouter l'événement de test au tableau d'événements
		// 	events.push(testEvent);
		// }
		// // --------------------------------------------------------------------------------------------------------------------------------------------------------------
		// events.sort((a, b) => a.start - b.start);


		// const embeds = [];
		// let fields = [];

		// events.forEach((ev, index) => {
		// 	const start = new Date(ev.start);
		// 	const end = new Date(ev.end);
		// 	const now = new Date();

		// 	const color = now > end ? '#ff0000' : (now >= start && now <= end) ? '#00ff00' : '#0099ff';

		// 	const timeFormat = { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/Paris' };
		// 	const startString = start.toLocaleString('fr-FR', timeFormat);
		// 	const endString = end.toLocaleString('fr-FR', timeFormat);

		// 	const timeRemaining = start - now;
		// 	const timePassed = now - end;
		// 	const timeToEnd = end - now;

		// 	const timeRemainingString = timePassed > 0 ? '~~Le cours est terminé~~' : timeRemaining > 0 ? `\`${Math.floor(timeRemaining / 1000 / 60)} minutes\`` : 'Le cours a commencé';
		// 	const timeToEndString = timeToEnd > 0 ? `\`${Math.floor(timeToEnd / 1000 / 60)} minutes restantes\`` : '~~Le cours est terminé~~';

		// 	const isPast = now > end;

		// 	if (fields.length + 7 > 25) {
		// 		const edtTextEmbed = new EmbedBuilder()
		// 			.setTitle(`Emploi du temps  :  __**${now.toLocaleDateString('fr-FR')}**__ - ${classe.toUpperCase()}`)
		// 			.setColor('#0099ff')
		// 			.addFields(fields)
		// 			.setTimestamp();
		// 		embeds.push(edtTextEmbed);
		// 		fields = [];
		// 	}

		// 	fields.push(
		// 		{ name: '> Salle', value: isPast ? `~~${ev.location ? `${ev.location.val}` : 'Pas de salle'}~~` : `${ev.location ? `${ev.location.val}` : 'Pas de salle'}`, inline: true },
		// 		{ name: 'Début', value: isPast ? `~~${startString}~~` : `${startString}`, inline: true },
		// 		{ name: 'Fin', value: isPast ? `~~${endString}~~` : `${endString}`, inline: true },
		// 		{ name: 'Matière', value: isPast ? `~~${ev.description ? `${ev.description.val.split(' : ')[1].split('\n')[0]}` : 'Pas d\'Matière'}~~` : `${ev.description ? `${ev.description.val.split(' : ')[1].split('\n')[0]}` : 'Pas d\'Matière'}`, inline: true },
		// 		{ name: 'Temps avant début', value: timeRemainingString, inline: true },
		// 		{ name: 'Temps avant fin', value: timeToEndString, inline: true },
		// 	);

		// 	if (now >= start && now <= end) {
		// 		fields.push({ name: 'En cours', value: '---------------------------------------------------------------------------\nA suivre :', inline: false });
		// 	}

		// 	fields.push({ name: ' ', value: ' ' });

		// 	if (index === events.length - 1) {
		// 		const edtTextEmbed = new EmbedBuilder()
		// 			.setTitle(`Emploi du temps  :  __**${now.toLocaleDateString('fr-FR')}**__ - ${classe.toUpperCase()}`)
		// 			.setColor('#0099ff')
		// 			.addFields(fields)
		// 			.setTimestamp();
		// 		embeds.push(edtTextEmbed);
		// 	}
		// });

		// interaction.editReply({ embeds: embeds });
		// // ...



	}
}
