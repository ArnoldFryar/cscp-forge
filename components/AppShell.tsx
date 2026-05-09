"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Brain, BookOpenText, CalendarDays, ClipboardList, Download, Flag, Grid2X2, Home, Info, PlayCircle, RotateCcw, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";

const navItems = [
  { label: "Dashboard", href: "/", icon: Home },
  { label: "Study Session", mobileLabel: "Session", href: "/study-session", icon: PlayCircle },
  { label: "Modules", href: "/modules", icon: Grid2X2 },
  { label: "Study Notes", mobileLabel: "Notes", href: "/study-notes", icon: BookOpenText },
  { label: "Practice", href: "/quiz", icon: ClipboardList },
  { label: "Final Exam", mobileLabel: "Exam", href: "/final-exam", icon: Flag },
  { label: "Active Recall", mobileLabel: "Recall", href: "/active-recall", icon: Brain },
  { label: "Missed", href: "/missed", icon: RotateCcw },
  { label: "Plan", href: "/study-plan", icon: CalendarDays },
  { label: "Export", href: "/export", icon: Download },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "About", href: "/about", icon: Info },
];

type AppShellProps = {
  children: ReactNode;
};

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-(--forge-bg) text-(--forge-text-primary) antialiased">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col border-r border-(--forge-border-soft) bg-(--forge-surface-primary) px-3 py-5 shadow-[10px_0_30px_rgba(0,0,0,0.16)] xl:flex">
        <Link href="/" className="flex items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-(--forge-surface-elevated)">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-[rgb(45_212_191/0.45)] bg-[rgb(45_212_191/0.12)] text-sm font-black text-(--forge-accent) shadow-sm">CF</span>
          <span>
            <span className="block text-lg font-black tracking-tight text-(--forge-text-primary)">CSCP Forge</span>
            <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-(--forge-text-muted)">Operations prep</span>
          </span>
        </Link>

        <nav className="mt-6 flex-1 space-y-1 overflow-y-auto pr-1">
          {navItems.map((item) => {
            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex items-center gap-3 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                  isActive
                    ? "border-(--forge-border-strong) bg-(--forge-surface-elevated) text-(--forge-text-primary) shadow-[0_0_18px_rgb(45_212_191/0.05)] before:absolute before:bottom-2 before:left-0 before:top-2 before:w-0.5 before:rounded-full before:bg-(--forge-accent)"
                    : "border-transparent text-(--forge-text-secondary) hover:border-(--forge-border-soft) hover:bg-(--forge-surface-elevated) hover:text-(--forge-text-primary)"
                }`}
              >
                <Icon className="shrink-0" size={18} aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-4 rounded-lg border border-(--forge-border-soft) bg-(--forge-surface-elevated) p-3 text-sm">
          <div className="flex items-center gap-2 text-(--forge-text-primary)">
            <ShieldCheck size={17} aria-hidden="true" />
            <p className="font-bold">Local cockpit</p>
          </div>
          <p className="mt-2 leading-6 text-(--forge-text-muted)">Progress, recovery, and plans stay on this device.</p>
        </div>
      </aside>

      <header className="sticky top-0 z-20 border-b border-(--forge-border-soft) bg-[rgb(5_8_22/0.94)] px-4 py-3 backdrop-blur xl:hidden">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-[rgb(45_212_191/0.45)] bg-[rgb(45_212_191/0.12)] text-xs font-black text-(--forge-accent)">CF</span>
            <span className="text-base font-black tracking-tight text-(--forge-text-primary)">CSCP Forge</span>
          </Link>
          <span className="rounded-full border border-(--forge-border-soft) bg-(--forge-surface-elevated) px-3 py-1 text-xs font-bold text-(--forge-text-secondary)">Local</span>
        </div>
      </header>

      <main className="pb-20 xl:ml-72 xl:pb-0">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 xl:py-8">{children}</div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-(--forge-border-soft) bg-[rgb(5_8_22/0.96)] px-2 py-1.5 shadow-[0_-18px_42px_rgba(0,0,0,0.28)] backdrop-blur xl:hidden">
        <div className="app-mobile-nav-track flex gap-1 overflow-x-auto pb-1">
          {navItems.map((item) => {
            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-h-12 w-16 shrink-0 flex-col items-center justify-center rounded-lg border text-[0.62rem] font-semibold ${
                  isActive ? "border-(--forge-border-strong) bg-(--forge-surface-elevated) text-(--forge-text-primary)" : "border-transparent text-(--forge-text-muted)"
                }`}
              >
                <Icon className="shrink-0" size={17} aria-hidden="true" />
                <span className="mt-0.5 truncate">{"mobileLabel" in item ? item.mobileLabel : item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}