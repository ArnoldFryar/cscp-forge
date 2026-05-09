# CSCP Forge Question Bank Validation Report

Generated: May 9, 2026

## Scope

This audit validates the 800-question local CSCP Forge bank for app compatibility, structural quality, duplicates, formatting, and content-quality risk. It does not rewrite the bank in bulk. Clear mechanical formatting issues were fixed at the importer boundary and the generated app data was regenerated from the existing owner-provided CSV.

## Source Files

- Source CSV: `import-data/questions.csv`
- Import command: `npm run import:questions`
- Validation command: `npm run validate:questions`
- Import utility: `scripts/importQuestions.ts`
- Conversion library: `lib/importQuestions.ts`
- Generated app data: `data/generatedQuestions.ts`
- App runtime export: `data/questions.ts`

Content policy: this audit covers the local owner-provided CSCP-style bank. No Pocket Prep questions were scraped, copied, or recreated.

## App Compatibility Result

The bank is structurally safe for the current app flows:

- Practice quiz
- Final exam simulator
- Missed-question review
- Analytics calculations
- Export flows

`data/questions.ts` exports `generatedQuestions` when the generated bank is non-empty, so the active runtime bank is the 800-question generated bank, not the fallback mock bank.

## Summary Counts

| Check | Result |
| --- | ---: |
| Source CSV rows imported | 800 |
| Generated app questions loaded | 800 |
| Importer validation errors | 0 |
| Duplicate question IDs | 0 |
| Exact duplicate question text | 0 |
| Duplicate answer choice text within a question | 0 |
| Missing or invalid required fields | 0 |
| Missing answer choices | 0 |
| Correct answer not matching a choice | 0 |
| Missing wrong-answer notes | 0 |
| Mechanical formatting issues after fix | 0 |

## Questions By App Module

| Module | App module name | Questions |
| --- | --- | ---: |
| `m1` | Supply Chain Strategy | 100 |
| `m2` | Demand and Supply Planning | 100 |
| `m3` | Global Network Design | 100 |
| `m4` | Sourcing and Supplier Management | 100 |
| `m5` | Inventory and Operations | 100 |
| `m6` | Logistics and Fulfillment | 100 |
| `m7` | Risk, Resilience, and Compliance | 100 |
| `m8` | Technology and Continuous Improvement | 100 |

## Source CSV Module Titles

The CSV itself uses this module taxonomy:

| CSV module | Source title | Questions |
| --- | --- | ---: |
| `1` | Supply Chains, Demand Management, and Forecasting | 100 |
| `2` | Global Supply Chain Networks | 100 |
| `3` | Sourcing Products and Services | 100 |
| `4` | Internal Operations and Inventory | 100 |
| `5` | Forward and Reverse Logistics | 100 |
| `6` | Supply Chain Relationships | 100 |
| `7` | Supply Chain Risk | 100 |
| `8` | Optimization, Sustainability, and Technology | 100 |

Important finding: the importer currently canonicalizes `moduleName` from the app's `data/modules.ts` after normalizing `module` to `m1` through `m8`. That keeps the app compatible, but it can mask taxonomy drift between the CSV module titles and the app's custom module labels. Example: source CSV module `4` is `Internal Operations and Inventory`, while app module `m4` is `Sourcing and Supplier Management`.

## Questions By Difficulty

| Difficulty | Questions |
| --- | ---: |
| Easy | 160 |
| Medium | 320 |
| Hard | 320 |

Importer mapping used:

| CSV difficulty | App difficulty |
| --- | --- |
| `Foundation` | `easy` |
| `Applied` | `medium` |
| `Exam Trap` | `hard` |
| `Scenario` | `hard` |

## Questions By Question Type

| Question type | Questions |
| --- | ---: |
| `concept` | 160 |
| `process` | 160 |
| `risk` | 160 |
| `calculation` | 160 |
| `scenario` | 160 |

Importer mapping used:

| CSV type | App question type |
| --- | --- |
| `concept` | `concept` |
| `best_action` | `process` |
| `trap` | `risk` |
| `metric` | `calculation` |
| `scenario` | `scenario` |

## Required Field Validation

| Field | Missing or invalid rows |
| --- | ---: |
| `id` | 0 |
| `moduleId` | 0 |
| `moduleName` | 0 |
| `topic` | 0 |
| `difficulty` | 0 |
| `questionType` | 0 |
| `questionText` | 0 |
| Four answer choices | 0 |
| Correct answer | 0 |
| `explanation` | 0 |
| `whyWrong` coverage | 0 |
| `examTrap` | 0 |
| `studyTip` | 0 |

## Formatting Fixes Applied

Fixed clear mechanical formatting issues only:

- Answer choices imported from CSV phrases now have normalized sentence-start capitalization.
- `examTrap` text extracted from explanations now has normalized sentence-start capitalization.
- `studyTip` text extracted from explanations now has normalized sentence-start capitalization.
- `data/generatedQuestions.ts` was regenerated from the existing `import-data/questions.csv` after the importer fix.

No semantic answer rewrites were performed.

## Content-Quality Findings To Flag Separately

These are not app-breaking compatibility defects, so they were flagged instead of mass rewritten.

| Finding | Count | Risk |
| --- | ---: | --- |
| Near-duplicate question pairs | 606 | Many questions use the same stem with only the topic swapped. This can make practice feel repetitive and inflate perceived coverage. |
| Repeated stem templates | 5 templates x 160 questions each | The full 800-question bank is built from five recurring stem patterns. |
| Weak or generic explanations | 640 | Many explanations explain the answer pattern rather than the specific concept. |
| Vague/generic question wording | 480 | Several questions ask broad prompts such as "best next action" or "best reflects CSCP thinking" without enough scenario detail. |
| Difficulty/type mismatch candidates | 160 | All `metric` rows are mapped to `calculation`, but the audited items generally require interpretation, not numeric calculation. |
| Overly obvious distractor candidates | 1 | Question `53` includes an obviously irrelevant distractor pattern. |

## Repeated Stem Templates

| Template | Count | Sample IDs |
| --- | ---: | --- |
| "Which statement best describes `<topic>` in a CSCP context?" | 160 | `1`, `6`, `11`, `16`, `21` |
| "A supply chain leader is reviewing `<topic>`. What is the best next action?" | 160 | `2`, `7`, `12`, `17`, `22` |
| "Which choice is the most common trap when working with `<topic>`?" | 160 | `3`, `8`, `13`, `18`, `23` |
| "When using metrics or analysis related to `<topic>`, what is the safest interpretation?" | 160 | `4`, `9`, `14`, `19`, `24` |
| "A team is struggling with `<topic>`. What response best reflects CSCP thinking?" | 160 | `5`, `10`, `15`, `20`, `25` |

## Near-Duplicate Samples

Representative pairs from the validator:

| IDs | Similarity | Pattern |
| --- | ---: | --- |
| `12` / `17` | 0.86 | Same "best next action" stem with different demand topic. |
| `13` / `18` | 0.85 | Same "common trap" stem with different demand topic. |
| `14` / `19` | 0.87 | Same metrics interpretation stem with different demand topic. |
| `21` / `26` | 0.90 | Same concept-definition stem with forecasting variant topic. |
| `22` / `27` | 0.92 | Same process stem with forecasting variant topic. |

## Topic Distribution

Each app module has 20 topics with 5 questions each. This is balanced numerically and does not show excessive concentration within a module.

However, topic-to-app-module alignment should be reviewed before treating module performance as instructionally precise. Examples:

- `m1` includes demand management, demand shaping, forecasting, forecast bias, and aggregate planning topics while the app labels `m1` as Supply Chain Strategy.
- `m3` contains sourcing and supplier topics while the app labels `m3` as Global Network Design.
- `m4` contains inventory and operations topics while the app labels `m4` as Sourcing and Supplier Management.
- `m5` contains logistics topics while the app labels `m5` as Inventory and Operations.
- `m6` contains relationship-management topics while the app labels `m6` as Logistics and Fulfillment.

## Recommended Fixes

1. Keep the structural bank as usable now. It passes app compatibility checks and will not break Practice, Final Exam, Missed Questions, Analytics, or Export flows.
2. Treat taxonomy alignment as the highest-priority content/data fix. Decide whether the app module labels should follow the CSV source taxonomy or whether the CSV rows should be remapped into the app's custom module taxonomy.
3. Reclassify the 160 `metric` rows from `calculation` to a more accurate app type, likely `concept`, `process`, or a new `metric` type. Do this carefully because `QuestionType` is currently a strict union.
4. Rewrite explanations in batches by topic, starting with high-use modules. Prioritize the 640 generic explanations that describe answer style rather than the underlying CSCP concept.
5. Reduce repeated templates gradually. Keep the existing IDs stable where possible so missed-question and progress history do not become disconnected later.
6. Add more scenario specificity to the 480 broad prompts before relying on these questions for final-exam readiness scoring.
7. Review question `53` for distractor quality.

## Bottom Line

The 800-question bank is technically safe for the app. The main risk is instructional quality, not runtime compatibility: the bank is highly templated, has many generic explanations, and uses a source module taxonomy that does not perfectly match the app's current eight-module naming model.
