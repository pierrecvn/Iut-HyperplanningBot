import NodeCache from 'node-cache';
import ical from 'node-ical';
import { ICAL_CACHE_TTL } from '../config.js';
import type { ICalEvent } from '../types/index.js';

const cache = new NodeCache({ stdTTL: ICAL_CACHE_TTL, checkperiod: 600 });

export async function fetchEvents(url: string): Promise<ICalEvent[]> {
  const cacheKey = `${url}_${new Date().toDateString()}`;
  const cached = cache.get<ICalEvent[]>(cacheKey);
  if (cached) return cached;

  const data = await ical.async.fromURL(url);
  const events = Object.values(data)
    .filter(ev => (ev as Record<string, unknown>).type === 'VEVENT')
    .map(ev => ev as unknown as ICalEvent)
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  cache.set(cacheKey, events);
  return events;
}

export function getEventsForDate(events: ICalEvent[], date: Date): ICalEvent[] {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  return events.filter(ev => {
    const evDate = new Date(ev.start);
    evDate.setHours(0, 0, 0, 0);
    return evDate.getTime() === dayStart.getTime();
  });
}
