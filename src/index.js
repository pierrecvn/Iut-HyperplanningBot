require("dotenv/config");

const { Client, GatewayIntentBits, ChannelType} = require("discord.js");
const eventHandler = require("./handlers/eventHandler");

const client = new Client({ intents: [3276799] });

eventHandler(client);

client.login(process.env.TOKEN);