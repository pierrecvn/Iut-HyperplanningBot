const { EmbedBuilder } = require('discord.js');
const schedule = require('node-schedule');
const Rappel = require('../../schemas/rappel');
const User = require('../../schemas/user');

const getIcalUrlClass = require('../../../src/utils/getIcalUrlClass.js');
const getClass = require('../../../src/utils/edtInfo.json');
const ical = require('node-ical');
const { getBrowser } = require('../../../src/events/ready/consoleLog.js');











module.exports = async (client) => {

	async function mainFunction() {
		try {
			// Récupérer tous les utilisateurs
			const users = await User.find();

			// Regrouper les utilisateurs par groupe
			const usersByGroup = users.reduce((groups, user) => {
				const key = user.Group;
				if (key) { // Vérifier si le groupe est défini
					if (!groups[key]) {
						groups[key] = [];
					}
					groups[key].push(user);
				}
				return groups;
			}, {});

			// Pour chaque groupe d'utilisateurs
			for (let group in usersByGroup) {
				// Récupérer l'emploi du temps pour ce groupe
				const url = getIcalUrlClass(group);
				const data = await ical.async.fromURL(url);

				now = new Date();
				now.setHours(0, 0, 0, 0);
				let events = [];

				events = Object.values(data).filter(ev => ev.type === 'VEVENT' && new Date(ev.start).setHours(0, 0, 0, 0) === now.setHours(0, 0, 0, 0));
				// --------------------------------------------------------------------------------------------------------------------------------------------------------------
				// // // Assurez-vous qu'il y a au moins un événement dans le tableau
				// if (events.length > 0) {
				// 	// Copier le premier événement
				// 	let testEvent = { ...events[0] };

				// 	// Modifier l'heure de début et de fin
				// 	let futureDate = new Date();
				// 	futureDate.setMinutes(futureDate.getMinutes() + 6); // Définir à 6 minutes après l'heure actuelle
				// 	testEvent.start = futureDate;

				// 	let futureEndDate = new Date(futureDate);
				// 	futureEndDate.setMinutes(futureEndDate.getMinutes() + 60); // Fin 60 minutes après le début
				// 	testEvent.end = futureEndDate;

				// 	// Ajouter l'événement de test au tableau d'événements
				// 	events.push(testEvent);
				// }
				//--------------------------------------------------------------------------------------------------------------------------------------------------------------
				events.sort((a, b) => a.start - b.start);

				// Trouver le prochain événement qui n'a pas encore commencé
				const nextEvent = events.find(ev => new Date(ev.start) > new Date());

				// Si aucun événement n'est trouvé, passer à l'utilisateur suivant
				if (!nextEvent) continue;

				// Pour chaque utilisateur dans le groupe
				for (let user of usersByGroup[group]) {
					// console.log(`Utilisateur ${user.UserId} dans le groupe ${group}`);
					// Trouver le rappel actif pour cet utilisateur
					const rappel = await Rappel.findOne({ userId: user.UserId, active: true }).exec();
					if (rappel) {
						// Si un rappel actif est trouvé, envoyer une intégration pour chaque événement à l'utilisateur
						const discordUser = await client.users.fetch(user.UserId);
						if (discordUser) {
							// Créer une intégration pour le prochain événement
							const embed = new EmbedBuilder()
								.setTitle(`Prochain cours : ${nextEvent.summary.val}`)
								.setFooter({ text : `Rappel ${rappel.time}`})
								.setDescription(`Début : ${nextEvent.start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} Fin : ${nextEvent.end.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`)
								.setColor('#0099ff');


							const jobDate = new Date(nextEvent.start);
							const rappelTime = rappel.time.split(' ')[0];
							jobDate.setMinutes(jobDate.getMinutes() - rappelTime);

							// Créer un identifiant unique pour la tâche
							const jobId = `${user.UserId}-${nextEvent.uid}`;

							// Annuler la tâche existante avec le même identifiant
							const existingJob = schedule.scheduledJobs[jobId];
							if (existingJob) {
								existingJob.cancel();
							}

							// Planifier la nouvelle tâche
							schedule.scheduleJob(jobId, jobDate, function () {
								discordUser.send({ embeds: [embed] });
							});
						} else {
							console.log(`Impossible de trouver l'utilisateur avec l'ID ${user.UserId}`);
						}
					}
				}
			}
		} catch (error) {
			console.error(error);
		}
	};

	mainFunction();



	const intervalTime = 15 * 60 * 1000;
	setInterval(mainFunction, intervalTime);
}





/*

const { EmbedBuilder } = require('discord.js');

const schedule = require('node-schedule');
const Rappel = require('../../schemas/rappel');
const User = require('../../schemas/user');

const getIcalUrlClass = require('../../../src/utils/getIcalUrlClass.js');
const getClass = require('../../../src/utils/edtInfo.json');
const ical = require('node-ical');
const { getBrowser } = require('../../../src/events/ready/consoleLog.js');

module.exports = async (client) => {
	try {
		// Récupérer tous les utilisateurs
		const users = await User.find();

		// Regrouper les utilisateurs par groupe
		const usersByGroup = users.reduce((groups, user) => {
			const key = user.Group;
			if (!groups[key]) {
				groups[key] = [];
			}
			groups[key].push(user);
			return groups;
		}, {});

		// Pour chaque groupe d'utilisateurs
		for (let group in usersByGroup) {
			// Récupérer l'emploi du temps pour ce groupe
			const url = getIcalUrlClass(group);
			const data = await ical.async.fromURL(url);

			now = new Date();
			now.setHours(0, 0, 0, 0);
			let events = [];

			events = Object.values(data).filter(ev => ev.type === 'VEVENT' && new Date(ev.start).setHours(0, 0, 0, 0) === now.setHours(0, 0, 0, 0));
		// --------------------------------------------------------------------------------------------------------------------------------------------------------------
		// // Assurez-vous qu'il y a au moins un événement dans le tableau
			if (events.length > 0) {
				// Copier le premier événement
				let testEvent = { ...events[0] };

				// Modifier l'heure de début et de fin
				let futureDate = new Date();
				futureDate.setMinutes(futureDate.getMinutes() + 6); // Définir à 6 minutes après l'heure actuelle
				testEvent.start = futureDate;

				let futureEndDate = new Date(futureDate);
				futureEndDate.setMinutes(futureEndDate.getMinutes() + 60); // Fin 60 minutes après le début
				testEvent.end = futureEndDate;

				// Ajouter l'événement de test au tableau d'événements
				events.push(testEvent);
			}
			//--------------------------------------------------------------------------------------------------------------------------------------------------------------
			events.sort((a, b) => a.start - b.start);

			// Pour chaque utilisateur dans le groupe
			for (let user of usersByGroup[group]) {
				console.log(`Utilisateur ${user.UserId} dans le groupe ${group}`);
				// Trouver le rappel actif pour cet utilisateur
				const rappel = await Rappel.findOne({ userId: user.UserId, active: true }).exec();
				if (rappel) {
					// Si un rappel actif est trouvé, envoyer une intégration pour chaque événement à l'utilisateur
					const discordUser = await client.users.fetch(user.UserId);
					if (discordUser) {
						const embeds = [];
						let fields = [];

						events.forEach((ev, index) => {
							const start = new Date(ev.start);
							const end = new Date(ev.end);
							const now = new Date();

							const color = now > end ? '#ff0000' : (now >= start && now <= end) ? '#00ff00' : '#0099ff';

							const timeFormat = { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/Paris' };
							const startString = start.toLocaleString('fr-FR', timeFormat);
							const endString = end.toLocaleString('fr-FR', timeFormat);

							const timeRemaining = start - now;
							const timePassed = now - end;
							const timeToEnd = end - now;

							const timeRemainingString = timePassed > 0 ? '~~Le cours est terminé~~' : timeRemaining > 0 ? `\`${Math.floor(timeRemaining / 1000 / 60)} minutes\`` : 'Le cours a commencé';
							const timeToEndString = timeToEnd > 0 ? `\`${Math.floor(timeToEnd / 1000 / 60)} minutes restantes\`` : '~~Le cours est terminé~~';

							const isPast = now > end;

							if (fields.length + 7 > 25) {
								const edtTextEmbed = new EmbedBuilder()
									.setTitle(`Emploi du temps  :  __**${now.toLocaleDateString('fr-FR')}**__ - ${group.toUpperCase()}`)
									.setColor('#0099ff')
									.addFields(fields)
									.setTimestamp();
								embeds.push(edtTextEmbed);
								fields = [];
							}

							fields.push(
								{ name: '> Salle', value: isPast ? `~~${ev.location ? `${ev.location.val}` : 'Pas de salle'}~~` : `${ev.location ? `${ev.location.val}` : 'Pas de salle'}`, inline: true },
								{ name: 'Début', value: isPast ? `~~${startString}~~` : `${startString}`, inline: true },
								{ name: 'Fin', value: isPast ? `~~${endString}~~` : `${endString}`, inline: true },
								{ name: 'Matière', value: isPast ? `~~${ev.description ? `${ev.description.val.split(' : ')[1].split('\n')[0]}` : 'Pas d\'Matière'}~~` : `${ev.description ? `${ev.description.val.split(' : ')[1].split('\n')[0]}` : 'Pas d\'Matière'}`, inline: true },
								{ name: 'Temps avant début', value: timeRemainingString, inline: true },
								{ name: 'Temps avant fin', value: timeToEndString, inline: true },
							);

							if (now >= start && now <= end) {
								fields.push({ name: 'En cours', value: '---------------------------------------------------------------------------\nA suivre :', inline: false });
							}

							fields.push({ name: ' ', value: ' ' });

							if (index === events.length - 1) {
								const edtTextEmbed = new EmbedBuilder()
									.setTitle(`Emploi du temps  :  __**${now.toLocaleDateString('fr-FR')}**__ - ${group.toUpperCase()}`)
									.setColor('#0099ff')
									.addFields(fields)
									.setTimestamp();
								embeds.push(edtTextEmbed);
							}
							const jobDate = new Date(ev.start);
							jobDate.setMinutes(jobDate.getMinutes() - 5);
							schedule.scheduleJob(jobDate, function () {
								discordUser.send({ embeds: embeds });
							});
						});
					} else {
						console.log(`Impossible de trouver l'utilisateur avec l'ID ${user.UserId}`);
					}
				}
			}
		}
	} catch (error) {
		console.error(error);
	}
}*/