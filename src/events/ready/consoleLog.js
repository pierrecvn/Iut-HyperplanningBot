require("colors");
const mongoose = require("mongoose");
const puppeteer = require('puppeteer');
const mongoURI = process.env.MONGODB_TOKEN;


// Lancez le navigateur au démarrage de l'application
let browser;
async function launchBrowser() {
	if (!browser) {
		try {
			console.log("Avant lancement du navigateur.".green);
			browser = await puppeteer.launch({
				product: 'firefox',
				headless: true,
				args: ['--no-sandbox', '--disable-setuid-sandbox']
			});
			console.log("Moteur Image lancé.".green);
		} catch (error) {
			console.error("Erreur lors du lancement du moteur Image:".red, error);
		}
	} else {
		console.log("Déja actif".yellow);
	}
	return browser;
}

launchBrowser();


module.exports = async (client) => {
	console.log(`${client.user.username} is online.`.blue);
	if (!mongoURI) return;
	mongoose.set("strictQuery", true);

	if (await mongoose.connect(mongoURI)) {
		console.log(`Connected to the MongoDB database.`.green);
	}
};


module.exports.getBrowser = launchBrowser;