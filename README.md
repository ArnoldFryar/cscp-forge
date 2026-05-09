# CSCP Forge

Clean MVP for APICS CSCP exam practice built with Next.js, React, TypeScript, and Tailwind CSS.

The app uses mock local data only. It does not include Supabase, authentication, payments, or AI API calls.

## Scripts

- `npm install`
- `npm run dev`
- `npm run build`

## MVP Pages

- Dashboard home
- Modules overview with 8 CSCP module cards
- Practice Quiz with module and difficulty selection
- Missed questions review
- Study Plan weekly layout
- Analytics snapshot

## Data Model

Local TypeScript interfaces are defined for `CSCPModule`, `Question`, `AnswerChoice`, `QuizSession`, `QuizResult`, `MissedQuestion`, `StudyPlanItem`, and `TopicPerformance`. Mock data is split across `data/modules.ts`, `data/questions.ts`, `data/studyPlan.ts`, and `data/mockProgress.ts`.

The local question bank currently includes 80 original CSCP-style practice questions, with 10 questions per module. The schema is designed so a future 800-question CSV or JSON import can map into stable module IDs, choice IDs, explanations, wrong-answer rationales, exam traps, and study tips.