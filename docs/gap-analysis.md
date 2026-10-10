# POP OS gap analysis

This compares POP OS against the lending lifecycle in the [reference model](ondeck-reference-model.md). It is based only on this repository's `index.html` (POP OS v2.x, a single-file app that keeps its data in the browser), as of 2026-10-10. Function names are given so each claim can be checked in the code.

**Key:** ✅ works · ◐ partial · ✗ missing · 🔌 needs an integration · 🗄 needs Supabase · 📋 needs a POP policy decision

## Stage by stage

| Stage | What POP OS does today | Gaps |
| --- | --- | --- |
| **Lead** | ✅ Leads list, lead score (`Biz.leadScore`), sources, follow-up dates, convert to application. ✅ *New:* duplicate check on convert (`Dup.find`). | ✗ No duplicate check when a lead is first created. ✗ No cost or ROI tracking by source. 📋 Consent-to-contact capture for calls and texts. |
| **Application** | ✅ 10-step wizard that saves each step (`STEPS`, `a.steps`), completion %, broker submission, consent step (step 6). | 🔌 No merchant e-signature on the application. ◐ Consent is a checkbox, with no signed evidence. |
| **Data collection** | ✅ Request templates, upload checks (type, 25 MB), statuses through to verified (`Docs`), uploads from both portals. | 🗄 Files exist only for the session (`Docs.files`); only metadata persists. 🔌 No bank-data connection (Plaid boundary only). ✗ No statement parsing. |
| **Underwriting** | ✅ Risk score with factors and flags (`Engine.risk`), payment capacity and max approval (`Engine.maxDaily`, `maxApproval`), stacking from existing positions, underwriter workstation, recorded decision (`a.uw`). | ✗ No KYC/KYB or sanctions screening. ✗ No delegated approval limits or second review above a threshold. ✗ No standard decline reason codes or adverse-action notices. 📋 Credit policy is POP's editable heuristic and needs calibrating against real outcomes. |
| **Offer** | ✅ A/B/C offers (`Biz.defaultOffers`), pricing table and tier adjustments, APR estimate, customer accepts in the portal. | ✗ No offer expiry. ✗ The pricing version isn't stored with each offer. 📋🔌 State commercial-finance disclosures (for example California and New York) need a disclosure module reviewed by counsel. |
| **Contract** | ◐ Contract stage and statuses (sent, signed). | 🔌 No e-signature provider; signing is recorded by hand. |
| **Funding** | ✅ Gated checklist (`Biz.fundingReady`) and capital partner selection. ✅ *New:* each application funds exactly once (`Biz.fund` guard). | ✗ No bank account verification. ✗ No dual control above a set amount. 🔌 No funding instruction to a bank or processor; funding is recorded only. |
| **Servicing** | ✅ Payment ledger, statuses (Current, Late, Delinquent, Default, Paid Off, Renewed) from `Engine.deal`, manual payments (`Svc.pay`), payoff figures, transactions. | 🔌 No ACH debits or processor webhooks; the ledger is demo or manual. The customer portal shows balances from this ledger without saying so. 📋 Payoff discount policy. |
| **Collections** | ✅ Queues, editable collections steps, actions logged. | 📋 Hardship, recovery and charge-off policy. 🔌 Texts and emails are logged, not sent. |
| **Renewal** | ✅ Eligibility (`Engine.renewal`, editable settings), suggested amount, renewal application with an in-progress guard, payoff of the prior deal at funding. | 📋 Renewal rules need approval. |
| **Brokers / ISOs** | ✅ Broker portal scoped to the broker's own records in the browser. ✅ Commissions tracked as estimated, earned, approved and paid (`Comm`). ✅ *New:* resubmissions are caught, and channel conflicts are held for review. | 🗄 Scoping is enforced only in the browser. 📋 Commission payout schedule, clawback, and whether the approver may also record the payout. |
| **Capital** | ✅ Capital partners with committed and deployed amounts, used to choose who funds each deal. | ✗ **No third-party provider programs, submissions or matching.** This is POP's main planned advantage, and it exists only in the newer POP OS design snapshot. |
| **CRM and management** | ✅ Tasks, communications log, activity timeline, notifications, global search, saved views, CSV export, reports, dashboards with date filters, editable roles matrix, audit log. | ✗ The audit log keeps only the latest 3,000 entries (`Store.audit`), which isn't acceptable for financial records. 🗄 Everything lives in one browser. |

## Financial and security gaps (highest risk first)

1. **Everything runs in the browser.** Data, demo passwords and permissions live in localStorage, so anyone with the page can read every record. This needs Supabase with row-level security (🗄).
2. **No identity, KYB or sanctions checks** before funding. This needs a provider and a written policy (🔌📋).
3. **The audit log is truncated at 3,000 entries.** In production, audit has to be append-only and written by the database (🗄).
4. **No dual control on funding or payouts.** Thresholds and approver roles have to be set (📋).
5. **The merchant portal shows servicing figures as if they were live.** Until a processor feeds the ledger, they should be labelled.

**Fixed in this round:** random-suffix IDs that could collide; funding the same application twice; duplicate merchants created at intake.

## Workflows that are more complicated than they need to be

- **Two separate funding sources.** Capital partners fund POP Direct deals, while the newer design adds outside providers. They should be one "funding path" choice on the file, not two places.
- **Status changes in several places.** The pipeline drag, the application stage menu and bulk actions each move stages. Stage rules (what must be true to enter a stage) should live in one function, `Biz.move`, and all three should go through it.
- **Re-keying.** Broker submissions re-type data the broker already has. Document uploads with bank data would remove most of that typing.

## Opportunities for intelligent automation (deterministic first, AI second)

- **Automatic chasing:** request missing documents and send follow-ups when a file stalls.
- **Next best action:** suggest the next step per file. The newer POP OS design already does this.
- **Statement analysis:** parse bank statements into deposits, average daily balance, NSFs and negative days, with an underwriter confirming the figures.
- **Provider matching:** match files to provider programs using explicit criteria, and learn from the outcomes of past submissions.
- **AI as an assistant only:** summaries of files and calls, plus draft messages. Financial figures always come from the engine, and a human signs off.
