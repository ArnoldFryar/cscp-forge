"use client";

import { useEffect, useMemo, useState } from "react";
import ModuleCard from "@/components/ModuleCard";
import { missedQuestions, quizResults, topicPerformance, userProgress } from "@/data/mockProgress";
import { modules } from "@/data/modules";
import { questions } from "@/data/questions";
import { buildInitialProgressSnapshot, loadProgress, type ProgressSnapshot } from "@/lib/progressStore";

const initialProgress = buildInitialProgressSnapshot({
  modules,
  questions,
  userProgress,
  quizResults,
  topicPerformance,
  missedQuestions,
});

export default function ModulesPage() {
  const [progress, setProgress] = useState<ProgressSnapshot>(() => initialProgress);

  useEffect(() => {
    setProgress(loadProgress(initialProgress));
  }, []);

  const moduleProgress = useMemo(
    () => new Map(progress.moduleStats.map((module) => [module.moduleId, module])),
    [progress.moduleStats],
  );

  return (
    <div className="space-y-6">
      <section>
        <p className="app-eyebrow">Modules</p>
        <h1 className="app-page-title mt-3 tracking-tight">8-module CSCP roadmap</h1>
        <p className="app-body-copy mt-3 max-w-3xl text-base">
          Each card now reflects your local quiz history with answered volume, accuracy, confidence, weakest topic, and the next move to make.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {modules.map((module) => (
          <ModuleCard key={module.id} module={module} progress={moduleProgress.get(module.id) ?? initialProgress.moduleStats.find((item) => item.moduleId === module.id)!} />
        ))}
      </section>
    </div>
  );
}