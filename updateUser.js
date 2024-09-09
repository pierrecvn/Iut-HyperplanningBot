const MongoClient = require('mongodb').MongoClient;

// /**
//  * URI de la base de données source
//  * @type {string}
//  */
// const sourceUri = 'mongodb+srv://bot:kYbZ5dxdYsHzTnfm@cluster0.adjsubc.mongodb.net/Hyperplanning?retryWrites=true&w=majority';

/**
 * URI de la base de données cible
 * @type {string}
 */
const mongoose = require('mongoose');
const { Schema, model } = require('mongoose');

// Définition du schéma utilisateur
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

// Création du modèle utilisateur
const User = model('user', userSchema);

// URI de la base de données
const sourceUri = process.env.MONGODB_TOKEN;
// Connexion à la base de données
mongoose.connect(sourceUri, { useNewUrlParser: true, useUnifiedTopology: true })
	.then(() => console.log('Connexion à MongoDB réussie.'))
	.catch(err => console.error('Connexion à MongoDB échouée :', err));

// Mise à jour des documents pour supprimer les valeurs des groupes
User.updateMany({}, { $set: { Group: '' } })
	.then(result => console.log('Mise à jour réussie :', result))
	.catch(err => console.error('Erreur lors de la mise à jour :', err));