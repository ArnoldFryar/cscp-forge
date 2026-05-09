# CSCP Forge Question Bank Validation Report

Generated: May 9, 2026

## Source

- Source file: `import-data/questions.csv`
- Import utility: `scripts/importQuestions.ts`
- Conversion library: `lib/importQuestions.ts`
- Generated app data: `data/generatedQuestions.ts`
- Content policy: Original CSCP-style question bank provided by the project owner. No Pocket Prep questions were scraped, copied, or recreated.

## CSV Column Validation

The source CSV was accepted through the importer alias map and converted into the app's `Question` interface.

| CSV column | App field |
| --- | --- |
| `id` | `id` |
| `module` | `moduleId` |
| `module_title` | `moduleName` |
| `topic` | `topic` |
| `type` | `questionType` |
| `difficulty` | `difficulty` |
| `question` | `questionText` |
| `A`, `B`, `C`, `D` | `choices` |
| `answer` / `answer_text` | `correctChoiceId` |
| `explanation` | `explanation`, with derived `examTrap` and `studyTip` when explicit columns are not present |

## Totals

| Check | Result |
| --- | ---: |
| Total questions loaded | 800 |
| Importer validation errors | 0 |
| Duplicate question ids | 0 |
| Invalid answer keys | 0 |
| Missing explanations | 0 |
| Missing exam traps | 0 |
| Missing study tips | 0 |
| Missing wrong-answer notes | 0 |

## Questions By Module

| Module | Name | Questions |
| --- | --- | ---: |
| `m1` | Supply Chain Strategy | 100 |
| `m2` | Demand and Supply Planning | 100 |
| `m3` | Global Network Design | 100 |
| `m4` | Sourcing and Supplier Management | 100 |
| `m5` | Inventory and Operations | 100 |
| `m6` | Logistics and Fulfillment | 100 |
| `m7` | Risk, Resilience, and Compliance | 100 |
| `m8` | Technology and Continuous Improvement | 100 |

## Questions By Difficulty

| Difficulty | Questions |
| --- | ---: |
| Easy | 160 |
| Medium | 320 |
| Hard | 320 |

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
| Four choices | 0 |
| Correct answer | 0 |
| `explanation` | 0 |
| Wrong-answer notes | 0 |
| `examTrap` | 0 |
| `studyTip` | 0 |

## App Usage Confirmation

`data/questions.ts` exports the generated 800-question bank when `generatedQuestions.length > 0`. It falls back to the local mock bank only if the generated bank is empty.
