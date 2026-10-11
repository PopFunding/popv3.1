/* Provider insights: declines within stated criteria, approvals outside them, top decline reasons, rules blocking open files. */
const { open } = require('./helpers');
(async () => {
  const t = await open(); const { page, check } = t;
  await t.signIn('u1', '#/providers');
  const r = await page.evaluate(() => { const g = DB.providers[0].programs[0], mk = (st, extra) => Object.assign({ id: uid('s'), appId: 'APP-x', merchantId: DB.merchants[0].id, providerId: DB.providers[0].id, programId: g.id, sentAt: addDays(todayISO, -5), sentBy: 'Test', status: st, respondedAt: todayISO }, extra);
    DB.submissions = [mk('Declined', { reason: 'Revenue too low' }), mk('Declined', { reason: 'revenue too low ' }), mk('Declined', { reason: 'Industry', override: 'exception asked' }), mk('Approved', { offerAmount: 50000, override: 'asked for exception' }), mk('Approved', { offerAmount: 40000 }), mk('Sent', { respondedAt: null })];
    const ins = Prov.insights(g), open = DB.applications.filter(a => !['Funded', 'Declined'].includes(a.stage)), expectBlocks = {};
    open.forEach(a => Prov.check(g, Prov.facts(a)).rules.filter(x => x.pass === false).forEach(x => expectBlocks[x.k] = (expectBlocks[x.k] || 0) + 1));
    const topK = Object.entries(expectBlocks).sort((a, b) => b[1] - a[1])[0];
    Store.save(); location.hash = '#/providers'; App.render();
    return { ins, topK, text: document.querySelector('main').textContent }; });
  check('declines of files that met the stated criteria are counted (overrides excluded)', r.ins.declinedWithin === 2, r.ins);
  check('approvals outside the stated criteria are counted', r.ins.approvedOutside === 1);
  check('decline reasons are grouped case- and space-insensitively, most common first', r.ins.reasons[0].n === 2 && /revenue too low/i.test(r.ins.reasons[0].label) && r.ins.reasons.length === 2, r.ins.reasons);
  check('blocking rules are counted across open files, largest first', !r.topK || (r.ins.blocks[0].n === r.topK[1]), { top: r.topK, got: r.ins.blocks[0] });
  check('the providers page shows the re-confirm warning and the insights', /Declined 2 files that met its stated criteria/.test(r.text) && /Approved 1 outside its stated criteria/.test(r.text) && /Top decline reasons/.test(r.text) && /Open files blocked by/.test(r.text));
  check('a program with no history shows no insight warnings', await page.evaluate(() => { const g = DB.providers[2].programs[0], i = Prov.insights(g); return i.declinedWithin === 0 && i.approvedOutside === 0 && i.reasons.length === 0; }));
  check('decline reasons typed by users are escaped on the page', await page.evaluate(() => { DB.submissions[0].reason = '<img src=x onerror="window.__x=1">'; App.render(); return !document.querySelector('main img[src="x"]') && !window.__x; }));
  check('no uncaught page errors', t.errors.length === 0, t.errors);
  await t.finish();
})().catch(e => { console.error(e); process.exit(1); });
