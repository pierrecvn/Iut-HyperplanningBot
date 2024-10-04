const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');

const getIcalUrlClass = require('../../../src/utils/getIcalUrlClass.js');
const infoEdt = require('../../utils/edtInfo.json');
const { getBrowser } = require('../../../src/events/ready/consoleLog.js');
const os = require('os');
const fs = require('fs');
const path = require('path');
const utilisateurModel = require('../../schemas/user');
const NodeCache = require('node-cache');
const ical = require('node-ical');


const cache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });

async function fetchAndParseIcal(url) {
	const cacheKey = `${url}_${new Date().toDateString()}`;

	const cacheData = await cache.get(cacheKey);
	if (cacheData) {
		//console.log(`${JSON.stringify(cache.get(cacheKey))}`)
		return cacheData;

	}

	//console.log('Nouvelles données');
	try {
		//const startTime = Date.now();
		const data = await ical.fromURL(url);
		/*const latence = Date.now() - startTime;
		console.log(`LATENCE : ${latence} ms`);*/

		const events = Object.values(data).filter(event => event.type === 'VEVENT').sort((a, b) => a.start - b.start);

		/**
		 * TEST 
		 */
		// // // Assurez-vous qu'il y a au moins un événement dans le tableau
		/*if (events.length > 0) {
			// Copier le premier événement
			let testEvent = { ...events[0] };

			// Modifier l'heure de début et de fin
			let futureDate = new Date();
			futureDate.setMinutes(futureDate.getMinutes() + 0); // Définir à 6 minutes après l'heure actuelle
			testEvent.start = futureDate;

			let futureEndDate = new Date(futureDate);
			futureEndDate.setMinutes(futureEndDate.getMinutes() + 60); // Fin 60 minutes après le début
			testEvent.end = futureEndDate;

			// Ajouter l'événement de test au tableau d'événements
			events.push(testEvent);
		}*/
		cache.set(cacheKey, events);

		return events;
	} catch (error) {
		console.error('err :', error);
		throw error;
	}
}





// Fonctions utilitaires
const formaterHeure = (date) => date.toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/Paris' });
//const calculerTempsRestant = (fin, maintenant) => (fin - maintenant > 0) ? `${Math.floor((fin - maintenant) / 1000 / 60)} minutes restantes` : 'Le cours est terminé';


const calculerTempsRestant = (fin, maintenant) => fin - maintenant > 0 ? formaterDuree(fin - maintenant, false) : 'Le cours est terminé';
const formaterDuree = (duree, avecMs = false) => {
	const heures = Math.floor(duree / (1000 * 60 * 60));
	const minutes = Math.floor((duree % (1000 * 60 * 60)) / (1000 * 60));
	const secondes = Math.floor((duree % (1000 * 60)) / 1000);
	const millisecondes = duree % 1000;
	let resultat = '';

	if (heures > 0) {
		resultat = `${heures} heures`;
	}

	if (minutes > 0) {
		resultat += ` ${minutes} minutes`;
	}

	if (avecMs) resultat += ` (${secondes} s ${millisecondes} ms)`;
	return resultat;
};

// Configuration de la commande
const commandeEdt = new SlashCommandBuilder()
	.setName('edt')
	.setDescription('Vous renvoie votre emploi du temps')
	.addSubcommand(sousCommande => sousCommande
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
	.addSubcommand(sousCommande => sousCommande
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
	);

// Fonction d'autocomplétion
async function executerAutocompletion(client, interaction) {
	const optionCiblee = interaction.options.getFocused(true);
	let choix;

	if (optionCiblee.name === 'classe') {
		choix = Object.keys(infoEdt);
	} else if (optionCiblee.name === 'date') {
		choix = Array.from({ length: 25 }, (_, i) => {
			const dateFuture = new Date();
			dateFuture.setDate(dateFuture.getDate() + i);
			return `${dateFuture.getDate().toString().padStart(2, '0')}/${(dateFuture.getMonth() + 1).toString().padStart(2, '0')}`;
		});
	}

	const choixFiltres = choix.filter(choix => choix.startsWith(optionCiblee.value));
	await interaction.respond(
		choixFiltres.map(choix => {
			if (optionCiblee.name === 'classe') {
				return { name: choix, value: choix };
			}
			const [jour, mois] = choix.split('/');
			const date = new Date();
			date.setMonth(parseInt(mois) - 1);
			date.setDate(parseInt(jour));
			const nomFormate = date.toLocaleDateString('fr-FR', { weekday: 'long', month: 'long', day: 'numeric' });
			return { name: `${choix} : ${nomFormate.charAt(0).toUpperCase() + nomFormate.slice(1)}`, value: choix };
		})
	);
}

// Fonction principale
async function executerCommande(client, interaction) {
	const tempsDebut = Date.now();
	const { options } = interaction;

	await interaction.deferReply({ content: 'Traitement en cours ...' });

	const utilisateur = options.getUser('utilisateur') || interaction.user;
	const donneesUtilisateur = await utilisateurModel.findOne({ UserId: utilisateur.id });
	const classeSpecifiee = options.getString('classe');
	const classe = classeSpecifiee || (donneesUtilisateur && donneesUtilisateur.Group);

	if (!classe) {
		return interaction.editReply({
			embeds: [creerEmbedInstructions()]
		});
	}

	const sousCommande = options.getSubcommand();
	if (!sousCommande) return interaction.editReply({ content: 'Veuillez choisir une option valide (Texte ou Image)', ephemeral: true });

	const url = getIcalUrlClass(classe.toUpperCase());
	let donnees;

	try {
		// 	const donnees = await ical.async.fromURL(url);
		donnees = await fetchAndParseIcal(url);

	} catch (error) {
		await interaction.editReply({ content: 'Une erreur est survenue lors de la récupération de l\'emploi du temps. Veuillez réessayer plus tard.', ephemeral: true });
		return;
	}


	const dateSpecifiee = options.getString('date');
	const maintenant = dateSpecifiee ? new Date(dateSpecifiee.split("/").reverse().join("/") + "/" + new Date().getFullYear()) : new Date();
	maintenant.setHours(0, 0, 0, 0);

	const evenements = donnees
		.filter(ev => new Date(ev.start).setHours(0, 0, 0, 0) === maintenant.getTime());

	// fs.writeFileSync('evenements.json', JSON.stringify(evenements, null, 2));

	if (evenements.length === 0) {
		return interaction.editReply({ embeds: [new EmbedBuilder().setTitle(`Emploi du temps du ${maintenant.toLocaleDateString('fr-FR')}`).setColor('#0099ff').setDescription('Aucun cours aujourd\'hui !').setTimestamp()] });
	}

	switch (sousCommande) {
		case "texte":
			await afficherEdtTexte(interaction, evenements, maintenant);
			break;
		case "image":
			await afficherEdtImage(interaction, evenements, maintenant, url, tempsDebut);
			break;
	}
}

// Fonctions auxiliaires
function creerEmbedInstructions() {
	return new EmbedBuilder()
		.setTitle('Groupe par défaut non défini')
		.setColor('#0099ff')
		.setDescription("Guide d'utilisation:\n Vous avez la possibilité d'utiliser la commande ``/edt texte`` ou ``/edt image`` pour obtenir l'emploi du temps de votre classe par défaut.")
		.addFields(
			{ name: ':warning: Pensez à définir votre classe par défaut', value: '``/setdefautgroupe``', inline: false },
			{ name: 'Pour avoir l\'emploi du temps d\'une autre classe : ', value: '``/edtimage <la classe> ``', inline: false },
			{ name: 'Ajouter les rappels de cours : ', value: '``/rappel <temps> <vrai/faux> ``', inline: false },
		)
		.setTimestamp();
}

async function afficherEdtTexte(interaction, evenements, maintenant) {
	evenements.forEach((ev, index) => {
		const debut = new Date(ev.start);
		const fin = new Date(ev.end);
		const maintenant = new Date();

		const couleur = maintenant > fin ? '#ff0000' : (maintenant >= debut && maintenant <= fin) ? '#00ff00' : '#0099ff';

		const tempsRestant = debut - maintenant;
		const tempsEcoule = maintenant - fin;
		const tempsAvantFin = fin - maintenant;

		const tempsRestantTexte = tempsEcoule > 0 ? 'Le cours est terminé' : tempsRestant > 0 ? `${Math.floor(tempsRestant / 1000 / 60)} minutes` : 'Le cours a commencé';
		const tempsAvantFinTexte = tempsAvantFin > 0 ? `${Math.floor(tempsAvantFin / 1000 / 60)} minutes restantes` : 'Le cours est terminé';

		const embed = new EmbedBuilder()
			.setTimestamp();

		if (ev.summary.val.startsWith('Cours annulé')) {
			embed.setTitle(`~~${ev.summary.val}~~`)
				.setColor("#ff0000");
		} else {
			embed.setTitle(ev.summary.val)
				.setColor(couleur)
				.addFields(
					{ name: 'Salle', value: ev.location ? ev.location.val : 'Pas de salle', inline: true },
					{ name: 'Matière', value: ev.description ? ev.description.val.split(' : ')[1].split('\n')[0] : 'Pas de matière', inline: true },
					{ name: '\u200B', value: '\u200B', inline: true },
					{ name: 'Début', value: formaterHeure(debut), inline: true },
					{ name: 'Fin', value: formaterHeure(fin), inline: true },
					{ name: '\u200B', value: '\u200B', inline: true },
					{ name: 'Temps avant début', value: tempsRestantTexte, inline: true },
					{ name: 'Temps avant fin', value: tempsAvantFinTexte, inline: true },
				);
		}

		if (index === evenements.length - 1) {
			embed.setFooter({ text: 'Fin de journée' });
			interaction.followUp({
				content: 'Fin de la journée',
				embeds: [embed],
			});
		} else {
			embed.setFooter({ text: ' ' });
			interaction.followUp({
				embeds: [embed],
			});
		}
	});
}

async function afficherEdtImage(interaction, evenements, maintenant, url, tempsDebut) {
	const contenuHtml = fs.readFileSync(path.join(__dirname, '../../utils/styles/index.html'), 'utf8');
	const stylesCss = fs.readFileSync(path.join(__dirname, '../../utils/styles/style.css'), 'utf8');

	const navigateur = await getBrowser();
	const page = await navigateur.newPage();

	const hauteurPage = 500 + evenements.length * 100;
	await page.setViewport({ width: 450, height: hauteurPage, deviceScaleFactor: 2 });

	await Promise.all([
		page.setContent(contenuHtml),
		page.addStyleTag({ content: stylesCss })
	]);

	await page.evaluate((date) => document.querySelector('.time').innerHTML += `<p>${date}</p>`, maintenant.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));

	const partiesUrl = url.split('/');
	const partieInfo = partiesUrl.find(partie => partie.includes('INFO'));
	let nomGroupe = partieInfo.split('_')[1].split('.')[0].replace(/O(?=\d)/, 'O ');

	await page.evaluate((nomGroupe) => {
		let elementTitre = document.querySelector('.title h1');
		if (elementTitre) {
			elementTitre.textContent = nomGroupe;
		}
	}, nomGroupe);

	let evenementActuel = null;
	let finEvenementPrecedent = null;
	let messageFinJournee;

	for (const [index, ev] of evenements.entries()) {
		const debut = new Date(ev.start);
		const fin = new Date(ev.end);
		const maintenant = new Date();
		const dernierEvenement = evenements[evenements.length - 1];
		const finDernierEvenement = new Date(dernierEvenement.end);


		let classeStatut, couleur;

		if (maintenant > fin) {
			couleur = '#ff0000';
			classeStatut = 'end';
		} else if (maintenant >= debut && maintenant <= fin) {
			couleur = '#00ff00';
			classeStatut = 'active';
			evenementActuel = ev;
		} else {
			couleur = '#0099ff';
			classeStatut = 'soon';
		}

		const tempsRestant = fin - maintenant;
		let texteResume = ev.summary.val;

		if (ev.summary.val.startsWith('Cours annulé')) {
			texteResume = `<s>${ev.summary.val}</s>`;
			couleur = "#ff0000";
			classeStatut = 'end';
		}

		if (maintenant > finDernierEvenement) {
			messageFinJournee = `Journée Terminée !!`;
		} else {
			messageFinJournee = `Fin de journée dans : ${formaterDuree(finDernierEvenement - maintenant)}`;
		}

		if (finEvenementPrecedent && new Date(ev.start) - finEvenementPrecedent > 0.75 * 60 * 60 * 1000) {
			page.evaluate((htmlPauseMidi) => document.querySelector('.grid-edt').innerHTML += htmlPauseMidi, `<div class="card"><span class="material-symbols-rounded">flatware</span><p>Pause Midi de ${formaterHeure(finEvenementPrecedent)} à ${formaterHeure(debut)} - (${formaterDuree(new Date(ev.start) - finEvenementPrecedent)})</p></div>`);
		}

		finEvenementPrecedent = fin;
		await page.evaluate((htmlCours) => document.querySelector('.grid-edt').innerHTML += htmlCours, `
            <div class="item ${classeStatut}">
                <div class="start">
                    <p>${formaterHeure(debut)}</p>
                    <p>${formaterHeure(fin)}</p>
                </div>
                <div class="center">
                    <h2>${texteResume}</h2>
                    <div class="show-items">
                        <div class="in">
                            <span class="material-symbols-rounded">door_open</span>
                            <p>${ev.location ? ev.location.val : 'Pas de salle'}</p>
                        </div>
                        <div class="in">
                            <span class="material-symbols-rounded">alarm</span>
                            <p>
${classeStatut === 'fin' ? calculerTempsRestant(fin, maintenant) : classeStatut === 'actif' ? formaterDuree(tempsRestant) : classeStatut === 'soon' ? `Dans ${calculerTempsRestant(debut, maintenant) }` : calculerTempsRestant(fin, maintenant) }</p>
                        </div>
                    </div>
                </div>
            </div>
        `);
	}

	await page.evaluate((finJournee) => document.querySelector('.grid-edt').innerHTML += finJournee,
		`<div class="card">
            <span class="material-symbols-rounded">flag</span>
            <p>${messageFinJournee}</p>
         </div>`
	);

	/**
	 * Combinaisons de couleurs pour le dégradé random
	 */
	const combinaisonsCouleurs = [
		['rgba(255, 175, 189, 0.6)', 'rgba(100, 199, 255, 0.6)'],
		['rgba(255, 223, 242, 0.56)', 'rgba(250, 137, 137, 0.726)'],
		['rgba(130, 250, 177, 0.5)', 'rgba(255, 177, 153, 0.5)'],
		['rgba(255, 204, 204, 0.5)', 'rgba(153, 204, 255, 0.5)'],
		['rgba(170, 156, 255, 0.5)', 'rgba(255, 156, 156, 0.5)'],
		['rgba(105, 180, 255, 0.7)', 'rgba(255, 244, 117, 0.7)'],
		['rgba(255, 134, 194, 0.6)', 'rgba(134, 255, 233, 0.6)'],
		['rgba(208, 132, 255, 0.65)', 'rgba(255, 136, 136, 0.65)'],
		['rgba(255, 198, 165, 0.5)', 'rgba(165, 198, 255, 0.5)'],
		['rgba(255, 247, 165, 0.6)', 'rgba(165, 223, 255, 0.6)']
	];

	const combinaisonChoisie = combinaisonsCouleurs[Math.floor(Math.random() * combinaisonsCouleurs.length)];

	const chanceEasteregg = Math.random();
	let eastereggActivé = chanceEasteregg < 0.0001; // 0.01% 

	// Chemin de l'image egg relatif au répertoire du script
	const imagePath = path.join(__dirname, '../../utils/styles/egg.png');
	const base64Image = fs.readFileSync(imagePath, { encoding: 'base64' });
	// Vérifier si l'image existe
	if (eastereggActivé && !fs.existsSync(imagePath)) {
		console.warn("L'image egg.png n'a pas été trouvée. L'Easter egg sera désactivé.");
		eastereggActivé = false;
	}

	await page.evaluate(async (combinaison, easteregg, base64Image) => {
		let style;
		if (easteregg) {

			style = `url(data:image/png;base64,${base64Image})`;

			document.querySelector('.main').style.background = style;
			document.querySelector('.main').style.backgroundSize = "cover";
			document.querySelector('.title').style.background = style;
			document.querySelector('.title').style.backgroundSize = "cover";
		} else {
			style = `linear-gradient(135deg, ${combinaison[0]} 0%, ${combinaison[1]} 100%)`;
			document.querySelector('.main').style.background = style;
			document.querySelector('.title').style.background = style;
		}
	}, combinaisonChoisie, eastereggActivé, base64Image);





	// Générer l'image
	const nombreAleatoire = Math.floor(Math.random() * 1000000);
	const dossierTemp = os.tmpdir();
	const cheminImageTemp = path.join(dossierTemp, `output_${nombreAleatoire}.png`);

	// Pause de 50ms pour la bonne gen du css // je sais c'est moche ;^;
	await new Promise(resolve => setTimeout(resolve, 50));


	await page.screenshot({ path: cheminImageTemp });

	const stats = fs.statSync(cheminImageTemp);
	const fileSizeInBytes = stats.size;
	const fileSizeInKilobytes = fileSizeInBytes / 1024;
	//console.log(`Taille de l'image : ${fileSizeInKilobytes} KB`);


	await page.close();

	const tempsGeneration = (Date.now() - tempsDebut) / 1000;

	const pieceJointe = new AttachmentBuilder(cheminImageTemp, `output_${nombreAleatoire}.png`);

	const boutons = new ActionRowBuilder().setComponents(
		new ButtonBuilder().setCustomId("restartBtn").setLabel("Recharger").setStyle(ButtonStyle.Primary)
	);

	let embed;
	if (evenementActuel) {
		const debut = new Date(evenementActuel.start);
		const fin = new Date(evenementActuel.end);
		const maintenant = new Date();
		const tempsAvantFin = fin - maintenant;
		const tempsAvantFinTexte = tempsAvantFin > 0 ? formaterDuree(tempsAvantFin, true) : 'Le cours est terminé';


		embed = new EmbedBuilder()
			.setTitle('Cours actuel :')
			.setDescription(evenementActuel.summary.val)
			.setColor('00FF00')
			.setImage(`attachment://output_${nombreAleatoire}.png`)
			.addFields(
				{ name: 'Salle', value: evenementActuel.location ? evenementActuel.location.val : 'Pas de salle', inline: true },
				{ name: 'Matière', value: evenementActuel.description ? evenementActuel.description.val.split(' : ')[1].split('\n')[0] : 'Pas de matière', inline: true },
				{ name: '\u200B', value: '\u200B', inline: true },
				{ name: 'Début', value: formaterHeure(debut), inline: true },
				{ name: 'Fin', value: formaterHeure(fin), inline: true },
				{ name: '\u200B', value: '\u200B', inline: true },
				{ name: 'Fin dans ', value: tempsAvantFinTexte, inline: true },
			)
			.setTimestamp()
			.setFooter({ text: `Génération : ${tempsGeneration}s` });
	} else {
		embed = new EmbedBuilder()
			.setTitle('Emploi du temps du ' + maintenant.toLocaleDateString('fr-FR'))
			.setColor('#0099ff')
			.setImage(`attachment://output_${nombreAleatoire}.png`)
			.setDescription('Aucun événement en cours.')
			.setFooter({ text: `Génération : ${tempsGeneration}s` })
			.setTimestamp();
	}

	await interaction.editReply({
		embeds: [embed],
		files: [pieceJointe],
		ephemeral: true,
		// components: [boutons]
	});

	fs.unlink(cheminImageTemp, (err) => {
		if (err) throw err;
		// Image supprimée
	});
}

module.exports = {
	data: commandeEdt.toJSON(),
	userPermissions: [PermissionFlagsBits.SendMessages],
	botPermissions: [PermissionFlagsBits.SendMessages],
	devOnly: false,
	testMode: false,
	deleted: false,
	sendDM: true,
	couldDown: true,
	runAutocomplete: executerAutocompletion,
	run: executerCommande
};