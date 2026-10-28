"use client";

import { Bell, Sparkles } from "lucide-react";

interface HeaderProps {
  title: string;
  description?: string;
}

export function DashboardHeader({ title, description }: HeaderProps) {
  return (
    <header className="h-16 border-b border-zinc-800/80 bg-[#090a0d]/60 backdrop-blur px-8 flex items-center justify-between shrink-0">
      <div>
        <h1 className="text-base font-semibold text-white tracking-tight">{title}</h1>
        {description && <p className="text-xs text-zinc-400">{description}</p>}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/5 text-[11px] font-medium text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Infrastructure Active
        </div>

        <button
          className="h-8 w-8 rounded-lg border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors"
          title="Notifications"
        >
          <Bell className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
