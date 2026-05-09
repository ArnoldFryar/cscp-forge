"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { CSCPModule, Difficulty, MissedQuestion, MissedQuestionStatus, Question } from "@/data/types";
import { filterMissedQuestionsForQuestionPool, loadMissedQuestions, markQuestionsRetrying, saveMissedQuestions, storeQuizLaunchIntent, updateMissedQuestionStatus } from "@/lib/missedQuestionStore";
import { ArrowRight, CheckCircle2, Filter, RefreshCcw } from "lucide-react";

type MissedQuestionsReviewProps = {
  modules: CSCPModule[];
  questions: Question[];
  initialMissedQuestions: MissedQuestion[];
};

type SortOption = "newest" | "oldest" | "hardest" | "module-order";

type FilterState = {
  moduleId: string | "all";
  topic: string | "all";
  difficulty: Difficulty | "all";
  status: MissedQuestionStatus | "all";
  sort: SortOption;
};

const difficultyRank: Record<Difficulty, number> = {
  hard: 0,
  medium: 1,
  easy: 2,
};

const statusOptions: Array<{ value: MissedQuestionStatus; label: string }> = [
  { value: "new", label: "New" },
  { value: "reviewed", label: "Reviewed" },
  { value: "retrying", label: "Retrying" },
  { value: "mastered", label: "Mastered" },
];

const sortOptions: Array<{ value: SortOption; label: string }> = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "hardest", label: "Hardest first" },
  { value: "module-order", label: "Module order" },
];

function getDefaultFilters(): FilterState {
  return {
    moduleId: "all",
    topic: "all",
    difficulty: "all",
    status: "all",
    sort: "newest",
  };
}

function getStatusLabel(status: MissedQuestionStatus) {
  return statusOptions.find((option) => option.value === status)?.label ?? status;
}

function getStatusClasses(status: MissedQuestionStatus) {
  if (status === "new") {
    return "border-sky-400/40 bg-sky-400/10 text-(--forge-info)";
  }
  if (status === "reviewed") {
    return "border-teal-400/40 bg-teal-400/10 text-(--forge-accent)";
  }
  if (status === "retrying") {
    return "border-amber-500/40 bg-amber-500/10 text-(--forge-warning)";
  }
  return "border-emerald-500/40 bg-emerald-500/10 text-(--forge-success)";
}

export default function MissedQuestionsReview({ modules, questions, initialMissedQuestions }: MissedQuestionsReviewProps) {
  const router = useRouter();
  const [filters, setFilters] = useState<FilterState>(() => getDefaultFilters());
  const [missedQueue, setMissedQueue] = useState<MissedQuestion[]>(() => filterMissedQuestionsForQuestionPool(initialMissedQuestions, questions));

  const moduleLookup = useMemo(() => new Map(modules.map((module) => [module.id, module])), [modules]);
  const questionLookup = useMemo(() => new Map(questions.map((question) => [question.id, question])), [questions]);

  useEffect(() => {
    const validMissedQuestions = filterMissedQuestionsForQuestionPool(loadMissedQuestions(initialMissedQuestions), questions);
    setMissedQueue(validMissedQuestions);
    saveMissedQuestions(validMissedQuestions);
  }, [initialMissedQuestions, questions]);

  const enrichedMissedQuestions = useMemo(() => {
    return missedQueue
      .map((missedQuestion) => {
        const question = questionLookup.get(missedQuestion.questionId);
        if (!question) {
          return null;
        }

        const moduleItem = moduleLookup.get(question.moduleId);
        if (!moduleItem) {
          return null;
        }

        return {
          missedQuestion,
          question,
          module: moduleItem,
          selectedChoiceText: question.choices.find((choice) => choice.id === missedQuestion.userSelectedChoiceId)?.text ?? "Selected answer unavailable",
          correctChoiceText: question.choices.find((choice) => choice.id === question.correctChoiceId)?.text ?? "Correct answer unavailable",
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [missedQueue, moduleLookup, questionLookup]);

  const topicOptions = useMemo(() => {
    return Array.from(
      new Set(
        enrichedMissedQuestions
          .filter((item) => filters.moduleId === "all" || item.question.moduleId === filters.moduleId)
          .map((item) => item.question.topic),
      ),
    ).sort();
  }, [enrichedMissedQuestions, filters.moduleId]);

  useEffect(() => {
    if (filters.topic !== "all" && !topicOptions.includes(filters.topic)) {
      setFilters((currentFilters) => ({ ...currentFilters, topic: "all" }));
    }
  }, [filters.topic, topicOptions]);

  const filteredMissedQuestions = useMemo(() => {
    const filtered = enrichedMissedQuestions.filter((item) => {
      const matchesModule = filters.moduleId === "all" || item.question.moduleId === filters.moduleId;
      const matchesTopic = filters.topic === "all" || item.question.topic === filters.topic;
      const matchesDifficulty = filters.difficulty === "all" || item.question.difficulty === filters.difficulty;
      const matchesStatus = filters.status === "all" || item.missedQuestion.status === filters.status;

      return matchesModule && matchesTopic && matchesDifficulty && matchesStatus;
    });

    return filtered.sort((left, right) => {
      if (filters.sort === "oldest") {
        return new Date(left.missedQuestion.lastMissedAt).getTime() - new Date(right.missedQuestion.lastMissedAt).getTime();
      }

      if (filters.sort === "hardest") {
        const difficultyDelta = difficultyRank[left.question.difficulty] - difficultyRank[right.question.difficulty];
        if (difficultyDelta !== 0) {
          return difficultyDelta;
        }
      }

      if (filters.sort === "module-order") {
        const moduleDelta = left.module.number - right.module.number;
        if (moduleDelta !== 0) {
          return moduleDelta;
        }
      }

      return new Date(right.missedQuestion.lastMissedAt).getTime() - new Date(left.missedQuestion.lastMissedAt).getTime();
    });
  }, [enrichedMissedQuestions, filters]);

  const retryableQuestionIds = filteredMissedQuestions
    .filter((item) => item.missedQuestion.status !== "mastered")
    .map((item) => item.missedQuestion.questionId);

  const summary = useMemo(() => {
    const total = enrichedMissedQuestions.length;
    const retrying = enrichedMissedQuestions.filter((item) => item.missedQuestion.status === "retrying").length;
    const mastered = enrichedMissedQuestions.filter((item) => item.missedQuestion.status === "mastered").length;

    return {
      total,
      retrying,
      mastered,
    };
  }, [enrichedMissedQuestions]);

  function handleStatusChange(questionId: string, status: MissedQuestionStatus) {
    setMissedQueue((currentQueue) => {
      const nextQueue = updateMissedQuestionStatus(currentQueue, questionId, status);
      saveMissedQuestions(nextQueue);
      return nextQueue;
    });
  }

  function handleRetry() {
    if (retryableQuestionIds.length === 0) {
      return;
    }

    setMissedQueue((currentQueue) => {
      const nextQueue = markQuestionsRetrying(currentQueue, retryableQuestionIds);
      saveMissedQuestions(nextQueue);
      return nextQueue;
    });

    storeQuizLaunchIntent({
      mode: "weak-area",
      moduleId: filters.moduleId,
      difficulty: filters.difficulty,
      topic: filters.topic,
      length: "all",
    });
    router.push("/quiz?mode=weak-area");
  }

  function resetFilters() {
    setFilters(getDefaultFilters());
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <div className="app-card p-4">
          <p className="app-muted text-xs font-bold uppercase tracking-[0.18em]">Total queue</p>
          <p className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{summary.total}</p>
        </div>
        <div className="app-card p-4">
          <p className="app-muted text-xs font-bold uppercase tracking-[0.18em]">Retrying now</p>
          <p className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{summary.retrying}</p>
        </div>
        <div className="app-card p-4">
          <p className="app-muted text-xs font-bold uppercase tracking-[0.18em]">Mastered</p>
          <p className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{summary.mastered}</p>
        </div>
      </section>

      <section className="app-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Filter size={16} aria-hidden="true" className="text-cyan-600 dark:text-cyan-300" />
              <p className="text-sm font-black text-slate-950 dark:text-white">Queue controls</p>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Narrow the queue by module, topic, difficulty, or status, then send the visible set straight into Weak Area mode.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              className="app-btn-secondary"
              type="button"
              onClick={resetFilters}
            >
              <RefreshCcw size={16} aria-hidden="true" />
              Reset filters
            </button>
            <button
              className="app-btn-primary disabled:opacity-50"
              type="button"
              onClick={handleRetry}
              disabled={retryableQuestionIds.length === 0}
            >
              Retry Missed Questions
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">
            Module
            <select
              className="app-input mt-2"
              value={filters.moduleId}
              onChange={(event) => setFilters((currentFilters) => ({ ...currentFilters, moduleId: event.target.value as string | "all", topic: "all" }))}
            >
              <option value="all">All modules</option>
              {modules.map((module) => (
                <option key={module.id} value={module.id}>Module {module.number}: {module.name}</option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">
            Topic
            <select
              className="app-input mt-2"
              value={filters.topic}
              onChange={(event) => setFilters((currentFilters) => ({ ...currentFilters, topic: event.target.value as string | "all" }))}
            >
              <option value="all">All topics</option>
              {topicOptions.map((topic) => (
                <option key={topic} value={topic}>{topic}</option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">
            Difficulty
            <select
              className="app-input mt-2"
              value={filters.difficulty}
              onChange={(event) => setFilters((currentFilters) => ({ ...currentFilters, difficulty: event.target.value as Difficulty | "all" }))}
            >
              <option value="all">All difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </label>

          <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">
            Status
            <select
              className="app-input mt-2"
              value={filters.status}
              onChange={(event) => setFilters((currentFilters) => ({ ...currentFilters, status: event.target.value as MissedQuestionStatus | "all" }))}
            >
              <option value="all">All statuses</option>
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-bold text-slate-700 dark:text-slate-200">
            Sort by
            <select
              className="app-input mt-2"
              value={filters.sort}
              onChange={(event) => setFilters((currentFilters) => ({ ...currentFilters, sort: event.target.value as SortOption }))}
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {filteredMissedQuestions.length === 0 ? (
        <section className="rounded-lg border border-dashed border-(--forge-border-strong) bg-(--forge-surface-card) p-10 text-center shadow-sm">
          <CheckCircle2 className="mx-auto text-emerald-600 dark:text-emerald-300" size={34} aria-hidden="true" />
          <h2 className="mt-4 text-2xl font-black text-slate-950 dark:text-white">
            {enrichedMissedQuestions.length === 0 ? "No missed questions" : "No missed questions match these filters"}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-300">
            {enrichedMissedQuestions.length === 0
              ? "Your recovery queue is clear. Future misses will appear here with explanations, trap notes, and retake controls."
              : "Reset the filters or take another quiz to populate the visible recovery queue."}
          </p>
        </section>
      ) : (
        <section className="grid gap-4">
          {filteredMissedQuestions.map(({ missedQuestion, question, module, selectedChoiceText, correctChoiceText }) => (
            <article key={missedQuestion.questionId} className="app-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">Module {module.number}: {module.name}</span>
                  <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-black text-teal-700 dark:bg-teal-950 dark:text-teal-200">{question.topic}</span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black capitalize text-slate-600 dark:bg-slate-800 dark:text-slate-300">{question.difficulty}</span>
                  <span className={`rounded-full border px-3 py-1 text-xs font-black ${getStatusClasses(missedQuestion.status)}`}>{getStatusLabel(missedQuestion.status)}</span>
                </div>

                <label className="text-sm font-bold text-slate-700 dark:text-slate-200">
                  Review status
                  <select
                    className="app-input mt-2 py-2"
                    value={missedQuestion.status}
                    onChange={(event) => handleStatusChange(missedQuestion.questionId, event.target.value as MissedQuestionStatus)}
                  >
                    {statusOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
              </div>

              <h2 className="mt-4 text-lg font-black leading-7 text-slate-950 dark:text-white">{question.questionText}</h2>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <p className="rounded-lg bg-rose-50 p-3 text-sm leading-6 text-rose-900 dark:bg-rose-950/40 dark:text-rose-100">
                  <span className="font-black">Your answer:</span> {selectedChoiceText}
                </p>
                <p className="rounded-lg bg-emerald-50 p-3 text-sm leading-6 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
                  <span className="font-black">Correct answer:</span> {correctChoiceText}
                </p>
              </div>

              <p className="mt-4 text-sm leading-6 text-slate-700 dark:text-slate-200">{question.explanation}</p>
              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                <p className="rounded-lg bg-amber-50 p-3 text-sm leading-6 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">Trap: {question.examTrap}</p>
                <p className="rounded-lg bg-teal-50 p-3 text-sm leading-6 text-teal-900 dark:bg-teal-950/40 dark:text-teal-100">Tip: {question.studyTip}</p>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-4 text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                <span>Missed {missedQuestion.missedCount} time(s)</span>
                <span>Last missed {new Date(missedQuestion.lastMissedAt).toLocaleDateString()}</span>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}