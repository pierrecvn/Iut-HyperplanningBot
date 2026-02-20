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

const COLOR_COMBOS = [
  ['rgba(255, 175, 189, 0.6)', 'rgba(100, 199, 255, 0.6)'],
  ['rgba(255, 223, 242, 0.56)', 'rgba(250, 137, 137, 0.726)'],
  ['rgba(130, 250, 177, 0.5)', 'rgba(255, 177, 153, 0.5)'],
  ['rgba(255, 204, 204, 0.5)', 'rgba(153, 204, 255, 0.5)'],
  ['rgba(170, 156, 255, 0.5)', 'rgba(255, 156, 156, 0.5)'],
  ['rgba(105, 180, 255, 0.7)', 'rgba(255, 244, 117, 0.7)'],
  ['rgba(255, 134, 194, 0.6)', 'rgba(134, 255, 233, 0.6)'],
  ['rgba(208, 132, 255, 0.65)', 'rgba(255, 136, 136, 0.65)'],
  ['rgba(255, 198, 165, 0.5)', 'rgba(165, 198, 255, 0.5)'],
  ['rgba(255, 247, 165, 0.6)', 'rgba(165, 223, 255, 0.6)'],
];

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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
  const endOfDayMsg = now > lastEnd
    ? 'Journee Terminee !!'
    : `Fin de journee dans : ${formaterDuree(lastEnd.getTime() - now.getTime())}`;

  // Build all event cards HTML
  let gridHtml = '';

  for (const ev of events) {
    const start = new Date(ev.start);
    const end = new Date(ev.end);
    const summary = getSummary(ev);
    const location = getLocation(ev);
    const durationMs = end.getTime() - start.getTime();

    let statusClass: string;
    let displaySummary: string;

    if (summary.startsWith('Cours annule')) {
      displaySummary = `<s>${escapeHtml(summary)}</s>`;
      statusClass = 'end';
    } else if (now > end) {
      displaySummary = escapeHtml(summary);
      statusClass = 'end';
    } else if (now >= start && now <= end) {
      displaySummary = escapeHtml(summary);
      statusClass = 'active';
      currentEvent = ev;
    } else {
      displaySummary = escapeHtml(summary);
      statusClass = 'soon';
    }

    // Lunch break detection
    if (prevEnd && start.getTime() - prevEnd.getTime() > 0.75 * 60 * 60 * 1000) {
      gridHtml += `<div class="card"><span class="material-symbols-rounded">flatware</span><p>Pause Midi de ${formaterHeure(prevEnd)} a ${formaterHeure(start)} - (${formaterDuree(start.getTime() - prevEnd.getTime())})</p></div>`;
    }
    prevEnd = end;

    // Time display
    let timeText: string;
    if (statusClass === 'end') {
      timeText = calculerTempsRestant(end, now);
    } else if (statusClass === 'active') {
      timeText = formaterDuree(end.getTime() - now.getTime());
    } else {
      timeText = `Dans ${calculerTempsRestant(start, now)}`;
    }

    // Progress bar for active course
    let progressHtml = '';
    if (statusClass === 'active' && !summary.startsWith('Cours annule')) {
      const elapsed = now.getTime() - start.getTime();
      const pct = Math.min(100, Math.max(0, Math.round((elapsed / durationMs) * 100)));
      progressHtml = `
          <div class="progress-container">
            <div class="progress-bar"><div class="progress-fill" style="width: ${pct}%"></div></div>
            <span class="progress-text">${pct}%</span>
          </div>`;
    }

    gridHtml += `
      <div class="item ${statusClass}">
        <div class="start">
          <p>${formaterHeure(start)}</p>
          <p>${formaterHeure(end)}</p>
        </div>
        <div class="center">
          <h2>${displaySummary}</h2>
          <div class="show-items">
            <div class="in">
              <span class="material-symbols-rounded">door_open</span>
              <p>${escapeHtml(location)}</p>
            </div>
            <div class="in">
              <span class="material-symbols-rounded">alarm</span>
              <p>${escapeHtml(timeText)}</p>
            </div>
            <div class="in">
              <span class="material-symbols-rounded">schedule</span>
              <p>${formaterDuree(durationMs)}</p>
            </div>
          </div>
          ${progressHtml}
        </div>
      </div>`;
  }

  // End of day
  gridHtml += `<div class="card"><span class="material-symbols-rounded">flag</span><p>${endOfDayMsg}</p></div>`;

  // Background
  const combo = COLOR_COMBOS[Math.floor(Math.random() * COLOR_COMBOS.length)];
  const isEgg = Math.random() < 0.0001;
  const eggPath = path.join(ASSETS_DIR, 'egg.png');

  let mainBg: string;
  let titleBg: string;
  if (isEgg && fs.existsSync(eggPath)) {
    const base64 = fs.readFileSync(eggPath, { encoding: 'base64' });
    mainBg = `background: url(data:image/png;base64,${base64}) center/cover;`;
    titleBg = mainBg;
  } else {
    const grad = `linear-gradient(135deg, ${combo[0]} 0%, ${combo[1]} 100%)`;
    mainBg = `background: ${grad};`;
    titleBg = `background: ${grad};`;
  }

  const dateFormatted = formaterDateFr(date);

  const fullHtml = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
  <style>${cssContent}</style>
</head>
<body>
  <div class="main" style="${mainBg}">
    <div class="title" style="${titleBg}">
      <h1>${escapeHtml(title)}</h1>
    </div>
    <div class="grid-edt">
      <div class="card time">
        <span class="material-symbols-rounded">schedule</span>
        <p>${escapeHtml(dateFormatted)}</p>
      </div>
      ${gridHtml}
    </div>
  </div>
</body>
</html>`;

  const browser = await getBrowser();
  const page = await browser.newPage();

  const pageHeight = 500 + events.length * 110;
  await page.setViewport({ width: 450, height: pageHeight, deviceScaleFactor: 2 });
  await page.setContent(fullHtml, { waitUntil: 'networkidle0' });
  await page.evaluateHandle('document.fonts.ready');

  const rnd = Math.floor(Math.random() * 1000000);
  const imagePath = path.join(os.tmpdir(), `edt_${rnd}.png`);

  // Crop sur le contenu réel
  const mainEl = await page.$('.main');
  if (mainEl) {
    await mainEl.screenshot({ path: imagePath });
  } else {
    await page.screenshot({ path: imagePath });
  }

  await page.close();
  return { imagePath, currentEvent };
}
