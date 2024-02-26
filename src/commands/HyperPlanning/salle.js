const { SlashCommandBuilder, StringSelectMenuBuilder, PermissionFlagsBits, ActionRowBuilder, EmbedBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle, } = require('discord.js');

const { getBrowser } = require('../../../src/events/ready/consoleLog.js');
const getIcalUrlSalle = require('../../utils/getIcalUrlSalle.js');
const getSalle = require('../../utils/salleInfo.json');
const ical = require('node-ical');
const puppeteer = require('puppeteer');
const fs = require('fs')	
const path = require('path');
const mConfig = require('../../messageConfig.json');

const formatTimeLibre = (date) => {
	const day = date.getDate().toString().padStart(2, '0');
	const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Les mois commencent à 0 en JavaScript
	const hours = date.getHours().toString().padStart(2, '0');
	const minutes = date.getMinutes().toString().padStart(2, '0');

	return `${hours}:${minutes} -(${day}/${month})`;
};
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
		.setName('salle')
		.setDescription('Vous renvoie toutes les salles disponibles a l\'heure actuelle')
		.addStringOption(option => option
			.setName('numero')
			.setDescription('La salle dont vous voulez l\'emploi du temps')
			.setAutocomplete(true)
			.setRequired(false)
		)
		.toJSON(),
	userPermissions: [PermissionFlagsBits.SendMessages],
	botPermissions: [PermissionFlagsBits.SendMessages],
	devOnly: false,
	testMode: false,
	deleted: false,
	sendDM: true,
	cooldown: true,
	runAutocomplete: async (client, interaction) => {

		const focusedOption = interaction.options.getFocused(true);
		let choices;

		choices = Object.keys(getSalle);

		const filtered = choices.filter(choice => choice.startsWith(focusedOption.value));
		const response = filtered.map(choice => {

			return { name: choice.substring(0, 3), value: choice };

		});

		await interaction.respond(response);

	},

	run: async (client, interaction) => {

		const startTime = Date.now();

		await interaction.deferReply({ content: 'Traitement en cours ...' });

		const nbSalle = interaction.options.getString('numero');

		if (nbSalle && !Object.keys(getSalle).includes(nbSalle)) {
				return interaction.editReply({ embeds: [new EmbedBuilder().setTitle(`Salle non valide`).setColor(mConfig.embedColorError).setDescription('Cette salle est invalide, \n Ex : /salle 602 ').setTimestamp()] , ephemeral: true});
		}


		if (nbSalle) {


			const url = getIcalUrlSalle(nbSalle);
			const data = await ical.async.fromURL(url);


			let date = interaction.options.getString('date');
			// console.log(date);

			let now;
			if (date) {
				let currentYear = new Date().getFullYear();
				date = date.split("/").reverse().join("/") + "/" + currentYear;

				let parsedDate = new Date(date);
				now = parsedDate;
			} else {
				now = new Date();
			}

			// console.log(now);
			// 
			now.setHours(0, 0, 0, 0);
			let events = [];

			events = Object.values(data).filter(ev => ev.type === 'VEVENT' && new Date(ev.start).setHours(0, 0, 0, 0) === now.setHours(0, 0, 0, 0));

			// console.log(events);
			if (events.length === 0) {
				return interaction.editReply({ embeds: [new EmbedBuilder().setTitle(`Emploi du temps du ${now.toLocaleDateString('fr-FR')}`).setColor('#0099ff').setDescription('Cette salle est libre, il n \'y a aucun cours dedans').setTimestamp()] });
			}

			const content = fs.readFileSync(path.join(__dirname, '../../utils/styles/index.html'), 'utf8');
			const style = fs.readFileSync(path.join(__dirname, '../../utils/styles/style.css'), 'utf8');

			const browser = await getBrowser();
			const page = await browser.newPage();

			const pageHeight = 500 + events.length * 100;
			await page.setViewport({ width: 450, height: pageHeight, deviceScaleFactor: 5 });

			await Promise.all([
				page.setContent(content),
				page.addStyleTag({ content: style })
			]);

			await page.evaluate((date) => document.querySelector('.time').innerHTML += `<p>${date}</p>`, now.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));

			const urlParts = url.split('/');

			// Récupérez la partie de l'URL qui contient 'INFOF1'
			const infoPart = urlParts.find(part => part.includes('Edt_IUTC_'));

			// Divisez cette partie en utilisant '_' comme séparateur et récupérez le dernier élément
			let salleName = infoPart.split('_')[2].split('.')[0];

			// Ajoutez un espace après le premier 'O' uniquement
			if (salleName.includes('Edt_IUTC_'))
				salleName = salleName.replace("_", " ");
			else
				salleName = "Salle " + infoPart.split('_')[2].split('.')[0].replace("_", " ")


			// console.log(salleName);



			await page.evaluate((salleName) => {
				let titleElement = document.querySelector('.title h1');
				if (titleElement) {
					titleElement.textContent = salleName;
				}
			}, salleName);

			let currentEvent = null;
			let previousEventEndTime = null;
			let finJourneeMessage;


			for (const [index, ev] of events.entries()) {
				const start = new Date(ev.start);
				const end = new Date(ev.end);
				const now = new Date();
				const lastEvent = events[events.length - 1];
				const lastEventEnd = new Date(lastEvent.end);
				let statusClass, color;

				if (now > end) {
					color = '#ff0000'; // Red
					statusClass = 'end';
				} else if (now >= start && now <= end) {
					color = '#00ff00'; // Green
					statusClass = 'active';
					currentEvent = ev;
				} else {
					color = '#0099ff';
					statusClass = 'soon'; // Blue
				}

				const startString = formatTime(start);
				const endString = formatTime(end);
				const currentTimeString = formatTime(now);
				const timeRemainingString = formatDuration(end - now);
				const timeToEndString = calculateTimeToEnd(end, now);


				if (now > lastEventEnd) {
					// Si le dernier événement est terminé, affichez "Journée Terminée !!"
					finJourneeMessage = `Journée Terminée !!`;
				} else {
					// Sinon, affichez le temps restant jusqu'à la fin de la journée
					finJourneeMessage = `Fin de journée dans : ${formatDuration(lastEventEnd - now)}`; // timeRemainingString;
				}


				// if (previousEventEndTime && new Date(ev.start) - previousEventEndTime > 0.75 * 60 * 60 * 1000) {
				// 	page.evaluate((pauseMidiHtml) => document.querySelector('.grid-edt').innerHTML += pauseMidiHtml, `<div class="card"><span class="material-symbols-rounded">flatware</span><p>Pause Midi de ${formatTime(previousEventEndTime)} à ${startString} - (${formatDuration(new Date(ev.start) - previousEventEndTime)})</p></div>`);
				// }

				previousEventEndTime = end;

				await page.evaluate((courseHtml) => document.querySelector('.grid-edt').innerHTML += courseHtml, `<div class="item ${statusClass}"><div class="start"><p>${startString}</p><p>${endString}</p></div><div class="center"><h2>${ev.summary.val}</h2><div class="show-items"><div class="in"><span class="material-symbols-rounded">door_open</span><p>${ev.location ? ev.location.val : 'Pas de salle'}</p></div><div class="in"><span class="material-symbols-rounded">alarm</span><p>${statusClass === 'end' ? timeToEndString : statusClass === 'active' ? timeRemainingString : `Démarre Bientot`}</p></div></div></div></div>`);
			}

			await page.evaluate((finJournee) => document.querySelector('.grid-edt').innerHTML += finJournee, `<div class="card"><span class="material-symbols-rounded">flag</span><p>${finJourneeMessage}</p></div>`);

			// output du fichier
			let rnd = Math.floor(Math.random() * 1000000);
			await page.screenshot({ path: `stdout/output_${rnd}.png` });
			await page.close();

			let timeGeneration = (Date.now() - startTime) / 1000;

			// await browser.close();





			// -----------------------------------------------
			const attachment = new AttachmentBuilder(`./stdout/output_${rnd}.png`, `output_${rnd}.png`);

			const Buttons = new ActionRowBuilder().setComponents(
				new ButtonBuilder().setCustomId("restartBtn").setLabel("Recharger").setStyle(ButtonStyle.Primary),
				// new ButtonBuilder().setCustomId("cancelBtn").setLabel("Annuler").setStyle(ButtonStyle.Secondary)
			)
			let embed;
			if (currentEvent) {
				const start = new Date(currentEvent.start);
				const end = new Date(currentEvent.end);
				const now = new Date();
				const startString = formatTime(start);
				const endString = formatTime(end);

				const timeToEnd = end - now;
				let timeToEndString;

				if (timeToEnd > 0) {
					const minutesToEnd = formatDuration(timeToEnd, ms = true);
					timeToEndString = `${minutesToEnd} restantes`;
				} else {
					timeToEndString = 'Le cours est terminé';
				}

				embed = new EmbedBuilder()
					.setTitle('Cours actuel :')
					.setDescription(currentEvent.summary.val)
					.setColor('00FF00')
					.setImage(`attachment://output_${rnd}.png`)
					.addFields(
						{ name: 'Salle', value: currentEvent.location ? currentEvent.location.val : 'Pas de salle', inline: true },
						{ name: 'Matière', value: currentEvent.description ? currentEvent.description.val.split(' : ')[1].split('\n')[0] : 'Pas d\'Matière', inline: true },
						{ name: '\u200B', value: '\u200B', inline: true },
						{ name: 'Début', value: startString, inline: true },
						{ name: 'Fin', value: endString, inline: true },
						{ name: '\u200B', value: '\u200B', inline: true },
						{ name: 'Fin dans ', value: timeToEndString, inline: true },
					)
					.setTimestamp()
					.setFooter({ text: ` Generation : ${timeGeneration}s` });



			} else {
				embed = new EmbedBuilder()
					.setTitle('Emploi du temps du ' + now.toLocaleDateString('fr-FR'))
					.setColor('#0099ff')
					.setImage(`attachment://output_${rnd}.png`)
					.setDescription('Aucun événement en cours.')
					.setFooter({ text: ` Generation : ${timeGeneration} s` })
					.setTimestamp();
			}


			await interaction.editReply({
				embeds: [embed],
				files: [attachment],
				ephemeral: true,
				// components: [Buttons]
			});

			fs.unlinkSync(`./stdout/output_${rnd}.png`);
			// await console.log('Image supprimée');


		} else {
			const salles = Object.keys(getSalle);
			let sallesLibres = [];

			// Parcourez chaque salle
			for (let salle of salles) {
				const url = getIcalUrlSalle(salle);
				const data = await ical.async.fromURL(url);

				// Obtenez tous les événements pour la journée
				const events = Object.values(data).filter(ev => ev.type === 'VEVENT');

				// Triez les événements par leur heure de début
				events.sort((a, b) => new Date(a.start) - new Date(b.start));

				// Créez un tableau pour stocker les intervalles de temps libres
				let freeTimes = [];

				// Parcourez la liste des événements
				for (let i = 0; i < events.length - 1; i++) {
					// Si l'heure de fin de l'événement actuel est inférieure à l'heure de début de l'événement suivant, alors la salle est libre entre ces deux événements
					if (new Date(events[i].end) < new Date(events[i + 1].start)) {
						freeTimes.push({ start: new Date(events[i].end), end: new Date(events[i + 1].start), nextEventStart: new Date(events[i + 1].start) });
					}
				}

				// Obtenez l'heure actuelle
				const now = new Date();
				// now.setHours(10, 16, 0, 0);
				

				// Trouvez l'intervalle de temps libre actuel
				const currentFreeTime = freeTimes.find(time => now >= time.start && now <= time.end);

				// Si un intervalle de temps libre actuel existe, ajoutez-le à la liste des salles libres
				if (currentFreeTime) {
					sallesLibres.push({ salle, freeTime: currentFreeTime });
				}
			}

			// Créez un embed pour afficher les salles libres et leur intervalle de temps libre actuel
			const embed = new EmbedBuilder()
				.setTitle('Salles libres')
				.setColor('#0099ff');

			for (let salleLibre of sallesLibres) { // ${salleLibre.freeTime.start.toLocaleTimeString()}
				embed.addFields({ name: salleLibre.salle.substring(0, 3), value: `Disponible jusqu'à \n${formatTimeLibre(salleLibre.freeTime.nextEventStart)}`, inline: true });
			}

			// Envoyez l'embed
			interaction.editReply({ embeds: [embed] });
		}
	}
}
