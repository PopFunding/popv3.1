/* Shared harness for POP OS browser tests: loads index.html in headless Chromium with fictional demo data. */
const path = require('path');
let pw; try { pw = require('playwright'); } catch (e) { pw = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright'); }
const FILE = 'file://' + path.resolve(__dirname, '..', 'index.html');

async function open(opts = {}) {
  const browser = await pw.chromium.launch();
  const page = await (await browser.newContext({ viewport: opts.viewport || { width: 1280, height: 900 }, reducedMotion: 'reduce' })).newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.route(/three\.min\.js/, r => r.abort());
  await page.goto(FILE); await page.waitForTimeout(400);
  const results = [];
  return {
    browser, page, errors,
    check: (name, ok, info) => results.push({ name, ok: !!ok, info }),
    signIn: (uid, hash) => page.evaluate(([u, h]) => { localStorage.setItem(SKEY, JSON.stringify({ u })); location.hash = h || '#/dash'; App.render(); }, [uid, hash]),
    mact: async i => { await page.click(`#modal [data-mact="${i}"]`); await page.waitForTimeout(80); },
    async finish() {
      await browser.close(); let failed = 0;
      for (const r of results) { if (!r.ok) failed++; console.log((r.ok ? 'PASS ' : 'FAIL ') + r.name + (!r.ok && r.info !== undefined ? '  ' + JSON.stringify(r.info) : '')); }
      console.log(`\n${results.length - failed}/${results.length} passed`); process.exitCode = failed ? 1 : 0;
    }
  };
}
module.exports = { open };
