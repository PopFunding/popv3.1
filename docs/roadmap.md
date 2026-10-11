# POP OS roadmap

Items are ranked on commercial value, operational efficiency, scalability, risk reduction, data availability, cost, and dependencies and testability. Each tier can start without the next one.

## Done
| Item | Where |
| --- | --- |
| Broker commissions in four states: estimated, earned, approved, paid | `Comm`, Relationships → Commissions, broker portal |
| Record integrity: sequential IDs, funding exactly once, duplicate and channel-conflict checks at intake | `Ids`, `Dup`, `Biz.fund`; `tests/integrity.test.js` |
| Merchant-portal servicing figures labelled as unverified until a payment processor connects (was A4) | `fundingCard`; `tests/portal.test.js` |
| Pricing versions on offers and deals, plus standard decline reason codes (was A5 and A6, without offer expiry) | `PV`, `DECLINE_REASONS`; `tests/pricing.test.js` |
| Provider programs with explainable funding-path matching, stale-criteria flags, and submission tracking with outcomes and response time (was A1 and A2). Demo providers are labelled; real criteria still needed (D1) | `Prov`, Relationships → Providers, file → Funding paths; `tests/providers.test.js` |
| Provider insights: declines of files that met stated criteria (re-confirm signal), approvals outside criteria, top decline reasons, and the rules blocking the most open files | `Prov.insights`, Providers page; `tests/insights.test.js` |
| Review fixes: funding and offer acceptance require underwriting approval; nothing proceeds under duplicate review; declined files reopen only for review; internal decline notes hidden from brokers; pre-tracking commissions confirmed one by one, defaulted ones on hold | `uwOk`, `Biz.fundBlock`, `Comm.legacy`; `tests/review-fixes.test.js` |
| Next best actions: one deterministic next step per open file (duplicate review, funding checklist, provider chase, offers, underwriting, documents, stalled files), most urgent first, scoped by role, with day thresholds in Settings | `Next`, dashboard panel and Overview → Next best actions; `tests/next.test.js` |
| One stage-rule table: every path that moves a file (wizard, underwriting, offers, funding, pipeline drag, stage menu, bulk) goes through `Biz.canMove` (was A3) | `STAGE_RULES`; `tests/stages.test.js` |

## A. Local now (no Supabase needed)
1. **Provider-funded deals.** Record when a provider funds a file (amount, date, POP's commission or fee) and link it to the submission, without POP holding a payment ledger for it.
2. **Submission package.** Build each provider's package (application, statements, ID) from the verified documents, with a checklist per program.
3. **Offer expiry.** This needs POP's validity period, a policy decision.

## B. Needs live Supabase
1. Accounts, sessions, and two-step sign-in with Supabase Auth (authenticator codes); invites from the server.
2. Database with row-level security per role, broker and merchant. This replaces browser-only scoping.
3. Append-only audit log written by database triggers. This replaces the 3,000-entry cap.
4. Private document storage with signed, expiring links.
5. Shared live data (Realtime) and a status page fed by real health checks.

## C. Needs third-party integrations
1. Payment processor (ACH debits and webhooks into the ledger), plus bank account verification.
2. Bank data (for example Plaid) to fill in revenue, average daily balance, NSFs and negative days.
3. E-signature (webhook marks the contract signed).
4. Email and texting, with STOP handling.
5. KYC/KYB and sanctions screening.

## D. Needs founder, underwriting, capital or legal decisions
1. **Verified provider program criteria,** and who confirms them, and how often.
2. **Commission policy:** payout schedule, clawback (commissions on deals in default are on hold until it's set), separation of approver and payer, and confirming each commission recorded before tracking began.
3. **Credit authority:** delegated approval limits, second-review thresholds, and dual control on funding.
4. **One open file per merchant**, or exceptions (currently an editor can override with a reason).
5. **Disclosures** (state commercial-finance laws), adverse-action practice, collections and hardship policy.
6. **Calibrating the risk engine** against real outcomes before relying on it.

## Next three recommendations
1. **Replace the demo providers with POP's real programs and their verified criteria (D1).** Matching and submission tracking are built; they only become useful with real criteria.
2. **Stand up Supabase (B1–B3) before any real merchant data enters the system.** The current browser storage is fine for demos and unsafe for real records.
3. **Decide commission policy and credit authority (D2, D3).** Both are already modelled in the code; the open decisions are the only thing keeping them from being complete.
