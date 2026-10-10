# POP OS architecture notes

Working documents for building POP OS into POP Funding's operating system. They are written for the founder, the build team and future Claude sessions.

| Document | What it answers |
| --- | --- |
| [OnDeck reference model](ondeck-reference-model.md) | How an established business lender runs the lifecycle, and what is verified, inferred or unknown |
| [Gap analysis](gap-analysis.md) | What POP OS (this repo's `index.html`) actually does today, stage by stage |
| [POP operating model](pop-operating-model.md) | POP's own target workflow, built around multi-provider capital |
| [Roadmap](roadmap.md) | What to build next, staged by what each item depends on |

## Ground rules

- **Code is the record.** A feature is listed as existing only if it exists in `index.html`. Mockups and snapshots don't count.
- **Facts carry a source.** OnDeck material is labelled **Documented** (with source), **Inference** or **Unknown**. Nothing inferred is presented as OnDeck policy.
- **Financial rules come from POP.** No outside lender's underwriting parameters or pricing are used. Pricing, limits and criteria in POP OS are POP's editable settings or verified provider rules.
- **Money never moves from the browser.** Payments, payouts and funding are recorded. Integrations that move money go through a server with audited, idempotent calls.

## Tests

```
node tests/integrity.test.js
```

The suite runs the real app in headless Chromium with fictional demo data. It needs Playwright, and you can set `PLAYWRIGHT_MODULE` if Playwright isn't installed locally.
