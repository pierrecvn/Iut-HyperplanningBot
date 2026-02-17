import edtInfo from '../data/edtInfo.json' with { type: 'json' };
import salleInfo from '../data/salleInfo.json' with { type: 'json' };

const BASE_URL = 'https://hplanning.univ-lehavre.fr/Telechargements/ical/';
const VERSION = '2022.0.5.0';
const PARAM_CLASS = '643d5b312e2e36325d2666683d3126663d31';
const PARAM_SALLE = '643d5b312e2e36325d2666683d3126663d3130';

export function getIcalUrlClass(group: string): string | null {
  const id = (edtInfo as Record<string, string>)[group.toUpperCase()];
  if (!id) return null;
  return `${BASE_URL}Edt_INFO${group.toUpperCase()}.ics?version=${VERSION}&idICal=${id}&param=${PARAM_CLASS}`;
}

export function getIcalUrlSalle(salle: string): string | null {
  const id = (salleInfo as Record<string, string>)[salle];
  if (!id) return null;
  return `${BASE_URL}Edt_IUTC_${salle}.ics?version=${VERSION}&idICal=${id}&param=${PARAM_SALLE}`;
}

export function getGroupKeys(): string[] {
  return Object.keys(edtInfo);
}

export function getSalleKeys(): string[] {
  return Object.keys(salleInfo);
}
