const { SlashCommandBuilder, PermissionFlagsBits, StringSelectMenuBuilder, EmbedBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');


const getIcalUrlClass = require('../../../src/utils/getIcalUrlClass.js');
const getClass = require('../../../src/utils/edtInfo.json');
const ical = require('node-ical');
const { getBrowser } = require('../../../src/events/ready/consoleLog.js');

const fs = require('fs');
const path = require('path');

const user = require('../../schemas/user');
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
			.addStringOption(option => option
				.setName('date')
				.setDescription('La date que vous souhaitez consulter')
				.setAutocomplete(true)
				.setRequired(false)
			)
			.addUserOption(option => option.setName('utilisateur').setDescription('L\'utilisateur cible'))

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
			.addStringOption(option => option
				.setName('date')
				.setDescription('La date que vous souhaitez consulter')
				.setAutocomplete(true)
				.setRequired(false)
			)
			.addUserOption(option => option.setName('utilisateur').setDescription('L\'utilisateur cible'))
		)
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

		const subcmd = options.getSubcommand();
		if (!subcmd) return interaction.editReply({ content: 'Veuillez choisir une option valide ( Texte ou Image) ', ephemeral: true });

		// console.log(classe);
		const url = getIcalUrlClass(classe.toUpperCase());
		const data = await ical.async.fromURL(url);

		let date = interaction.options.getString('date');
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

		console.log(events);
		if (events.length === 0) {
			return interaction.editReply({ embeds: [new EmbedBuilder().setTitle(`Emploi du temps du ${now.toLocaleDateString('fr-FR')}`).setColor('#0099ff').setDescription('Aucun cours ! Va dormir !').setTimestamp()] });
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

				const [content, style] = await Promise.all([
					fs.promises.readFile(path.join(__dirname, '../../utils/styles/index.html'), 'utf8'),
					fs.promises.readFile(path.join(__dirname, '../../utils/styles/style.css'), 'utf8')
				]);

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
						page.evaluate((pauseMidiHtml) => document.querySelector('.grid-edt').innerHTML += pauseMidiHtml, `<div class="card"><span class="material-symbols-rounded"><svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20"><path d="M252.491-164q-6.722 0-11.453-4.6-4.731-4.6-4.731-11.4v-349.385q-25.23-5.538-41.076-23.002-15.847-17.465-15.847-43.921v-186.461q0-5.671 3.723-9.451 3.724-3.78 9.308-3.78 5.585 0 9.508 3.78 3.923 3.78 3.923 9.451V-604h33.231v-178.769q0-5.671 3.723-9.451 3.723-3.78 9.308-3.78 5.584 0 9.507 3.78t3.923 9.451V-604h33.231v-178.769q0-5.671 3.723-9.451 3.723-3.78 9.308-3.78t9.508 3.78q3.923 3.78 3.923 9.451v186.461q0 26.456-15.846 43.921-15.846 17.464-41.077 24.002V-180q0 6.8-4.548 11.4-4.547 4.6-11.269 4.6Zm248.616 0q-6.722 0-11.453-4.725-4.731-4.725-4.731-11.711v-343.872q-33.692-13.461-58.846-49.23-25.154-35.77-25.154-86.462 0-57.317 28.846-96.659Q458.615-796 500.923-796q42.308 0 71.154 39.341 28.846 39.342 28.846 96.659 0 50.692-25.154 86.462-25.153 35.769-58.846 49.23v343.872q0 6.986-4.547 11.711Q507.829-164 501.107-164Zm200.502 0q-6.722 0-11.243-4.6-4.52-4.6-4.52-11.4v-581.692q0-11.77 6.466-20.731 6.465-8.962 16.457-8.962 31.385 0 51.616 29.462 20.231 29.461 20.231 89.923v191.692q0 12.031-8.172 20.17Q764.272-452 752.191-452h-34.578v272q0 6.8-4.641 11.4-4.641 4.6-11.363 4.6Z"/></svg></span><p>Pause Midi de ${formatTime(previousEventEndTime)} à ${startString} - (${formatDuration(new Date(ev.start) - previousEventEndTime)})</p></div>`);
					}

					previousEventEndTime = end;

					await page.evaluate((courseHtml) => document.querySelector('.grid-edt').innerHTML += courseHtml, `<div class="item ${statusClass}"><div class="start"><p>${startString}</p><p>${endString}</p></div><div class="center"><h2>${ev.summary.val}</h2><div class="show-items"><div class="in"><span class="material-symbols-rounded"><svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20"><path d="M443.789-453.231q10.596 0 18.788-7.982 8.192-7.981 8.192-18.576 0-10.596-7.982-18.788-7.981-8.192-18.576-8.192-10.596 0-18.788 7.982-8.192 7.981-8.192 18.576 0 10.596 7.982 18.788 7.981 8.192 18.576 8.192ZM288-185v-31l257.692-34.154q9.231-.769 15.769-7.692Q568-264.769 568-274v-399.923q0-24.231-16.269-42.077-16.27-17.846-40.962-21.846L312.615-764v-32l206.231 24.615q34.877 4.37 58.016 32.878Q600-710 600-673.923v400.834q0 21.012-14.692 36.781-14.693 15.77-36.077 18.462L288-185Zm0-31h384v-523.385q0-10.769-6.923-17.692T647.385-764h-334.77q-10.769 0-17.692 6.923T288-739.385V-216Zm-69.539 32q-6.838 0-11.419-4.52t-4.581-11.269q0-6.749 4.581-11.48Q211.623-216 218.461-216H256v-523.385q0-23.546 16.534-40.08Q289.069-796 312.615-796h334.77q23.546 0 40.081 16.535Q704-762.931 704-739.385V-216h37.328q6.749 0 11.48 4.52 4.731 4.521 4.731 11.27t-4.581 11.479Q748.377-184 741.539-184H218.461Z"/></svg></span><p>${ev.location ? ev.location.val : 'Pas de salle'}</p></div><div class="in"><span class="material-symbols-rounded"><svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20"><path d="M496-454.308v-153.804q0-6.426-4.52-11.157T480.211-624q-6.75 0-11.48 4.488Q464-615.025 464-608.324v157.964q0 5.597 2.231 10.363 2.23 4.766 6.8 9.336L582.692-321q5.616 5.615 11.269 5.5 5.654-.115 12.039-6.5t6.385-11.654q0-5.269-6.385-11.654l-110-109ZM480-136q-61.539 0-115.364-23.138-53.826-23.139-94.093-63.405-40.266-40.267-63.405-94.093Q184-370.461 184-432t23.138-115.364q23.139-53.826 63.405-94.093 40.267-40.266 94.093-63.405Q418.461-728 480-728t115.364 23.138q53.826 23.139 94.093 63.405 40.266 40.267 63.405 94.093Q776-493.539 776-432t-23.138 115.364q-23.139 53.826-63.405 94.093-40.267 40.266-94.093 63.405Q541.539-136 480-136Zm0-296ZM122.231-651.538q-6.385-6.385-6.385-11.654 0-5.27 6.385-11.654l115.923-115.923q5.615-5.616 11.269-6 5.654-.385 12.039 6 6.384 6.384 6.384 11.654 0 5.269-6.384 11.653L144.538-650.538q-5.615 5.615-10.769 5.5-5.154-.116-11.538-6.5Zm716.538 0q-6.384 6.384-11.654 6.384-5.269 0-11.653-6.384L699.538-767.462q-5.615-5.615-6-11.269-.384-5.654 6-12.038 6.385-6.385 11.654-6.385 5.27 0 11.654 6.385l115.923 116.923q5.616 5.615 6 10.769.385 5.154-6 11.539ZM479.778-168q109.453 0 186.837-77.163Q744-322.326 744-431.778q0-109.453-77.163-186.837Q589.674-696 480.222-696q-109.453 0-186.837 77.163Q216-541.674 216-432.222q0 109.453 77.163 186.837Q370.326-168 479.778-168Z"/></svg></span><p>${statusClass === 'end' ? timeToEndString : statusClass === 'active' ? timeRemainingString : `Démarre Bientot`}</p></div></div></div></div>`);
				}

				await page.evaluate((finJournee) => document.querySelector('.grid-edt').innerHTML += finJournee, `<div class="card"><span class="material-symbols-rounded"><svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20"><path d="M264-472v292q0 6.8-4.547 11.4-4.548 4.6-11.27 4.6-6.722 0-11.452-4.6Q232-173.2 232-180v-567.693q0-12.03 8.138-20.169Q248.277-776 260.307-776h213.284q10.862 0 18.662 5.67 7.799 5.671 9.67 15.176L519.693-680h180q12.03 0 20.169 8.05Q728-663.899 728-651.999v248.014q0 11.901-8.138 19.943Q711.723-376 699.693-376H582.154q-10.171 0-18.163-5.67-7.991-5.671-9.914-15.176L536.307-472H264Zm320 64h112v-240H517.846q-10.171 0-18.162-5.671-7.992-5.67-9.915-15.175L472-744H264v240h274.154q10.171 0 18.162 5.671 7.992 5.67 9.915 15.175L584-408ZM480-576Z"/></svg></span><p>${finJourneeMessage}</p></div>`);

				// output du fichier
				let rnd = Math.floor(Math.random() * 1000000);
				await page.screenshot({
					path: `stdout/output_${rnd}.png`,
					clip: { x: 0, y: 0, width: 450, height: pageHeight }
				});
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

				break;
		}
	}
}
