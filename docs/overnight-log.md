# Overnight log: 2026-10-10 to 2026-10-11

Everything below is committed locally on `claude/artifact-review-272h80`. Nothing is pushed or deployed. All data used is the app's fictional demo data.

**Tests:** `node tests/run-all.js` gives 141/141 checks across 9 suites. The demo data (111 applications, 62 deals, 56 merchants, and every offer, balance and risk score) is identical to before these changes.

## What changed

| Area | What you'll see | Where |
| --- | --- | --- |
| Commissions | Relationships → Commissions. Each commission is Estimated, Before tracking, Earned, Approved or Paid. Approve, then record the payout with a date and reference. The broker portal shows the same states. | `Comm` |
| Record integrity | Unique sequential IDs. An application funds exactly once. Duplicate-business warnings at lead conversion, new applications and broker submissions; channel conflicts are held for review. | `Ids`, `Dup` |
| Merchant portal | Balances and renewal are marked "not yet confirmed by a payment processor", and the button reads "Request a payment". | `fundingCard` |
| Pricing and declines | Offers and deals record the pricing version they were priced on. Declines use standard codes, and internal notes stay internal. | `PV`, `DECLINE_REASONS` |
| Stage rules | One rule table for every way a file changes stage. Funding requires underwriting approval. | `STAGE_RULES`, `Biz.canMove` |
| Capital providers | Relationships → Providers, and Funding paths on each file: every program's criteria shown as pass or fail with the file's numbers, flags on stale criteria, submissions with outcomes, and insights such as "declined files that met its criteria". | `Prov` |
| Next best actions | A dashboard panel, plus Overview → Next best actions: one next step per open file, most urgent first. | `Next` |

## Found by review and fixed

An independent review of the night's changes found that a file could be funded without underwriting approval, or while under duplicate review. It also found that internal decline notes showed to brokers, and that old deals counted as commission owed. All were fixed, with regression tests (`tests/review-fixes.test.js`).

## Defaults I chose, all editable (please confirm or change)

- **Next best actions timing** (Settings → Follow-up timing): 3 days in underwriting, 3 days for unanswered offers, 3 days for provider response, 14 days with no movement.
- **Provider criteria "stale" window:** 90 days. This matches the newer POP OS design.
- **Overrides:** a written reason (at least 5 characters) for each override, such as a second open file, a submission outside a provider's criteria, or keeping a possible duplicate.

## Your decisions needed

1. **Real provider programs.** The three providers are demo, with made-up criteria. Matching only becomes useful with your real programs and their verified criteria.
2. **Commission policy:**
   - Payout schedule.
   - Clawback (commissions on deals in default are on hold until this is set).
   - Whether the person who approves a commission may also record the payout.
   - Confirming each commission recorded before tracking began.
3. **Credit authority:** approval limits, second review, and dual control on funding.
4. **Offer validity period** (needed for offer expiry).
5. **OnDeck research:** allow `www.ondeck.com`, `ondeck.com`, `www.sec.gov` and `efts.sec.gov` in the environment's network settings so the reference model can be sourced.

## Not done, and why

- **Provider-funded deals** (POP placed the file and the provider funded it). Adding these to the deal list would mix them into POP's own servicing numbers. They need their own record type, designed with you.
- **Anything needing Supabase or integrations:** accounts, server-side permissions, stored documents, payments, e-signature, bank data.
