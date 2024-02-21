require("colors");
const mongoose = require("mongoose");
const puppeteer = require('puppeteer');
const mongoURI = process.env.MONGODB_TOKEN;


// Lancez le navigateur au démarrage de l'application
let browser;
async function launchBrowser() {
	if (!browser) {
		browser = await puppeteer.launch({ product: 'firefox', headless: true });
		console.log("Moteur Image.".green);
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

// Exportez une fonction qui renvoie une promesse résolue avec l'instance du navigateur
module.exports.getBrowser = launchBrowser;