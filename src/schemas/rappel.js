const mongoose = require('mongoose');

const rappelSchema = new mongoose.Schema({
	userId: String,
	time: String,
	active: Boolean
});

module.exports = mongoose.model('Rappel', rappelSchema);