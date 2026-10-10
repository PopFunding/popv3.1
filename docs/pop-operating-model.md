# POP operating model

This is POP's own lifecycle. It isn't a copy of any lender's. One principle drives the design: **one authoritative file per business, with many possible funding paths.** A file is underwritten once, then matched to POP Direct (POP's own capital) or to outside provider programs, using explicit rules and real outcomes.

Every stage below covers what the user sees, what the system calculates, what is automated, what a person must review, what is recorded, what moves the file on, how exceptions are handled, and what is measured. 🗄 marks steps that need Supabase. 🔌 marks steps that need an integration.

## 1. Intake (lead, broker submission or web application)
- **Sees:** one intake form, wherever the business came from, with a duplicate warning before anything is created.
- **System:** checks for duplicates on EIN, phone, email and name + state (**built**). It assigns an owner and channel, and records consent.
- **Automated:** routing by channel and territory; instant acknowledgement to the broker or merchant.
- **Human:** resolving duplicates and channel conflicts (**built**: held for review, with a reason required).
- **Recorded:** merchant, file, channel and broker, consent with timestamp, and duplicate review decisions.
- **Next:** the required intake fields are complete.
- **Exceptions:** a duplicate goes to review; missing consent blocks pulling any data.
- **Metrics:** intake to complete file, duplicate rate by channel, and conflict resolution time.

## 2. Document and data collection
- **Sees:** a checklist of what is still missing, plus a single upload link for the merchant or broker.
- **System:** requests from templates; 🔌 bank data, when connected, fills in revenue, average daily balance, NSFs and negative days.
- **Automated:** reminders when items are outstanding (day 1, 3 and 5).
- **Human:** verifying each document, and rejecting it with a reason.
- **Recorded:** 🗄 each file, who uploaded it, and its verification status and by whom.
- **Next:** all required items are verified.
- **Exceptions:** a stale statement (older than set days) is re-requested automatically.
- **Metrics:** time to a complete file, and chase count per file.

## 3. Underwriting (once per file)
- **Sees:** the risk score with each factor, flags, payment capacity and existing positions.
- **System:** POP's deterministic engine (`Engine.risk`, `maxDaily`, `maxApproval`), with the settings version stored on the decision.
- **Automated:** auto-decline outside POP's hard limits; flags for stacking and NSFs.
- **Human:** the underwriter decides within delegated authority (📋 limits to set); a second approver above the threshold.
- **Recorded:** the inputs used, score, settings version, decision, reason code and approver.
- **Next:** approved, or conditionally approved.
- **Exceptions:** a decline records a standard reason code (and an adverse-action notice where it applies, 📋).
- **Metrics:** decision time, approvals by score band, and early default by band.

## 4. Funding path match (POP's advantage)
- **Sees:** ranked funding paths, for example "POP Direct · within POP rules", "Provider A · Program 2 · meets 7 of 7 criteria", and "Provider B · fails minimum time in business".
- **System:** checks verified program criteria and POP's own rules, and explains every pass or fail. It flags criteria that haven't been re-confirmed within a set number of days.
- **Automated:** builds the submission package; ranking draws on past approval rate, speed and funded share per program.
- **Human:** chooses the path or paths; confirms provider criteria periodically.
- **Recorded:** the match results with the version of the criteria used; each submission with its outcome (approved, declined with reason, or no response).
- **Next:** a path is chosen, and either the submission goes out or POP Direct is picked.
- **Exceptions:** no path matches, so the system explains which criteria fail most often and suggests what could change (amount, term).
- **Metrics:** matches per file, approval rate by program, response time, and share of submissions funded.

## 5. Offers
- **Sees:** POP Direct offers from the engine, and provider offers entered or received, side by side and labelled by source.
- **System:** payment, payback, fee, commission and estimated APR. 📋🔌 State disclosures come from a reviewed disclosure module.
- **Automated:** offer expiry; a reminder to the merchant.
- **Human:** pricing exceptions need approval.
- **Recorded:** each offer with its source, pricing version and expiry; acceptance with a timestamp.
- **Next:** the merchant accepts.
- **Metrics:** time to offer, acceptance rate, and offers per file.

## 6. Contract and funding
- **Sees:** the contract generated from the accepted offer, and the funding checklist.
- **System:** a gate (checklist complete and a capital source chosen) and idempotent funding (**built**).
- **Automated:** 🔌 an e-signature webhook marks the contract signed; 🔌 bank account verification.
- **Human:** funding approval, with dual control above the threshold (📋).
- **Recorded:** the signed contract, verification results, funding instruction and reference, and approvers.
- **Next:** funds are confirmed (🔌 bank or processor confirmation in production).
- **Exceptions:** a failed verification blocks funding with a reason; a duplicate instruction is refused (**built**).
- **Metrics:** time from signature to funds, and funding exceptions.

## 7. Servicing, collections and renewal
- **POP Direct:** the payment ledger is the source of truth (🔌 processor webhooks write the payments). Statuses come from the ledger, and collections queues follow POP's editable steps.
- **Provider-funded:** POP records the terms and outcome; balances come only from provider reports. The portals show "serviced by the provider" rather than estimated balances.
- **Renewal:** eligibility comes from the ledger and POP's rules; the renewal file re-enters at stage 3, with history attached.
- **Recorded:** every payment, return and status change, and every renewal offer.
- **Metrics:** on-time rate, cure rate, renewal rate, and repeat share of volume.

## 8. Broker and merchant experience
- **Brokers:** submission status in plain language; commissions as **estimated, earned, approved and paid** (**built**); document requests; no visibility into other channels' records.
- **Merchants:** application tracker, offers, documents, and servicing figures only from verified data, with payments only through authorized payment infrastructure.

## Controlled AI

| AI may | AI may not |
| --- | --- |
| Summarize a file or call | Set prices, limits or decisions |
| Draft messages for a person to send | Send money or sign anything |
| Extract figures from statements, with a person confirming them | Override deterministic rules |
| Suggest a next action | Act without a logged human approval where policy requires one |
