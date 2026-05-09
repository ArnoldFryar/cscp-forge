"use client";

import { useEffect, useMemo, useState } from "react";
import { modules } from "@/data/modules";
import { questions } from "@/data/questions";
import {
  calculateActiveRecallSummary,
  generateActiveRecallPrompts,
  getPromptProgress,
  loadActiveRecallProgress,
  saveActiveRecallProgress,
  toggleActiveRecallReview,
  updateActiveRecallConfidence,
  type ActiveRecallProgressStore,
} from "@/lib/activeRecallStore";
import { Brain, Eye, EyeOff, Filter, Flag, Sparkles } from "lucide-react";

type FilterState = {
  moduleId: string | "all";
  topic: string | "all";
  lowConfidenceOnly: boolean;
};

const activeRecallPrompts = generateActiveRecallPrompts(questions);

function getDefaultFilters(): FilterState {
  return {
    moduleId: "all",
    topic: "all",
    lowConfidenceOnly: false,
  };
}

export default function ActiveRecallPage() {
  const [progress, setProgress] = useState<ActiveRecallProgressStore>({});
  const [filters, setFilters] = useState<FilterState>(() => getDefaultFilters());
  const [openPromptIds, setOpenPromptIds] = useState<string[]>([]);

  useEffect(() => {
    setProgress(loadActiveRecallProgress());
  }, []);

  const summary = useMemo(() => calculateActiveRecallSummary(activeRecallPrompts, progress), [progress]);
  const topicOptions = useMemo(() => {
    return Array.from(new Set(
      activeRecallPrompts
        .filter((prompt) => filters.moduleId === "all" || prompt.moduleId === filters.moduleId)
        .map((prompt) => prompt.topic),
    )).sort();
  }, [filters.moduleId]);

  const filteredPrompts = useMemo(() => {
    return activeRecallPrompts
      .filter((prompt) => {
        const promptProgress = getPromptProgress(progress, prompt.id);
        const matchesModule = filters.moduleId === "all" || prompt.moduleId === filters.moduleId;
        const matchesTopic = filters.topic === "all" || prompt.topic === filters.topic;
        const matchesLowConfidence = !filters.lowConfidenceOnly || (promptProgress.confidence !== null && promptProgress.confidence <= 2);

        return matchesModule && matchesTopic && matchesLowConfidence;
      })
      .sort((left, right) => {
        const leftProgress = getPromptProgress(progress, left.id);
        const rightProgress = getPromptProgress(progress, right.id);

        if (leftProgress.markedForReview !== rightProgress.markedForReview) {
          return Number(rightProgress.markedForReview) - Number(leftProgress.markedForReview);
        }

        const leftConfidence = leftProgress.confidence ?? 6;
        const rightConfidence = rightProgress.confidence ?? 6;
        if (leftConfidence !== rightConfidence) {
          return leftConfidence - rightConfidence;
        }

        if (left.moduleId !== right.moduleId) {
          return left.moduleId.localeCompare(right.moduleId);
        }

        return left.topic.localeCompare(right.topic);
      });
  }, [filters, progress]);

  useEffect(() => {
    if (filters.topic !== "all" && !topicOptions.includes(filters.topic)) {
      setFilters((currentFilters) => ({ ...currentFilters, topic: "all" }));
    }
  }, [filters.topic, topicOptions]);

  function persistProgress(nextProgress: ActiveRecallProgressStore) {
    setProgress(nextProgress);
    saveActiveRecallProgress(nextProgress);
  }

  function togglePromptAnswer(promptId: string) {
    setOpenPromptIds((currentOpenPromptIds) => (
      currentOpenPromptIds.includes(promptId)
        ? currentOpenPromptIds.filter((currentPromptId) => currentPromptId !== promptId)
        : [...currentOpenPromptIds, promptId]
    ));
  }

  function handleConfidenceChange(promptId: string, confidence: 1 | 2 | 3 | 4 | 5) {
    persistProgress(updateActiveRecallConfidence(progress, promptId, confidence));
  }

  function handleReviewToggle(promptId: string) {
    persistProgress(toggleActiveRecallReview(progress, promptId));
  }

  function resetFilters() {
    setFilters(getDefaultFilters());
  }

  return (
    <div className="space-y-6">
      <section className="app-card grid gap-5 p-6 sm:p-7 lg:grid-cols-[1fr_320px]">
        <div>
          <p className="app-eyebrow">Active Recall</p>
          <h1 className="app-page-title mt-3 tracking-tight">Recall concepts without answer choices</h1>
          <p className="app-body-copy mt-3 max-w-3xl text-base">
            Practice explaining, comparing, teaching, and stress-testing CSCP topics from memory so you build true recall instead of just recognizing multiple-choice patterns.
          </p>
        </div>
        <article className="app-panel border-[rgb(45_212_191/0.42)] bg-[rgb(45_212_191/0.1)] p-5">
          <p className="text-sm font-black text-cyan-950 dark:text-cyan-100">Recall strength</p>
          <p className="mt-3 text-4xl font-black text-cyan-950 dark:text-white">{summary.score}%</p>
          <p className="mt-1 text-sm text-cyan-800 dark:text-cyan-200">{summary.ratedCount} of {summary.totalPrompts} prompts rated</p>
          <p className="mt-5 text-sm font-bold text-cyan-900 dark:text-cyan-100">{summary.lowConfidenceCount} low-confidence prompts · {summary.reviewCount} marked for review</p>
        </article>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="app-card p-5">
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Active Recall Score</p>
          <p className="mt-3 text-3xl font-black text-slate-950 dark:text-white">{summary.score}%</p>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Average confidence converted into a recall score.</p>
        </article>
        <article className="app-card p-5">
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Rated prompts</p>
          <p className="mt-3 text-3xl font-black text-slate-950 dark:text-white">{summary.ratedCount}</p>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Prompts with a saved confidence rating from 1 to 5.</p>
        </article>
        <article className="app-card p-5">
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Low confidence</p>
          <p className="mt-3 text-3xl font-black text-slate-950 dark:text-white">{summary.lowConfidenceCount}</p>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Prompts currently rated 1 or 2.</p>
        </article>
        <article className="app-card p-5">
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Marked for review</p>
          <p className="mt-3 text-3xl font-black text-slate-950 dark:text-white">{summary.reviewCount}</p>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Prompts you flagged for another deep pass.</p>
        </article>
      </section>

      <section className="app-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Filter size={16} aria-hidden="true" className="text-cyan-600 dark:text-cyan-300" />
              <p className="text-sm font-black text-slate-950 dark:text-white">Prompt filters</p>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">Filter by module, topic, or weak recall so the next prompt set stays focused.</p>
          </div>
          <button
            className="app-btn-secondary"
            type="button"
            onClick={resetFilters}
          >
            Reset filters
          </button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
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

          <label className="flex items-end gap-3 rounded-lg border border-slate-200 p-4 text-sm font-bold text-slate-700 dark:border-slate-700 dark:text-slate-200">
            <input
              className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
              type="checkbox"
              checked={filters.lowConfidenceOnly}
              onChange={(event) => setFilters((currentFilters) => ({ ...currentFilters, lowConfidenceOnly: event.target.checked }))}
            />
            Low confidence only
          </label>
        </div>
      </section>

      {filteredPrompts.length === 0 ? (
        <section className="rounded-lg border border-dashed border-(--forge-border-strong) bg-(--forge-surface-card) p-10 text-center shadow-sm">
          <Brain className="mx-auto text-cyan-600 dark:text-cyan-300" size={32} aria-hidden="true" />
          <h2 className="mt-4 text-2xl font-black text-slate-950 dark:text-white">No prompts match these filters</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">Widen the filters or rate more prompts to surface low-confidence recall work.</p>
        </section>
      ) : (
        <section className="grid gap-4">
          {filteredPrompts.map((prompt) => {
            const promptProgress = getPromptProgress(progress, prompt.id);
            const isOpen = openPromptIds.includes(prompt.id);

            return (
              <article key={prompt.id} className="app-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{prompt.moduleName}</span>
                    <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-black text-cyan-700 dark:bg-cyan-950 dark:text-cyan-200">{prompt.topic}</span>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200">{prompt.promptTypeLabel}</span>
                  </div>
                  <button
                    className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-bold transition ${promptProgress.markedForReview ? "border-amber-500/40 bg-amber-500/10 text-(--forge-warning)" : "border-(--forge-border-strong) text-(--forge-text-secondary) hover:border-(--forge-accent) hover:bg-(--forge-surface-elevated)"}`}
                    type="button"
                    onClick={() => handleReviewToggle(prompt.id)}
                  >
                    <Flag size={16} aria-hidden="true" />
                    {promptProgress.markedForReview ? "Marked for review" : "Mark for review"}
                  </button>
                </div>

                <p className="mt-4 text-lg font-black leading-7 text-slate-950 dark:text-white">{prompt.prompt}</p>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <button
                    className="app-btn-secondary"
                    type="button"
                    onClick={() => togglePromptAnswer(prompt.id)}
                  >
                    {isOpen ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                    {isOpen ? "Hide model answer" : "Show model answer"}
                  </button>
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    <Sparkles size={14} aria-hidden="true" />
                    Confidence {promptProgress.confidence ?? "not rated"}
                  </div>
                </div>

                {isOpen ? (
                  <div className="mt-4 rounded-lg border border-[rgb(56_189_248/0.3)] bg-[rgb(56_189_248/0.09)] p-4 text-sm leading-6 text-(--forge-text-secondary)">
                    {prompt.modelAnswer}
                  </div>
                ) : null}

                <div className="mt-5 flex flex-wrap items-center gap-2">
                  {[1, 2, 3, 4, 5].map((confidence) => (
                    <button
                      key={confidence}
                      className={`rounded-lg border px-3 py-2 text-sm font-black transition ${promptProgress.confidence === confidence ? "border-[rgb(45_212_191/0.62)] bg-[rgb(45_212_191/0.16)] text-(--forge-text-primary)" : "border-(--forge-border-strong) text-(--forge-text-secondary) hover:border-(--forge-accent) hover:bg-(--forge-surface-elevated)"}`}
                      type="button"
                      onClick={() => handleConfidenceChange(prompt.id, confidence as 1 | 2 | 3 | 4 | 5)}
                    >
                      {confidence}
                    </button>
                  ))}
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}