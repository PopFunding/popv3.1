/* Stage rules: one function decides whether a file may enter a stage, for every path that moves files. */
const { open } = require('./helpers');
(async () => {
  const t = await open(); const { page, check } = t;
  await t.signIn('u1', '#/pipeline');
  const block = await page.evaluate(() => {
    const fresh = DB.applications.find(a => a.stage === 'Underwriting' && !a.uw) || DB.applications.find(a => a.stage === 'Documents');
    const out = {}; const tryMove = (a, s) => { const before = a.stage, r = Biz.move(a, s); return { r, stayed: a.stage === before, msg: document.getElementById('toast').textContent }; };
    out.approvedNoDecision = tryMove(fresh, 'Approved');
    out.offerSentNoOffers = tryMove(fresh, 'Offer Sent');
    out.contractNoSelection = tryMove(fresh, 'Contract');
    out.fundedDirect = tryMove(fresh, 'Funded');
    out.declinedNoReason = tryMove(fresh, 'Declined');
    const funded = DB.applications.find(a => a.stage === 'Funded'); out.leaveFunded = tryMove(funded, 'Underwriting');
    out.backwards = tryMove(fresh, 'Application'); out.backwards.stage = fresh.stage;
    return out; });
  check('Approved needs an approved underwriting decision', block.approvedNoDecision.r === false && block.approvedNoDecision.stayed && /underwriting decision/.test(block.approvedNoDecision.msg), block.approvedNoDecision);
  check('Offer Sent needs offers recorded as sent', block.offerSentNoOffers.r === false && block.offerSentNoOffers.stayed);
  check('Contract needs an accepted offer', block.contractNoSelection.r === false && block.contractNoSelection.stayed);
  check('Funded can only be reached by funding', block.fundedDirect.r === false && block.fundedDirect.stayed);
  check('Declined needs a decline reason', block.declinedNoReason.r === false && block.declinedNoReason.stayed);
  check('a funded file cannot be moved back', block.leaveFunded.r === false && block.leaveFunded.stayed && /stays funded/.test(block.leaveFunded.msg));
  check('moving back to an earlier stage is allowed (rework)', block.backwards.r === true && block.backwards.stage === 'Application');
  // pipeline drag goes through the same rule and does not claim success when blocked
  const drag = await page.evaluate(() => { const a = DB.applications.find(x => x.stage === 'Documents' && !x.uw); document.getElementById('toast').textContent = ''; pipeMove(a.id, 'Approved'); return { stage: a.stage, msg: document.getElementById('toast').textContent }; });
  check('pipeline drag is blocked by the same rule, with no success message', drag.stage === 'Documents' && /underwriting decision/.test(drag.msg) && !/→/.test(drag.msg), drag);
  // the normal path still works end to end
  const flow = await page.evaluate(() => { const a = DB.applications.find(x => x.stage === 'Underwriting' && !x.dealId); const steps = [];
    location.hash = '#/app/' + a.id + '/8'; App.render(); document.getElementById('dAmt').value = '50000'; App.acts.approve({ dataset: { id: a.id } }); steps.push(a.stage);
    App.acts.offsend({ dataset: { id: a.id } }); document.getElementById('modal').hidden = true; steps.push(a.stage);
    App.acts.offaccept({ dataset: { id: a.id, o: a.offers.find(o => o.status === 'Sent').id } }); steps.push(a.stage);
    a.funding.checks = { contract: true, id: true, bank: true, statements: true, capital: true }; a.funding.capitalId = DB.capital[0].id; Biz.fund(a); steps.push(a.stage);
    return steps; });
  check('the normal path still runs: Approved → Offer Sent → Contract → Funded', flow.join('>') === 'Approved>Offer Sent>Contract>Funded', flow);
  const sweep = await page.evaluate(() => { const bad = []; for (const u of DB.users) { localStorage.setItem(SKEY, JSON.stringify({ u: u.id })); const pages = ROLES[u.role] ? Object.keys(ROUTES) : u.role === 'broker' ? Object.keys(BrkPages) : Object.keys(CustPages); for (const r of pages) { try { location.hash = '#/' + r; App.render(); } catch (e) { bad.push(u.role + ':' + r + ': ' + e.message); } } } return bad; });
  check('every page renders for every user', sweep.length === 0, sweep.slice(0, 5));
  check('no uncaught page errors', t.errors.length === 0, t.errors);
  await t.finish();
})().catch(e => { console.error(e); process.exit(1); });
