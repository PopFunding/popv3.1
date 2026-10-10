# OnDeck operational reference model

**Status: research blocked. No OnDeck facts are verified yet.**

On 2026-10-10 the build environment couldn't fetch ondeck.com or sec.gov. The page-fetch tool had no DNS, and the network proxy refused SEC. Web search only returned summaries, which don't count as sources. So this document holds:

1. **A lifecycle reference model** built from general knowledge of business lending, labelled **Inference** throughout. It describes how this kind of lender typically has to work, not how OnDeck does.
2. **Primary sources to verify**, found by search but not yet read.
3. **Questions to answer** once the sources can be read.

Nothing here should be used as an OnDeck underwriting parameter, price, limit or approval rule. Eligibility thresholds that appeared in search summaries are deliberately left out until the live page is read.

## Primary sources to read (not yet fetched)

- On Deck Capital S-1 (2014): <https://www.sec.gov/Archives/edgar/data/1420811/000119312514405349/d772825ds1.htm>
- On Deck Capital 10-K, fiscal 2019: <https://www.sec.gov/Archives/edgar/data/1420811/000142081120000035/ondk-20191231x10kfinal.htm>
- On Deck Capital filing index, CIK 1420811, for the 10-Ks from fiscal 2015 to 2018 and earnings releases
- Enova International 10-K filings after 2020, which cover OnDeck as part of Enova's small-business lending:
  - Fiscal 2020: <https://www.sec.gov/Archives/edgar/data/1529864/000156459021009434/enva-10k_20201231.htm>
  - Fiscal 2023: <https://www.sec.gov/Archives/edgar/data/1529864/000095017024019385/enva-20231231.htm>
- Public product and eligibility pages: <https://www.ondeck.com/loan-qualifying/>, `/term-loan` and `/line-of-credit`

To unblock this, add `www.ondeck.com`, `ondeck.com`, `www.sec.gov` and `efts.sec.gov` to the environment's allowed domains. Then re-run the research and replace the questions below with sourced findings.

## Lifecycle reference model (Inference, general business lending)

Each stage lists objective, roles, inputs, steps, decision points, records, controls, interactions, automation and success metrics. What OnDeck itself does at each stage is listed under "Verify for OnDeck".

### 1. Lead
- **Objective:** find businesses that need capital and are likely to qualify.
- **Roles:** marketing, sales or funding specialists, brokers/ISOs, referral partners.
- **Inputs:** business name, contact, stated revenue, time in business, requested amount, source.
- **Steps:** capture, de-duplicate, assign, contact, qualify.
- **Decisions:** qualified or not; who owns the relationship (channel attribution).
- **Records:** lead, source and partner, consent to contact.
- **Controls:** consent to contact (calls and texts); one owner per relationship.
- **Interactions:** call, email, text, broker submission.
- **Automation:** routing, scoring, follow-up reminders, de-duplication.
- **Metrics:** contact rate, qualification rate, cost per funded deal by channel.
- **Verify for OnDeck:** channel mix (direct, partners, brokers), and how broker-sourced deals are attributed.

### 2. Application
- **Objective:** a complete, authorized application.
- **Roles:** applicant, specialist, broker.
- **Inputs:** business and owner identity, entity details, revenue, bank details, authorization to pull credit and bank data.
- **Steps:** collect, validate, sign authorization.
- **Decisions:** complete enough to underwrite.
- **Records:** application, authorization with timestamp, version of the terms shown.
- **Controls:** identity data protection; signed consent before pulling data.
- **Automation:** pre-fill, field validation, save-and-resume.
- **Metrics:** start-to-submit conversion, time to complete.
- **Verify for OnDeck:** what the online application asks for, and the published eligibility minimums (read from the live page only).

### 3. Data collection
- **Objective:** verified financial data.
- **Inputs:** bank statements or linked bank data, ID, voided check, sometimes tax returns or processing statements.
- **Steps:** request, receive, verify, flag gaps.
- **Controls:** document authenticity checks, retention rules, access limited by role.
- **Automation:** bank-data connections, statement parsing, auto-requests for missing items.
- **Metrics:** time from submit to complete file, share of files needing manual chasing.
- **Verify for OnDeck:** which data sources it says it uses (bank data, credit bureaus, public records).

### 4. Underwriting
- **Objective:** a risk view and affordable payment capacity.
- **Roles:** underwriter, credit policy owner.
- **Steps:** cash-flow analysis, existing-debt (stacking) review, fraud and identity checks, scoring, exceptions.
- **Decisions:** approve, decline or counter, within delegated authority.
- **Records:** inputs used, score and version, decision, reasons, approver.
- **Controls:** delegated approval limits, second review above thresholds, model governance, reasons for any adverse action.
- **Automation:** scoring, rule checks, auto-decline outside policy; humans handle exceptions.
- **Metrics:** decision time, approval rate, early-default rate by score band.
- **Verify for OnDeck:** what is published about its proprietary score and any human review. Its parameters are not public and must not be inferred.

### 5. Decision and offer
- **Objective:** clear, compliant offers.
- **Steps:** price within policy, build offer options, disclose cost.
- **Controls:** required state cost disclosures for commercial finance; offer expiry; the pricing version recorded with each offer.
- **Metrics:** offer acceptance rate, time to offer.
- **Verify for OnDeck:** how it presents cost (published disclosure practices), its products, terms and payment frequencies.

### 6. Acceptance and contract
- **Objective:** a signed agreement that matches the accepted offer.
- **Controls:** the agreement is generated from the accepted offer, e-signature evidence is kept, nothing can be edited after signing.
- **Metrics:** time from acceptance to signature.

### 7. Funding
- **Objective:** money to the verified business account, exactly once.
- **Steps:** verification checklist, bank account verification, KYC/KYB and sanctions screening, funding instruction, confirmation.
- **Controls:** dual control above set amounts, idempotent instructions, reconciliation to bank records.
- **Metrics:** time from signature to funds, funding exceptions.
- **Verify for OnDeck:** its published funding-speed claims.

### 8. Servicing
- **Objective:** accurate payments and balances.
- **Steps:** scheduled debits, returns handling, payoff quotes, customer service.
- **Controls:** the ledger is the source of truth; payment authorization rules; no live balance without reconciled data.
- **Metrics:** on-time rate, returns, roll rates.
- **Verify for OnDeck:** payment frequencies, self-service features, and how delinquency is described in filings.

### 9. Collections
- **Objective:** cure delinquency fairly and lawfully.
- **Controls:** contact rules, hardship options, recovery and charge-off policy.
- **Metrics:** cure rate, loss rate.

### 10. Renewal
- **Objective:** keep good customers.
- **Steps:** eligibility (paid-down share, payment history), offer, payoff of the prior balance.
- **Controls:** renewal amounts within policy; no stacking against itself.
- **Metrics:** renewal rate, share of volume from repeat customers.
- **Verify for OnDeck:** renewal and prepayment policies and repeat-customer share (from filings).

## Questions to answer from sources

1. Channel mix and how broker/ISO partners are managed and paid.
2. Published eligibility, products, terms, payment frequencies and fees (from the live site).
3. Published claims about decision and funding speed.
4. What the filings say about the scoring approach and the data used, in their own words, without inferring parameters.
5. Servicing, collections and renewal practices described in filings.
6. Reported metrics by year: originations, customers, repeat share, losses.
7. Technology platform and funding structure, at a high level (licensing of its lending platform, credit facilities).
