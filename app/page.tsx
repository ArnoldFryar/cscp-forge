import ProgressBar from "@/components/ProgressBar";
import { modules } from "@/data/modules";
import { missedQuestions, userProgress } from "@/data/mockProgress";
import { questions } from "@/data/questions";
import { weeklyStudyPlan } from "@/data/studyPlan";
import { getModuleById, getWeakestModule } from "@/lib/scoring";
import { BarChart3, Flame, Target, TrendingUp, Trophy } from "lucide-react";

export default function HomePage() {
  const weakestModule = getWeakestModule(modules, userProgress.weakestModuleId);
  const weeklyProgress = Math.round((userProgress.minutesStudiedThisWeek / userProgress.weeklyGoalMinutes) * 100);
  const nextPlanItem = weeklyStudyPlan[0];

  const cards = [
    { label: "Overall readiness", value: `${userProgress.readinessScore}%`, detail: "Balanced across practice, accuracy, and coverage", icon: Trophy },
    { label: "Questions completed", value: userProgress.questionsCompleted.toLocaleString(), detail: `${questions.length} mock questions available now`, icon: Target },
    { label: "Average accuracy", value: `${userProgress.averageAccuracy}%`, detail: "Across recent local attempts", icon: TrendingUp },
    { label: "Weakest module", value: weakestModule.name, detail: `${weakestModule.accuracy}% accuracy needs attention`, icon: BarChart3 },
    { label: "Study streak", value: `${userProgress.currentStudyStreak} days`, detail: "Keep sessions short and consistent", icon: Flame },
  ];

  return (
    <div className="space-y-6">
      <section className="grid gap-5 lg:grid-cols-[1.45fr_0.55fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-600 dark:text-cyan-300">CSCP Forge</p>
          <h1 className="mt-4 max-w-3xl text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl">
            Premium practice for working supply chain professionals.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
            Study by CSCP module, answer original scenario-based questions, review explanations, and keep weak areas visible until they improve.
          </p>
        </div>
        <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-6 shadow-sm dark:border-cyan-900/70 dark:bg-cyan-950/40">
          <p className="text-sm font-black text-cyan-950 dark:text-cyan-100">This week</p>
          <p className="mt-3 text-4xl font-black text-cyan-950 dark:text-white">{userProgress.minutesStudiedThisWeek}m</p>
          <p className="mt-1 text-sm text-cyan-800 dark:text-cyan-200">of {userProgress.weeklyGoalMinutes} planned minutes</p>
          <div className="mt-5">
            <ProgressBar value={weeklyProgress} label="Weekly study plan completion" />
          </div>
          <p className="mt-5 text-sm font-bold text-cyan-900 dark:text-cyan-100">Next: {nextPlanItem.focus}</p>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <article key={card.label} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{card.label}</p>
                <Icon size={18} className="text-cyan-600 dark:text-cyan-300" aria-hidden="true" />
              </div>
              <p className="mt-4 text-2xl font-black tracking-tight text-slate-950 dark:text-white">{card.value}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{card.detail}</p>
            </article>
          );
        })}
      </section>

      <section className="grid gap-5 lg:grid-cols-[0.7fr_0.3fr]">
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black tracking-tight text-slate-950 dark:text-white">Module readiness</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Progress and accuracy across the 8-module study map.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{modules.length} modules</span>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {modules.slice(0, 4).map((module) => (
              <div key={module.id} className="rounded-lg border border-slate-100 p-4 dark:border-slate-800">
                <div className="flex items-center justify-between gap-3 text-sm font-bold">
                  <span className="text-slate-950 dark:text-white">{module.name}</span>
                  <span className="text-cyan-600 dark:text-cyan-300">{module.accuracy}%</span>
                </div>
                <div className="mt-3"><ProgressBar value={module.accuracy} label={`${module.name} accuracy`} /></div>
              </div>
            ))}
          </div>
        </article>
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
          <h2 className="text-lg font-black tracking-tight text-slate-950 dark:text-white">Review queue</h2>
          <p className="mt-3 text-4xl font-black text-slate-950 dark:text-white">{missedQuestions.length}</p>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">Mock missed questions ready for explanation review and retesting.</p>
          <p className="mt-5 rounded-lg bg-amber-50 p-3 text-sm font-bold text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
            Weakest focus: {getModuleById(modules, userProgress.weakestModuleId).name}
          </p>
        </article>
      </section>
    </div>
  );
}