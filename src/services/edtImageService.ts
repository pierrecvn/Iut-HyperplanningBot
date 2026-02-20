import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import os from 'os';
import { getBrowser } from '../lib/puppeteer.js';
import { formaterHeure, formaterDuree, calculerTempsRestant, formaterDateFr } from '../lib/formatters.js';
import { getSummary, getLocation } from '../types/ical.js';
import type { ICalEvent } from '../types/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = path.join(__dirname, '..', 'assets', 'styles');

const GRADIENTS = [
  ['#667eea', '#764ba2'],
  ['#f093fb', '#f5576c'],
  ['#4facfe', '#00f2fe'],
  ['#43e97b', '#38f9d7'],
  ['#fa709a', '#fee140'],
  ['#a18cd1', '#fbc2eb'],
  ['#fccb90', '#d57eeb'],
  ['#e0c3fc', '#8ec5fc'],
  ['#f5576c', '#ff9a9e'],
  ['#3b82f6', '#8b5cf6'],
  ['#06b6d4', '#6366f1'],
  ['#f97316', '#ef4444'],
];

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildEventHtml(ev: ICalEvent, statusClass: string, timeText: string, now: Date): string {
  const start = new Date(ev.start);
  const end = new Date(ev.end);
  const summary = getSummary(ev);
  const location = getLocation(ev);
  const durationMs = end.getTime() - start.getTime();
  const duration = formaterDuree(durationMs);
  const cancelled = summary.startsWith('Cours annule');

  const displaySummary = escapeHtml(summary);

  // Badge
  let badge: string;
  if (cancelled) badge = 'Annulé';
  else if (statusClass === 'ended') badge = 'Terminé';
  else if (statusClass === 'active') badge = 'En cours';
  else badge = 'À venir';

  // Progress bar for active course
  let progressHtml = '';
  if (statusClass === 'active' && !cancelled) {
    const elapsed = now.getTime() - start.getTime();
    const pct = Math.min(100, Math.max(0, Math.round((elapsed / durationMs) * 100)));
    progressHtml = `
      <div class="progress-container">
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${pct}%"></div>
        </div>
        <span class="progress-text">${pct}%</span>
      </div>`;
  }

  return `
    <div class="event ${statusClass}${cancelled ? ' cancelled' : ''}">
      <div class="event-dot"></div>
      <div class="event-card">
        <div class="event-header">
          <div class="event-time-range">
            <span class="time-start">${formaterHeure(start)}</span>
            <span class="time-sep">→</span>
            <span class="time-end">${formaterHeure(end)}</span>
          </div>
          <span class="badge badge-${statusClass}">${badge}</span>
        </div>
        <h2 class="event-title">${displaySummary}</h2>
        <div class="event-details">
          <div class="detail">
            <span class="material-symbols-rounded">door_open</span>
            <span>${escapeHtml(location)}</span>
          </div>
          <div class="detail">
            <span class="material-symbols-rounded">schedule</span>
            <span>${duration}</span>
          </div>
          <div class="detail">
            <span class="material-symbols-rounded">alarm</span>
            <span>${escapeHtml(timeText)}</span>
          </div>
        </div>
        ${progressHtml}
      </div>
    </div>`;
}

function buildBreakHtml(prevEnd: Date, nextStart: Date): string {
  const durationMs = nextStart.getTime() - prevEnd.getTime();
  return `
    <div class="break-card">
      <div class="dot-break"></div>
      <div class="break-content">
        <span class="material-symbols-rounded">restaurant</span>
        <div>
          <p class="break-title">Pause déjeuner</p>
          <p class="break-time">${formaterHeure(prevEnd)} → ${formaterHeure(nextStart)} · ${formaterDuree(durationMs)}</p>
        </div>
      </div>
    </div>`;
}

export async function generateEdtImage(
  events: ICalEvent[],
  date: Date,
  title: string,
): Promise<{ imagePath: string; currentEvent: ICalEvent | null }> {
  const cssContent = fs.readFileSync(path.join(ASSETS_DIR, 'style.css'), 'utf8');

  const now = new Date();
  let currentEvent: ICalEvent | null = null;
  let prevEnd: Date | null = null;

  const lastEvent = events[events.length - 1];
  const lastEnd = new Date(lastEvent.end);
  const dayDone = now > lastEnd;
  const endOfDayMsg = dayDone
    ? 'Journée terminée !'
    : `Fin de journée dans ${formaterDuree(lastEnd.getTime() - now.getTime())}`;

  let eventsHtml = '';

  for (const ev of events) {
    const start = new Date(ev.start);
    const end = new Date(ev.end);
    const summary = getSummary(ev);

    let statusClass: string;
    if (summary.startsWith('Cours annule')) {
      statusClass = 'ended';
    } else if (now > end) {
      statusClass = 'ended';
    } else if (now >= start && now <= end) {
      statusClass = 'active';
      currentEvent = ev;
    } else {
      statusClass = 'upcoming';
    }

    if (prevEnd && start.getTime() - prevEnd.getTime() > 0.75 * 60 * 60 * 1000) {
      eventsHtml += buildBreakHtml(prevEnd, start);
    }
    prevEnd = end;

    let timeText: string;
    if (statusClass === 'ended') {
      timeText = calculerTempsRestant(end, now);
    } else if (statusClass === 'active') {
      timeText = `Encore ${formaterDuree(end.getTime() - now.getTime())}`;
    } else {
      timeText = `Dans ${calculerTempsRestant(start, now)}`;
    }

    eventsHtml += buildEventHtml(ev, statusClass, timeText, now);
  }

  const endIcon = dayDone ? 'celebration' : 'flag';
  eventsHtml += `
    <div class="end-card">
      <div class="dot-end"></div>
      <div class="end-content">
        <span class="material-symbols-rounded">${endIcon}</span>
        <p>${endOfDayMsg}</p>
      </div>
    </div>`;

  // Background
  const gradient = GRADIENTS[Math.floor(Math.random() * GRADIENTS.length)];
  const isEgg = Math.random() < 0.0001;
  const eggPath = path.join(ASSETS_DIR, 'egg.png');
  let bgStyle: string;

  if (isEgg && fs.existsSync(eggPath)) {
    const base64 = fs.readFileSync(eggPath, { encoding: 'base64' });
    bgStyle = `background: url(data:image/png;base64,${base64}) center/cover;`;
  } else {
    bgStyle = `background: linear-gradient(135deg, ${gradient[0]} 0%, ${gradient[1]} 100%);`;
  }

  const dateFormatted = formaterDateFr(date);

  const fullHtml = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" />
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
  <style>${cssContent}</style>
</head>
<body>
  <div class="main" style="${bgStyle}">
    <div class="header">
      <h1>${escapeHtml(title)}</h1>
      <p class="date">
        <span class="material-symbols-rounded">calendar_today</span>
        ${escapeHtml(dateFormatted)}
      </p>
    </div>
    <div class="timeline">
      ${eventsHtml}
    </div>
  </div>
</body>
</html>`;

  const browser = await getBrowser();
  const page = await browser.newPage();

  const pageHeight = 280 + events.length * 155;
  await page.setViewport({ width: 480, height: pageHeight, deviceScaleFactor: 2 });
  await page.setContent(fullHtml, { waitUntil: 'networkidle0' });
  await page.evaluateHandle('document.fonts.ready');

  const rnd = Math.floor(Math.random() * 1000000);
  const imagePath = path.join(os.tmpdir(), `edt_${rnd}.png`);

  const mainEl = await page.$('.main');
  if (mainEl) {
    await mainEl.screenshot({ path: imagePath });
  } else {
    await page.screenshot({ path: imagePath });
  }

  await page.close();
  return { imagePath, currentEvent };
}
