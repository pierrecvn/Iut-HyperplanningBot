const path = require("path");
const getAllFiles = require("./getAllFiles");

module.exports = (exceptions = []) => {
	let selects = [];
	const selectFiles = getAllFiles(path.join(__dirname, "..", "selects"));

	for (const selectFile of selectFiles) {
		const selectObjet = require(selectFile);

		if (exceptions.includes(selectObjet.name)) continue;
		selects.push(selectObjet);
	}

	return selects;
};
