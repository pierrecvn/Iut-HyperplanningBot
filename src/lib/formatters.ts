export function formaterHeure(date: Date): string {
  return date.toLocaleString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Europe/Paris',
  });
}

export function formaterDuree(ms: number, avecMs = false): string {
  if (ms <= 0) return '0 minutes';
  const heures = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  const secondes = Math.floor((ms % (1000 * 60)) / 1000);
  const millisecondes = ms % 1000;

  let resultat = '';
  if (heures > 0) resultat = `${heures} heures`;
  if (minutes > 0) resultat += ` ${minutes} minutes`;
  if (avecMs) resultat += ` (${secondes} s ${millisecondes} ms)`;
  return resultat.trim();
}

export function calculerTempsRestant(fin: Date, maintenant: Date): string {
  const diff = fin.getTime() - maintenant.getTime();
  return diff > 0 ? formaterDuree(diff) : 'Le cours est termine';
}

export function formaterDateFr(date: Date): string {
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Europe/Paris',
  });
}

export function formaterDateCourte(date: Date): string {
  return date.toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' });
}
