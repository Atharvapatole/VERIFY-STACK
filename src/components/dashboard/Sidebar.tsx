"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ShieldCheck,
  LayoutDashboard,
  Layers,
  PlugZap,
  KeyRound,
  SendHorizontal,
  BarChart3,
  ListTree,
  BookOpen,
  Settings,
  LogOut,
  ShieldAlert,
} from "lucide-react";

const navItems = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Projects", href: "/dashboard/projects", icon: Layers },
  { label: "WhatsApp Integrations", href: "/dashboard/integrations", icon: PlugZap },
  { label: "API Keys", href: "/dashboard/api-keys", icon: KeyRound },
  { label: "Test Message", href: "/dashboard/test-message", icon: SendHorizontal },
  { label: "Usage & Analytics", href: "/dashboard/usage", icon: BarChart3 },
  { label: "Audit & Logs", href: "/dashboard/logs", icon: ListTree },
  { label: "Developer Docs", href: "/dashboard/docs", icon: BookOpen },
  { label: "Project Settings", href: "/dashboard/settings", icon: Settings },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch {
      router.push("/login");
    }
  };

  return (
    <aside className="w-64 border-r border-zinc-800/80 bg-[#0c0e12] flex flex-col justify-between shrink-0 h-screen sticky top-0">
      <div>
        {/* Brand */}
        <div className="h-16 flex items-center px-6 border-b border-zinc-800/80 gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <span className="font-semibold text-sm tracking-tight text-white">Verify Stack</span>
            <span className="block text-[10px] text-zinc-500">OTP Infrastructure</span>
          </div>
        </div>

        {/* Navigation links */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer controls */}
      <div className="p-3 border-t border-zinc-800/80 space-y-1">
        <Link
          href="/admin"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-amber-400 hover:bg-amber-400/5 transition-colors"
        >
          <ShieldAlert className="h-4 w-4 text-amber-500" />
          Platform Admin
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-rose-400 hover:bg-rose-500/5 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
