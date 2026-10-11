/* Broker commissions: estimated → earned → approved → paid, deals funded before tracking, holds, permissions and audit. */
const { open } = require('./helpers');
(async () => {
  const t = await open(); const { page, check } = t;
  await t.signIn('u1', '#/commissions');
  const base = await page.evaluate(() => ({ t: Comm.totals(), all: DB.deals.filter(d => d.commission > 0).reduce((s, d) => s + d.commission, 0), h1: document.querySelector('main h1').textContent }));
  check('admin sees the Commissions page', base.h1 === 'Broker commissions');
  check('deals funded before tracking are not counted as owed', base.t.Earned === 0 && base.t['Before tracking'] === base.all, base.t);
  check('before-tracking + earned + approved + paid equals all funded-deal commissions', base.t['Before tracking'] + base.t.Earned + base.t.Approved + base.t.Paid === base.all);
  check('estimated comes from open offers and is kept separate', base.t.n.Estimated > 0 && base.t.Estimated > 0);
  const pick = await page.evaluate(() => { const ok = Comm.deals().filter(d => Engine.deal(d).status !== 'Default'); return { a: ok[0].id, b: ok[1].id, def: (Comm.deals().find(d => Engine.deal(d).status === 'Default') || {}).id }; });
  // confirm two legacy deals: one already paid, one not yet paid
  await page.click(`button[data-act="commlegacy"][data-id="${pick.b}"]`); await t.mact(2);
  check('confirming "already paid" needs a date and reference', await page.evaluate(() => /between funding/.test(document.getElementById('e-clD').textContent) && /reference/.test(document.getElementById('e-clR').textContent)));
  await page.fill('#clD', await page.evaluate(() => todayISO)); await page.fill('#clR', 'CHK-1044'); await t.mact(2);
  check('a pre-tracking payout is recorded as Paid and audited', await page.evaluate(i => { const c = Comm.rec(Store.get('deals', i)); return c.status === 'Paid' && c.legacy && c.ref === 'CHK-1044' && DB.audit[0].action === 'Confirmed pre-tracking commission'; }, pick.b));
  await page.click(`button[data-act="commlegacy"][data-id="${pick.a}"]`); await t.mact(1);
  check('"not yet paid" moves a pre-tracking commission to Earned', await page.evaluate(i => Comm.rec(Store.get('deals', i)).status === 'Earned', pick.a));
  const id = pick.a, amt = await page.evaluate(i => Store.get('deals', i).commission, id), t1 = await page.evaluate(() => Comm.totals());
  check('a payout cannot be recorded before approval', await page.evaluate(i => Comm.pay(Store.get('deals', i), todayISO, 'X123') === false, id));
  await page.click(`button[data-act="commapprove"][data-id="${id}"]`); await t.mact(1);
  const a1 = await page.evaluate(i => ({ st: Comm.rec(Store.get('deals', i)).status, t: Comm.totals(), audit: DB.audit[0].action }), id);
  check('approval moves Earned to Approved, shifts totals and is audited', a1.st === 'Approved' && a1.t.Approved === t1.Approved + amt && a1.audit === 'Approved broker commission', a1.st);
  check('approving twice is refused', await page.evaluate(i => Comm.approve(Store.get('deals', i)) === false, id));
  await page.click(`button[data-act="commpay"][data-id="${id}"]`); await page.fill('#cpR', ''); await t.mact(1);
  check('a payout needs a reference', await page.evaluate(() => /reference/.test(document.getElementById('e-cpR').textContent)));
  await page.fill('#cpD', '2099-01-01'); await page.fill('#cpR', 'ACH-55821'); await t.mact(1);
  check('a payout date cannot be in the future', await page.evaluate(() => /between funding/.test(document.getElementById('e-cpD').textContent)));
  await page.fill('#cpD', await page.evaluate(() => todayISO)); await t.mact(1);
  const p1 = await page.evaluate(i => ({ c: Comm.rec(Store.get('deals', i)), audit: DB.audit[0].action }), id);
  check('the payout moves it to Paid with date and reference, audited', p1.c.status === 'Paid' && p1.c.ref === 'ACH-55821' && p1.audit === 'Recorded broker commission payout', p1.c);
  if (pick.def) {
    const hold = await page.evaluate(i => { const d = Store.get('deals', i); Comm.legacy(d, false); Table.st('comm').f.st = 'Earned'; App.render(); return { approve: Comm.approve(d), pill: !!document.querySelector('main') && /On hold · in default/.test(document.querySelector('main').textContent) }; }, pick.def);
    check('a commission on a deal in default stays on hold', hold.approve === false && hold.pill, hold);
  }
  check('a newly funded deal starts as Earned', await page.evaluate(() => { const a = DB.applications.find(x => !x.dealId && x.uw && x.uw.decision === 'Approved' && x.offers.some(o => o.commissionPct > 0) && !['Funded', 'Declined'].includes(x.stage)); if (!a) return 'no candidate'; a.selectedOffer = a.offers.find(o => o.commissionPct > 0).id; a.funding.checks = { contract: true, id: true, bank: true, statements: true, capital: true }; a.funding.capitalId = DB.capital[0].id; const d = Biz.fund(a); return d && Comm.rec(d).status === 'Earned'; }));
  await page.reload(); await page.waitForTimeout(300);
  check('state survives a reload', await page.evaluate(i => Comm.rec(Store.get('deals', i)).status === 'Paid', id));
  await t.signIn('u2', '#/commissions');
  check('executive can view but has no actions and cannot approve', await page.evaluate(() => document.querySelectorAll('[data-act^="comm"]').length === 0 && Comm.approve(Comm.deals().find(d => Comm.rec(d).status === 'Earned') || Comm.deals()[0]) === false));
  await t.signIn('u5', '#/commissions');
  check('sales cannot open Commissions', await page.evaluate(() => /access/i.test(document.querySelector('main').textContent)));
  await t.signIn('u9', '#/bcomm');
  const br = await page.evaluate(() => ({ kpis: [...document.querySelectorAll('.kpi .kl')].map(x => x.textContent).join('|'), own: Comm.deals(App.user.brokerId).every(d => d.brokerId === App.user.brokerId), acts: document.querySelectorAll('[data-act^="comm"]').length }));
  check('broker sees each state separately, own deals only, no admin actions', /^Estimated\|(Before tracking\|)?Earned\|Approved\|Paid$/.test(br.kpis) && br.own && br.acts === 0, br);
  check('no uncaught page errors', t.errors.length === 0, t.errors);
  await t.finish();
})().catch(e => { console.error(e); process.exit(1); });
