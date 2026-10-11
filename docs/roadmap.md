# POP OS roadmap

Items are ranked on commercial value, operational efficiency, scalability, risk reduction, data availability, cost, and dependencies and testability. Each tier can start without the next one.

## Done
| Item | Where |
| --- | --- |
| Broker commissions in four states: estimated, earned, approved, paid | `Comm`, Relationships → Commissions, broker portal |
| Record integrity: sequential IDs, funding exactly once, duplicate and channel-conflict checks at intake | `Ids`, `Dup`, `Biz.fund`; `tests/integrity.test.js` |
| Merchant-portal servicing figures labelled as unverified until a payment processor connects (was A4) | `fundingCard`; `tests/portal.test.js` |
| Pricing versions on offers and deals, plus standard decline reason codes (was A5 and A6, without offer expiry) | `PV`, `DECLINE_REASONS`; `tests/pricing.test.js` |

## A. Local now (no Supabase needed)
1. **Provider programs and funding-path matching.** A program registry with explicit criteria, an explanation of each pass or fail on every file, and a flag on criteria not re-confirmed within a set number of days. This is the highest commercial value: it's POP's advantage B. It needs real provider criteria (see D1) before it means anything; demo programs must be labelled as demo.
2. **Submission tracking per provider.** Record sent, approved, declined (with reason) and response time. This builds the relationship knowledge (advantage C) and later feeds the matching ranking.
3. **One stage-rule function.** Put the rules for entering each stage in `Biz.move`, and route the pipeline drag, stage menu and bulk actions through it. This means fewer paths and fewer errors.
4. **Offer expiry.** This needs POP's validity period, a policy decision.

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
2. **Commission policy:** payout schedule, clawback, and separation of approver and payer.
3. **Credit authority:** delegated approval limits, second-review thresholds, and dual control on funding.
4. **One open file per merchant**, or exceptions (currently an editor can override with a reason).
5. **Disclosures** (state commercial-finance laws), adverse-action practice, collections and hardship policy.
6. **Calibrating the risk engine** against real outcomes before relying on it.

## Next three recommendations
1. **Get verified criteria for POP's first two or three provider programs (D1), then build A1 and A2 on them.** That turns POP's main advantage from a design into a working tool, and it can be tested locally.
2. **Stand up Supabase (B1–B3) before any real merchant data enters the system.** The current browser storage is fine for demos and unsafe for real records.
3. **Decide commission policy and credit authority (D2, D3).** Both are already modelled in the code; the open decisions are the only thing keeping them from being complete.
