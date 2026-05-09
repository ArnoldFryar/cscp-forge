# CSCP Forge Supabase Migration Plan

## Scope

This is a planning document only. Do not implement Supabase in the app yet, and do not change the current local-first runtime. The existing Next.js app should continue to use local TypeScript data and `localStorage` until a migration phase explicitly replaces a path.

## Current Local Data Model Review

CSCP Forge is currently local-first. The browser owns all user progress, while the question bank and module metadata are bundled in the app.

### LocalStorage Keys

| Key | Source | Shape | Notes |
|---|---|---|---|
| `cscp-forge-progress` | `lib/progressStore.ts` | `ProgressSnapshot` | Stores quiz history, aggregate answered/correct/missed counts, readiness score, module stats, topic stats, missed-by-difficulty, study date history, and streak data. |
| `cscp-forge-missed-questions` | `lib/missedQuestionStore.ts` | `MissedQuestion[]` | Stores one row per missed question, keyed by `questionId`, with missed count, status, last missed date, and last selected wrong answer. |
| `cscp-forge-quiz-launch-intent` | `lib/missedQuestionStore.ts` | `QuizLaunchIntent` | Ephemeral client routing helper for launching weak-area or module-specific quiz flows. This should stay client-only and not be synced. |
| `cscp-forge-active-recall` | `lib/activeRecallStore.ts` | `Record<promptId, ActiveRecallProgress>` | Stores confidence rating, review flag, and updated timestamp per generated active recall prompt. |
| `cscp-forge-study-plan-settings` | `lib/studyPlanGenerator.ts` | `StudyPlanSettings` | Stores exam date, study days per week, minutes per session, confidence level, and preferred study style. Generated weekly plans are derived, not persisted. |
| `cscp-forge-final-exam-attempts` | `lib/finalExamStore.ts` | `FinalExamAttempt[]` | Stores final exam attempts, question results, module/topic/difficulty breakdowns, elapsed time, and missed question ids. Current retention is last 20 attempts. |

### Local Progress Shape

`ProgressSnapshot` is a denormalized client snapshot. Supabase should not copy it as the primary data model. Instead, Supabase should store normalized facts and allow derived views/functions to rebuild progress.

Important current fields:

- Quiz history: `QuizResult[]`
- User-level totals: questions answered, correct, missed, quiz attempts, average accuracy, last quiz score
- Study consistency: `studyStreak`, `lastStudyDate`, `studyDateHistory[]`, `totalStudySessions`
- Module aggregates: questions answered, correct, missed, accuracy, weakest topic
- Topic aggregates: attempted, correct, accuracy, trend
- Missed-by-difficulty aggregates
- Readiness score: derived by `lib/readinessEngine.ts`, not canonical source data

Migration principle: store raw attempts, answers, missed-question state, recall ratings, study plan settings, study sessions, and final exam attempts. Recompute aggregates from those records.

## Current Question Bank Model Review

The question bank is currently local TypeScript data.

### Module Model

`data/modules.ts` exports 8 CSCP modules with:

- `id`: local id such as `m1`
- `number`: 1-8
- `name`
- `domain`
- `description`
- `examWeight`
- `progress`, `accuracy`, `completedQuestions`: seed/demo fields, not canonical after real user sync
- `totalQuestions`
- `priority`

### Question Model

`data/types.ts` defines each question with:

- `id`: generated bank currently uses string ids `"1"` through `"800"`; old mock fallback uses ids like `q001`
- `moduleId`
- `moduleName`
- `topic`
- `difficulty`: `easy | medium | hard`
- `questionType`: `concept | scenario | calculation | definition | process | risk | strategy`
- `questionText`
- `choices`: 4 answer choices, each with id and text
- `correctChoiceId`
- `explanation`
- `whyWrong`: map of wrong choice id to explanation
- `examTrap`
- `studyTip`

### Import Model

The app imports the owner-provided CSV from `import-data/questions.csv` into `data/generatedQuestions.ts`. `data/questions.ts` exports `generatedQuestions` when present and falls back to the mock bank only if the generated bank is empty.

Migration principle: keep the original local question ids as stable external ids during the transition. Introduce UUID primary keys in Supabase, but preserve `external_id` for deterministic import, localStorage migration, and de-duplication.

## Recommended Postgres Types

Create enum types before table creation:

```sql
create type difficulty_level as enum ('easy', 'medium', 'hard');
create type question_type as enum ('concept', 'scenario', 'calculation', 'definition', 'process', 'risk', 'strategy');
create type quiz_mode as enum ('study', 'exam', 'weak-area');
create type missed_question_status as enum ('new', 'reviewed', 'retrying', 'mastered');
create type study_confidence_level as enum ('low', 'moderate', 'high');
create type study_style as enum ('reading', 'quiz-heavy', 'balanced', 'weak-area-focused');
create type final_exam_timing_mode as enum ('timed', 'untimed');
create type study_session_type as enum ('quiz', 'missed-review', 'active-recall', 'study-notes', 'final-exam', 'planner', 'mixed');
```

## Table Design

### 1. `auth.users`

Supabase Auth owns this table. Do not create or directly mutate it from migrations except through Supabase-managed auth flows.

Relevant columns:

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | Primary auth user id. Referenced by app tables. |
| `email` | `text` | Managed by Supabase Auth. |
| `created_at` | `timestamptz` | Managed by Supabase Auth. |
| `last_sign_in_at` | `timestamptz` | Managed by Supabase Auth. |

Relationships:

- `auth.users.id` -> `profiles.user_id`
- `auth.users.id` -> all user-owned progress tables

RLS notes:

- Supabase manages access. App policies should reference `auth.uid()` from user-owned public tables.

### 2. `profiles`

Stores app-facing user profile and migration metadata.

| Column | Type | Notes |
|---|---|---|
| `user_id` | `uuid primary key references auth.users(id) on delete cascade` | One profile per auth user. |
| `display_name` | `text null` | Optional user-facing name. |
| `target_exam_date` | `date null` | Can mirror study plan settings for quick access. |
| `timezone` | `text not null default 'UTC'` | Used for study streak/date calculations. |
| `local_migration_completed_at` | `timestamptz null` | Set after importing existing localStorage data. |
| `created_at` | `timestamptz not null default now()` | Audit. |
| `updated_at` | `timestamptz not null default now()` | Audit. |

Relationships:

- Parent: `auth.users`
- Children: all user-owned study records.

Indexes:

- Primary key on `user_id`
- Optional `profiles_target_exam_date_idx` on `target_exam_date`

RLS notes:

- Select/insert/update own row only: `auth.uid() = user_id`
- Delete usually disallowed from client; account deletion should cascade through admin/server flow.

### 3. `modules`

Canonical CSCP module catalog.

| Column | Type | Notes |
|---|---|---|
| `id` | `text primary key` | Preserve current ids `m1` through `m8`. |
| `number` | `int2 not null unique` | 1 through 8. |
| `name` | `text not null` | Module name. |
| `domain` | `text not null` | Current module domain. |
| `description` | `text not null` | Current module description. |
| `exam_weight_percent` | `numeric(5,2) null` | Convert `"12%"` into numeric `12.00`. |
| `priority` | `text null` | Seed priority if still useful; not user-specific. |
| `created_at` | `timestamptz not null default now()` | Audit. |
| `updated_at` | `timestamptz not null default now()` | Audit. |

Relationships:

- Parent for `questions.module_id`, study plans, module rollups.

Indexes:

- `modules_number_idx` on `number`

RLS notes:

- Public read for authenticated and anonymous users if the app remains usable without auth.
- Writes only through service role/admin migrations.

### 4. `questions`

Canonical question bank table. Phase 1 does not need this table populated, but define it before Phase 2.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid primary key default gen_random_uuid()` | Internal stable DB id. |
| `external_id` | `text not null unique` | Current local id such as `"1"`; required for migration mapping. |
| `module_id` | `text not null references modules(id)` | `m1` through `m8`. |
| `topic` | `text not null` | Topic label. |
| `difficulty` | `difficulty_level not null` | Easy, medium, hard. |
| `question_type` | `question_type not null` | Existing union values. |
| `question_text` | `text not null` | Prompt. |
| `choices` | `jsonb not null` | Array of `{ id, text }`; keep original choice ids for migration compatibility. |
| `correct_choice_id` | `text not null` | Must match a choice id in `choices`. |
| `explanation` | `text not null` | Correct-answer explanation. |
| `why_wrong` | `jsonb not null default '{}'::jsonb` | Map of wrong choice id to explanation. |
| `exam_trap` | `text not null` | Existing field. |
| `study_tip` | `text not null` | Existing field. |
| `source` | `text not null default 'owner_csv'` | Provenance label. |
| `is_active` | `boolean not null default true` | Allows retirement without deleting history. |
| `created_at` | `timestamptz not null default now()` | Audit. |
| `updated_at` | `timestamptz not null default now()` | Audit. |

Relationships:

- Parent: `modules`
- Children: `user_answers`, `missed_questions`, active recall prompt references if promoted later.

Indexes:

- `questions_external_id_idx` unique on `external_id`
- `questions_module_id_idx` on `module_id`
- `questions_module_difficulty_idx` on `(module_id, difficulty)`
- `questions_topic_idx` on `topic`
- `questions_active_idx` on `is_active` where `is_active = true`
- Optional GIN index on `choices` only if querying inside JSONB choices becomes necessary.

RLS notes:

- Public/authenticated read allowed.
- Writes only through service role/admin import pipeline.
- Never expose mutating question bank operations to normal clients.

### 5. `quiz_attempts`

Stores one practice quiz attempt. This replaces `ProgressSnapshot.quizHistory[]` as the canonical quiz fact table.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid primary key default gen_random_uuid()` | Attempt id. |
| `user_id` | `uuid not null references auth.users(id) on delete cascade` | Owner. |
| `local_attempt_id` | `text null` | Preserve existing `QuizResult.id` during migration. |
| `session_id` | `text null` | Existing local session id. |
| `module_id` | `text null references modules(id)` | Null means all modules. |
| `mode` | `quiz_mode not null` | Study, exam, weak-area. |
| `difficulty_filter` | `difficulty_level null` | Null means all difficulties. |
| `topic_filter` | `text null` | Null means all topics. |
| `requested_length` | `text not null` | Store `10`, `25`, `50`, or `all`. |
| `score` | `int2 not null check (score between 0 and 100)` | Percent. |
| `correct_count` | `int2 not null default 0` | From `QuizResult.correctCount`. |
| `incorrect_count` | `int2 not null default 0` | From `QuizResult.incorrectCount`. |
| `unanswered_count` | `int2 not null default 0` | From `QuizResult.unansweredCount`. |
| `total_questions` | `int2 not null` | Attempt length. |
| `missed_topics` | `text[] not null default '{}'` | Existing unique missed topics. |
| `topic_performance` | `jsonb not null default '[]'::jsonb` | Preserve generated topic performance snapshot initially. Can later normalize if needed. |
| `started_at` | `timestamptz null` | Add when available. |
| `completed_at` | `timestamptz not null` | Existing completion timestamp. |
| `created_at` | `timestamptz not null default now()` | Audit. |

Relationships:

- Parent: `auth.users`, optional `modules`
- Children: `user_answers`

Indexes:

- `quiz_attempts_user_completed_idx` on `(user_id, completed_at desc)`
- `quiz_attempts_user_module_idx` on `(user_id, module_id)`
- `quiz_attempts_user_mode_idx` on `(user_id, mode)`
- `quiz_attempts_local_attempt_idx` on `(user_id, local_attempt_id)` unique where `local_attempt_id is not null`

RLS notes:

- Users can select/insert/update/delete only their own rows: `auth.uid() = user_id`.
- Consider disallowing updates after insert except for server-side migration/import, because attempts are historical records.

### 6. `user_answers`

Stores one answer per question within a quiz or final exam attempt.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid primary key default gen_random_uuid()` | Answer id. |
| `user_id` | `uuid not null references auth.users(id) on delete cascade` | Denormalized for RLS and query speed. |
| `quiz_attempt_id` | `uuid null references quiz_attempts(id) on delete cascade` | Set for normal quiz attempts. |
| `final_exam_attempt_id` | `uuid null references final_exam_attempts(id) on delete cascade` | Set for final exam attempts. |
| `question_id` | `uuid null references questions(id)` | Set after Phase 2 question migration. |
| `question_external_id` | `text not null` | Required from Phase 1 while questions remain local. |
| `module_id` | `text not null references modules(id)` | Denormalized from question at answer time. |
| `topic` | `text not null` | Denormalized from question at answer time. |
| `difficulty` | `difficulty_level null` | Denormalized from question at answer time when available. |
| `selected_choice_id` | `text null` | Null means unanswered. |
| `correct_choice_id` | `text not null` | Preserved at answer time. |
| `is_correct` | `boolean not null` | Scoring fact. |
| `answered_at` | `timestamptz not null default now()` | Timestamp. |

Constraints:

- Exactly one of `quiz_attempt_id` or `final_exam_attempt_id` should be non-null.
- Unique `(quiz_attempt_id, question_external_id)` where `quiz_attempt_id is not null`.
- Unique `(final_exam_attempt_id, question_external_id)` where `final_exam_attempt_id is not null`.

Relationships:

- Parent: `auth.users`
- Parent: `quiz_attempts` or `final_exam_attempts`
- Optional parent: `questions`
- Parent: `modules`

Indexes:

- `user_answers_user_answered_idx` on `(user_id, answered_at desc)`
- `user_answers_user_question_idx` on `(user_id, question_external_id)`
- `user_answers_user_module_idx` on `(user_id, module_id)`
- `user_answers_user_topic_idx` on `(user_id, module_id, topic)`
- `user_answers_user_correct_idx` on `(user_id, is_correct)`

RLS notes:

- Users can read/insert their own answer rows.
- Updates should be restricted. Prefer immutable answer rows after attempt submission.

### 7. `missed_questions`

Canonical user recovery queue.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid primary key default gen_random_uuid()` | Row id. |
| `user_id` | `uuid not null references auth.users(id) on delete cascade` | Owner. |
| `question_id` | `uuid null references questions(id)` | Set after Phase 2. |
| `question_external_id` | `text not null` | Current local `questionId`. |
| `missed_count` | `int2 not null default 1` | Current `missedCount`. |
| `last_missed_at` | `timestamptz not null` | Current `lastMissedAt`. |
| `status` | `missed_question_status not null default 'new'` | Existing status union. |
| `last_selected_choice_id` | `text not null` | Current `userSelectedChoiceId`. |
| `last_reviewed_at` | `timestamptz null` | Set when status moves to reviewed/mastered. |
| `mastered_at` | `timestamptz null` | Set when status is mastered. |
| `created_at` | `timestamptz not null default now()` | Audit. |
| `updated_at` | `timestamptz not null default now()` | Audit. |

Relationships:

- Parent: `auth.users`
- Optional parent: `questions`

Indexes:

- `missed_questions_user_status_idx` on `(user_id, status)`
- `missed_questions_user_last_missed_idx` on `(user_id, last_missed_at desc)`
- Unique `missed_questions_user_question_idx` on `(user_id, question_external_id)`

RLS notes:

- Users can CRUD only their own missed-question rows.
- Server functions may upsert from submitted quiz/final exam attempts.

### 8. `active_recall_ratings`

Stores user confidence and review flags for generated prompts.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid primary key default gen_random_uuid()` | Row id. |
| `user_id` | `uuid not null references auth.users(id) on delete cascade` | Owner. |
| `prompt_id` | `text not null` | Current generated prompt id. |
| `module_id` | `text not null references modules(id)` | Denormalized prompt module. |
| `topic` | `text not null` | Denormalized prompt topic. |
| `prompt_type` | `text not null` | Existing prompt type union. |
| `source_question_external_id` | `text null` | Current source question id. |
| `question_id` | `uuid null references questions(id)` | Set after Phase 2 where possible. |
| `confidence` | `int2 null check (confidence between 1 and 5)` | Current confidence. |
| `marked_for_review` | `boolean not null default false` | Current review flag. |
| `updated_at` | `timestamptz not null default now()` | Current updatedAt. |
| `created_at` | `timestamptz not null default now()` | Audit. |

Relationships:

- Parent: `auth.users`, `modules`, optional `questions`

Indexes:

- Unique `active_recall_user_prompt_idx` on `(user_id, prompt_id)`
- `active_recall_user_module_idx` on `(user_id, module_id)`
- `active_recall_user_review_idx` on `(user_id, marked_for_review)` where `marked_for_review = true`
- `active_recall_user_confidence_idx` on `(user_id, confidence)`

RLS notes:

- Users can CRUD only their own ratings.
- Prompt definitions can remain generated locally in Phase 1; store enough denormalized fields for cross-device continuity.

### 9. `study_plans`

Stores study plan settings and optional generated plan snapshots.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid primary key default gen_random_uuid()` | Plan id. |
| `user_id` | `uuid not null references auth.users(id) on delete cascade` | Owner. |
| `target_exam_date` | `date not null` | From `StudyPlanSettings`. |
| `study_days_per_week` | `int2 not null check (study_days_per_week between 1 and 7)` | From settings. |
| `minutes_per_session` | `int2 not null check (minutes_per_session between 20 and 180)` | From settings. |
| `confidence_level` | `study_confidence_level not null` | From settings. |
| `preferred_study_style` | `study_style not null` | From settings. |
| `generated_plan` | `jsonb null` | Optional snapshot of `GeneratedStudyPlan`; derived plans can also remain client-generated. |
| `is_active` | `boolean not null default true` | One active plan per user. |
| `created_at` | `timestamptz not null default now()` | Audit. |
| `updated_at` | `timestamptz not null default now()` | Audit. |

Relationships:

- Parent: `auth.users`

Indexes:

- `study_plans_user_active_idx` on `(user_id, is_active)`
- Unique partial index on `(user_id)` where `is_active = true`
- `study_plans_target_exam_date_idx` on `(target_exam_date)`

RLS notes:

- Users can CRUD only their own plans.
- Generated plan JSON may contain derived weak-topic labels, not sensitive beyond the user’s own performance.

### 10. `study_sessions`

Stores daily study activity and consistency. This is the canonical replacement for `studyDateHistory`, `studyStreak`, and `totalStudySessions`.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid primary key default gen_random_uuid()` | Session id. |
| `user_id` | `uuid not null references auth.users(id) on delete cascade` | Owner. |
| `session_type` | `study_session_type not null` | Quiz, final exam, notes, recall, etc. |
| `module_id` | `text null references modules(id)` | Optional focus module. |
| `started_at` | `timestamptz not null default now()` | Start. |
| `ended_at` | `timestamptz null` | End. |
| `duration_minutes` | `int2 null` | Optional user/session duration. |
| `questions_answered` | `int2 not null default 0` | Session rollup. |
| `notes` | `text null` | Optional user note later. |
| `metadata` | `jsonb not null default '{}'::jsonb` | Link to local planner day id, route, or source event. |
| `created_at` | `timestamptz not null default now()` | Audit. |

Relationships:

- Parent: `auth.users`, optional `modules`

Indexes:

- `study_sessions_user_started_idx` on `(user_id, started_at desc)`
- `study_sessions_user_type_idx` on `(user_id, session_type)`
- `study_sessions_user_module_idx` on `(user_id, module_id)`

RLS notes:

- Users can CRUD only their own sessions.
- Prefer append-only for sessions generated from attempts; manual study sessions can be editable.

### 11. `final_exam_attempts`

Stores one final exam simulator attempt. Detailed answers live in `user_answers` and/or `question_results` JSON during transition.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid primary key default gen_random_uuid()` | Attempt id. |
| `user_id` | `uuid not null references auth.users(id) on delete cascade` | Owner. |
| `local_attempt_id` | `text null` | Current `FinalExamAttempt.id`. |
| `session_id` | `text null` | Current final exam session id. |
| `length` | `int2 not null check (length in (75, 150))` | Half or full exam. |
| `timing_mode` | `final_exam_timing_mode not null` | Timed or untimed. |
| `started_at` | `timestamptz not null` | Attempt start. |
| `completed_at` | `timestamptz not null` | Attempt completion. |
| `elapsed_seconds` | `int4 not null` | Current elapsed seconds. |
| `score` | `int2 not null check (score between 0 and 100)` | Percent score. |
| `correct_count` | `int2 not null default 0` | Correct count. |
| `incorrect_count` | `int2 not null default 0` | Incorrect count. |
| `unanswered_count` | `int2 not null default 0` | Unanswered count. |
| `total_questions` | `int2 not null` | 75 or 150. |
| `module_breakdown` | `jsonb not null default '[]'::jsonb` | Preserve current breakdown. |
| `topic_breakdown` | `jsonb not null default '[]'::jsonb` | Preserve current breakdown. |
| `difficulty_breakdown` | `jsonb not null default '[]'::jsonb` | Preserve current breakdown. |
| `missed_question_external_ids` | `text[] not null default '{}'` | Current missed ids. |
| `created_at` | `timestamptz not null default now()` | Audit. |

Relationships:

- Parent: `auth.users`
- Children: `user_answers`

Indexes:

- `final_exam_attempts_user_completed_idx` on `(user_id, completed_at desc)`
- `final_exam_attempts_user_score_idx` on `(user_id, score desc)`
- `final_exam_attempts_user_length_idx` on `(user_id, length)`
- Unique `final_exam_attempts_user_local_idx` on `(user_id, local_attempt_id)` where `local_attempt_id is not null`

RLS notes:

- Users can read/insert own attempts.
- Updates should generally be disallowed after insert. Delete can be allowed for user-controlled history cleanup or restricted to support/admin flows.

## Relationships Summary

- `auth.users 1 -> 1 profiles`
- `auth.users 1 -> many quiz_attempts`
- `auth.users 1 -> many user_answers`
- `auth.users 1 -> many missed_questions`
- `auth.users 1 -> many active_recall_ratings`
- `auth.users 1 -> many study_plans`
- `auth.users 1 -> many study_sessions`
- `auth.users 1 -> many final_exam_attempts`
- `modules 1 -> many questions`
- `modules 1 -> many user_answers`
- `modules 1 -> many active_recall_ratings`
- `modules 1 -> many study_sessions`
- `quiz_attempts 1 -> many user_answers`
- `final_exam_attempts 1 -> many user_answers`
- `questions 1 -> many user_answers`
- `questions 1 -> many missed_questions`
- `questions 1 -> many active_recall_ratings` where prompts are linked to source questions

## Derived Views and Functions

Do not store every dashboard number as a mutable column. Prefer SQL views or RPC functions for aggregates.

Recommended derived views:

- `user_module_performance`: per user/module attempted, correct, missed, accuracy, hard-question accuracy.
- `user_topic_performance`: per user/module/topic attempted, correct, accuracy, latest attempt date.
- `user_study_streaks`: computed from `study_sessions.started_at` by user timezone.
- `user_readiness_inputs`: combines quiz accuracy, hard accuracy, module coverage, missed recovery, active recall confidence, consistency, final exam impact.
- `question_bank_summary`: module counts, difficulty counts, active question counts for admin validation.

## Migration Order

1. Enable required extensions: `pgcrypto` for `gen_random_uuid()` if not already enabled.
2. Create enum types.
3. Create `modules`.
4. Create `questions` with nullable use in Phase 1 but ready for Phase 2.
5. Create `profiles`.
6. Create `quiz_attempts`.
7. Create `final_exam_attempts`.
8. Create `user_answers` after both attempt tables exist.
9. Create `missed_questions`.
10. Create `active_recall_ratings`.
11. Create `study_plans`.
12. Create `study_sessions`.
13. Add indexes and partial unique indexes.
14. Enable RLS on all public user-owned tables.
15. Add RLS policies.
16. Add read policies for public/reference tables: `modules`, and later `questions`.
17. Add import/admin-only policies or service-role-only paths for question bank writes.
18. Add derived views/RPC functions after real data exists.

## Row Level Security Strategy

General rules:

- Enable RLS on every public table.
- User-owned tables must include `user_id uuid not null` and policies based on `auth.uid() = user_id`.
- Reference tables (`modules`, `questions`) should be read-only to clients.
- Question writes, module writes, and CSV imports must use service role or admin-only server paths.
- Avoid client-side direct updates for immutable history tables such as `quiz_attempts`, `user_answers`, and `final_exam_attempts` after insertion.

Example user-owned policy pattern:

```sql
create policy "Users can read own quiz attempts"
on quiz_attempts for select
using (auth.uid() = user_id);

create policy "Users can insert own quiz attempts"
on quiz_attempts for insert
with check (auth.uid() = user_id);
```

Example reference read policy:

```sql
create policy "Questions are readable"
on questions for select
using (is_active = true);
```

If anonymous usage remains supported, create anon read policies for `modules` and active `questions`, but never for user-owned tables.

## LocalStorage to Supabase Mapping

| Local source | Supabase destination | Notes |
|---|---|---|
| `ProgressSnapshot.quizHistory[]` | `quiz_attempts` + `user_answers` | Import each `QuizResult`; use `question_external_id` until question UUID mapping exists. |
| `ProgressSnapshot.studyDateHistory[]` | `study_sessions` | Backfill one lightweight session per date if no richer event exists. |
| `ProgressSnapshot.moduleStats[]` | Derived view | Do not import as canonical. Recompute from answers. |
| `ProgressSnapshot.topicStats[]` | Derived view or temporary JSON on attempts | Do not import as canonical unless needed for bootstrapping. |
| `cscp-forge-missed-questions` | `missed_questions` | Upsert by `(user_id, question_external_id)`. |
| `cscp-forge-active-recall` | `active_recall_ratings` | Upsert by `(user_id, prompt_id)`. |
| `cscp-forge-study-plan-settings` | `study_plans` | Mark latest as `is_active = true`. |
| `cscp-forge-final-exam-attempts` | `final_exam_attempts` + `user_answers` | Import attempt summary and detailed answer rows. |
| `cscp-forge-quiz-launch-intent` | No DB table | Keep ephemeral client state only. |

## Phased Migration Plan

### Phase 1: Keep Questions Local, Sync User Progress

Goal: preserve the current app experience while syncing user-owned progress records.

Implementation outline:

- Keep `data/generatedQuestions.ts` and local question loading unchanged.
- Add Supabase client behind a feature flag.
- Add auth-optional device sync only if needed, but prefer waiting for Phase 3 auth before real cross-device promises.
- Store quiz attempts, user answers, missed questions, active recall ratings, study plan settings, study sessions, and final exam attempts using `question_external_id`.
- Keep localStorage as the immediate write path. Add background sync after successful local writes.
- Add an import-on-login routine later that reads localStorage once and upserts to Supabase.
- Do not use Supabase question ids yet.

Risks:

- Without auth, progress cannot safely sync across devices. If Phase 1 precedes auth, treat it as single-device backup only or require anonymous Supabase auth.
- Need conflict rules. Recommended: latest `updated_at` wins for settings/ratings; append-only for attempts; max `missed_count` plus latest status for missed questions.

### Phase 2: Move Question Bank to Supabase

Goal: make Supabase the canonical source for modules and questions while preserving local fallback.

Implementation outline:

- Import `modules` first.
- Import `questions` from the same owner-provided CSV/import output.
- Preserve current question ids in `questions.external_id`.
- Add validation SQL checks: 800 active questions, 100 per module, difficulty counts, non-empty explanations/traps/tips, valid choice ids.
- Add a read-only query layer that can load active questions from Supabase.
- Keep bundled generated questions as offline fallback and PWA cache support.
- Add a mapping helper from `external_id` to `questions.id` for old user records.

Risks:

- Any change to question ids can break localStorage migration. Keep `external_id` stable.
- If question text changes after attempts exist, historical answer explanations may drift. Consider snapshotting `question_text`, `choices`, and `correct_choice_id` in `user_answers` only if audit-grade history is required.

### Phase 3: Add Auth

Goal: introduce user accounts and secure progress records.

Implementation outline:

- Add Supabase Auth with email/password or magic link.
- Create `profiles` row on sign-up through trigger or server action.
- On first authenticated session, import localStorage data into user-owned tables.
- Keep localStorage as offline cache after auth.
- Add account/session UI and a visible sync status.
- Enforce RLS policies before exposing writes from the client.

Risks:

- Duplicate import if migration is retried. Use `local_attempt_id`, `(user_id, question_external_id)`, and `(user_id, prompt_id)` unique constraints.
- Account switching on one browser can mix localStorage data. Add explicit migration confirmation and clear local sync metadata per user.

### Phase 4: Add Cross-Device Progress

Goal: make Supabase the source of truth for authenticated user progress across devices while retaining offline-first behavior.

Implementation outline:

- Load latest Supabase records at sign-in and hydrate local stores.
- Queue offline writes locally and replay when online.
- Add conflict handling:
  - Attempts: append-only by unique local ids.
  - Missed questions: merge count/status with latest timestamps.
  - Active recall: latest `updated_at` wins.
  - Study plan settings: latest `updated_at` wins.
  - Study sessions: append-only.
- Add sync health indicators and last synced timestamp.
- Move readiness calculations to shared client/server logic or Supabase views.

Risks:

- Offline changes on multiple devices can conflict. Keep conflict rules simple and explainable.
- Large answer history can grow quickly. Use pagination and aggregate views for dashboard loads.

### Phase 5: Add AI Tutor Logs and Personalization

Goal: extend the data model for tutor interactions, recommendations, and personalized remediation.

Future tables:

- `ai_tutor_sessions`: session metadata, user id, module/topic focus, created timestamps.
- `ai_tutor_messages`: role, content, token metadata, safety metadata, linked question ids.
- `personalization_events`: user action events used for recommendations.
- `recommendations`: generated next actions, model/version, accepted/dismissed status.
- `concept_mastery`: derived or model-assisted mastery state per user/module/topic.

Implementation outline:

- Add tutor logging only after auth and RLS are stable.
- Never store copyrighted third-party question content from outside the owner-provided bank.
- Store model prompts/responses with privacy controls and user deletion support.
- Use existing readiness inputs first; add AI personalization only where it improves recommendations.

Risks:

- Tutor logs can contain sensitive user-entered text. Add clear retention policy.
- AI recommendations should not overwrite factual progress records; keep them advisory.

## Implementation Guardrails

- Keep local app behavior unchanged until each phase is intentionally started.
- Keep question bank provenance clear: owner-provided CSV only.
- Preserve `question_external_id` through every phase.
- Prefer append-only attempt/answer history.
- Do not store derived readiness as the only source of truth; derive from attempts, answers, recovery, recall, sessions, and final exams.
- Keep localStorage available as offline cache even after Supabase is active.
- Add migration tests before writing user data remotely.

## First Migration Checklist

- [ ] Create Supabase project and environments.
- [ ] Add SQL migrations for enums and base tables.
- [ ] Add RLS policies and verify with anon/authenticated/service role tests.
- [ ] Seed `modules`.
- [ ] Build a localStorage export/import test fixture from current stores.
- [ ] Implement Phase 1 behind a feature flag.
- [ ] Verify no app behavior changes with the feature flag off.
- [ ] Add telemetry-free sync status UI only after the sync path is reliable.