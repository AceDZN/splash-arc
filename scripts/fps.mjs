// Rough frame-rate probe in headless Chrome (GPU flags on). Usage: node scripts/fps.mjs [url]
import { chromium } from 'playwright';
const url = process.argv[2] ?? 'http://localhost:5212/?level=1&autopause=0';
const browser = await chromium.launch({ channel: 'chrome', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 });
await page.goto(url);
await page.waitForTimeout(8000);
const r = await page.evaluate(() => new Promise((res) => {
  let n = 0; const t0 = performance.now();
  const f = () => { n++; if (performance.now() - t0 < 4000) requestAnimationFrame(f); else res({ fps: n / 4, gl: (() => { const gl = document.createElement('canvas').getContext('webgl2'); const d = gl.getExtension('WEBGL_debug_renderer_info'); return d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : 'unknown'; })(), info: window.__splash.stage.renderer.info.render }); };
  requestAnimationFrame(f);
}));
console.log(JSON.stringify(r));
await browser.close();
