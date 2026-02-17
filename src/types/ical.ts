export interface ICalEvent {
  type: string;
  summary: { val: string } | string;
  description: { val: string } | string;
  start: Date;
  end: Date;
  location: { val: string } | string;
  uid: string;
  [key: string]: unknown;
}

export function getSummary(ev: ICalEvent): string {
  return typeof ev.summary === 'object' && ev.summary !== null ? ev.summary.val : String(ev.summary ?? '');
}

export function getLocation(ev: ICalEvent): string {
  if (!ev.location) return 'Pas de salle';
  return typeof ev.location === 'object' && ev.location !== null ? ev.location.val : String(ev.location);
}

export function getDescription(ev: ICalEvent): string {
  if (!ev.description) return '';
  return typeof ev.description === 'object' && ev.description !== null ? ev.description.val : String(ev.description);
}

export function getMatiere(ev: ICalEvent): string {
  const desc = getDescription(ev);
  if (!desc) return 'Pas de matiere';
  const parts = desc.split(' : ');
  if (parts.length < 2) return 'Pas de matiere';
  return parts[1].split('\n')[0];
}
