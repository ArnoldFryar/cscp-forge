import Link from "next/link";
import { BookOpenText, CheckCircle2, Download, MonitorSmartphone, Smartphone, WifiOff } from "lucide-react";

const installSteps = [
  {
    title: "Desktop Chrome",
    icon: MonitorSmartphone,
    steps: [
      "Open CSCP Forge in Chrome after the production app is served.",
      "Click the install icon in the address bar, or open Chrome menu > Save and share > Install page as app.",
      "Launch CSCP Forge from the desktop, Start menu, or app launcher.",
    ],
  },
  {
    title: "Android Chrome",
    icon: Smartphone,
    steps: [
      "Open CSCP Forge in Chrome on Android.",
      "Tap the browser menu and choose Add to Home screen or Install app.",
      "Use the home-screen app icon for standalone study sessions.",
    ],
  },
  {
    title: "iPhone Safari",
    icon: Smartphone,
    steps: [
      "Open CSCP Forge in Safari on iPhone.",
      "Tap Share, then Add to Home Screen.",
      "Launch from the home-screen icon. Safari handles installation differently than Chrome, so there may not be an install prompt.",
    ],
  },
];

export default function AboutPage() {
  return (
    <div className="space-y-6">
      <section className="app-card p-6 sm:p-7">
        <p className="app-eyebrow">About</p>
        <h1 className="app-page-title mt-3 max-w-4xl tracking-tight">Install CSCP Forge as a study app.</h1>
        <p className="app-body-copy mt-4 max-w-3xl text-base">
          CSCP Forge is configured as a Progressive Web App with standalone display, app icons, a theme color, and offline-friendly caching for the core study routes.
        </p>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        {installSteps.map((platform) => {
          const Icon = platform.icon;
          return (
            <article key={platform.title} className="app-card p-5">
              <div className="flex items-center gap-2">
                <Icon className="text-cyan-700 dark:text-cyan-300" size={20} aria-hidden="true" />
                <h2 className="text-lg font-black tracking-tight text-slate-950 dark:text-white">{platform.title}</h2>
              </div>
              <ol className="mt-5 space-y-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                {platform.steps.map((step, index) => (
                  <li key={step} className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/70">{index + 1}. {step}</li>
                ))}
              </ol>
            </article>
          );
        })}
      </section>

      <section className="grid gap-5 lg:grid-cols-[0.58fr_0.42fr]">
        <article className="app-card p-5">
          <div className="flex items-center gap-2">
            <WifiOff className="text-cyan-700 dark:text-cyan-300" size={20} aria-hidden="true" />
            <h2 className="text-lg font-black tracking-tight text-slate-950 dark:text-white">Offline-friendly study routes</h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
            After the app has loaded once in production, the service worker caches the core routes used for daily studying.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {["Dashboard", "Modules", "Quiz questions", "Missed questions", "Study notes"].map((item) => (
              <div key={item} className="flex items-center gap-2 rounded-lg bg-slate-50 p-3 text-sm font-bold text-slate-700 dark:bg-slate-800/70 dark:text-slate-200">
                <CheckCircle2 className="text-emerald-600 dark:text-emerald-300" size={16} aria-hidden="true" />
                {item}
              </div>
            ))}
          </div>
        </article>

        <article className="app-card p-5">
          <div className="flex items-center gap-2">
            <Download className="text-cyan-700 dark:text-cyan-300" size={20} aria-hidden="true" />
            <h2 className="text-lg font-black tracking-tight text-slate-950 dark:text-white">Local progress offline</h2>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Progress, missed-question recovery, active recall confidence, study plans, and final exam attempts remain localStorage-based. That means they continue to read and write on the installed app even when the network is unavailable.
          </p>
          <Link
            href="/study-notes"
            className="app-btn-primary mt-5"
          >
            <BookOpenText size={16} aria-hidden="true" />
            Open study notes
          </Link>
        </article>
      </section>
    </div>
  );
}