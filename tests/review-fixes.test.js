/* Regression tests for the issues found in the 2026-10-11 code review. */
const { open } = require('./helpers');
(async () => {
  const t = await open(); const { page, check } = t;
  await t.signIn('u1', '#/dash');
  const ready = a => `(()=>{const a=Store.get('applications','${a}');a.offers=a.offers.length?a.offers:Biz.defaultOffers(a);a.funding.checks={contract:true,id:true,bank:true,statements:true,capital:true};a.funding.capitalId=DB.capital[0].id;return a;})()`;
  // 1. no funding without an approved underwriting decision
  const f1 = await page.evaluate(() => { const a = DB.applications.find(x => x.stage === 'Application' && !x.uw); if (!a.offers.length) a.offers = Biz.defaultOffers(a); a.offers.forEach(o => o.status = 'Sent');
    App.acts.offaccept({ dataset: { id: a.id, o: a.offers[0].id } }); const afterAccept = { stage: a.stage, sel: a.selectedOffer };
    a.selectedOffer = a.offers[0].id; a.funding.checks = { contract: true, id: true, bank: true, statements: true, capital: true }; a.funding.capitalId = DB.capital[0].id;
    const n = DB.deals.length, d = Biz.fund(a); return { afterAccept, deal: !!d, created: DB.deals.length - n, stage: a.stage }; });
  check('an offer cannot be accepted before underwriting approval', f1.afterAccept.stage === 'Application' && !f1.afterAccept.sel, f1.afterAccept);
  check('funding is refused without an approved underwriting decision; no deal is created', !f1.deal && f1.created === 0 && f1.stage === 'Application', f1);
  // 2. no funding while a duplicate review is open
  const f2 = await page.evaluate(() => { const a = DB.applications.find(x => x.stage === 'Documents'); const rk = Biz.risk(a); a.uw = { score: rk.score, tier: rk.tier, decision: 'Approved', by: 'Test', at: todayISO, amount: 50000 };
    a.review = { type: 'duplicate', status: 'Open', at: todayISO, matches: [] }; if (!a.offers.length) a.offers = Biz.defaultOffers(a); a.offers.forEach(o => o.status = 'Sent');
    App.acts.offaccept({ dataset: { id: a.id, o: a.offers[0].id } }); const sel = a.selectedOffer;
    a.selectedOffer = a.offers[0].id; a.funding.checks = { contract: true, id: true, bank: true, statements: true, capital: true }; a.funding.capitalId = DB.capital[0].id;
    const m = merch(a.merchantId).status, n = DB.deals.length, d = Biz.fund(a); return { sel, deal: !!d, created: DB.deals.length - n, stage: a.stage, merchantBefore: m, merchantAfter: merch(a.merchantId).status, dealId: a.dealId }; });
  check('an offer cannot be accepted while a duplicate review is open', !f2.sel, f2);
  check('funding is refused while a duplicate review is open, and nothing changes', !f2.deal && f2.created === 0 && !f2.dealId && f2.merchantAfter === f2.merchantBefore, f2);
  check('underwriting cannot approve a file while its duplicate review is open', await page.evaluate(() => { const a = DB.applications.find(x => x.stage === 'Underwriting' && !x.uw); a.review = { type: 'duplicate', status: 'Open', at: todayISO, matches: [] }; location.hash = '#/app/' + a.id + '/8'; App.render(); document.getElementById('dAmt').value = '30000'; App.acts.approve({ dataset: { id: a.id } }); const ok = !a.uw && a.stage === 'Underwriting'; a.review.status = 'Kept'; return ok; }));
  // 3. declined files can only be reopened for review
  const f3 = await page.evaluate(() => { const a = DB.applications.find(x => x.stage === 'Declined'); if (!a.offers.length) a.offers = Biz.defaultOffers(a); a.selectedOffer = a.offers[0].id; a.offers[0].status = 'Accepted';
    const toContract = Biz.move(a, 'Contract'), st1 = a.stage, toOffer = Biz.move(a, 'Offer Sent'), toUw = Biz.move(a, 'Underwriting'); return { toContract, toOffer, st1, toUw, st2: a.stage }; });
  check('a declined file cannot jump to Offer Sent or Contract', f3.toContract === false && f3.toOffer === false && f3.st1 === 'Declined', f3);
  check('a declined file can be reopened for review (Underwriting)', f3.toUw === true && f3.st2 === 'Underwriting', f3);
  // 4. internal decline notes stay internal
  const app4 = await page.evaluate(() => DB.applications.find(x => x.stage === 'Underwriting' && x.brokerId === 'b1').id);
  await page.evaluate(id => { location.hash = '#/app/' + id + '/8'; App.render(); }, app4);
  await page.selectOption('#dWhy', 'Other'); await page.fill('#dNote', 'Owner has prior fraud flag per internal check'); await page.click(`[data-act="decline"][data-id="${app4}"]`); await page.waitForTimeout(80); await t.mact(1);
  const internal = await page.evaluate(id => { location.hash = '#/app/' + id + '/8'; App.render(); return document.querySelector('main').textContent; }, app4);
  check('the internal file shows the decline note', /Internal note: Owner has prior fraud flag/.test(internal));
  await t.signIn('u9', '#/bdeal/' + app4);
  const broker = await page.evaluate(() => document.querySelector('main').textContent);
  check('the broker sees only the standard reason, not the internal note', /Other/.test(broker) && !/fraud flag/.test(broker));
  // 6. re-approval retires the old decline record
  await t.signIn('u1', '#/dash');
  const f6 = await page.evaluate(id => { const a = Store.get('applications', id); Biz.move(a, 'Underwriting'); location.hash = '#/app/' + id + '/8'; App.render(); document.getElementById('dAmt').value = '40000'; App.acts.approve({ dataset: { id } }); return { decline: a.decline, hist: (a.declineHistory || []).map(x => x.code), stage: a.stage }; }, app4);
  check('re-approving moves the old decline into history', f6.decline === null && f6.hist.join() === 'OTH' && f6.stage === 'Approved', f6);
  // 7. provider exclusions ignore case
  const f7 = await page.evaluate(() => { const g = { criteria: { excludedIndustries: ['trucking'], products: ['WC'] } }, f = { industry: 'Trucking', product: 'wc', state: 'FL' }; const r = Prov.check(g, f); return { ind: r.rules.find(x => x.k === 'industry').pass, prod: r.rules.find(x => x.k === 'products').pass }; });
  check('industry exclusions and product codes match regardless of case', f7.ind === false && f7.prod === true, f7);
  check('no uncaught page errors', t.errors.length === 0, t.errors);
  await t.finish();
})().catch(e => { console.error(e); process.exit(1); });
