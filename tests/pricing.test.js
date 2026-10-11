/* Pricing versions on offers and deals; standard decline reasons with codes. */
const { open } = require('./helpers');
(async () => {
  const t = await open(); const { page, check } = t;
  await t.signIn('u1', '#/pricing');
  check('pricing page shows the current version', await page.evaluate(() => /Pricing version v1/.test(document.querySelector('main').textContent)));
  const a1 = await page.evaluate(() => { const a = DB.applications.find(x => x.uw && x.uw.decision === 'Approved' && !['Funded', 'Declined'].includes(x.stage)); a.offers = a.offers.filter(o => o.status !== 'Draft').concat(Biz.defaultOffers(a)); return { id: a.id, pv: a.offers.filter(o => o.status === 'Draft').map(o => o.pv) }; });
  check('new offers record pricing v1', a1.pv.length && a1.pv.every(v => v === 1), a1.pv);
  await page.fill('input[data-price="12"]', '25.5'); await page.dispatchEvent('input[data-price="12"]', 'change'); await page.waitForTimeout(80);
  const after = await page.evaluate(() => ({ v: PV(), log: DB.settings.pricingLog[0], audit: DB.audit[0], text: document.querySelector('main').textContent }));
  check('changing pricing bumps the version and logs who changed what', after.v === 2 && after.log.change === 'Base 12 mo → 25.5' && after.audit.action === 'Pricing version changed', after.log);
  check('pricing page shows v2 and the last change', /Pricing version v2/.test(after.text) && /Base 12 mo → 25.5/.test(after.text));
  const kept = await page.evaluate(id => Store.get('applications', id).offers.filter(o => o.status === 'Draft').map(o => o.pv), a1.id);
  check('existing offers keep the version they were priced on', kept.every(v => v === 1), kept);
  const gen = await page.evaluate(id => { const a = Store.get('applications', id); App.acts.offgen({ dataset: { id } }); return a.offers.filter(o => o.status === 'Draft').map(o => o.pv); }, a1.id);
  check('regenerated offers use the new version', gen.every(v => v === 2), gen);
  await page.evaluate(id => { location.hash = '#/app/' + id + '/9'; App.render(); }, a1.id); await page.waitForTimeout(80);
  check('offer table shows each offer\'s pricing version', await page.evaluate(() => /Pricing v2/.test(document.querySelector('main').textContent)));
  const manual = await page.evaluate(id => { const a = Store.get('applications', id), o = a.offers.find(x => x.status === 'Draft'); const el = document.querySelector(`[data-of="${id}"][data-o="${o.id}"][data-k="factor"]`); if (!el) return 'no field'; el.value = '1.300'; el.dispatchEvent(new Event('change', { bubbles: true })); return Store.get('applications', id).offers.find(x => x.id === o.id).pv; }, a1.id);
  check('editing a factor by hand marks the offer as Manual factor', manual === 'manual', manual);
  const deal = await page.evaluate(() => { const a = DB.applications.find(x => !x.dealId && x.offers.length && !['Funded', 'Declined'].includes(x.stage)); a.offers[0].pv = 2; a.selectedOffer = a.offers[0].id; a.funding.checks = { contract: true, id: true, bank: true, statements: true, capital: true }; a.funding.capitalId = DB.capital[0].id; const d = Biz.fund(a); return d.pricingVersion; });
  check('a funded deal keeps its offer\'s pricing version', deal === 2, deal);
  // declines
  const dec = await page.evaluate(() => DB.applications.find(x => x.stage === 'Underwriting').id);
  await page.evaluate(id => { location.hash = '#/app/' + id + '/8'; App.render(); }, dec); await page.waitForTimeout(80);
  check('decline reasons come from the standard list', await page.evaluate(() => [...document.querySelectorAll('#dWhy option')].map(o => o.textContent).filter(Boolean).join('|') === DECLINE_REASONS.map(r => r[1]).join('|')));
  await page.selectOption('#dWhy', 'Other'); await page.click(`[data-act="decline"][data-id="${dec}"]`); await page.waitForTimeout(80);
  check('Other needs a note', await page.evaluate(id => /Explain/.test(document.getElementById('e-dNote').textContent) && Store.get('applications', id).stage === 'Underwriting', dec));
  await page.selectOption('#dWhy', 'High NSF activity'); await page.click(`[data-act="decline"][data-id="${dec}"]`); await page.waitForTimeout(80); await t.mact(1);
  const d2 = await page.evaluate(id => { const a = Store.get('applications', id); return { stage: a.stage, decline: a.decline, audit: DB.audit.find(x => x.action === 'Decline reason') }; }, dec);
  check('decline records code, reason, who and when', d2.stage === 'Declined' && d2.decline.code === 'NSF' && d2.decline.by === 'Jack Rivera' && /NSF · High NSF activity/.test(d2.audit.next), d2.decline);
  const sweep = await page.evaluate(() => { const bad = []; for (const u of DB.users) { localStorage.setItem(SKEY, JSON.stringify({ u: u.id })); const pages = ROLES[u.role] ? Object.keys(ROUTES) : u.role === 'broker' ? Object.keys(BrkPages) : Object.keys(CustPages); for (const r of pages) { try { location.hash = '#/' + r; App.render(); } catch (e) { bad.push(u.role + ':' + r + ': ' + e.message); } } } return bad; });
  check('every page renders for every user', sweep.length === 0, sweep.slice(0, 5));
  check('no uncaught page errors', t.errors.length === 0, t.errors);
  await t.finish();
})().catch(e => { console.error(e); process.exit(1); });
