// Captures real gameplay at the mockups' framing for docs/VISUAL_REVIEW.md.
// Inputs are real: mouse drags on the canvas and key presses. The page is only queried to find
// where a world point is on screen (so the drag starts on the vertex handle) and to read state.
// Usage: node scripts/shots.mjs [baseUrl] (dev server must be running).
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const base = process.argv[2] ?? 'http://localhost:5212/';
const out = 'docs/captures';
mkdirSync(out, { recursive: true });
const W = 1672;
const H = 941;

const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? 'chrome', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

const state = () => page.evaluate(() => JSON.parse(window.render_game_to_text()));
const step = (ms) => page.evaluate((t) => window.advanceTime(t), ms);
const screenOf = (x, y) => page.evaluate(([x, y]) => {
  const { stage } = window.__splash;
  const v = new stage.camera.position.constructor(x, y, 0).project(stage.camera);
  const r = stage.renderer.domElement.getBoundingClientRect();
  return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height };
}, [x, y]);

async function open(level) {
  await page.goto(`${base}?level=${level}&autopause=0`);
  await page.waitForFunction(() => typeof window.render_game_to_text === 'function' && JSON.parse(window.render_game_to_text()).started);
  // Let models load and the camera settle in real time.
  await page.waitForTimeout(6000);
  await step(1500);
}

async function dragVertex(to) {
  const s = await state();
  const from = await screenOf(s.aim.vertex.p, s.aim.vertex.k);
  const dest = await screenOf(to.p, to.k);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) await page.mouse.move(from.x + ((dest.x - from.x) * i) / 12, from.y + ((dest.y - from.y) * i) / 12);
  await page.mouse.up();
  await step(200);
  return state();
}

const log = {};

// 01 — first 30 seconds: drag the vertex of level 1 up to (4, 5).
await open(1);
log.first30 = (await dragVertex({ p: 4, k: 5 })).aim;
await page.waitForTimeout(700); // let CSS transitions (toasts, bubbles) settle; the simulation is paused in manual mode
await page.screenshot({ path: `${out}/01-first-30s.png` });

// 03 — consequence: the default arc on level 1 splats on the wall (y(2) = 1.5).
await open(1);
await page.keyboard.press('Space');
await step(1100);
log.consequence = (await state()).lastShot;
await page.waitForTimeout(700); // let CSS transitions (toasts, bubbles) settle; the simulation is paused in manual mode
await page.screenshot({ path: `${out}/03-consequence-wall.png` });

// 03b — return fire: the rival's arc lands on us when the bucket sits under the vertex.
await open(4);
await page.keyboard.press('ArrowLeft');
await page.keyboard.press('Space');
await step(3500);
log.returnFire = (await state()).returnFire;
await page.waitForTimeout(700); // let CSS transitions (toasts, bubbles) settle; the simulation is paused in manual mode
await page.screenshot({ path: `${out}/03b-return-fire.png` });

// 02 — impact: level 6, vertex (4, 8) lights both lanterns and soaks the fort area.
await open(6);
log.impactAim = (await dragVertex({ p: 4, k: 8 })).aim;
await page.keyboard.press('Space');
await step(2900);
log.impact = (await state()).lastShot;
await page.waitForTimeout(700); // let CSS transitions (toasts, bubbles) settle; the simulation is paused in manual mode
await page.screenshot({ path: `${out}/02-impact.png` });

// 04 — night raid: level 7 aimed at (5, 11).
await open(7);
log.night = (await dragVertex({ p: 5, k: 11 })).aim;
await page.waitForTimeout(700); // let CSS transitions (toasts, bubbles) settle; the simulation is paused in manual mode
await page.screenshot({ path: `${out}/04-night-raid.png` });

writeFileSync(`${out}/capture-log.json`, JSON.stringify({ base, viewport: [W, H], log, errors }, null, 2));
console.log(JSON.stringify({ log, errors }, null, 2));
await browser.close();
