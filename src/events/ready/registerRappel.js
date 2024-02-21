const schedule = require('node-schedule');
const Rappel = require('../../schemas/rappel');
const User = require('../../schemas/user');

const getClass = require('../../../src/utils/edtInfo.json');

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
			// Pour chaque utilisateur dans le groupe
			for (let user of usersByGroup[group]) {
				console.log(`Utilisateur ${user.UserId} dans le groupe ${group}`);
				// Trouver le rappel actif pour cet utilisateur
				const rappel = await Rappel.findOne({ userId: user.UserId, active: true }).exec();
				if (rappel) {
					// Si un rappel actif est trouvé, envoyer un message à l'utilisateur
					const discordUser = await client.users.fetch(user.UserId);
					if (discordUser) {
						discordUser.send("Coucou ! C'est l'heure de ton cours !");
					} else {
						console.log(`Impossible de trouver l'utilisateur avec l'ID ${user.UserId}`);
					}
				}
			}
		}
	} catch (error) {
		console.error(error);
	}
}


/*

	setInterval(async () => {
		for (let group of Object.keys(getClass)) {
			const users = await User.find({ Groupe: group }).exec();
			if (users.length === 0) {
				console.log(`Aucun utilisateur trouvé pour le groupe ${group}`);
			} else {
				console.log(`${users.length} utilisateurs trouvés pour le groupe ${group}`);
				console.log('Utilisateurs :', users); // Loguer les utilisateurs
			}
		}
	}, 5_000)


	await Promise.all(users.map(async (user) => {
				const rappel = await Rappel.findOne({ userId: user.UserId, active: true }).exec();
				if (rappel) {
					const date = new Date();
					// date.setSeconds(date.getSeconds() + 100);

					console.log(date);

					// Vérifie si un travail est déjà planifié pour cet utilisateur
					if (!scheduledUsers[user.UserId]) {
						schedule.scheduleJob(user.UserId, date, async function () {
							try {

								const discordUser = await client.users.fetch(user.UserId);
								if (discordUser) {
									discordUser.send("Coucou ! C'est l'heure de ton cours !");
								} else {
									console.log(`Impossible de trouver l'utilisateur avec l'ID ${user.UserId}`);
								}

							} catch (error) {
								console.error(error);
							}
						});

						// Marquer l'utilisateur comme ayant un rappel planifié
						scheduledUsers[user.UserId] = true;
					}

					console.log(`Rappel pour l'utilisateur ${user.UserId} à ${rappel.time}`);
				}
			}));*/