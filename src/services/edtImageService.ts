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

/** Injecte du HTML dans .grid-edt via page.evaluate (string mode) */
async function appendToGrid(page: Awaited<ReturnType<import('puppeteer').Browser['newPage']>>, html: string): Promise<void> {
  await page.evaluate(`document.querySelector('.grid-edt').innerHTML += \`${html.replace(/`/g, '\\`')}\``);
}

export async function generateEdtImage(
  events: ICalEvent[],
  date: Date,
  title: string,
): Promise<{ imagePath: string; currentEvent: ICalEvent | null }> {
  const htmlContent = fs.readFileSync(path.join(ASSETS_DIR, 'index.html'), 'utf8');
  const cssContent = fs.readFileSync(path.join(ASSETS_DIR, 'style.css'), 'utf8');

  const browser = await getBrowser();
  const page = await browser.newPage();

  const pageHeight = 500 + events.length * 100;
  await page.setViewport({ width: 450, height: pageHeight, deviceScaleFactor: 2 });

  await page.setContent(htmlContent);
  await page.addStyleTag({ content: cssContent });

  // Set date
  const dateFormatted = formaterDateFr(date);
  await page.evaluate(`document.querySelector('.time').innerHTML += '<p>${dateFormatted.replace(/'/g, "\\'")}</p>'`);

  // Set title
  await page.evaluate(`{
    const el = document.querySelector('.title h1');
    if (el) el.textContent = '${title.replace(/'/g, "\\'")}';
  }`);

  let currentEvent: ICalEvent | null = null;
  let prevEnd: Date | null = null;
  let endOfDayMsg = '';

  const lastEvent = events[events.length - 1];
  const lastEnd = new Date(lastEvent.end);
  const now = new Date();

  if (now > lastEnd) {
    endOfDayMsg = 'Journee Terminee !!';
  } else {
    endOfDayMsg = `Fin de journee dans : ${formaterDuree(lastEnd.getTime() - now.getTime())}`;
  }

  for (const ev of events) {
    const start = new Date(ev.start);
    const end = new Date(ev.end);
    const summary = getSummary(ev);
    const location = getLocation(ev);

    let statusClass: string;
    let displaySummary = summary;

    if (summary.startsWith('Cours annule')) {
      displaySummary = `<s>${summary}</s>`;
      statusClass = 'end';
    } else if (now > end) {
      statusClass = 'end';
    } else if (now >= start && now <= end) {
      statusClass = 'active';
      currentEvent = ev;
    } else {
      statusClass = 'soon';
    }

    // Lunch break detection
    if (prevEnd && start.getTime() - prevEnd.getTime() > 0.75 * 60 * 60 * 1000) {
      const pauseHtml = `<div class="card"><span class="material-symbols-rounded">flatware</span><p>Pause Midi de ${formaterHeure(prevEnd)} a ${formaterHeure(start)} - (${formaterDuree(start.getTime() - prevEnd.getTime())})</p></div>`;
      await appendToGrid(page, pauseHtml);
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

    const courseHtml = `
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
              <p>${location}</p>
            </div>
            <div class="in">
              <span class="material-symbols-rounded">alarm</span>
              <p>${timeText}</p>
            </div>
          </div>
        </div>
      </div>`;

    await appendToGrid(page, courseHtml);
  }

  // End of day
  await appendToGrid(page, `<div class="card"><span class="material-symbols-rounded">flag</span><p>${endOfDayMsg}</p></div>`);

  // Random gradient
  const combo = COLOR_COMBOS[Math.floor(Math.random() * COLOR_COMBOS.length)];

  // Easter egg (0.01%)
  const isEgg = Math.random() < 0.0001;
  const eggPath = path.join(ASSETS_DIR, 'egg.png');

  if (isEgg && fs.existsSync(eggPath)) {
    const base64 = fs.readFileSync(eggPath, { encoding: 'base64' });
    await page.evaluate(`{
      const style = 'url(data:image/png;base64,${base64})';
      document.querySelector('.main').style.background = style;
      document.querySelector('.main').style.backgroundSize = 'cover';
      document.querySelector('.title').style.background = style;
      document.querySelector('.title').style.backgroundSize = 'cover';
    }`);
  } else {
    await page.evaluate(`{
      const style = 'linear-gradient(135deg, ${combo[0]} 0%, ${combo[1]} 100%)';
      document.querySelector('.main').style.background = style;
      document.querySelector('.title').style.background = style;
    }`);
  }

  // Attendre le chargement des fonts (Material Symbols)
  await page.evaluateHandle('document.fonts.ready');

  const rnd = Math.floor(Math.random() * 1000000);
  const imagePath = path.join(os.tmpdir(), `edt_${rnd}.png`);
  await page.screenshot({ path: imagePath });
  await page.close();

  return { imagePath, currentEvent };
}
