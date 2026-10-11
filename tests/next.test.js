/* Next best actions: one deterministic step per open file, ordered by urgency, scoped by role, thresholds from settings. */
const { open } = require('./helpers');
(async () => {
  const t = await open(); const { page, check } = t;
  await t.signIn('u1', '#/dash');
  const r = await page.evaluate(() => { const base = DB.applications.find(a => a.stage === 'Application'), mk = (stage, extra) => Object.assign(JSON.parse(JSON.stringify(base)), { id: 'T-' + stage.replace(/\s/g, ''), stage, stageSince: todayISO, created: todayISO, review: null, uw: null, offers: [], selectedOffer: null, funding: { status: null, checks: {} } }, extra || {});
    const k = a => (Next.forApp(a) || {}).k, txt = a => (Next.forApp(a) || {}).text;
    const sentOffer = [{ id: 'o1', status: 'Sent', sentAt: addDays(todayISO, -5), amount: 10000, term: 6, freq: 'daily', factor: 1.2, feePct: 2.5, commissionPct: 0 }];
    return {
      funded: Next.forApp(mk('Funded')), declined: Next.forApp(mk('Declined')),
      review: k(mk('Underwriting', { review: { status: 'Open' } })),
      contract: txt(mk('Contract', { funding: { checks: { contract: true }, capitalId: null } })), ready: txt(mk('Contract', { funding: { checks: { contract: true, id: true, bank: true, statements: true }, capitalId: 'c1' } })),
      approvedDraft: txt(mk('Approved', { offers: [{ status: 'Draft' }] })), approvedNone: txt(mk('Approved')),
      offerOld: txt(mk('Offer Sent', { offers: sentOffer })), offerNew: txt(mk('Offer Sent', { offers: [Object.assign({}, sentOffer[0], { sentAt: todayISO })] })),
      uwOld: Next.forApp(mk('Underwriting', { stageSince: addDays(todayISO, -4) })), uwNew: Next.forApp(mk('Underwriting')),
      stall: txt(mk('Application', { stageSince: addDays(todayISO, -20) })), fresh: txt(mk('Application')) }; });
  check('funded and declined files have no next action', r.funded === null && r.declined === null);
  check('an open duplicate review comes first', r.review === 'review');
  check('contract files show how much of the funding checklist is left', r.contract === 'Finish the funding checklist (4 left)' && r.ready === 'Ready to fund', [r.contract, r.ready]);
  check('approved files: send drafted offers, or build them', r.approvedDraft === 'Send the drafted offers' && r.approvedNone === 'Build offers');
  check('offers unanswered past the threshold get a follow-up', r.offerOld === 'Follow up on offers sent 5 days ago' && r.offerNew === "Waiting on the merchant's choice", [r.offerOld, r.offerNew]);
  check('underwriting past the threshold is urgent', r.uwOld.p < r.uwNew.p && /4 days/.test(r.uwOld.text), [r.uwOld.text, r.uwNew.text]);
  check('stalled files are flagged for re-engagement', r.stall === 'Re-engage: no movement in 20 days' && r.fresh === 'Complete the application', [r.stall, r.fresh]);
  // a provider that has not answered
  const prov = await page.evaluate(() => { const a = DB.applications.find(x => x.stage === 'Underwriting' && !x.review); DB.submissions.unshift({ id: 'sN', appId: a.id, merchantId: a.merchantId, providerId: DB.providers[0].id, programId: DB.providers[0].programs[0].id, sentAt: addDays(todayISO, -4), sentBy: 'T', status: 'Sent' }); const x = Next.forApp(a); DB.submissions.shift(); return x.text; });
  check('a provider with no response past the threshold is chased', prov === 'Chase Lumen Ridge Capital: no response in 4 days', prov);
  // thresholds come from settings
  const thr = await page.evaluate(() => { const a = DB.applications.find(x => x.stage === 'Underwriting' && !x.review); a.stageSince = addDays(todayISO, -2); const before = Next.forApp(a).p; DB.settings.nba.uwDays = 2; const after = Next.forApp(a).p; DB.settings.nba.uwDays = 3; return { before, after }; });
  check('changing a threshold in settings changes the urgency', thr.before > thr.after, thr);
  // ordering and role scope
  const ord = await page.evaluate(() => { const l = Next.list(DB.users.find(u => u.id === 'u1')); return l.every((x, i) => i === 0 || l[i - 1].p <= x.p); });
  check('the list is ordered by urgency', ord);
  const scope = await page.evaluate(() => { const sofia = DB.users.find(u => u.id === 'u5'), uw = DB.users.find(u => u.role === 'underwriter'), ops = DB.users.find(u => u.role === 'operations');
    const s = Next.list(sofia), w = Next.list(uw), o = Next.list(ops); return { s: s.length > 0 && s.every(x => x.app.repId === sofia.id && x.role === 'sales'), w: w.every(x => x.role === 'underwriter'), o: o.every(x => x.role === 'operations'), admin: Next.list(DB.users[0]).length >= s.length + w.length + o.length }; });
  check('sales see their own files; underwriters and operations see their role\'s steps; admins see all', scope.s && scope.w && scope.o && scope.admin, scope);
  // screens
  await t.signIn('u1', '#/dash');
  const dash = await page.evaluate(() => { const card = [...document.querySelectorAll('section.card')].find(c => /Next best actions/.test(c.textContent)); return card && { rows: card.querySelectorAll('a.nba').length, all: !!card.querySelector('a[href="#/next"]') }; });
  check('the dashboard shows up to 6 next actions and a link to all', dash && dash.rows > 0 && dash.rows <= 6 && dash.all, dash);
  await t.signIn('u1', '#/next');
  check('the full list page renders every action as a link', await page.evaluate(() => document.querySelectorAll('main a.nba').length === Next.list().length));
  await t.signIn('u1', '#/settings');
  await page.fill('input[data-cfg="nba"][data-k="offerDays"]', '5'); await page.dispatchEvent('input[data-cfg="nba"][data-k="offerDays"]', 'change'); await page.waitForTimeout(80);
  check('an admin can change follow-up timing in Settings, audited', await page.evaluate(() => DB.settings.nba.offerDays === 5 && DB.audit[0].record === 'nba.offerDays'));
  const sweep = await page.evaluate(() => { const bad = []; for (const u of DB.users) { localStorage.setItem(SKEY, JSON.stringify({ u: u.id })); const pages = ROLES[u.role] ? Object.keys(ROUTES) : u.role === 'broker' ? Object.keys(BrkPages) : Object.keys(CustPages); for (const r of pages) { try { location.hash = '#/' + r; App.render(); } catch (e) { bad.push(u.role + ':' + r + ': ' + e.message); } } } return bad; });
  check('every page renders for every user', sweep.length === 0, sweep.slice(0, 5));
  check('no uncaught page errors', t.errors.length === 0, t.errors);
  await t.finish();
})().catch(e => { console.error(e); process.exit(1); });
