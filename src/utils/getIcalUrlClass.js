const edtInfoData = require('./edtInfo.json');

function getIcalUrlClass(edtInfo) {
	const baseUrl = "https://hplanning.univ-lehavre.fr/Telechargements/ical/";
	const version = "2022.0.4.3";
	const param = "643d5b312e2e36325d2666683d3126663d31";
	let idICal = edtInfoData[edtInfo];

	return `${baseUrl}Edt_INFO${edtInfo}.ics?version=${version}&idICal=${idICal}&param=${param}`;
}

module.exports = getIcalUrlClass;
