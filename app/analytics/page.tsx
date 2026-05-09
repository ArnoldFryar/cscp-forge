import ProgressBar from "@/components/ProgressBar";
import { modules } from "@/data/modules";
import { quizResults, topicPerformance, userProgress } from "@/data/mockProgress";

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <section>
        <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-600 dark:text-cyan-300">Analytics</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">Readiness analytics</h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-300">
          Simple local bars show where accuracy is strong and where study time should move next.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Readiness</p>
          <p className="mt-3 text-3xl font-black text-slate-950 dark:text-white">{userProgress.readinessScore}%</p>
        </article>
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Average accuracy</p>
          <p className="mt-3 text-3xl font-black text-slate-950 dark:text-white">{userProgress.averageAccuracy}%</p>
        </article>
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Recent attempts</p>
          <p className="mt-3 text-3xl font-black text-slate-950 dark:text-white">{quizResults.length}</p>
        </article>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black tracking-tight text-slate-950 dark:text-white">Accuracy by module</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Mock progress values for MVP reporting.</p>
          </div>
        </div>
        <div className="mt-6 space-y-5">
        {modules.map((module) => (
          <div key={module.id} className="grid gap-2 md:grid-cols-[260px_1fr_52px] md:items-center">
            <div>
              <p className="text-sm font-black text-slate-950 dark:text-white">{module.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{module.completedQuestions}/{module.totalQuestions} questions</p>
            </div>
            <ProgressBar value={module.accuracy} label={`${module.name} accuracy`} />
            <span className="text-sm font-black text-cyan-700 dark:text-cyan-300">{module.accuracy}%</span>
          </div>
        ))}
        </div>
      </section>
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
        <h2 className="text-lg font-black tracking-tight text-slate-950 dark:text-white">Topic performance</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {topicPerformance.map((topic) => (
            <div key={topic.id} className="rounded-lg border border-slate-100 p-4 dark:border-slate-800">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-black text-slate-950 dark:text-white">{topic.topic}</p>
                <span className="text-sm font-black text-cyan-700 dark:text-cyan-300">{topic.accuracy}%</span>
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{topic.correct}/{topic.attempted} correct, trend {topic.trend}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}