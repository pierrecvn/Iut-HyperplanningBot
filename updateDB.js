const MongoClient = require('mongodb').MongoClient;

/**
 * URI de la base de données source
 * @type {string}
 */
const sourceUri = 'mongodb+srv://bot:kYbZ5dxdYsHzTnfm@cluster0.adjsubc.mongodb.net/Hyperplanning?retryWrites=true&w=majority';

/**
 * URI de la base de données cible
 * @type {string}
 */
const targetUri = 'mongodb+srv://bot:kYbZ5dxdYsHzTnfm@cluster0.adjsubc.mongodb.net/HyperplanningTEST?retryWrites=true&w=majority';

/**
 * Clone la base de données source vers la base de données cible.
 * @async
 */
async function cloneDb() {
	/**
	 * Client pour la base de données source
	 * @type {MongoClient}
	 */
	const sourceClient = new MongoClient(sourceUri, { useNewUrlParser: true, useUnifiedTopology: true });

	/**
	 * Client pour la base de données cible
	 * @type {MongoClient}
	 */
	const targetClient = new MongoClient(targetUri, { useNewUrlParser: true, useUnifiedTopology: true });

	try {
		// Connect to the source database
		await sourceClient.connect();
		const sourceDb = sourceClient.db();

		// Connect to the target database
		await targetClient.connect();
		const targetDb = targetClient.db();

		// Get the list of collections in the source database
		const collections = await sourceDb.listCollections().toArray();

		for (let collection of collections) {
			// Get the documents from the source collection
			const documents = await sourceDb.collection(collection.name).find().toArray();

			// Insert the documents into the target collection
			await targetDb.collection(collection.name).insertMany(documents);
		}

		console.log('Database cloned successfully');
	} catch (err) {
		console.error('An error occurred while cloning the database:', err);
	} finally {
		// Close the database connections
		await sourceClient.close();
		await targetClient.close();
	}
}

cloneDb();