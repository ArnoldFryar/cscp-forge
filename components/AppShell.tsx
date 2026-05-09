"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, CalendarDays, ClipboardList, Grid2X2, Home, RotateCcw } from "lucide-react";
import type { ReactNode } from "react";

const navItems = [
  { label: "Dashboard", href: "/", icon: Home },
  { label: "Modules", href: "/modules", icon: Grid2X2 },
  { label: "Practice", href: "/quiz", icon: ClipboardList },
  { label: "Missed", href: "/missed", icon: RotateCcw },
  { label: "Plan", href: "/study-plan", icon: CalendarDays },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
];

type AppShellProps = {
  children: ReactNode;
};

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-100">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-slate-200/80 bg-white/90 px-5 py-6 shadow-sm backdrop-blur xl:block dark:border-slate-800 dark:bg-slate-950/90">
        <Link href="/" className="flex items-center gap-3 rounded-lg px-2 py-1">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-600 text-sm font-black text-white shadow-sm shadow-cyan-600/30">CF</span>
          <span>
            <span className="block text-lg font-black tracking-tight">CSCP Forge</span>
            <span className="block text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Exam prep</span>
          </span>
        </Link>

        <nav className="mt-8 space-y-1">
          {navItems.map((item) => {
            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold transition ${
                  isActive
                    ? "bg-slate-950 text-white shadow-sm dark:bg-white dark:text-slate-950"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white"
                }`}
              >
                <Icon size={18} aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="absolute inset-x-5 bottom-6 rounded-lg border border-cyan-200 bg-cyan-50 p-4 text-sm dark:border-cyan-900/70 dark:bg-cyan-950/40">
          <p className="font-black text-cyan-950 dark:text-cyan-100">Focused sprint</p>
          <p className="mt-1 text-cyan-800 dark:text-cyan-200">9-day streak active. Keep sessions short, scored, and deliberate.</p>
        </div>
      </aside>

      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur xl:hidden dark:border-slate-800 dark:bg-slate-950/90">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-600 text-xs font-black text-white">CF</span>
            <span className="text-base font-black tracking-tight">CSCP Forge</span>
          </Link>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-slate-900 dark:text-slate-300">MVP</span>
        </div>
      </header>

      <main className="pb-24 xl:ml-72 xl:pb-0">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 xl:py-8">{children}</div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-2 py-2 shadow-[0_-16px_40px_rgba(15,23,42,0.08)] backdrop-blur xl:hidden dark:border-slate-800 dark:bg-slate-950/95">
        <div className="grid grid-cols-6 gap-1">
          {navItems.map((item) => {
            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-h-14 flex-col items-center justify-center rounded-lg text-[0.68rem] font-bold ${
                  isActive ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950" : "text-slate-500 dark:text-slate-400"
                }`}
              >
                <Icon size={18} aria-hidden="true" />
                <span className="mt-1 truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}