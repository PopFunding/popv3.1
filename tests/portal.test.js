/* Merchant portal honesty: servicing figures are labelled as unverified until a payment processor is connected. */
const { open } = require('./helpers');
(async () => {
  const t = await open({ viewport: { width: 390, height: 844 } }); const { page, check } = t;
  await t.signIn('u10', '#/home');
  const off = await page.evaluate(() => { const c = document.querySelector('.fcard'); return { card: !!c, text: c ? c.textContent : '', btn: [...document.querySelectorAll('[data-act="cpay"]')].map(b => b.textContent.trim()) }; });
  check('customer with active funding sees a funding card', off.card);
  check('figures are labelled as not confirmed by a payment processor', /not yet confirmed by a payment processor/.test(off.text));
  check('the payment button says Request a payment', off.btn.length && off.btn.every(b => b === 'Request a payment'), off.btn);
  check('renewal and next payment are worded as estimates', /Expected next payment/.test(off.text) && !/Eligible now/.test(off.text), off.text.match(/Renewal eligibility[^A-Z]*/));
  await page.click('[data-act="cpay"]'); await page.waitForTimeout(80);
  check('the payment dialog is a request and says no money moves', await page.evaluate(() => /Request a payment/.test(document.getElementById('dlgT').textContent) && /No money moves/.test(document.querySelector('#modal').textContent)));
  await page.evaluate(() => { document.getElementById('modal').hidden = true; DB.settings.integrations.ach = true; App.render(); });
  const on = await page.evaluate(() => { const c = document.querySelector('.fcard'); return { text: c.textContent, btn: document.querySelector('[data-act="cpay"]').textContent.trim() }; });
  check('with a processor connected the warning goes away', !/not yet confirmed/.test(on.text) && on.btn === 'Make payment', on.btn);
  await page.evaluate(() => { DB.settings.integrations.ach = false; Store.save(); });
  check('no uncaught page errors', t.errors.length === 0, t.errors);
  await t.finish();
})().catch(e => { console.error(e); process.exit(1); });
