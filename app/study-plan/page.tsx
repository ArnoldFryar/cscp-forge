import ProgressBar from "@/components/ProgressBar";
import { userProgress } from "@/data/mockProgress";
import { weeklyStudyPlan } from "@/data/studyPlan";

export default function StudyPlanPage() {
  const weeklyProgress = Math.round((userProgress.minutesStudiedThisWeek / userProgress.weeklyGoalMinutes) * 100);

  return (
    <div className="space-y-6">
      <section className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-600 dark:text-cyan-300">Study Plan</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">Weekly execution plan</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-300">
            A practical weekly layout for short focused study blocks around high-value modules and missed-question review.
          </p>
        </div>
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
          <p className="text-sm font-black text-slate-950 dark:text-white">Weekly goal</p>
          <p className="mt-3 text-3xl font-black text-slate-950 dark:text-white">{weeklyProgress}%</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{userProgress.minutesStudiedThisWeek} of {userProgress.weeklyGoalMinutes} minutes complete</p>
          <div className="mt-5"><ProgressBar value={weeklyProgress} label="Weekly study progress" /></div>
        </article>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-7">
        {weeklyStudyPlan.map((day) => (
          <article key={day.day} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-black text-slate-950 dark:text-white">{day.day}</h2>
              <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-black text-cyan-700 dark:bg-cyan-950 dark:text-cyan-200">{day.minutes}m</span>
            </div>
            <p className="mt-4 text-sm font-black text-slate-800 dark:text-slate-100">{day.focus}</p>
            <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              {day.tasks.map((task) => (
                <li key={task} className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/70">{task}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>
    </div>
  );
}