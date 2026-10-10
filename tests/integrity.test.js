/* Record-integrity tests for POP OS (index.html). Runs the real app in headless Chromium with fictional demo data only.
   Run:  node tests/integrity.test.js        (needs Playwright; set PLAYWRIGHT_MODULE to its path if it is not installed locally) */
const path = require('path');
let pw; try { pw = require('playwright'); } catch (e) { pw = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright'); }
const FILE = 'file://' + path.resolve(__dirname, '..', 'index.html');
const results = []; const check = (name, ok, info) => results.push({ name, ok: !!ok, info });

(async () => {
  const browser = await pw.chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' })).newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.route(/three\.min\.js/, r => r.abort());                       // 3D logo is not needed for these tests
  await page.goto(FILE); await page.waitForTimeout(400);
  const signIn = (uid, hash) => page.evaluate(([u, h]) => { localStorage.setItem(SKEY, JSON.stringify({ u })); location.hash = h || '#/dash'; App.render(); }, [uid, hash]);
  const mact = async i => { await page.click(`#modal [data-mact="${i}"]`); await page.waitForTimeout(80); };
  await signIn('u1');

  // 1. IDs are unique, sequential and never reused
  const ids = await page.evaluate(() => { const out = [], seen = new Set(DB.applications.map(a => a.id)); for (let i = 0; i < 300; i++) { const id = Ids.app(); out.push(id); seen.add(id); }
    const last = out[out.length - 1]; DB.applications.unshift({ id: last, merchantId: DB.merchants[0].id, offers: [], steps: {}, funding: { checks: {} }, stage: 'New' }); DB.applications = DB.applications.filter(a => a.id !== last);
    return { unique: new Set(out).size === out.length && out.every(id => !DB.applications.some(a => a.id === id)), sequential: out.every((id, i) => i === 0 || +id.slice(4) === +out[i - 1].slice(4) + 1), afterDelete: Ids.app(), last, deal: Ids.deal(), lead: Ids.lead(), maxDeal: Math.max(...DB.deals.map(d => +d.id.slice(4))) }; });
  check('300 new application IDs are unique and sequential', ids.unique && ids.sequential);
  check('a deleted newest ID is not reissued', +ids.afterDelete.slice(4) === +ids.last.slice(4) + 1, [ids.last, ids.afterDelete]);
  check('deal IDs continue after the highest existing deal', +ids.deal.slice(4) > ids.maxDeal, ids.deal);
  check('lead IDs use the L- prefix', /^L-\d+$/.test(ids.lead), ids.lead);

  // 2. Funding is idempotent
  const fund = await page.evaluate(() => { const a = DB.applications.find(x => x.stage === 'Contract' && x.offers.length) || DB.applications.find(x => x.offers.length && !x.dealId);
    a.selectedOffer = a.selectedOffer || a.offers[a.offers.length - 1].id; a.funding.checks = { contract: true, id: true, bank: true, statements: true, capital: true }; a.funding.capitalId = DB.capital[0].id;
    const n0 = DB.deals.length, d1 = Biz.fund(a), d2 = Biz.fund(a), d3 = Biz.fund(a);
    return { n0, n1: DB.deals.length, same: d1 && d1 === d2 && d2 === d3, audit: DB.audit[0].action, appId: a.id, dealId: d1 && d1.id }; });
  check('funding one application three times creates exactly one deal', fund.same && fund.n1 === fund.n0 + 1, fund);
  check('repeat funding attempts are audited', fund.audit === 'Blocked duplicate funding', fund.audit);
  await page.evaluate(id => { location.hash = '#/fund/' + id; App.render(); App.acts.ffund({ dataset: { id } }); }, fund.appId); await page.waitForTimeout(80);
  check('the Mark funded action on a funded file opens the existing deal', await page.evaluate(d => location.hash === '#/deal/' + d, fund.dealId));

  // 3. Duplicate matching rules
  const dm = await page.evaluate(() => { const m = DB.merchants.find(x => x.ein && x.owner && x.owner.phone && x.owner.email), other = DB.merchants.find(x => x.state !== m.state);
    const phoneFmt = Dup.digits(m.owner.phone).replace(/(\d{3})(\d{3})(\d{4})/, '$1.$2.$3');
    return { name: m.dba,
      ein: Dup.find({ ein: m.ein }).some(h => h.m.id === m.id && h.why.includes('Same EIN')),
      phone: Dup.find({ phone: '+1 ' + phoneFmt }).some(h => h.m.id === m.id && h.why.includes('Same owner phone')),
      email: Dup.find({ email: '  ' + m.owner.email.toUpperCase() + ' ' }).some(h => h.m.id === m.id && h.why.includes('Same owner email')),
      nameState: Dup.find({ name: m.dba.toUpperCase() + ', L.L.C.', state: m.state }).some(h => h.m.id === m.id),
      nameOtherState: Dup.find({ name: m.dba, state: other.state }).some(h => h.m.id === m.id),
      unrelated: Dup.find({ name: 'Zebra Quantum Bakery', phone: '5550000000', email: 'nobody@example.test' }).length }; });
  check('matches on EIN, any phone format, email case and spacing', dm.ein && dm.phone && dm.email, dm);
  check('matches the same name with LLC punctuation in the same state', dm.nameState, dm.name);
  check('does not match the same name in a different state', !dm.nameOtherState);
  check('unrelated business has no matches', dm.unrelated === 0);

  // 4. Lead conversion checks for duplicates
  const lead = await page.evaluate(() => { const m = DB.merchants.find(x => x.owner && x.owner.phone && !Dup.openApps(x.id).length) ; const l = Store.add('leads', { id: Ids.lead(), name: 'Test Owner', business: 'Completely New Name Co', phone: m.owner.phone, email: '', revenue: 90000, tib: 24, industry: 'Retail', state: m.state, source: 'Website', priority: 'Medium', repId: 'u5', status: 'New', created: todayISO, lastContact: null, nextFollow: todayISO }, 'Created lead');
    return { lid: l.id, mid: m.id, mCount: DB.merchants.length, aCount: DB.applications.length }; });
  await page.evaluate(id => App.acts.convert({ dataset: { id } }), lead.lid); await page.waitForTimeout(80);
  check('converting a matching lead shows the duplicate warning', await page.evaluate(() => /Possible duplicate/.test(document.querySelector('#modal').textContent)));
  await mact(2);
  check('creating a new merchant anyway requires a reason', await page.evaluate(() => !document.querySelector('#modal').hidden && /reason/i.test(document.getElementById('e-dupR').textContent)));
  await mact(1);
  const conv = await page.evaluate(l => ({ m: DB.merchants.length, a: DB.applications.length, app: DB.applications[0], lead: Store.get('leads', l.lid).status }), lead);
  check('using the existing merchant adds an application without a new merchant', conv.m === lead.mCount && conv.a === lead.aCount + 1 && conv.app.merchantId === lead.mid && conv.lead === 'Converted', { m: conv.m, a: conv.a });

  // 5. A second open file on the same merchant needs a reason
  await signIn('u1', '#/apps');
  const mid = lead.mid; const before = await page.evaluate(() => DB.applications.length);
  await page.evaluate(() => App.acts.newapp()); await page.selectOption('#naM', mid); await page.fill('#naR', '60000'); await mact(1);
  check('blocked: merchant already has an open file', await page.evaluate(n => DB.applications.length === n && /already has an open file/.test(document.getElementById('naOpen').textContent), before));
  await page.fill('#naW', 'Separate line of credit'); await mact(1);
  check('allowed with a reason, and the override is audited', await page.evaluate(n => DB.applications.length === n + 1 && DB.audit.some(x => x.action === 'Second open file allowed' && x.next === 'Separate line of credit'), before));

  // 6. Broker submissions: own resubmission and channel conflict
  const target = await page.evaluate(() => { const m = DB.merchants.find(x => x.brokerId !== 'b1' && x.owner && x.owner.email && x.state); return { dba: m.dba, broker: brokerName(m.brokerId), email: m.owner.email, state: m.state, id: m.id }; });
  await signIn('u9', '#/submit'); await page.waitForTimeout(80);
  const fill = async (biz, email, phone) => { await page.fill('#sB', biz); await page.fill('#sO', 'Pat Owner'); await page.fill('#sP', phone || '(555) 777-1212'); await page.fill('#sE', email); await page.fill('#sS', target.state); await page.fill('#sR', '80000'); await page.fill('#sQ', '40000'); await page.evaluate(() => App.acts.bsubmit()); await page.waitForTimeout(80); };
  const n0 = await page.evaluate(() => DB.applications.length);
  await fill('Fresh Start Bakery', 'pat@freshstart.test');
  const first = await page.evaluate(() => DB.applications[0]);
  check('a clean broker submission has no review flag', !first.review && first.brokerId === 'b1');
  await page.evaluate(() => { location.hash = '#/submit'; App.render(); }); await fill('Fresh Start Bakery LLC', 'PAT@freshstart.test');
  check('a broker resubmitting their own open file is sent to it, nothing new is created', await page.evaluate(([n, id]) => DB.applications.length === n + 1 && location.hash === '#/bdeal/' + id, [n0, first.id]));
  await page.evaluate(() => { location.hash = '#/submit'; App.render(); }); await fill(target.dba, target.email, '(555) 313-4040');
  const conflict = await page.evaluate(() => { const a = DB.applications[0]; return { id: a.id, review: a.review, task: DB.tasks[0].title, audit: DB.audit.some(x => x.action === 'Possible duplicate submission'), text: document.querySelector('main').textContent }; });
  check('a submission matching another relationship is held for review', conflict.review && conflict.review.status === 'Open' && conflict.review.matches.some(m => m.merchantId === target.id), conflict.review);
  check('a review task and audit entry are created', /Review possible duplicate/.test(conflict.task) && conflict.audit, conflict.task);
  check('the broker sees a neutral notice that names no other business or broker', /checking this submission/.test(conflict.text) && !conflict.text.includes(target.broker) && conflict.text.split(target.dba).length <= 2, target.broker);
  await signIn('u1', '#/app/' + conflict.id); await page.waitForTimeout(80);
  check('internal file shows the review banner with the match', await page.evaluate(n => /Possible duplicate/.test(document.querySelector('main').textContent) && document.querySelector('main').textContent.includes(n), target.dba));
  check('the file cannot move past Documents while under review', await page.evaluate(id => { const a = Store.get('applications', id); const r = Biz.move(a, 'Underwriting'); return r === false && a.stage === 'Application'; }, conflict.id));
  if (await page.$(`[data-act="dupkeep"][data-id="${conflict.id}"]`)) await page.click(`[data-act="dupkeep"][data-id="${conflict.id}"]`); await page.fill('#dkR', 'Different owner and EIN confirmed by phone'); await mact(1);
  check('clearing the review with a reason lets work continue', await page.evaluate(id => { const a = Store.get('applications', id); Biz.move(a, 'Underwriting'); return a.review.status === 'Kept' && a.stage === 'Underwriting'; }, conflict.id));

  // 7. Regression: every page for every role
  const sweep = await page.evaluate(() => { const bad = []; for (const u of DB.users) { localStorage.setItem(SKEY, JSON.stringify({ u: u.id })); const pages = ROLES[u.role] ? Object.keys(ROUTES) : u.role === 'broker' ? Object.keys(BrkPages) : Object.keys(CustPages); for (const r of pages) { try { location.hash = '#/' + r; App.render(); } catch (e) { bad.push(u.role + ':' + r + ': ' + e.message); } } } return bad; });
  check('every page renders for every user', sweep.length === 0, sweep.slice(0, 5));
  check('no uncaught page errors', errors.length === 0, errors.slice(0, 5));

  await browser.close();
  let failed = 0; for (const r of results) { if (!r.ok) failed++; console.log((r.ok ? 'PASS ' : 'FAIL ') + r.name + (!r.ok && r.info !== undefined ? '  ' + JSON.stringify(r.info) : '')); }
  console.log(`\n${results.length - failed}/${results.length} passed`); process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
