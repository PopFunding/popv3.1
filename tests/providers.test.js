/* Capital providers: explainable funding-path matching, stale criteria, submissions and their outcomes. */
const { open } = require('./helpers');
(async () => {
  const t = await open(); const { page, check } = t;
  await t.signIn('u1', '#/providers');
  const seed = await page.evaluate(() => ({ n: DB.providers.length, demo: DB.providers.every(p => p.demo), subs: DB.submissions.length, note: /Demo providers/.test(document.querySelector('main').textContent), h1: document.querySelector('main h1').textContent }));
  check('demo providers are added once, labelled demo, with an on-screen notice', seed.n === 3 && seed.demo && seed.note && seed.h1 === 'Capital providers', seed);
  // rule engine at the boundaries, on a synthetic program and facts
  const eng = await page.evaluate(() => { const g = { criteria: { minRevenue: 30000, minTib: 12, minScore: 620, maxPositions: 2, maxNsf: 5, minAmount: 10000, maxAmount: 500000, products: ['wc'], excludedIndustries: ['Trucking'], excludedStates: ['NY'] }, confirmedAt: todayISO };
    const base = { revenue: 30000, tib: 12, score: 620, positions: 2, nsfs: 5, amount: 10000, industry: 'Retail', state: 'FL', product: 'wc' };
    const at = Prov.check(g, base), r = k => Prov.check(g, Object.assign({}, base, k));
    return { boundaryOk: at.eligible && at.of === 10 && at.met === 10,
      fails: { rev: r({ revenue: 29999 }).fails, tib: r({ tib: 11 }).fails, score: r({ score: 619 }).fails, pos: r({ positions: 3 }).fails, nsf: r({ nsfs: 6 }).fails, low: r({ amount: 9999 }).fails, high: r({ amount: 500001 }).fails, prod: r({ product: 'tf' }).fails, ind: r({ industry: 'Trucking' }).fails, st: r({ state: 'NY' }).fails },
      unset: Prov.check({ criteria: { minRevenue: 30000 } }, base), detail: r({ revenue: 29999 }).rules.find(x => x.k === 'minRevenue') }; });
  check('a file exactly at every limit meets all 10 rules', eng.boundaryOk);
  check('each rule fails by itself just past its limit', Object.values(eng.fails).every(n => n === 1), eng.fails);
  check('rules a program does not set are shown as not specified, not failed', eng.unset.eligible && eng.unset.of === 1 && eng.unset.rules.filter(x => x.pass === null).length === 9);
  check('a failing rule explains the limit and the file value', eng.detail.label === 'Monthly revenue at least $30,000' && eng.detail.detail === '$29,999' && eng.detail.pass === false, eng.detail);
  check('criteria older than the stale window are flagged', await page.evaluate(() => Prov.stale({ confirmedAt: addDays(todayISO, -91) }) && !Prov.stale({ confirmedAt: addDays(todayISO, -90) }) && Prov.stale({})));
  // a real file
  const a = await page.evaluate(() => { const x = DB.applications.find(y => y.stage === 'Underwriting' && Prov.rank(y).some(z => z.r.eligible) && Prov.rank(y).some(z => !z.r.eligible)); return x && x.id; });
  check('there is a demo file with both matching and failing programs', !!a, a);
  await page.evaluate(id => { location.hash = '#/paths/' + id; App.render(); }, a); await page.waitForTimeout(80);
  const pg = await page.evaluate(id => { const r = Prov.rank(Store.get('applications', id)); const firstFail = r.findIndex(x => !x.r.eligible); return { ordered: r.slice(0, firstFail).every(x => x.r.eligible) && r.slice(firstFail).every(x => !x.r.eligible), text: document.querySelector('main').textContent, stale: r.some(x => x.r.stale) }; }, a);
  check('eligible programs are listed before failing ones', pg.ordered);
  check('the page shows POP Direct, match counts and the stale warning', /POP Direct/.test(pg.text) && /Meets \d+ of \d+/.test(pg.text) && /Fails \d+ of \d+/.test(pg.text) && (!pg.stale || /Criteria not confirmed in 90 days/.test(pg.text)));
  check('the file page links to its funding paths', await page.evaluate(id => { location.hash = '#/app/' + id; App.render(); return !!document.querySelector('a[href="#/paths/' + id + '"]'); }, a));
  // submissions
  const ids = await page.evaluate(id => { const r = Prov.rank(Store.get('applications', id)); return { ok: r.find(x => x.r.eligible).g.id, bad: r.find(x => !x.r.eligible).g.id }; }, a);
  await page.evaluate(id => { location.hash = '#/paths/' + id; App.render(); }, a);
  await page.click(`[data-act="subnew"][data-g="${ids.ok}"]`); await t.mact(1);
  const s1 = await page.evaluate(([id, g]) => DB.submissions.find(s => s.appId === id && s.programId === g), [a, ids.ok]);
  check('recording a submission to a matching program stores who and when', s1 && s1.status === 'Sent' && s1.sentBy === 'Jack Rivera' && s1.sentAt && !s1.override, s1);
  check('a second open submission to the same program is refused', await page.evaluate(([id, g]) => { App.acts.subnew({ dataset: { id, g } }); return DB.submissions.filter(s => s.appId === id && s.programId === g).length === 1 && /Already submitted/.test(document.getElementById('toast').textContent); }, [a, ids.ok]));
  await page.evaluate(() => { document.getElementById('modal').hidden = true; });
  await page.evaluate(() => document.querySelectorAll('details.path').forEach(d => d.open = true));
  await page.click(`[data-act="subnew"][data-g="${ids.bad}"]`); await t.mact(1);
  check('submitting outside criteria needs a reason', await page.evaluate(([id, g]) => !DB.submissions.some(s => s.appId === id && s.programId === g) && /reason/.test(document.getElementById('e-snR').textContent), [a, ids.bad]));
  await page.fill('#snR', 'Provider agreed to review a revenue exception'); await t.mact(1);
  check('the override reason is stored and audited', await page.evaluate(([id, g]) => { const s = DB.submissions.find(x => x.appId === id && x.programId === g); return s && /revenue exception/.test(s.override) && DB.audit[0].action === 'Recorded provider submission'; }, [a, ids.bad]));
  // responses
  await page.click(`[data-act="subresp"][data-id="${s1.id}"]`); await page.selectOption('#srS', 'Approved'); await t.mact(1);
  check('an approval needs the approved amount', await page.evaluate(() => /approved amount/.test(document.getElementById('e-srA').textContent)));
  await page.fill('#srA', '45000'); await t.mact(1);
  const r1 = await page.evaluate(id => DB.submissions.find(s => s.id === id), s1.id);
  check('the approval is recorded with amount, date and response time', r1.status === 'Approved' && r1.offerAmount === 45000 && r1.respondedAt, r1);
  const bad = await page.evaluate(([id, g]) => DB.submissions.find(s => s.appId === id && s.programId === g).id, [a, ids.bad]);
  await page.click(`[data-act="subresp"][data-id="${bad}"]`); await page.selectOption('#srS', 'Declined'); await t.mact(1);
  check('a decline needs a reason', await page.evaluate(() => /decline reason/.test(document.getElementById('e-srR').textContent)));
  await page.fill('#srR', 'Revenue below program minimum'); await t.mact(1);
  const st = await page.evaluate(([g1, g2]) => ({ a: Prov.stats({ programId: g1 }), b: Prov.stats({ programId: g2 }) }), [ids.ok, ids.bad]);
  check('program history counts approvals, declines and approval rate', st.a.approved === 1 && st.a.rate === 1 && st.b.declined === 1 && st.b.rate === 0, st);
  check('between equally matching programs, the better approval history ranks first', await page.evaluate(id => { const save = [DB.providers, DB.submissions];
    DB.providers = [{ id: 'tA', name: 'A Test', active: true, programs: [{ id: 'tgA', name: 'Any', active: true, confirmedAt: todayISO, criteria: {} }] }, { id: 'tB', name: 'B Test', active: true, programs: [{ id: 'tgB', name: 'Any', active: true, confirmedAt: todayISO, criteria: {} }] }];
    const before = Prov.rank(Store.get('applications', id)).map(x => x.p.id).join(',');
    DB.submissions = [{ id: 'x1', appId: 'z', programId: 'tgB', providerId: 'tB', status: 'Approved', sentAt: todayISO, respondedAt: todayISO }, { id: 'x2', appId: 'z', programId: 'tgA', providerId: 'tA', status: 'Declined', sentAt: todayISO, respondedAt: todayISO }];
    const after = Prov.rank(Store.get('applications', id)).map(x => x.p.id).join(',');
    [DB.providers, DB.submissions] = save; return before === 'tA,tB' && after === 'tB,tA'; }, a));
  // permissions and criteria upkeep
  const g = await page.evaluate(() => DB.providers[1].programs[0].id);
  await page.evaluate(() => { location.hash = '#/providers'; App.render(); });
  await page.click(`[data-act="provconfirm"][data-g="${g}"]`); await t.mact(1);
  check('confirming criteria clears the stale flag and is audited', await page.evaluate(id => { const x = Prov.programs().find(y => y.g.id === id).g; return x.confirmedAt === todayISO && !Prov.stale(x) && DB.audit[0].action === 'Confirmed provider criteria'; }, g));
  await page.click(`[data-act="provedit"][data-g="${g}"]`); await page.fill('#pc_minAmount', '900000'); await page.fill('#pc_maxAmount', '1000'); await t.mact(1);
  check('criteria edits are validated (min above max refused)', await page.evaluate(() => /at least the minimum/.test(document.getElementById('e-pc_maxAmount').textContent)));
  await page.fill('#pc_minAmount', ''); await page.fill('#pc_maxAmount', '200000'); await t.mact(1);
  check('saved criteria edits are audited; empty means not specified', await page.evaluate(id => { const x = Prov.programs().find(y => y.g.id === id).g; return x.criteria.maxAmount === 200000 && x.criteria.minAmount === null && DB.audit[0].action === 'Changed provider criteria'; }, g));
  await t.signIn('u2', '#/providers');
  check('executive can view providers but not confirm or edit', await page.evaluate(() => /Capital providers/.test(document.querySelector('main h1').textContent) && !document.querySelector('[data-act="provconfirm"],[data-act="provedit"]')));
  await t.signIn('u5', '#/paths/' + a);
  check('sales can open funding paths for a file', await page.evaluate(() => /Funding paths/.test(document.querySelector('main h1').textContent)));
  await page.reload(); await page.waitForTimeout(300);
  check('providers and submissions survive a reload', await page.evaluate(() => DB.providers.length === 3 && DB.submissions.length === 2));
  const sweep = await page.evaluate(() => { const bad = []; for (const u of DB.users) { localStorage.setItem(SKEY, JSON.stringify({ u: u.id })); const pages = ROLES[u.role] ? Object.keys(ROUTES) : u.role === 'broker' ? Object.keys(BrkPages) : Object.keys(CustPages); for (const r of pages) { try { location.hash = '#/' + r; App.render(); } catch (e) { bad.push(u.role + ':' + r + ': ' + e.message); } } } return bad; });
  check('every page renders for every user', sweep.length === 0, sweep.slice(0, 5));
  check('no uncaught page errors', t.errors.length === 0, t.errors);
  await t.finish();
})().catch(e => { console.error(e); process.exit(1); });
