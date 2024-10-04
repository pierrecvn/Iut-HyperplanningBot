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
				// // // // Assurez-vous qu'il y a au moins un événement dans le tableau
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
					console.log(`Utilisateur ${user.UserId} dans le groupe ${group}`);
					// Trouver le rappel actif pour cet utilisateur
					const rappel = await Rappel.findOne({ userId: user.UserId, active: true }).exec();
					if (rappel) {
						// Si un rappel actif est trouvé, envoyer une intégration pour chaque événement à l'utilisateur
						const discordUser = await client.users.fetch(user.UserId);
						if (discordUser) {
							// Créer une intégration pour le prochain événement
							const embed = new EmbedBuilder()
								.setTitle(`Prochain cours : ${nextEvent.summary.val}`)
								.setFooter({ text: `Rappel ${rappel.time}` })
								.setDescription(`
								\n> Début : ${nextEvent.start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })}
								\n> Fin   : ${nextEvent.end.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })}
								\n> Salle : ${nextEvent.location ? nextEvent.location.val : 'Pas de salle'}`)
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
							schedule.scheduleJob(jobId, jobDate, async function () {
								try {
									await discordUser.send({ embeds: [embed] });
								} catch (error) {
									console.error(`Impossible d'envoyer un message à l'utilisateur ${discordUser.id}: `, error);
								}
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



	const intervalTime = 20 * 60 * 1000; // toutes les 15 minutes reactualise la base des rappels 
	setInterval(mainFunction, intervalTime);
}
