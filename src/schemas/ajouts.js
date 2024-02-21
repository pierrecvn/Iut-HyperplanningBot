const { Schema, model } = require('mongoose');

const ajoutSchema = new Schema({
	UserId: {
		type: String,
		required: true,
	},
	Ajout: {
		type: String,
		required: true,
	},
	
});

module.exports = model('ajouts', ajoutSchema);
