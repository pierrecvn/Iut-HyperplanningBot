const { Schema, model } = require('mongoose');

const userSchema = new Schema({
	UserId: {
		type: String,
		required: true,
	},
	GuildId: {
		type: String,
		required: false,
	},
	Group: {
		type: String,
		required: false,
	},
	NbCommand: {
		type: Number,
		required: false,
		default: 0
	},
	LastCommand: {
		type: Date,
		required: false,
		default: Date.now
	},
});

module.exports = model('user', userSchema);
