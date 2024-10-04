const { model, Schema } = require("mongoose");

let botPresenceSchema = new Schema({
	ClientID: String,
	Presences: Array,
}, { strict: false })

module.exports = model('botPresence', botPresenceSchema);