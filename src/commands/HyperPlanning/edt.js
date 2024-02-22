const { SlashCommandBuilder, PermissionFlagsBits, Activitygroup, EmbedBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');


const getIcalUrlClass = require('../../../src/utils/getIcalUrlClass.js');
const getClass = require('../../../src/utils/edtInfo.json');
const ical = require('node-ical');
const { getBrowser } = require('../../../src/events/ready/consoleLog.js');

const fs = require('fs');
const path = require('path');


const user	 = require('../../schemas/user');
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
		.setName('edt')
		.setDescription('Vous renvoie votre emploi du temps')
		.addSubcommand((subcommand) => subcommand
			.setName("texte")
			.setDescription("Vous envoie l'emploi du temps en texte")
			.addStringOption(option => option
				.setName('classe')
				.setDescription('La classe dont vous voulez l\'emploi du temps')
				.setAutocomplete(true)
				.setRequired(false)
				)
				.addUserOption(option => option.setName('utilisateur').setDescription('L\'utilisateur cible'))
				.addStringOption(option => option
					.setName('date')
					.setDescription('La date que vous souhaitez consulter')
				.setAutocomplete(true)
				.setRequired(false)
			)

		)
		.addSubcommand(subcommand => subcommand
			.setName('image')
			.setDescription('Envoie l\'emploi du temps en image')
			.addStringOption(option => option
				.setName('classe')
				.setDescription('La classe dont vous voulez l\'emploi du temps')
				.setAutocomplete(true)
				.setRequired(false)
				)
				.addUserOption(option => option.setName('utilisateur').setDescription('L\'utilisateur cible'))
				.addStringOption(option => option
					.setName('date')
					.setDescription('La date que vous souhaitez consulter')
				.setAutocomplete(true)
				.setRequired(false)
			)
		)
		.toJSON(),
	userPermissions: [PermissionFlagsBits.SendMessages],
	botPermissions: [PermissionFlagsBits.SendMessages],
	devOnly: false,
	testMode: false,
	deleted: false,
	sendDM: true,
	couldDown :true,
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
			const formattedName = formatter.format(date);
			return { name: `${choice} : ${formattedName.charAt(0).toUpperCase() + formattedName.slice(1)}`, value: choice };
		});


		await interaction.respond(response);
		
	},

	run: async (client, interaction) => {

		let startTime = Date.now();

		const { options, guildId, guild } = interaction;

		let iclasse = interaction.options.getString('classe');

		let classe;

		await interaction.deferReply({ content: 'Traitement en cours ...'});

		let reply = await interaction.fetchReply();

		const utilisateur = interaction.options.getUser('utilisateur') || interaction.user;

		const dataDB = await user.findOne({ UserId: utilisateur.id });

		if (interaction.uesr === utilisateur && !iclasse && !dataDB.Group) { return interaction.editReply({ content: `${utilisateur} n'as pas de groupe par défaut` }); }

		if (!iclasse && !dataDB || !dataDB.Group && !iclasse) {

			return interaction.editReply({
				embeds: [new EmbedBuilder()
					.setTitle('Groupe par défaut non défini')
					.setColor('#0099ff')
					.setDescription("Guide d'utilisation:\n Vous avez la possibilité d'utilser la commande ``/edt texte`` ou ``/edt image`` pour obtenir l'emploi du temps de votre classe par defaut.")
					.setFields(
						{ name: ':warning: Pensez à définir votre classe par défaut', value: '``/setdefautgroupe``', inline: false },
						{ name: 'Pour avoir l\'emploi du temps d\'une autre classe : ', value: '``/edtimage <la classe> ``', inline: false },
						{ name: 'Ajouter les rappels de cours : ', value: '``/rappel <temps> <vrai/faux> ``', inline: false },

					)
					.setTimestamp()]
				,
			});
		}
		classe = iclasse || dataDB.Group;

		const subcmd = options.getSubcommand();
		if (!subcmd) return interaction.editReply({ content: 'Veuillez choisir une option valide ( Texte ou Image) ', ephemeral: true });
	
	
		// console.log(classe);
		const url = getIcalUrlClass(classe.toUpperCase());
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
			return interaction.editReply({ embeds: [new EmbedBuilder().setTitle(`Emploi du temps du ${now.toLocaleDateString('fr-FR')}`).setColor('#0099ff').setDescription('Aucun cours ! va dormir !').setTimestamp()] });
		}
		// --------------------------------------------------------------------------------------------------------------------------------------------------------------
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
			// --------------------------------------------------------------------------------------------------------------------------------------------------------------
			events.sort((a, b) => a.start - b.start);

		switch (subcmd) {
			case "texte":
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
							.setTitle(`Emploi du temps  :  __**${now.toLocaleDateString('fr-FR')}**__ - ${classe.toUpperCase()}`)
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
							.setTitle(`Emploi du temps  :  __**${now.toLocaleDateString('fr-FR')}**__ - ${classe.toUpperCase()}`)
							.setColor('#0099ff')
							.addFields(fields)
							.setTimestamp();
						embeds.push(edtTextEmbed);
					}
				});

				interaction.editReply({ embeds: embeds });
				break;
			// ...
		



			case "image":

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
				const infoPart = urlParts.find(part => part.includes('INFO'));

				// Divisez cette partie en utilisant '_' comme séparateur et récupérez le dernier élément
				let groupName = infoPart.split('_')[1].split('.')[0];

				// Ajoutez un espace après le premier 'O' uniquement
				if (groupName.includes('INFOO'))
					groupName = groupName.replace(/(O)(\d+)/, '$1 ' + '$2');
				else
					groupName = infoPart.split('_')[1].split('.')[0].replace("O", "O ")


				// console.log(groupName);
				await page.evaluate((groupName) => {
					let titleElement = document.querySelector('.title h1');
					if (titleElement) {
						titleElement.textContent = groupName;
					}
				}, groupName);

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


					if (previousEventEndTime && new Date(ev.start) - previousEventEndTime > 0.75 * 60 * 60 * 1000) {
						page.evaluate((pauseMidiHtml) => document.querySelector('.grid-edt').innerHTML += pauseMidiHtml, `<div class="card"><span class="material-symbols-rounded">flatware</span><p>Pause Midi de ${formatTime(previousEventEndTime)} à ${startString} - (${formatDuration(new Date(ev.start) - previousEventEndTime)})</p></div>`);
					}

					previousEventEndTime = end;

					await page.evaluate((courseHtml) => document.querySelector('.grid-edt').innerHTML += courseHtml, `<div class="item ${statusClass}"><div class="start"><p>${startString}</p><p>${endString}</p></div><div class="center"><h2>${ev.summary.val}</h2><div class="show-items"><div class="in"><span class="material-symbols-rounded">door_open</span><p>${ev.location ? ev.location.val : 'Pas de salle'}</p></div><div class="in"><span class="material-symbols-rounded">alarm</span><p>${statusClass === 'end' ? timeToEndString : statusClass === 'active' ? timeRemainingString : `Démarre Bientot`}</p></div></div></div></div>`);
				}

				await page.evaluate((finJournee) => document.querySelector('.grid-edt').innerHTML += finJournee, `<div class="card"><span class="material-symbols-rounded">flag</span><p>${finJourneeMessage}</p></div>`);

				// output du fichier
				let rnd = Math.floor(Math.random() * 1000000);
				await page.screenshot({ path: `stdout/output_${rnd}.png` });
				await page.close();

				let timeGeneration = (Date.now() - startTime) /1000;
				
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

				break;
		}
	}
}
