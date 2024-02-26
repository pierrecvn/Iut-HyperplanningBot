require("colors");
const mongoose = require("mongoose");
const puppeteer = require('puppeteer');
const mongoURI = process.env.MONGODB_TOKEN;


// Lancez le navigateur au démarrage de l'application
let browser;
async function launchBrowser() {
	if (!browser) {
		browser = await puppeteer.launch({
			product: 'firefox', headless: true,
			args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-accelerated-2d-canvas', '--no-first-run', '--no-zygote', '--blink-settings=imagesEnabled=false',
				'--disable-web-security'
				//'--single-process', 
				//'--disable-gpu'
			]
		});
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

	// const channel = await client.users.fetch("549274676849803305");
	// channel.send("Presence Updated");

};

// Exportez une fonction qui renvoie une promesse résolue avec l'instance du navigateur
module.exports.getBrowser = launchBrowser;